"""Doctor Portal Endpoints: Profile, Day Summary, Queue, Notes, Availability, Leaves."""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.core.sse import broadcaster
from app.models.accounts import User
from app.models.booking import Appointment, QueueEntry
from app.models.common import AppointmentStatus, DoctorAvailabilityStatus, QueueStatus, Role, SlotStatus, utcnow
from app.models.hospitals import Doctor
from app.models.scheduling import DoctorLeave, DoctorSchedule, Slot
from app.models.system import AvailabilityLogEntry, ConsultationNote, DoctorAvailabilityState
from app.services.queue_service import get_today_ist, recompute_doctor_queue

router = APIRouter(tags=["Doctor Portal"])


class ConsultationDraftBody(BaseModel):
    appointment_id: str
    patient_id: str
    doctor_id: Optional[str] = None
    text: str
    follow_up: Optional[str] = "none"
    follow_up_date: Optional[str] = None
    finalized: Optional[bool] = False


class AvailabilityBody(BaseModel):
    status: DoctorAvailabilityStatus
    until: Optional[str] = None
    delay_minutes: Optional[int] = 0
    reason: Optional[str] = None
    notify: Optional[bool] = False


class LeaveCreateBody(BaseModel):
    date_from: str
    date_to: str
    reason: str


async def resolve_doctor_id(current_user: User, requested_id: Optional[str] = None) -> str:
    """Resolve the effective doctor ID."""
    if requested_id:
        return requested_id

    # If current user is doctor, look up their doctor record
    doc = await Doctor.find_one(Doctor.custom_id == str(current_user.id))
    if not doc:
        # Check by email or name
        doc = await Doctor.find_one(Doctor.email == current_user.email)
    if doc:
        return doc.custom_id or str(doc.id)

    # If first doctor in current user's hospital
    if current_user.hospital_id:
        first_doc = await Doctor.find_one(Doctor.hospital_id == current_user.hospital_id)
        if first_doc:
            return first_doc.custom_id or str(first_doc.id)

    # Fallback to any doctor
    any_doc = await Doctor.first_or_none()
    if any_doc:
        return any_doc.custom_id or str(any_doc.id)

    return str(current_user.id)


