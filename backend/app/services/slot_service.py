"""Slot Generation, Holding, and Expiry Service."""
from datetime import datetime, time, timedelta, timezone
import logging
from typing import List, Optional

from app.core.config import get_settings
from app.models.common import SlotStatus, utcnow
from app.models.hospitals import Doctor
from app.models.scheduling import DoctorLeave, DoctorSchedule, Slot

logger = logging.getLogger("chroniq.slots")


def _parse_time(time_str: str) -> time:
    """Parse 'HH:MM' string into datetime.time object."""
    parts = [int(p) for p in time_str.split(":")]
    return time(hour=parts[0], minute=parts[1])


async def generate_slots_for_doctor(doctor_id: str, days: int = 14) -> int:
    """Generate bookable slots for a doctor over the rolling window."""
    schedule = await DoctorSchedule.find_one(DoctorSchedule.doctor_id == doctor_id)
    if not schedule or not schedule.weekly:
        return 0

    doctor = await Doctor.find_one(Doctor.custom_id == doctor_id)
    if not doctor:
        doctor = await Doctor.get(doctor_id)
    if not doctor or not doctor.is_active:
        return 0

    leaves = await DoctorLeave.find(DoctorLeave.doctor_id == doctor_id).to_list()

    now = datetime.now(timezone.utc)
    slots_created = 0
    slot_delta = timedelta(minutes=schedule.slot_minutes)

    existing_slots = await Slot.find(Slot.doctor_id == doctor_id, Slot.start >= now).to_list()
    existing_starts = set(s.start if s.start.tzinfo else s.start.replace(tzinfo=timezone.utc) for s in existing_slots)

    new_slots_to_insert = []

    for day_offset in range(days):
        target_date = (now + timedelta(days=day_offset)).date()
        weekday = target_date.weekday()

        rule = next((r for r in schedule.weekly if r.weekday == weekday), None)
        if not rule:
            continue

        start_t = _parse_time(rule.start)
        end_t = _parse_time(rule.end)

        shift_start = datetime.combine(target_date, start_t, tzinfo=timezone.utc)
        shift_end = datetime.combine(target_date, end_t, tzinfo=timezone.utc)

        current_slot_start = shift_start
        while current_slot_start + slot_delta <= shift_end:
            current_slot_end = current_slot_start + slot_delta

            # Check if slot overlaps any break
            in_break = False
            for b in rule.breaks:
                b_start = datetime.combine(target_date, _parse_time(b.start), tzinfo=timezone.utc)
                b_end = datetime.combine(target_date, _parse_time(b.end), tzinfo=timezone.utc)
                if max(current_slot_start, b_start) < min(current_slot_end, b_end):
                    in_break = True
                    break

            # Check if slot overlaps doctor leave
            on_leave = False
            for leave in leaves:
                l_from = leave.date_from if leave.date_from.tzinfo else leave.date_from.replace(tzinfo=timezone.utc)
                l_to = leave.date_to if leave.date_to.tzinfo else leave.date_to.replace(tzinfo=timezone.utc)
                if max(current_slot_start, l_from) < min(current_slot_end, l_to):
                    on_leave = True
                    break

            if not in_break and not on_leave and current_slot_start > now:
                if current_slot_start not in existing_starts:
                    new_slots_to_insert.append(
                        Slot(
                            doctor_id=doctor_id,
                            hospital_id=doctor.hospital_id,
                            department_id=doctor.department_id,
                            start=current_slot_start,
                            end=current_slot_end,
                            status=SlotStatus.OPEN,
                        )
                    )
                    existing_starts.add(current_slot_start)

            current_slot_start = current_slot_end

    if new_slots_to_insert:
        try:
            await Slot.insert_many(new_slots_to_insert)
            slots_created = len(new_slots_to_insert)
        except Exception:
            # Fallback to single inserts if batch unique error occurs
            for s in new_slots_to_insert:
                try:
                    await s.insert()
                    slots_created += 1
                except Exception:
                    pass

    return slots_created


async def hold_slot(slot_id: str, user_id: str) -> Optional[Slot]:
    """Atomically hold a slot for 5 minutes. Free or expired slots can be held."""
    from bson import ObjectId
    from pymongo import ReturnDocument

    settings = get_settings()
    now = utcnow()
    hold_until = now + timedelta(minutes=settings.SLOT_HOLD_MINUTES)

    slot_oid = ObjectId(slot_id) if ObjectId.is_valid(slot_id) else None
    id_filter = {"$or": [{"_id": slot_oid}, {"_id": slot_id}]} if slot_oid else {"_id": slot_id}

    # Atomic condition: slot is OPEN, expired HELD, or re-held by same user
    filter_condition = {
        "$and": [
            id_filter,
            {
                "$or": [
                    {"status": SlotStatus.OPEN.value},
                    {"status": SlotStatus.HELD.value, "held_until": {"$lt": now}},
                    {"status": SlotStatus.HELD.value, "held_by": user_id},
                ]
            },
        ]
    }
    update_doc = {
        "$set": {
            "status": SlotStatus.HELD.value,
            "held_by": user_id,
            "held_until": hold_until,
        }
    }

    collection = Slot.get_pymongo_collection()
    updated_raw = await collection.find_one_and_update(
        filter_condition,
        update_doc,
        return_document=ReturnDocument.AFTER,
    )

    if not updated_raw:
        return None

    return await Slot.get(slot_id)


async def release_slot(slot_id: str, user_id: str) -> bool:
    """Release a held slot back to OPEN if held by this user."""
    from bson import ObjectId

    slot_oid = ObjectId(slot_id) if ObjectId.is_valid(slot_id) else None
    id_filter = {"$or": [{"_id": slot_oid}, {"_id": slot_id}]} if slot_oid else {"_id": slot_id}

    filter_condition = {
        "$and": [
            id_filter,
            {"status": SlotStatus.HELD.value, "held_by": user_id},
        ]
    }
    update_doc = {
        "$set": {
            "status": SlotStatus.OPEN.value,
            "held_by": None,
            "held_until": None,
        }
    }
    collection = Slot.get_pymongo_collection()
    res = await collection.find_one_and_update(filter_condition, update_doc)
    return res is not None


async def release_expired_holds() -> int:
    """Release all expired holds back to OPEN."""
    now = utcnow()
    expired = await Slot.find(
        Slot.status == SlotStatus.HELD,
        Slot.held_until < now,
    ).to_list()

    count = 0
    for slot in expired:
        slot.status = SlotStatus.OPEN
        slot.held_by = None
        slot.held_until = None
        await slot.save()
        count += 1

    return count
