"""Walk-in Registration Router."""
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.models.accounts import User
from app.models.booking import Appointment, PatientSnapshot, QueueEntry, StatusEvent
from app.models.common import AppointmentStatus, AppointmentType, CreatedVia, QueueStatus, Role, utcnow
from app.models.hospitals import Department, Doctor, Hospital
from app.schemas.booking import WalkInRequest
from app.services.booking_service import generate_booking_code
from app.services.queue_service import get_next_token, get_today_ist, recompute_doctor_queue

router = APIRouter(prefix="/walk-in", tags=["Walk-in"])


class WalkInBody(BaseModel):
    patient: PatientSnapshot
    department_id: Optional[str] = None
    departmentId: Optional[str] = None
    doctor_id: Optional[str] = None
    doctorId: Optional[str] = None
    reason: str
    priority: int = 2


@router.post("", status_code=status.HTTP_201_CREATED)
async def register_walk_in(
    payload: WalkInBody,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Register a walk-in patient at front desk or kiosk and issue queue token immediately."""
    doc_id = payload.doctor_id or payload.doctorId
    dept_id = payload.department_id or payload.departmentId

    if not doc_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="doctorId is required")

    doctor = await Doctor.find_one(Doctor.custom_id == doc_id)
    if not doctor:
        doctor = await Doctor.get(doc_id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    hosp_id = doctor.hospital_id
    dept_id = dept_id or doctor.department_id

    hospital = await Hospital.find_one(Hospital.custom_id == hosp_id)
    if not hospital:
        hospital = await Hospital.get(hosp_id)
    hosp_name = hospital.name if hospital else "Hospital"

    department = await Department.find_one(Department.custom_id == dept_id)
    if not department:
        department = await Department.get(dept_id)
    dept_name = department.name if department else "General"

    token = await get_next_token(hosp_id, dept_id)
    token_number = int(token.split("-")[-1]) if "-" in token else 1
    now = utcnow()
    today = get_today_ist()

    # Create Appointment record
    appointment = Appointment(
        booking_code=generate_booking_code(),
        patient_id="walk-in",
        patient=payload.patient,
        hospital_id=hosp_id,
        department_id=dept_id,
        doctor_id=doc_id,
        hospital_name=hosp_name,
        doctor_name=doctor.name,
        department_name=dept_name,
        scheduled_start=now,
        scheduled_end=now + timedelta(minutes=15),
        type=AppointmentType.WALK_IN,
        reason=payload.reason,
        fee=doctor.fee,
        status=AppointmentStatus.CHECKED_IN,
        status_history=[
            StatusEvent(
                status=AppointmentStatus.CHECKED_IN,
                at=now,
                by=str(current_user.id) if current_user else "kiosk",
                note="Walk-in registered",
            )
        ],
        created_via=CreatedVia.WALK_IN,
        token=token,
    )
    await appointment.insert()

    # Create QueueEntry
    entry = QueueEntry(
        appointment_id=str(appointment.id),
        hospital_id=hosp_id,
        department_id=dept_id,
        doctor_id=doc_id,
        queue_date=today,
        token=token,
        token_number=token_number,
        priority=payload.priority,
        status=QueueStatus.WAITING,
        sort_time=now,
        checked_in_at=now,
    )
    await entry.insert()

    # Recompute doctor's queue positions and ETAs
    await recompute_doctor_queue(doc_id)

    return {
        "success": True,
        "token": token,
        "appointment_id": str(appointment.id),
        "queue_entry_id": str(entry.id),
        "position": entry.position,
        "eta_minutes": entry.eta_minutes,
        "appointment": appointment.dict(),
    }
