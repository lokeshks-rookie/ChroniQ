"""Self-Service Hospital Kiosk Router (Masked Data, Fast Check-in, Walk-ins)."""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.models.booking import Appointment, PatientSnapshot, QueueEntry
from app.models.common import AppointmentStatus, AppointmentType, CreatedVia, QueueStatus, utcnow
from app.models.hospitals import Department, Doctor, Hospital
from app.services.booking_service import generate_booking_code
from app.services.queue_service import check_in_patient, get_next_token, get_today_ist, recompute_doctor_queue

router = APIRouter(prefix="/kiosk", tags=["Kiosk"])


class KioskCheckInBody(BaseModel):
    appointmentId: Optional[str] = None
    appointment_id: Optional[str] = None
    hospitalId: Optional[str] = None
    hospital_id: Optional[str] = None


class KioskWalkInBody(BaseModel):
    hospitalId: Optional[str] = None
    hospital_id: Optional[str] = None
    departmentId: Optional[str] = None
    department_id: Optional[str] = None
    doctorId: Optional[str] = None
    doctor_id: Optional[str] = None
    patientName: Optional[str] = None
    patient_name: Optional[str] = None
    patientPhone: Optional[str] = None
    patient_phone: Optional[str] = None
    age: Optional[int] = 30
    gender: Optional[str] = "other"
    reason: Optional[str] = "General consultation"
    priority: Optional[int] = 2


def mask_name(name: str) -> str:
    if not name:
        return "Unknown"
    parts = name.split()
    masked = []
    for p in parts:
        if len(p) <= 1:
            masked.append(p)
        elif len(p) == 2:
            masked.append(p[0] + "*")
        else:
            masked.append(p[0] + "*" * (len(p) - 1))
    return " ".join(masked)


def mask_phone(phone: str) -> str:
    if not phone:
        return "******"
    cleaned = "".join(filter(str.isdigit, phone))
    if len(cleaned) >= 10:
        return cleaned[:2] + "******" + cleaned[-2:]
    return "******" + (cleaned[-2:] if len(cleaned) >= 2 else "")


def to_kiosk_summary(apt: Appointment) -> dict:
    now = utcnow()
    # Check-in allowed up to 60 mins before scheduled time
    window_start = apt.scheduled_start - timedelta(minutes=60)
    can_check_in = (
        apt.status == AppointmentStatus.BOOKED
        and now >= window_start
        and now <= apt.scheduled_end
    )
    cannot_reason = None
    if apt.status in (AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_QUEUE):
        cannot_reason = "Already checked in"
    elif now < window_start:
        cannot_reason = "Too early for check-in (available 60m prior)"
    elif now > apt.scheduled_end:
        cannot_reason = "Appointment time has passed"

    return {
        "id": str(apt.id),
        "appointment_id": str(apt.id),
        "booking_code": apt.booking_code,
        "patient_name_masked": mask_name(apt.patient.name),
        "patient_phone_masked": mask_phone(apt.patient.phone),
        "doctor_name": apt.doctor_name,
        "department_name": apt.department_name,
        "scheduled_start": apt.scheduled_start.isoformat(),
        "status": apt.status,
        "can_check_in": can_check_in,
        "already_checked_in": apt.status in (AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_QUEUE),
        "token": apt.token,
        "cannot_reason": cannot_reason,
    }


@router.get("/{hospitalId}/lookup-phone")
async def lookup_by_phone(
    hospitalId: str,
    phone: str = Query(...),
):
    """Lookup patient appointments by phone number for today with privacy masking."""
    cleaned = "".join(filter(str.isdigit, phone))
    # Query appointments matching this phone and hospital
    all_appts = await Appointment.find(
        Appointment.hospital_id == hospitalId,
        Appointment.status != AppointmentStatus.CANCELLED,
    ).to_list()

    matches = []
    for a in all_appts:
        apt_phone = "".join(filter(str.isdigit, a.patient.phone or ""))
        if cleaned in apt_phone or apt_phone in cleaned:
            matches.append(to_kiosk_summary(a))

    return {"appointments": matches}


@router.get("/{hospitalId}/lookup-qr")
async def lookup_by_qr(
    hospitalId: str,
    code: Optional[str] = Query(None),
    booking_code: Optional[str] = Query(None),
):
    """Lookup appointment by QR code or booking reference code."""
    query_code = code or booking_code
    if not query_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="code or booking_code is required")

    apt = await Appointment.find_one(Appointment.booking_code == query_code)
    if not apt:
        # Also try by appointment ID
        apt = await Appointment.get(query_code)
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No appointment found for this code.")

    return {"appointment": to_kiosk_summary(apt)}


