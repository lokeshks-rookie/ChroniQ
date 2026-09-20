"""Transactional Appointment Booking, Reschedule, and Cancellation Service."""
from datetime import datetime, timezone
import random
import string
from typing import Optional
from fastapi import HTTPException, status

from app.core.db import get_client
from app.models.accounts import FamilyMember, User
from app.models.booking import Appointment, PatientSnapshot, QueueEntry, StatusEvent
from app.models.common import AppointmentStatus, AppointmentType, CreatedVia, QueueStatus, SlotStatus, utcnow
from app.models.hospitals import Department, Doctor, Hospital
from app.models.scheduling import Slot


def generate_booking_code() -> str:
    """Generate human-friendly booking code like 'APT-7K3Q9'."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"APT-{suffix}"


async def confirm_booking(
    user_id: str,
    doctor_id: str,
    slot_id: str,
    patient_name: Optional[str] = None,
    family_member_id: Optional[str] = None,
    reason: Optional[str] = None,
    symptoms_note: Optional[str] = None,
    created_via: CreatedVia = CreatedVia.WEB,
) -> Appointment:
    """Confirm a held slot into a booked appointment."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    slot = await Slot.get(slot_id)
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")

    now = utcnow()
    if slot.status != SlotStatus.HELD or (slot.held_until and slot.held_until < now):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Slot is no longer held. Please select and hold a slot again."
        )

    if slot.held_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not hold this slot. Please select and hold an open slot to book.",
        )

    # Doctor details
    from bson import ObjectId
    doctor = await Doctor.find_one(Doctor.custom_id == doctor_id)
    if not doctor and ObjectId.is_valid(doctor_id):
        doctor = await Doctor.get(doctor_id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # Hospital & Department details
    hospital = await Hospital.find_one(Hospital.custom_id == doctor.hospital_id)
    if not hospital and ObjectId.is_valid(doctor.hospital_id):
        hospital = await Hospital.get(doctor.hospital_id)
    hospital_name = hospital.name if hospital else "Hospital"

    department = await Department.find_one(Department.custom_id == doctor.department_id)
    if not department and ObjectId.is_valid(doctor.department_id):
        department = await Department.get(doctor.department_id)
    department_name = department.name if department else "General"

    # Patient Snapshot
    snapshot_name = patient_name or user.name
    snapshot_age = user.age
    snapshot_gender = user.gender

    if family_member_id:
        fm = await FamilyMember.get(family_member_id)
        if fm and str(fm.user_id) == user_id:
            snapshot_name = fm.name
            snapshot_age = fm.age
            snapshot_gender = fm.gender

    patient_snapshot = PatientSnapshot(
        name=snapshot_name,
        age=snapshot_age,
        gender=snapshot_gender,
        phone=user.phone,
    )

    booking_code = generate_booking_code()

    # Create Appointment
    appointment = Appointment(
        booking_code=booking_code,
        patient_id=user_id,
        family_member_id=family_member_id,
        patient=patient_snapshot,
        hospital_id=doctor.hospital_id,
        department_id=doctor.department_id,
        doctor_id=doctor_id,
        slot_id=slot_id,
        hospital_name=hospital_name,
        doctor_name=doctor.name,
        department_name=department_name,
        scheduled_start=slot.start,
        scheduled_end=slot.end,
        type=AppointmentType.BOOKED,
        reason=reason,
        symptoms_note=symptoms_note,
        fee=doctor.fee,
        status=AppointmentStatus.BOOKED,
        status_history=[
            StatusEvent(
                status=AppointmentStatus.BOOKED,
                at=now,
                by=user_id,
                note="Booked via portal",
            )
        ],
        created_via=created_via,
    )

    # Atomic conditional update on slot: must match held_by == user_id and status == HELD
    slot_collection = Slot.get_pymongo_collection()
    slot_oid = ObjectId(slot_id) if ObjectId.is_valid(slot_id) else None
    id_filter = {"$or": [{"_id": slot_oid}, {"_id": slot_id}]} if slot_oid else {"_id": slot_id}

    filter_cond = {
        "$and": [
            id_filter,
            {"status": SlotStatus.HELD.value, "held_by": user_id},
        ]
    }
    update_doc = {
        "$set": {
            "status": SlotStatus.BOOKED.value,
            "appointment_id": str(appointment.id),
        }
    }
    updated_slot = await slot_collection.find_one_and_update(filter_cond, update_doc)
    if not updated_slot:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Slot reservation could not be confirmed. It may have expired or been modified.",
        )

    await appointment.insert()
    return appointment


async def cancel_appointment(appointment_id: str, user_id: str, reason: Optional[str] = None) -> Appointment:
    """Cancel an appointment and free its slot."""
    appointment = await Appointment.get(appointment_id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if appointment.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment cannot be cancelled")

    now = utcnow()
    appointment.status = AppointmentStatus.CANCELLED
    appointment.cancelled_reason = reason or "Cancelled by user"
    appointment.status_history.append(
        StatusEvent(status=AppointmentStatus.CANCELLED, at=now, by=user_id, note=reason)
    )
    appointment.updated_at = now
    await appointment.save()

    # Free the slot
    if appointment.slot_id:
        slot = await Slot.get(appointment.slot_id)
        if slot and slot.status == SlotStatus.BOOKED:
            slot.status = SlotStatus.OPEN
            slot.held_by = None
            slot.held_until = None
            slot.appointment_id = None
            await slot.save()

    # Cancel any queue entry
    q_entry = await QueueEntry.find_one(QueueEntry.appointment_id == appointment_id)
    if q_entry:
        q_entry.status = QueueStatus.CANCELLED
        await q_entry.save()

    return appointment
