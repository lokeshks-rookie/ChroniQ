"""Queue Router & Real-Time SSE Streams."""
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.dependencies import get_current_user, get_optional_user, require_roles
from app.core.sse import broadcaster
from app.models.accounts import User
from app.models.booking import Appointment, QueueEntry
from app.models.common import QueueStatus, Role
from app.services.queue_service import (
    call_again,
    call_next_patient,
    change_entry_priority,
    check_in_patient,
    complete_consultation,
    emergency_insert,
    get_doctor,
    mark_no_show,
    skip_patient,
    start_consultation,
)

router = APIRouter(prefix="/queue", tags=["Queue"])


class CheckInBody(BaseModel):
    appointment_id: Optional[str] = None
    booking_code: Optional[str] = None


class CallNextBody(BaseModel):
    doctor_id: str
    room: Optional[str] = None


class CallAgainBody(BaseModel):
    entry_id: Optional[str] = None
    doctor_id: Optional[str] = None
    room: Optional[str] = None


class EntryActionBody(BaseModel):
    entry_id: Optional[str] = None
    doctor_id: Optional[str] = None
    reason: Optional[str] = None
    consult_minutes: Optional[float] = None
    duration_minutes: Optional[float] = None


class PriorityBody(BaseModel):
    priority: int


class EmergencyInsertBody(BaseModel):
    doctor_id: str
    patient_name: str
    reason: str


def to_queue_response(entry: Optional[QueueEntry]) -> Optional[dict]:
    if not entry:
        return None
    return {
        "id": str(entry.id),
        "appointment_id": entry.appointment_id,
        "hospital_id": entry.hospital_id,
        "department_id": entry.department_id,
        "doctor_id": entry.doctor_id,
        "queue_date": entry.queue_date,
        "token": entry.token,
        "token_number": entry.token_number,
        "priority": entry.priority,
        "status": entry.status,
        "position": entry.position,
        "eta_minutes": entry.eta_minutes,
        "call_count": entry.call_count,
        "skip_count": entry.skip_count,
        "is_late_arrival": entry.is_late_arrival,
        "checked_in_at": entry.checked_in_at,
        "called_at": entry.called_at,
        "started_at": entry.started_at,
        "completed_at": entry.completed_at,
        "consult_minutes": entry.consult_minutes,
    }


@router.get("/stream")
async def queue_event_stream(
    channel: str = Query(..., description="e.g. patient:{id}, doctor:{id}, department:{id}, hospital:{id}")
):
    """Server-Sent Events endpoint for real-time queue notifications & display boards."""
    async def sse_generator():
        queue = await broadcaster.subscribe(channel)
        try:
            # Yield initial keep-alive ping
            yield "event: ping\ndata: connected\n\n"
            while True:
                data = await queue.get()
                yield data
        except asyncio.CancelledError:
            pass
        finally:
            await broadcaster.unsubscribe(channel, queue)

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{hospital_id}/{department_id}")
async def get_department_queue(
    hospital_id: str,
    department_id: str,
    date: Optional[str] = Query(None),
):
    """Get active live queue tokens for a hospital department."""
    from app.services.queue_service import get_today_ist
    target_date = date or get_today_ist()
    entries = await QueueEntry.find(
        QueueEntry.hospital_id == hospital_id,
        QueueEntry.department_id == department_id,
        QueueEntry.queue_date == target_date,
    ).sort([("status", 1), ("token_number", 1)]).to_list()
    return {
        "hospital_id": hospital_id,
        "department_id": department_id,
        "date": target_date,
        "total_entries": len(entries),
        "entries": [to_queue_response(e) for e in entries],
    }


@router.get("/entry/{appointment_id}")
@router.get("/{appointment_id}")
async def get_queue_status(appointment_id: str):
    """Get live queue position, ETA, and status for an appointment or queue entry."""
    entry = await QueueEntry.find_one(QueueEntry.appointment_id == appointment_id)
    if not entry:
        from bson import ObjectId
        if ObjectId.is_valid(appointment_id):
            entry = await QueueEntry.get(appointment_id)
    if not entry:
        appt = await Appointment.get(appointment_id)
        if not appt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment or queue entry not found")
        return {
            "appointment_id": appointment_id,
            "status": appt.status,
            "token": appt.token,
            "position": None,
            "eta_minutes": None,
        }
    return to_queue_response(entry)


async def _resolve_queue_entry(payload: EntryActionBody, target_statuses: Optional[List[QueueStatus]] = None) -> QueueEntry:
    if payload.entry_id:
        entry = await QueueEntry.get(payload.entry_id)
        if entry:
            return entry

    if payload.doctor_id:
        from app.services.queue_service import get_today_ist
        today = get_today_ist()
        query = {"doctor_id": payload.doctor_id, "queue_date": today}
        if target_statuses:
            status_vals = [s.value if hasattr(s, "value") else str(s) for s in target_statuses]
            query["status"] = {"$in": status_vals}
        entry = await QueueEntry.find_one(query)
        if entry:
            return entry

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")


