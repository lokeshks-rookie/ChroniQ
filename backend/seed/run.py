"""Idempotent Database Seeder (`python -m seed.run`)."""
import asyncio
import logging
import sys

from app.core.config import get_settings
from app.core.db import close_db, init_db
from app.core.security import hash_password
from app.models.accounts import User
from app.models.common import HospitalStatus, Role, utcnow
from app.models.hospitals import Department, Doctor, Hospital
from app.models.scheduling import DoctorSchedule, WeeklyRule
from app.services.slot_service import generate_slots_for_doctor
from seed.data import SEED_DEPARTMENTS, SEED_DOCTORS, SEED_HOSPITAL, SEED_USERS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("chroniq.seed")


async def seed_database():
    """Run full idempotent seeding of platform data."""
    settings = get_settings()
    logger.info("Initializing DB connection for seeding...")
    connected = await init_db()
    if not connected:
        logger.error(
            "Cannot run seed: MongoDB connection could not be established. "
            "Please configure MONGODB_URI in backend/.env."
        )
        return False

    now = utcnow()

    # 1. Seed Hospital
    logger.info("Seeding Hospital...")
    hosp = await Hospital.find_one(Hospital.custom_id == SEED_HOSPITAL["custom_id"])
    if not hosp:
        hosp = Hospital(**SEED_HOSPITAL)
        await hosp.insert()
        logger.info(f"Created hospital: {hosp.name} ({hosp.custom_id})")
    else:
        logger.info(f"Hospital {hosp.name} already exists.")

    # 2. Seed Departments
    logger.info("Seeding Departments...")
    for d_data in SEED_DEPARTMENTS:
        dept = await Department.find_one(Department.custom_id == d_data["custom_id"])
        if not dept:
            dept = Department(**d_data)
            await dept.insert()
            logger.info(f"Created department: {dept.name} ({dept.custom_id})")
        else:
            logger.info(f"Department {dept.name} already exists.")

    # 3. Seed Doctors & Schedules
    logger.info("Seeding Doctors & default schedules...")
    for doc_data in SEED_DOCTORS:
        doc = await Doctor.find_one(Doctor.custom_id == doc_data["custom_id"])
        if not doc:
            doc = Doctor(**doc_data)
            await doc.insert()
            logger.info(f"Created doctor: {doc.name} ({doc.custom_id})")
        else:
            logger.info(f"Doctor {doc.name} already exists.")

        # Default schedule (Mon - Fri: 09:00 - 13:00, 14:00 - 17:00)
        sched = await DoctorSchedule.find_one(DoctorSchedule.doctor_id == doc_data["custom_id"])
        if not sched:
            from app.models.scheduling import TimeRange
            weekly = []
            for day in [0, 1, 2, 3, 4]:
                weekly.append(
                    WeeklyRule(
                        weekday=day,
                        start="09:00",
                        end="17:00",
                        breaks=[TimeRange(start="13:00", end="14:00")],
                    )
                )

            sched = DoctorSchedule(
                doctor_id=doc_data["custom_id"],
                hospital_id=SEED_HOSPITAL["custom_id"],
                slot_minutes=15,
                weekly=weekly,
            )
            await sched.insert()

        # Generate initial 14 days of slots
        try:
            await generate_slots_for_doctor(doc_data["custom_id"], days=settings.SLOT_GENERATION_DAYS)
        except Exception as e:
            logger.warning(f"Slot generation notice for {doc_data['custom_id']}: {e}")

    # 4. Seed Standard Staff & Demo Users
    logger.info("Seeding Users...")
    for u_data in SEED_USERS:
        user = await User.find_one(User.phone == u_data["phone"])
        if not user:
            user = User(
                name=u_data["name"],
                phone=u_data["phone"],
                email=u_data["email"],
                password_hash=hash_password(u_data["password"]),
                role=Role(u_data["role"]),
                hospital_id=u_data.get("hospital_id"),
                preferred_language=u_data.get("preferred_language", "en"),
                age=u_data.get("age"),
                gender=u_data.get("gender"),
                is_verified=True,
                is_active=True,
            )
            await user.insert()
            logger.info(f"Created user: {user.name} ({user.phone}) - {user.role}")
        else:
            logger.info(f"User {user.phone} already exists.")

    # 5. Bootstrap Super Admin from ENV
    logger.info("Bootstrapping Super Admin...")
    admin_email = settings.SEED_SUPER_ADMIN_EMAIL
    super_admin = await User.find_one(User.email == admin_email)
    if not super_admin:
        super_admin = User(
            name="Super Administrator",
            phone="+91 90000 00001",
            email=admin_email,
            password_hash=hash_password(settings.SEED_SUPER_ADMIN_PASSWORD),
            role=Role.SUPER_ADMIN,
            is_verified=True,
            is_active=True,
        )
        await super_admin.insert()
        logger.info(f"Bootstrapped Super Admin: {admin_email}")
    else:
        logger.info(f"Super Admin {admin_email} already exists.")

    logger.info("Seeding completed successfully!")
    await close_db()
    return True


if __name__ == "__main__":
    success = asyncio.run(seed_database())
    sys.exit(0 if success else 1)
