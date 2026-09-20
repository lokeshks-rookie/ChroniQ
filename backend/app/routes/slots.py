"""Doctor Slots and Slot Hold Routes."""
from datetime import datetime, time, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.models.accounts import User
from app.models.common import SlotStatus, utcnow
from app.models.scheduling import Slot
from app.schemas.booking import SlotHoldResponse, SlotResponse
from app.services.slot_service import generate_slots_for_doctor, hold_slot

router = APIRouter(tags=["Slots"])


def _to_slot_response(s: Slot) -> SlotResponse:
    return SlotResponse(
        id=str(s.id),
        doctor_id=s.doctor_id,
        hospital_id=s.hospital_id,
        department_id=s.department_id,
        start=s.start,
        end=s.end,
        status=s.status,
        held_by=s.held_by,
        held_until=s.held_until,
        appointment_id=s.appointment_id,
    )


@router.get("/doctors/{id}/slots", response_model=List[SlotResponse])
async def get_doctor_slots(
    id: str,
    date: str = Query(..., description="Target date in YYYY-MM-DD format"),
):
    """Retrieve bookable slots for a doctor on a given date."""
    try:
        parts = [int(p) for p in date.split("-")]
        target_date = datetime(parts[0], parts[1], parts[2]).date()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD.")

    start_of_day = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
    end_of_day = datetime.combine(target_date, time.max, tzinfo=timezone.utc)

    # Ensure slots are generated for this window
    await generate_slots_for_doctor(id, days=14)

    slots = await Slot.find(
        Slot.doctor_id == id,
        Slot.start >= start_of_day,
        Slot.start <= end_of_day,
    ).sort([("start", 1)]).to_list()

    # Normalize expired holds
    now = utcnow()
    for s in slots:
        if s.status == SlotStatus.HELD and s.held_until and s.held_until < now:
            s.status = SlotStatus.OPEN

    return [_to_slot_response(s) for s in slots]


@router.post("/slots/{id}/hold", response_model=SlotHoldResponse)
async def hold_slot_endpoint(
    id: str,
    current_user: User = Depends(get_current_user),
):
    """Lock a slot for 5 minutes during checkout to prevent double booking."""
    settings = get_settings()
    slot = await hold_slot(slot_id=id, user_id=str(current_user.id))
    if not slot or not slot.held_until:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This slot is no longer available. Please choose another time slot.",
        )

    held_dt = slot.held_until
    if held_dt.tzinfo is None:
        held_dt = held_dt.replace(tzinfo=timezone.utc)
    remaining_seconds = max(0, int((held_dt - utcnow()).total_seconds()))
    return SlotHoldResponse(
        slot_id=str(slot.id),
        held_until=held_dt,
        expires_in_seconds=remaining_seconds,
    )