@router.post("/check-in")
async def check_in(
    payload: CheckInBody,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Check in patient at kiosk or desk."""
    appt = None
    appt_id = payload.appointment_id
    if not appt_id and payload.booking_code:
        appt = await Appointment.find_one(Appointment.booking_code == payload.booking_code)
        if not appt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found for booking code")
        appt_id = str(appt.id)
    elif appt_id:
        appt = await Appointment.get(appt_id)
        if not appt:
            appt = await Appointment.find_one(Appointment.booking_code == appt_id)
            if appt:
                appt_id = str(appt.id)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="appointment_id or booking_code is required")

    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Authorization checks
    if current_user:
        if current_user.role == Role.PATIENT and appt.patient_id != str(current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot check in another patient's appointment")
        if current_user.role in (Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.DOCTOR):
            if current_user.hospital_id and appt.hospital_id != current_user.hospital_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot check in appointment belonging to another hospital")

    entry = await check_in_patient(appt_id)
    return {
        "success": True,
        "queue_entry": to_queue_response(entry),
        "appointment": appt.dict(),
        "token": entry.token,
    }


@router.post("/call-next")
async def call_next(
    payload: CallNextBody,
    current_user: User = Depends(require_roles(Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Call the next waiting patient in line."""
    doctor = await get_doctor(payload.doctor_id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    if current_user.role in (Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.DOCTOR):
        if current_user.hospital_id and doctor.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Doctor belongs to another hospital")

    entry = await call_next_patient(doctor_id=payload.doctor_id, room=payload.room)
    if not entry:
        return {"success": False, "message": "No patients currently waiting in queue."}
    return {"success": True, "queue_entry": to_queue_response(entry)}


@router.post("/call-again")
async def recall_patient(
    payload: CallAgainBody,
    current_user: User = Depends(require_roles(Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Call a patient again."""
    entry_id = payload.entry_id
    if not entry_id and payload.doctor_id:
        entry = await _resolve_queue_entry(EntryActionBody(doctor_id=payload.doctor_id), target_statuses=[QueueStatus.CALLED])
        entry_id = str(entry.id)
    if not entry_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="entry_id or doctor_id is required")

    entry = await QueueEntry.get(entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    if current_user.role in (Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.DOCTOR):
        if current_user.hospital_id and entry.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's queue entry")

    updated = await call_again(entry_id=entry_id, room=payload.room)
    return {"success": True, "queue_entry": to_queue_response(updated)}


@router.post("/start")
@router.post("/start-consultation")
async def start_consult(
    payload: EntryActionBody,
    current_user: User = Depends(require_roles(Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Mark consultation as started."""
    entry = await _resolve_queue_entry(payload, target_statuses=[QueueStatus.CALLED, QueueStatus.WAITING, QueueStatus.IN_CONSULTATION])

    if current_user.role in (Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.DOCTOR):
        if current_user.hospital_id and entry.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's queue entry")

    updated = await start_consultation(entry_id=str(entry.id))
    return {"success": True, "queue_entry": to_queue_response(updated)}


@router.post("/complete")
async def finish_consult(
    payload: EntryActionBody,
    current_user: User = Depends(require_roles(Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Mark consultation as completed, updating doctor rolling average."""
    entry = await _resolve_queue_entry(payload, target_statuses=[QueueStatus.IN_CONSULTATION, QueueStatus.CALLED])

    if current_user.role in (Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.DOCTOR):
        if current_user.hospital_id and entry.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's queue entry")

    consult_mins = payload.duration_minutes if payload.duration_minutes is not None else payload.consult_minutes
    updated = await complete_consultation(entry_id=str(entry.id), consult_minutes=consult_mins)
    return {"success": True, "queue_entry": to_queue_response(updated)}


@router.post("/skip")
async def skip(
    payload: EntryActionBody,
    current_user: User = Depends(require_roles(Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Skip patient and push them down in priority."""
    entry = await _resolve_queue_entry(payload, target_statuses=[QueueStatus.CALLED, QueueStatus.WAITING])

    if current_user.role in (Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.DOCTOR):
        if current_user.hospital_id and entry.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's queue entry")

    updated = await skip_patient(entry_id=str(entry.id), reason=payload.reason)
    return {"success": True, "queue_entry": to_queue_response(updated)}


@router.post("/no-show")
async def no_show(
    payload: EntryActionBody,
    current_user: User = Depends(require_roles(Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Mark patient as no-show."""
    entry = await _resolve_queue_entry(payload, target_statuses=[QueueStatus.CALLED, QueueStatus.WAITING])

    if current_user.role in (Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.DOCTOR):
        if current_user.hospital_id and entry.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's queue entry")

    updated = await mark_no_show(entry_id=str(entry.id))
    return {"success": True, "queue_entry": to_queue_response(updated)}


@router.patch("/{entry_id}/priority")
async def update_priority(
    entry_id: str,
    payload: PriorityBody,
    current_user: User = Depends(require_roles(Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Update priority for a queue entry (0 emergency, 1 priority, 2 normal)."""
    entry = await QueueEntry.get(entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    if current_user.role in (Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.DOCTOR):
        if current_user.hospital_id and entry.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's queue entry")

    updated = await change_entry_priority(entry_id=entry_id, priority=payload.priority)
    return {"success": True, "queue_entry": to_queue_response(updated)}


@router.post("/emergency-insert")
async def emergency_add(
    payload: EmergencyInsertBody,
    current_user: User = Depends(require_roles(Role.DOCTOR, Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Insert an emergency patient at top of queue immediately."""
    doctor = await get_doctor(payload.doctor_id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    if current_user.role in (Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.DOCTOR):
        if current_user.hospital_id and doctor.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Doctor belongs to another hospital")

    entry = await emergency_insert(
        doctor_id=payload.doctor_id,
        patient_name=payload.patient_name,
        reason=payload.reason,
    )
    return {"success": True, "queue_entry": to_queue_response(entry)}
