"""Queue Router & Real-Time SSE Streams."""
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.core.sse import broadcaster
from app.models.accounts import User
from app.models.booking import Appointment, QueueEntry
from app.models.common import Role
from app.services.queue_service import (
    call_again,
    call_next_patient,
    change_entry_priority,
    check_in_patient,
    complete_consultation,
    emergency_insert,
    mark_no_show,
    skip_patient,
    start_consultation,
)

router = APIRouter(prefix="/queue", tags=["Queue"])


class CheckInBody(BaseModel):
    appointment_id: str


class CallNextBody(BaseModel):
    doctor_id: str
    room: Optional[str] = None


class CallAgainBody(BaseModel):
    entry_id: Optional[str] = None
    doctor_id: Optional[str] = None
    room: Optional[str] = None


class EntryActionBody(BaseModel):
    entry_id: str
    reason: Optional[str] = None
    consult_minutes: Optional[float] = None


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


@router.get("/{appointment_id}")
async def get_queue_status(appointment_id: str):
    """Get live queue position, ETA, and status for an appointment."""
    entry = await QueueEntry.find_one(QueueEntry.appointment_id == appointment_id)
    if not entry:
        appt = await Appointment.get(appointment_id)
        if not appt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        return {
            "appointment_id": appointment_id,
            "status": appt.status,
            "token": appt.token,
            "position": None,
            "eta_minutes": None,
        }
    return to_queue_response(entry)


@router.post("/check-in")
async def check_in(
    payload: CheckInBody,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Check in patient at kiosk or desk."""
    entry = await check_in_patient(payload.appointment_id)
    appt = await Appointment.get(payload.appointment_id)
    return {
        "success": True,
        "queue_entry": to_queue_response(entry),
        "appointment": appt.dict() if appt else None,
        "token": entry.token,
    }


@router.post("/call-next")
async def call_next(
    payload: CallNextBody,
    current_user: User = Depends(get_current_user),
):
    """Call the next waiting patient in line."""
    entry = await call_next_patient(doctor_id=payload.doctor_id, room=payload.room)
    if not entry:
        return {"success": False, "message": "No patients currently waiting in queue."}
    return {"success": True, "queue_entry": to_queue_response(entry)}


@router.post("/call-again")
async def recall_patient(
    payload: CallAgainBody,
    current_user: User = Depends(get_current_user),
):
    """Call a patient again."""
    if not payload.entry_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="entry_id is required")
    entry = await call_again(entry_id=payload.entry_id, room=payload.room)
    return {"success": True, "queue_entry": to_queue_response(entry)}


@router.post("/start")
@router.post("/start-consultation")
async def start_consult(
    payload: EntryActionBody,
    current_user: User = Depends(get_current_user),
):
    """Mark consultation as started."""
    entry = await start_consultation(entry_id=payload.entry_id)
    return {"success": True, "queue_entry": to_queue_response(entry)}


@router.post("/complete")
async def finish_consult(
    payload: EntryActionBody,
    current_user: User = Depends(get_current_user),
):
    """Mark consultation as completed, updating doctor rolling average."""
    entry = await complete_consultation(entry_id=payload.entry_id, consult_minutes=payload.consult_minutes)
    return {"success": True, "queue_entry": to_queue_response(entry)}


@router.post("/skip")
async def skip(
    payload: EntryActionBody,
    current_user: User = Depends(get_current_user),
):
    """Skip patient and push them down in priority."""
    entry = await skip_patient(entry_id=payload.entry_id, reason=payload.reason)
    return {"success": True, "queue_entry": to_queue_response(entry)}


@router.post("/no-show")
async def no_show(
    payload: EntryActionBody,
    current_user: User = Depends(get_current_user),
):
    """Mark patient as no-show."""
    entry = await mark_no_show(entry_id=payload.entry_id)
    return {"success": True, "queue_entry": to_queue_response(entry)}


@router.patch("/{entry_id}/priority")
async def update_priority(
    entry_id: str,
    payload: PriorityBody,
    current_user: User = Depends(get_current_user),
):
    """Update priority for a queue entry (0 emergency, 1 priority, 2 normal)."""
    entry = await change_entry_priority(entry_id=entry_id, priority=payload.priority)
    return {"success": True, "queue_entry": to_queue_response(entry)}


@router.post("/emergency-insert")
async def emergency_add(
    payload: EmergencyInsertBody,
    current_user: User = Depends(get_current_user),
):
    """Insert an emergency patient at top of queue immediately."""
    entry = await emergency_insert(
        doctor_id=payload.doctor_id,
        patient_name=payload.patient_name,
        reason=payload.reason,
    )
    return {"success": True, "queue_entry": to_queue_response(entry)}