@router.get("/doctor/profile")
async def get_doctor_profile(
    doctorId: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Fetch profile of authenticated doctor."""
    doc_id = await resolve_doctor_id(current_user, doctorId)
    doctor = await Doctor.find_one(Doctor.custom_id == doc_id)
    if not doctor:
        doctor = await Doctor.get(doc_id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return doctor.dict()


@router.get("/doctor/day-summary")
async def get_day_summary(
    doctorId: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Fetch today's schedule, appointments, and live KPI counters."""
    doc_id = await resolve_doctor_id(current_user, doctorId)
    doctor = await Doctor.find_one(Doctor.custom_id == doc_id)
    if not doctor:
        doctor = await Doctor.get(doc_id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    today = get_today_ist()
    appts = await Appointment.find(Appointment.doctor_id == doc_id).to_list()
    queue = await QueueEntry.find(QueueEntry.doctor_id == doc_id, QueueEntry.queue_date == today).to_list()
    schedule = await DoctorSchedule.find_one(DoctorSchedule.doctor_id == doc_id)

    completed = [a for a in appts if a.status == AppointmentStatus.COMPLETED]
    waiting = [q for q in queue if q.status == QueueStatus.WAITING]
    in_consult = [q for q in queue if q.status in (QueueStatus.IN_CONSULTATION, QueueStatus.CALLED)]
    noshow = [a for a in appts if a.status == AppointmentStatus.NO_SHOW]

    return {
        "doctor": doctor.dict(),
        "appointments": [a.dict() for a in appts],
        "totalToday": len(appts),
        "completedCount": len(completed),
        "waitingCount": len(waiting),
        "inConsultationCount": len(in_consult),
        "noShowCount": len(noshow),
        "avgConsultMinutes": doctor.avg_consult_minutes,
        "slotMinutes": schedule.slot_minutes if schedule else 15,
    }


@router.get("/doctor/queue")
async def get_doctor_queue(
    doctorId: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Fetch live queue entries for doctor."""
    doc_id = await resolve_doctor_id(current_user, doctorId)
    doctor = await Doctor.find_one(Doctor.custom_id == doc_id)
    if not doctor:
        doctor = await Doctor.get(doc_id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    today = get_today_ist()
    all_entries = await QueueEntry.find(
        QueueEntry.doctor_id == doc_id,
        QueueEntry.queue_date == today,
    ).to_list()

    active_entry = next((e for e in all_entries if e.status in (QueueStatus.IN_CONSULTATION, QueueStatus.CALLED)), None)
    waiting_entries = sorted(
        [e for e in all_entries if e.status == QueueStatus.WAITING],
        key=lambda x: (x.priority, x.sort_time or x.created_at),
    )
    completed_today = [e for e in all_entries if e.status == QueueStatus.COMPLETED]

    return {
        "doctor": doctor.dict(),
        "activeEntry": active_entry.dict() if active_entry else None,
        "waitingEntries": [e.dict() for e in waiting_entries],
        "completedToday": [e.dict() for e in completed_today],
    }


@router.post("/consultations/draft")
async def save_consultation_draft(
    payload: ConsultationDraftBody,
    doctorId: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Save or update draft consultation clinical note."""
    doc_id = payload.doctor_id or await resolve_doctor_id(current_user, doctorId)
    now = utcnow()

    note = await ConsultationNote.find_one(ConsultationNote.appointment_id == payload.appointment_id)
    if not note:
        note = ConsultationNote(
            appointment_id=payload.appointment_id,
            doctor_id=doc_id,
            patient_id=payload.patient_id,
            text=payload.text,
            follow_up=payload.follow_up or "none",
            follow_up_date=payload.follow_up_date,
            finalized=payload.finalized or False,
            created_at=now,
            updated_at=now,
        )
        await note.insert()
    else:
        note.text = payload.text
        if payload.follow_up:
            note.follow_up = payload.follow_up
        if payload.follow_up_date:
            note.follow_up_date = payload.follow_up_date
        if payload.finalized is not None:
            note.finalized = payload.finalized
        note.updated_at = now
        await note.save()

    return note.dict()


@router.get("/doctor/availability")
async def get_doctor_availability(
    doctorId: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Get current doctor availability state, recent logs, and upcoming leaves."""
    doc_id = await resolve_doctor_id(current_user, doctorId)
    avail = await DoctorAvailabilityState.find_one(DoctorAvailabilityState.doctor_id == doc_id)
    if not avail:
        avail = DoctorAvailabilityState(
            doctor_id=doc_id,
            status=DoctorAvailabilityStatus.AVAILABLE,
            changed_at=utcnow(),
        )
        await avail.insert()

    recent_logs = await AvailabilityLogEntry.find(
        AvailabilityLogEntry.doctor_id == doc_id
    ).sort("-changed_at").limit(10).to_list()

    upcoming_leaves = await DoctorLeave.find(
        DoctorLeave.doctor_id == doc_id
    ).to_list()

    return {
        "availability": avail.dict(),
        "effectiveStatus": {
            "status": avail.status.value if hasattr(avail.status, "value") else avail.status,
            "lateMinutes": avail.delay_minutes,
            "until": avail.until,
            "reason": avail.reason,
        },
        "recentLogs": [l.dict() for l in recent_logs],
        "upcomingLeaves": [l.dict() for l in upcoming_leaves],
    }


@router.post("/doctor/availability")
async def set_doctor_availability(
    payload: AvailabilityBody,
    doctorId: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Update doctor availability status (triggers recalculation of waiting patient ETAs)."""
    doc_id = await resolve_doctor_id(current_user, doctorId)
    now = utcnow()

    avail = await DoctorAvailabilityState.find_one(DoctorAvailabilityState.doctor_id == doc_id)
    if not avail:
        avail = DoctorAvailabilityState(
            doctor_id=doc_id,
            status=payload.status,
            until=payload.until,
            delay_minutes=payload.delay_minutes or 0,
            reason=payload.reason,
            changed_at=now,
        )
        await avail.insert()
    else:
        avail.status = payload.status
        avail.until = payload.until
        avail.delay_minutes = payload.delay_minutes or 0
        avail.reason = payload.reason
        avail.changed_at = now
        await avail.save()

    # Log the change
    log_entry = AvailabilityLogEntry(
        doctor_id=doc_id,
        status=payload.status,
        reason=payload.reason,
        duration_minutes=payload.delay_minutes,
        changed_at=now,
    )
    await log_entry.insert()

    # Recompute doctor queue with delay offsets
    await recompute_doctor_queue(doc_id)

    # Broadcast availability change over SSE
    await broadcaster.publish(
        channel=f"doctor:{doc_id}",
        event_name="availability_changed",
        data={"status": payload.status, "delay_minutes": payload.delay_minutes, "reason": payload.reason},
    )

    return {"success": True, "affectedCount": 1}


@router.post("/doctor/leaves")
async def add_doctor_leave(
    payload: LeaveCreateBody,
    doctorId: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Schedule upcoming doctor leave and flag affected appointments."""
    doc_id = await resolve_doctor_id(current_user, doctorId)
    doc = await Doctor.find_one(Doctor.custom_id == doc_id)
    if not doc:
        doc = await Doctor.get(doc_id)
    hosp_id = doc.hospital_id if doc else (current_user.hospital_id or "hosp_city_01")

    leave = DoctorLeave(
        doctor_id=doc_id,
        hospital_id=hosp_id,
        date_from=payload.date_from,
        date_to=payload.date_to,
        reason=payload.reason,
        created_at=utcnow(),
    )
    await leave.insert()

    # Flag appointments falling within the leave range as needs_reschedule
    affected_appts = await Appointment.find(
        Appointment.doctor_id == doc_id,
        Appointment.status == AppointmentStatus.BOOKED,
    ).to_list()

    affected_count = 0
    for a in affected_appts:
        appt_date = a.scheduled_start.strftime("%Y-%m-%d")
        if payload.date_from <= appt_date <= payload.date_to:
            a.needs_reschedule = True
            await a.save()
            affected_count += 1

    return {"success": True, "affectedCount": affected_count, "leave_id": str(leave.id)}


@router.delete("/doctor/leaves/{id}")
async def cancel_doctor_leave(
    id: str,
    doctorId: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Cancel an upcoming scheduled doctor leave."""
    leave = await DoctorLeave.get(id)
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave record not found")

    await leave.delete()
    return {"success": True}
