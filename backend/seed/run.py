"""Comprehensive Database Seeder (`python -m seed.run`).
Upserts 13 hospitals, departments, doctors, schedules, 14-day slots,
multi-role users, family members, live queue entries for today, appointments,
reviews, and notification templates.
"""
import asyncio
from datetime import datetime, timedelta, timezone
import logging
import sys

from app.core.config import get_settings
from app.core.db import close_db, init_db
from app.core.security import hash_password
from app.models.accounts import FamilyMember, User
from app.models.booking import Appointment, PatientSnapshot, QueueEntry, StatusEvent, TokenCounter
from app.models.common import (
    AppointmentStatus,
    AppointmentType,
    CreatedVia,
    QueueStatus,
    Role,
    SlotStatus,
    utcnow,
)
from app.models.hospitals import Department, Doctor, Hospital
from app.models.scheduling import DoctorSchedule, Slot, TimeRange, WeeklyRule
from app.models.system import NotificationTemplate, Review
from app.services.slot_service import generate_slots_for_doctor
from seed.data import (
    SEED_DEPARTMENTS,
    SEED_DOCTORS,
    SEED_FAMILY_MEMBERS,
    SEED_HOSPITALS,
    SEED_NOTIFICATION_TEMPLATES,
    SEED_REVIEWS,
    SEED_USERS,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("chroniq.seed")


async def seed_database():
    """Run full idempotent seeding of platform data."""
    settings = get_settings()
    logger.info("Initializing DB connection for comprehensive seeding...")
    connected = await init_db()
    if not connected:
        logger.error(
            "Cannot run seed: MongoDB connection could not be established. "
            "Please configure MONGODB_URI in backend/.env."
        )
        return False

    now = utcnow()
    today_str = now.strftime("%Y-%m-%d")

    # -------------------------------------------------------------------------
    # 1. Seed All 13 Hospitals
    # -------------------------------------------------------------------------
    logger.info("1. Seeding 13 Hospitals...")
    for h_data in SEED_HOSPITALS:
        existing = await Hospital.find_one(Hospital.custom_id == h_data["custom_id"])
        if not existing:
            hosp = Hospital(**h_data)
            await hosp.insert()
            logger.info(f"   [+] Created hospital: {hosp.name} ({hosp.custom_id})")
        else:
            # Update metadata while preserving
            for k in ["name", "city", "address", "phone", "email", "location", "timings", "facilities", "rating_avg", "rating_count", "settings"]:
                if k in h_data:
                    setattr(existing, k, h_data[k])
            await existing.save()
            logger.info(f"   [*] Updated hospital: {existing.name} ({existing.custom_id})")

    # -------------------------------------------------------------------------
    # 2. Seed Departments
    # -------------------------------------------------------------------------
    logger.info("2. Seeding Clinical Departments...")
    for d_data in SEED_DEPARTMENTS:
        existing = await Department.find_one(Department.custom_id == d_data["custom_id"])
        if not existing:
            dept = Department(**d_data)
            await dept.insert()
            logger.info(f"   [+] Created department: {dept.name} ({dept.custom_id})")
        else:
            for k in ["name", "room", "token_prefix", "is_active"]:
                if k in d_data:
                    setattr(existing, k, d_data[k])
            await existing.save()

    # -------------------------------------------------------------------------
    # 3. Seed Doctors & Schedules & Pre-generate Slots
    # -------------------------------------------------------------------------
    logger.info("3. Seeding Doctors & 14-Day Schedules...")
    for doc_data in SEED_DOCTORS:
        doc = await Doctor.find_one(Doctor.custom_id == doc_data["custom_id"])
        if not doc:
            doc = Doctor(**doc_data)
            await doc.insert()
            logger.info(f"   [+] Created doctor: {doc.name} ({doc.custom_id})")
        else:
            for k in ["name", "specialty", "qualifications", "experience_years", "fee", "languages", "gender", "bio", "avg_consult_minutes", "rating_avg", "rating_count", "room"]:
                if k in doc_data:
                    setattr(doc, k, doc_data[k])
            await doc.save()

        # Weekly Schedule (Mon - Sat: 09:00 - 13:00, 14:00 - 17:00)
        sched = await DoctorSchedule.find_one(DoctorSchedule.doctor_id == doc_data["custom_id"])
        if not sched:
            weekly = [
                WeeklyRule(
                    weekday=day,
                    start="09:00",
                    end="17:00",
                    breaks=[TimeRange(start="13:00", end="14:00")],
                )
                for day in [0, 1, 2, 3, 4, 5]  # Mon - Sat
            ]
            sched = DoctorSchedule(
                doctor_id=doc_data["custom_id"],
                hospital_id=doc_data["hospital_id"],
                slot_minutes=15,
                weekly=weekly,
            )
            await sched.insert()

        # Pre-generate 14 days of slots
        try:
            await generate_slots_for_doctor(doc_data["custom_id"], days=settings.SLOT_GENERATION_DAYS)
        except Exception as e:
            logger.warning(f"   Slot generation note for {doc_data['custom_id']}: {e}")

    # -------------------------------------------------------------------------
    # 4. Seed Users (Admins, Receptionists, Doctors, Patients)
    # -------------------------------------------------------------------------
    logger.info("4. Seeding User Accounts (Admins, Receptionists, Doctors, Patients)...")
    user_map = {}
    for u_data in SEED_USERS:
        user = await User.find_one(User.phone == u_data["phone"])
        if not user:
            user = User(
                name=u_data["name"],
                phone=u_data["phone"],
                email=u_data.get("email"),
                password_hash=hash_password(u_data["password"]),
                role=Role(u_data["role"]),
                hospital_id=u_data.get("hospital_id"),
                linked_doctor_id=u_data.get("linked_doctor_id"),
                preferred_language=u_data.get("preferred_language", "en"),
                age=u_data.get("age"),
                gender=u_data.get("gender"),
                is_verified=True,
                is_active=True,
            )
            await user.insert()
            logger.info(f"   [+] Created user: {user.name} ({user.phone}) - {user.role}")
        else:
            # Update credentials & links
            user.name = u_data["name"]
            user.email = u_data.get("email")
            user.password_hash = hash_password(u_data["password"])
            user.role = Role(u_data["role"])
            user.hospital_id = u_data.get("hospital_id")
            user.linked_doctor_id = u_data.get("linked_doctor_id")
            user.is_verified = True
            user.is_active = True
            await user.save()
            logger.info(f"   [*] Updated user: {user.name} ({user.phone}) - {user.role}")
        user_map[user.email or user.phone] = user

    # -------------------------------------------------------------------------
    # 5. Bootstrap Super Admin
    # -------------------------------------------------------------------------
    logger.info("5. Bootstrapping Super Admin...")
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
        logger.info(f"   [+] Bootstrapped Super Admin: {admin_email}")
    else:
        super_admin.password_hash = hash_password(settings.SEED_SUPER_ADMIN_PASSWORD)
        super_admin.is_active = True
        super_admin.is_verified = True
        await super_admin.save()
        logger.info(f"   [*] Super Admin confirmed: {admin_email}")

    # -------------------------------------------------------------------------
    # 6. Seed Family Members (for Ravi Kumar)
    # -------------------------------------------------------------------------
    logger.info("6. Seeding Family Members...")
    ravi = user_map.get("patient.ravi@example.com")
    if ravi:
        for f_data in SEED_FAMILY_MEMBERS:
            existing_fam = await FamilyMember.find_one(
                FamilyMember.user_id == ravi.id,
                FamilyMember.name == f_data["name"],
            )
            if not existing_fam:
                fam = FamilyMember(
                    user_id=ravi.id,
                    name=f_data["name"],
                    age=f_data["age"],
                    gender=f_data["gender"],
                    relation=f_data["relation"],
                )
                await fam.insert()
                logger.info(f"   [+] Added family member: {fam.name} ({fam.relation}) for Ravi Kumar")

    # -------------------------------------------------------------------------
    # 7. Seed Appointments & Live Queue Entries for TODAY
    # -------------------------------------------------------------------------
    logger.info("7. Seeding Live Appointments & Queue Entries for Today...")
    hosp_city = "hosp_city_01"
    dept_card = "dept_card"
    doc_card = "doc_card_1"

    # Token counter for CARD today
    counter = await TokenCounter.find_one(
        TokenCounter.hospital_id == hosp_city,
        TokenCounter.department_id == dept_card,
        TokenCounter.date == today_str,
    )
    if not counter:
        counter = TokenCounter(
            hospital_id=hosp_city,
            department_id=dept_card,
            date=today_str,
            seq=4,
            expire_at=now + timedelta(days=7),
        )
        await counter.insert()
    else:
        counter.seq = max(counter.seq, 4)
        await counter.save()

    # Find available slot for today or create placeholder slots for appointments
    today_slots = await Slot.find(
        Slot.doctor_id == doc_card,
        Slot.status == SlotStatus.OPEN,
    ).limit(10).to_list()

    patients_for_today = [
        {"email": "priya.s@example.com", "name": "Priya Sharma", "token": "CARD-001", "token_num": 1, "status": QueueStatus.COMPLETED, "appt_status": AppointmentStatus.COMPLETED, "time_offset": -60},
        {"email": "karthik.r@example.com", "name": "Karthik Raja", "token": "CARD-002", "token_num": 2, "status": QueueStatus.IN_CONSULTATION, "appt_status": AppointmentStatus.CHECKED_IN, "time_offset": -15},
        {"email": "patient.ravi@example.com", "name": "Ravi Kumar", "token": "CARD-003", "token_num": 3, "status": QueueStatus.WAITING, "appt_status": AppointmentStatus.CHECKED_IN, "time_offset": 10},
        {"email": "ananya.r@example.com", "name": "Ananya Rao", "token": "CARD-004", "token_num": 4, "status": QueueStatus.WAITING, "appt_status": AppointmentStatus.CHECKED_IN, "time_offset": 25},
    ]

    for p in patients_for_today:
        user = user_map.get(p["email"])
        if not user:
            continue

        existing_entry = await QueueEntry.find_one(
            QueueEntry.hospital_id == hosp_city,
            QueueEntry.queue_date == today_str,
            QueueEntry.token == p["token"],
        )
        if not existing_entry:
            appt_start = now + timedelta(minutes=p["time_offset"])
            appt_end = appt_start + timedelta(minutes=15)
            booking_code = f"CQ-{now.strftime('%Y%m%d')}-{p['token_num']:04d}"

            # Ensure slot is booked if available
            slot_id = None
            if today_slots:
                s = today_slots.pop(0)
                s.status = SlotStatus.BOOKED
                await s.save()
                slot_id = str(s.id)

            appt = Appointment(
                booking_code=booking_code,
                patient_id=str(user.id),
                patient=PatientSnapshot(name=user.name, phone=user.phone, age=user.age, gender=user.gender),
                hospital_id=hosp_city,
                department_id=dept_card,
                doctor_id=doc_card,
                slot_id=slot_id,
                hospital_name="City Hospital",
                doctor_name="Dr. Anand Ramanathan",
                department_name="Cardiology",
                scheduled_start=appt_start,
                scheduled_end=appt_end,
                type=AppointmentType.BOOKED,
                reason="Cardiac follow-up & BP check",
                fee=800,
                status=p["appt_status"],
                token=p["token"],
                created_via=CreatedVia.WEB,
                status_history=[StatusEvent(status=p["appt_status"])],
            )
            await appt.insert()

            # Create Queue Entry
            q_entry = QueueEntry(
                appointment_id=str(appt.id),
                hospital_id=hosp_city,
                department_id=dept_card,
                doctor_id=doc_card,
                queue_date=today_str,
                token=p["token"],
                token_number=p["token_num"],
                status=p["status"],
                sort_time=appt_start,
                position=p["token_num"] - 2 if p["token_num"] > 2 else 0,
                eta_minutes=(p["token_num"] - 2) * 12 if p["token_num"] > 2 else 0,
                checked_in_at=now - timedelta(minutes=30),
                called_at=now - timedelta(minutes=15) if p["status"] in [QueueStatus.IN_CONSULTATION, QueueStatus.COMPLETED] else None,
                started_at=now - timedelta(minutes=14) if p["status"] in [QueueStatus.IN_CONSULTATION, QueueStatus.COMPLETED] else None,
                completed_at=now - timedelta(minutes=2) if p["status"] == QueueStatus.COMPLETED else None,
                consult_minutes=12.0 if p["status"] == QueueStatus.COMPLETED else None,
            )
            await q_entry.insert()
            logger.info(f"   [+] Seeded queue token {p['token']} ({p['status']}) for {user.name}")

    # -------------------------------------------------------------------------
    # 8. Seed Reviews
    # -------------------------------------------------------------------------
    logger.info("8. Seeding Reviews...")
    for r_data in SEED_REVIEWS:
        existing_rev = await Review.find_one(
            Review.doctor_id == r_data["doctor_id"],
            Review.comment == r_data["comment"],
        )
        if not existing_rev:
            review = Review(
                appointment_id=f"appt_rev_{r_data['doctor_id']}_{r_data['patient_name'].replace(' ', '_')}",
                patient_id=str(ravi.id) if ravi else "sample_patient",
                doctor_id=r_data["doctor_id"],
                hospital_id=r_data["hospital_id"],
                doctor_rating=r_data["doctor_rating"],
                hospital_rating=r_data["hospital_rating"],
                comment=r_data["comment"],
                tags=r_data.get("tags", []),
                wait_as_expected=r_data.get("wait_as_expected"),
            )
            await review.insert()
            logger.info(f"   [+] Added review for {r_data['doctor_id']}")

    # -------------------------------------------------------------------------
    # 9. Seed Notification Templates
    # -------------------------------------------------------------------------
    logger.info("9. Seeding Notification Templates...")
    for t_data in SEED_NOTIFICATION_TEMPLATES:
        existing_tpl = await NotificationTemplate.find_one(
            NotificationTemplate.hospital_id == t_data["hospital_id"],
            NotificationTemplate.type == t_data["type"],
        )
        if not existing_tpl:
            tpl = NotificationTemplate(**t_data)
            await tpl.insert()
            logger.info(f"   [+] Added template: {tpl.label}")

    logger.info("=" * 60)
    logger.info("Database seeding successfully finished with 100% original data!")
    logger.info("=" * 60)
    await close_db()
    return True


if __name__ == "__main__":
    success = asyncio.run(seed_database())
    sys.exit(0 if success else 1)
