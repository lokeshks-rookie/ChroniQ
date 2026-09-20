"""Appointments router."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.models.accounts import User
from app.models.booking import Appointment, StatusEvent
from app.models.common import AppointmentStatus, CreatedVia, Role, SlotStatus, utcnow
from app.models.scheduling import Slot
from app.schemas.booking import AppointmentCreateRequest, AppointmentResponse, RescheduleRequest
from app.services.booking_service import confirm_booking, cancel_appointment

router = APIRouter(prefix="/appointments", tags=["Appointments"])


class CancelBody(BaseModel):
    reason: Optional[str] = "Cancelled by user"
    notify_patient: Optional[bool] = True


def to_appointment_response(apt: Appointment) -> dict:
    return {
        "id": str(apt.id),
        "booking_code": apt.booking_code,
        "patient_id": apt.patient_id,
        "family_member_id": apt.family_member_id,
        "patient": apt.patient.dict(),
        "hospital_id": apt.hospital_id,
        "department_id": apt.department_id,
        "doctor_id": apt.doctor_id,
        "slot_id": apt.slot_id,
        "hospital_name": apt.hospital_name,
        "doctor_name": apt.doctor_name,
        "department_name": apt.department_name,
        "scheduled_start": apt.scheduled_start,
        "scheduled_end": apt.scheduled_end,
        "type": apt.type,
        "reason": apt.reason,
        "symptoms_note": apt.symptoms_note,
        "fee": apt.fee,
        "status": apt.status,
        "status_history": [e.dict() for e in apt.status_history],
        "created_via": apt.created_via,
        "rescheduled_from": apt.rescheduled_from,
        "cancelled_reason": apt.cancelled_reason,
        "desk_confirmed": apt.desk_confirmed,
        "needs_reschedule": apt.needs_reschedule,
        "token": apt.token,
        "created_at": apt.created_at,
        "updated_at": apt.updated_at,
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreateRequest,
    current_user: User = Depends(get_current_user),
):
    """Book an appointment with a held slot."""
    if not payload.slot_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="slot_id is required")

    apt = await confirm_booking(
        user_id=str(current_user.id),
        doctor_id=payload.doctor_id,
        slot_id=payload.slot_id,
        patient_name=payload.patient_name or (payload.patient.name if payload.patient else None),
        family_member_id=payload.family_member_id,
        reason=payload.reason,
        symptoms_note=payload.symptoms_note or payload.symptoms,
        created_via=CreatedVia.WEB,
    )
    return to_appointment_response(apt)


@router.get("/me", response_model=List[dict])
async def get_my_appointments(
    current_user: User = Depends(get_current_user),
):
    """Get appointments for the logged-in patient."""
    user_id = str(current_user.id)
    appointments = await Appointment.find(Appointment.patient_id == user_id).sort("-scheduled_start").to_list()
    return [to_appointment_response(a) for a in appointments]


@router.get("/{id}", response_model=dict)
async def get_appointment(
    id: str,
    current_user: User = Depends(get_current_user),
):
    """Get appointment details by ID or booking code."""
    apt = await Appointment.get(id)
    if not apt:
        apt = await Appointment.find_one(Appointment.booking_code == id)
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Authorization: patient must own it or user must be staff/super_admin
    user_id = str(current_user.id)
    if current_user.role == Role.PATIENT and apt.patient_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

    if current_user.role in (Role.HOSPITAL_ADMIN, Role.RECEPTIONIST, Role.DOCTOR):
        if current_user.hospital_id and apt.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hospital mismatch")

    return to_appointment_response(apt)


@router.patch("/{id}/reschedule", response_model=dict)
async def reschedule_appointment(
    id: str,
    payload: RescheduleRequest,
    current_user: User = Depends(get_current_user),
):
    """Reschedule an existing appointment."""
    apt = await Appointment.get(id)
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    user_id = str(current_user.id)
    if current_user.role == Role.PATIENT and apt.patient_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

    # Free old slot if any
    if apt.slot_id:
        old_slot = await Slot.get(apt.slot_id)
        if old_slot and old_slot.status == SlotStatus.BOOKED:
            old_slot.status = SlotStatus.OPEN
            old_slot.held_by = None
            old_slot.held_until = None
            old_slot.appointment_id = None
            await old_slot.save()

    now = utcnow()
    if payload.new_slot_id:
        new_slot = await Slot.get(payload.new_slot_id)
        if not new_slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New slot not found")
        new_slot.status = SlotStatus.BOOKED
        new_slot.appointment_id = str(apt.id)
        await new_slot.save()
        apt.slot_id = payload.new_slot_id
        apt.scheduled_start = new_slot.start
        apt.scheduled_end = new_slot.end
    elif payload.new_scheduled_start and payload.new_scheduled_end:
        apt.scheduled_start = payload.new_scheduled_start
        apt.scheduled_end = payload.new_scheduled_end

    apt.status = AppointmentStatus.BOOKED
    apt.needs_reschedule = False
    apt.status_history.append(
        StatusEvent(
            status=AppointmentStatus.RESCHEDULED,
            at=now,
            by=user_id,
            note=payload.reason or "Rescheduled",
        )
    )
    apt.updated_at = now
    await apt.save()
    return to_appointment_response(apt)


@router.delete("/{id}", response_model=dict)
async def cancel_apt(
    id: str,
    payload: Optional[CancelBody] = None,
    current_user: User = Depends(get_current_user),
):
    """Cancel an appointment."""
    apt = await Appointment.get(id)
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    user_id = str(current_user.id)
    if current_user.role == Role.PATIENT and apt.patient_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

    reason = payload.reason if payload else "Cancelled"
    cancelled = await cancel_appointment(appointment_id=str(apt.id), user_id=user_id, reason=reason)
    return to_appointment_response(cancelled)


@router.post("/{id}/confirm", response_model=dict)
async def confirm_appointment_desk(
    id: str,
    current_user: User = Depends(get_current_user),
):
    """Front-desk mark confirmation on appointment."""
    apt = await Appointment.get(id)
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    apt.desk_confirmed = True
    apt.updated_at = utcnow()
    await apt.save()
    return {"success": True, "appointment_id": str(apt.id)}