@router.post("/check-in")
async def kiosk_check_in(
    payload: KioskCheckInBody,
):
    """Perform self-service check-in and issue physical token."""
    apt_id = payload.appointmentId or payload.appointment_id
    if not apt_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="appointmentId is required")

    entry = await check_in_patient(appointment_id=apt_id)
    apt = await Appointment.get(apt_id)

    doc = await Doctor.find_one(Doctor.custom_id == entry.doctor_id)
    if not doc:
        doc = await Doctor.get(entry.doctor_id)
    room = doc.room if doc else "Room 1"

    return {
        "success": True,
        "token": entry.token,
        "position": entry.position,
        "eta_minutes": entry.eta_minutes,
        "doctor_name": apt.doctor_name if apt else (doc.name if doc else "Doctor"),
        "department_name": apt.department_name if apt else "Department",
        "room": room,
        "appointment_time": apt.scheduled_start.isoformat() if apt else utcnow().isoformat(),
        "patient_name": mask_name(apt.patient.name) if apt else "Patient",
    }


@router.post("/walk-in")
async def kiosk_walk_in(
    payload: KioskWalkInBody,
):
    """Issue a walk-in token from self-service kiosk."""
    hosp_id = payload.hospitalId or payload.hospital_id or "hosp_city_01"
    dept_id = payload.departmentId or payload.department_id
    doc_id = payload.doctorId or payload.doctor_id
    pat_name = payload.patientName or payload.patient_name or "Walk-in Patient"
    pat_phone = payload.patientPhone or payload.patient_phone or "9999999999"

    if not doc_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="doctorId is required")

    doc = await Doctor.find_one(Doctor.custom_id == doc_id)
    if not doc:
        doc = await Doctor.get(doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    dept_id = dept_id or doc.department_id
    dept = await Department.find_one(Department.custom_id == dept_id)
    if not dept:
        dept = await Department.get(dept_id)

    hosp = await Hospital.find_one(Hospital.custom_id == hosp_id)
    if not hosp:
        hosp = await Hospital.get(hosp_id)

    now = utcnow()
    today = get_today_ist()
    token = await get_next_token(hosp_id, dept_id)
    token_number = int(token.split("-")[-1]) if "-" in token else 1

    appt = Appointment(
        booking_code=generate_booking_code(),
        patient_id="kiosk-walk-in",
        patient=PatientSnapshot(name=pat_name, phone=pat_phone, age=payload.age or 30, gender=payload.gender or "other"),
        hospital_id=hosp_id,
        department_id=dept_id,
        doctor_id=doc_id,
        hospital_name=hosp.name if hosp else "Hospital",
        doctor_name=doc.name,
        department_name=dept.name if dept else "General",
        scheduled_start=now,
        scheduled_end=now + timedelta(minutes=15),
        type=AppointmentType.WALK_IN,
        reason=payload.reason or "Walk-in consultation",
        fee=doc.fee,
        status=AppointmentStatus.CHECKED_IN,
        created_via=CreatedVia.KIOSK,
        token=token,
    )
    await appt.insert()

    entry = QueueEntry(
        appointment_id=str(appt.id),
        hospital_id=hosp_id,
        department_id=dept_id,
        doctor_id=doc_id,
        queue_date=today,
        token=token,
        token_number=token_number,
        priority=payload.priority or 2,
        status=QueueStatus.WAITING,
        sort_time=now,
        checked_in_at=now,
    )
    await entry.insert()

    await recompute_doctor_queue(doc_id)

    return {
        "success": True,
        "token": token,
        "position": entry.position,
        "eta_minutes": entry.eta_minutes,
        "doctor_name": doc.name,
        "department_name": dept.name if dept else "General",
        "room": doc.room,
        "patient_name": mask_name(pat_name),
    }


@router.get("/{hospitalId}/departments")
async def kiosk_departments(hospitalId: str):
    """List hospital departments with available doctor count for kiosk touchscreens."""
    depts = await Department.find(Department.hospital_id == hospitalId, Department.is_active == True).to_list()
    result = []
    for d in depts:
        doc_count = await Doctor.find(
            Doctor.hospital_id == hospitalId,
            Doctor.department_id == (d.custom_id or str(d.id)),
            Doctor.is_active == True,
        ).count()
        result.append({
            "id": d.custom_id or str(d.id),
            "name": d.name,
            "code": d.code,
            "token_prefix": d.token_prefix,
            "icon": d.icon,
            "doctors_available_count": doc_count,
        })
    return result
