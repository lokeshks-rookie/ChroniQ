"""Transactional Appointment Booking, Reschedule, and Cancellation Service."""
from datetime import datetime, timezone
import logging
import random
import string
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status

from app.core.db import get_client
from app.models.accounts import FamilyMember, User
from app.models.booking import Appointment, PatientSnapshot, QueueEntry, StatusEvent
from app.models.common import AppointmentStatus, AppointmentType, CreatedVia, QueueStatus, Role, SlotStatus, utcnow, ensure_utc
from app.models.hospitals import Department, Doctor, Hospital
from app.models.scheduling import Slot

logger = logging.getLogger("chroniq.booking")


def generate_booking_code() -> str:
    """Generate human-friendly booking code like 'APT-7K3Q9'."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"APT-{suffix}"


async def confirm_booking(
    user_id: str,
    doctor_id: str,
    slot_id: str,
    caller_role: Role = Role.PATIENT,
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
    held_until = ensure_utc(slot.held_until)
    if slot.status != SlotStatus.HELD or (held_until and held_until < now):
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

    # Patient Snapshot derivation (GAP-7)
    if family_member_id:
        fm = await FamilyMember.get(family_member_id)
        if not fm or str(fm.user_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or unauthorized family member ID.",
            )
        snapshot_name = fm.name
        snapshot_age = fm.age
        snapshot_gender = fm.gender
    else:
        if caller_role == Role.PATIENT:
            # Patients cannot override their account identity with arbitrary names
            if patient_name and patient_name.strip() != user.name.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Arbitrary patient identity overrides are not permitted for patient accounts.",
                )
            snapshot_name = user.name
            snapshot_age = user.age
            snapshot_gender = user.gender
        else:
            # Authorized staff assisted booking
            snapshot_name = patient_name or user.name
            snapshot_age = user.age
            snapshot_gender = user.gender

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


async def reschedule_appointment_service(
    appointment_id: str,
    user_id: str,
    caller_role: Role,
    new_slot_id: str,
    caller_hospital_id: Optional[str] = None,
    reason: Optional[str] = None,
) -> Appointment:
    """Safely and consistently reschedule an appointment (GAP-6).

    Enforces ownership, status validity, hold rules, and atomic database consistency
    using MongoDB multi-document transactions when supported, with conditional update + compensation
    rollback fallback for standalone/mock topologies.
    """
    apt = await Appointment.get(appointment_id)
    if not apt:
        apt = await Appointment.find_one(Appointment.booking_code == appointment_id)
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Authorization
    if caller_role == Role.PATIENT and apt.patient_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden: You can only reschedule your own appointments")

    if caller_role in (Role.HOSPITAL_ADMIN, Role.RECEPTIONIST, Role.DOCTOR):
        if caller_hospital_id and apt.hospital_id != caller_hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hospital mismatch: Cannot reschedule appointment of another hospital",
            )

    # Status eligibility: only BOOKED appointments can be rescheduled
    if apt.status != AppointmentStatus.BOOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reschedule an appointment with status '{apt.status.value}'. Only booked appointments can be rescheduled.",
        )

    if not new_slot_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="new_slot_id is required for rescheduling")

    new_slot = await Slot.get(new_slot_id)
    if not new_slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New slot not found")

    # Hospital & Doctor validation
    if new_slot.hospital_id != apt.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital mismatch: Cannot reschedule to a slot at a different hospital.",
        )
    if new_slot.doctor_id != apt.doctor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor mismatch: Cannot reschedule to a slot with a different doctor.",
        )

    # Availability & Hold enforcement
    now = utcnow()
    held_until = ensure_utc(new_slot.held_until)
    if caller_role == Role.PATIENT:
        if new_slot.status != SlotStatus.HELD or (held_until and held_until < now):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot is no longer held or hold has expired. Please select and hold an open slot before rescheduling.",
            )
        if new_slot.held_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not hold this slot. Please select and hold an open slot to reschedule.",
            )
    else:
        # Staff: cannot steal another user's active hold
        if new_slot.status == SlotStatus.HELD and new_slot.held_by != user_id and held_until and held_until >= now:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This slot is currently held by another user.",
            )
        if new_slot.status not in (SlotStatus.OPEN, SlotStatus.HELD):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="New slot is already booked")

    # Prepare IDs and filters
    slot_collection = Slot.get_pymongo_collection()
    appt_collection = Appointment.get_pymongo_collection()
    old_slot_id = apt.slot_id

    slot_oid = ObjectId(new_slot_id) if ObjectId.is_valid(new_slot_id) else None
    new_id_filter = {"$or": [{"_id": slot_oid}, {"_id": new_slot_id}]} if slot_oid else {"_id": new_slot_id}

    appt_oid = ObjectId(str(apt.id)) if ObjectId.is_valid(str(apt.id)) else None
    appt_id_filter = {"$or": [{"_id": appt_oid}, {"_id": str(apt.id)}]} if appt_oid else {"_id": str(apt.id)}

    new_event = StatusEvent(
        status=AppointmentStatus.RESCHEDULED,
        at=now,
        by=user_id,
        note=reason or "Rescheduled",
    )
    event_dict = new_event.model_dump() if hasattr(new_event, "model_dump") else new_event.dict()

    # Determine if client supports MongoDB transactions
    client = get_client()
    session = None
    use_transaction = False
    if client:
        try:
            session = await client.start_session()
            session.start_transaction()
            use_transaction = True
        except Exception as e:
            logger.info(f"MongoDB transactions not supported by deployment ({e}); using atomic conditional updates with rollback compensation.")
            if session:
                try:
                    await session.end_session()
                except Exception:
                    pass
                session = None
            use_transaction = False

    if use_transaction and session:
        try:
            # 1. Claim new slot within transaction
            if caller_role == Role.PATIENT:
                claim_filter = {
                    "$and": [
                        new_id_filter,
                        {"status": SlotStatus.HELD.value, "held_by": user_id},
                    ]
                }
            else:
                claim_filter = {
                    "$and": [
                        new_id_filter,
                        {"status": {"$in": [SlotStatus.OPEN.value, SlotStatus.HELD.value]}},
                    ]
                }
            claim_res = await slot_collection.find_one_and_update(
                claim_filter,
                {"$set": {"status": SlotStatus.BOOKED.value, "appointment_id": str(apt.id), "held_by": None, "held_until": None}},
                session=session,
            )
            if not claim_res:
                await session.abort_transaction()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Destination slot could not be secured. It may have expired or been claimed concurrently.",
                )

            # 2. Update appointment within transaction (optimistic concurrency guard)
            appt_filter = {
                "$and": [
                    appt_id_filter,
                    {"status": AppointmentStatus.BOOKED.value, "slot_id": old_slot_id},
                ]
            }
            appt_update_res = await appt_collection.find_one_and_update(
                appt_filter,
                {
                    "$set": {
                        "slot_id": new_slot_id,
                        "scheduled_start": new_slot.start,
                        "scheduled_end": new_slot.end,
                        "rescheduled_from": old_slot_id,
                        "needs_reschedule": False,
                        "updated_at": now,
                    },
                    "$push": {"status_history": event_dict},
                },
                session=session,
            )
            if not appt_update_res:
                await session.abort_transaction()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Appointment was modified concurrently. Please refresh and try again.",
                )

            # 3. Free old slot within transaction
            if old_slot_id:
                old_oid = ObjectId(old_slot_id) if ObjectId.is_valid(old_slot_id) else None
                old_id_filter = {"$or": [{"_id": old_oid}, {"_id": old_slot_id}]} if old_oid else {"_id": old_slot_id}
                await slot_collection.find_one_and_update(
                    {
                        "$and": [
                            old_id_filter,
                            {"appointment_id": str(apt.id)},
                        ]
                    },
                    {
                        "$set": {
                            "status": SlotStatus.OPEN.value,
                            "held_by": None,
                            "held_until": None,
                            "appointment_id": None,
                        }
                    },
                    session=session,
                )

            await session.commit_transaction()
        except HTTPException:
            if session.in_transaction:
                await session.abort_transaction()
            raise
        except Exception as tx_err:
            if session.in_transaction:
                await session.abort_transaction()
            logger.error(f"Transaction error during rescheduling: {tx_err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reschedule appointment due to a database transaction error.",
            )
        finally:
            await session.end_session()
    else:
        # Atomic conditional update sequence with compensation rollback
        if caller_role == Role.PATIENT:
            claim_filter = {
                "$and": [
                    new_id_filter,
                    {"status": SlotStatus.HELD.value, "held_by": user_id},
                ]
            }
        else:
            claim_filter = {
                "$and": [
                    new_id_filter,
                    {"status": {"$in": [SlotStatus.OPEN.value, SlotStatus.HELD.value]}},
                ]
            }
        claim_res = await slot_collection.find_one_and_update(
            claim_filter,
            {"$set": {"status": SlotStatus.BOOKED.value, "appointment_id": str(apt.id), "held_by": None, "held_until": None}},
        )
        if not claim_res:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Destination slot could not be secured. It may have expired or been claimed concurrently.",
            )

        appt_filter = {
            "$and": [
                appt_id_filter,
                {"status": AppointmentStatus.BOOKED.value, "slot_id": old_slot_id},
            ]
        }
        appt_update_res = await appt_collection.find_one_and_update(
            appt_filter,
            {
                "$set": {
                    "slot_id": new_slot_id,
                    "scheduled_start": new_slot.start,
                    "scheduled_end": new_slot.end,
                    "rescheduled_from": old_slot_id,
                    "needs_reschedule": False,
                    "updated_at": now,
                },
                "$push": {"status_history": event_dict},
            },
        )
        if not appt_update_res:
            # Compensation rollback: restore new slot back to HELD for the user
            await slot_collection.find_one_and_update(
                {"$and": [new_id_filter, {"appointment_id": str(apt.id)}]},
                {"$set": {"status": SlotStatus.HELD.value, "held_by": user_id, "appointment_id": None}},
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Appointment was modified concurrently. Please refresh and try again.",
            )

        # Free old slot
        if old_slot_id:
            old_oid = ObjectId(old_slot_id) if ObjectId.is_valid(old_slot_id) else None
            old_id_filter = {"$or": [{"_id": old_oid}, {"_id": old_slot_id}]} if old_oid else {"_id": old_slot_id}
            await slot_collection.find_one_and_update(
                {
                    "$and": [
                        old_id_filter,
                        {"appointment_id": str(apt.id)},
                    ]
                },
                {
                    "$set": {
                        "status": SlotStatus.OPEN.value,
                        "held_by": None,
                        "held_until": None,
                        "appointment_id": None,
                    }
                },
            )

    return await Appointment.get(str(apt.id))
