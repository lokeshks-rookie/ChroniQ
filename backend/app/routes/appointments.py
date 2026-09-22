"""Appointments router."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user, require_roles
from app.models.accounts import User
from app.models.booking import Appointment, StatusEvent
from app.models.common import AppointmentStatus, CreatedVia, Role, SlotStatus, utcnow
from app.models.scheduling import Slot
from app.schemas.booking import AppointmentCreateRequest, AppointmentResponse, RescheduleRequest
from app.services.booking_service import confirm_booking, cancel_appointment, reschedule_appointment_service

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
        "patient": apt.patient.model_dump(),
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
        "status_history": [e.model_dump() for e in apt.status_history],
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
    """Book an appointment with a held slot (GAP-7)."""
    if not payload.slot_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="slot_id is required")

    # Identity override prevention for patient accounts (GAP-7)
    if current_user.role == Role.PATIENT:
        if payload.patient_id and payload.patient_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot book appointment on behalf of another patient ID.",
            )
        if not payload.family_member_id:
            if payload.patient_name and payload.patient_name.strip() != current_user.name.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Arbitrary patient identity overrides are not permitted for patient accounts.",
                )
            if payload.patient and payload.patient.name and payload.patient.name.strip() != current_user.name.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Arbitrary patient identity overrides are not permitted for patient accounts.",
                )

    apt = await confirm_booking(
        user_id=str(current_user.id),
        doctor_id=payload.doctor_id,
        slot_id=payload.slot_id,
        caller_role=current_user.role,
        patient_name=payload.patient_name or (payload.patient.name if payload.patient else None),
        family_member_id=payload.family_member_id,
        reason=payload.reason,
        symptoms_note=payload.symptoms_note or payload.symptoms,
        created_via=CreatedVia.WEB,
    )
    return to_appointment_response(apt)


@router.get("", response_model=List[dict])
@router.get("/me", response_model=List[dict])
async def get_my_appointments(
    request: Request,
    hospital_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Get appointments scoped to caller's role and hospital."""
    is_me = request.url.path.endswith("/me")
    if is_me or current_user.role == Role.PATIENT:
        user_id = str(current_user.id)
        appointments = await Appointment.find(Appointment.patient_id == user_id).sort("-scheduled_start").to_list()
        return [to_appointment_response(a) for a in appointments]

    # Staff view (Hospital Admin, Receptionist, Doctor, Super Admin)
    filters = {}
    if current_user.role in (Role.HOSPITAL_ADMIN, Role.RECEPTIONIST):
        effective_hosp = current_user.hospital_id or hospital_id or "hosp_city_01"
        filters["hospital_id"] = effective_hosp
    elif current_user.role == Role.DOCTOR:
        doc_id = current_user.linked_doctor_id or str(current_user.id)
        filters["doctor_id"] = doc_id
    elif current_user.role == Role.SUPER_ADMIN:
        if hospital_id:
            filters["hospital_id"] = hospital_id

    if doctor_id:
        filters["doctor_id"] = doctor_id
    if status:
        filters["status"] = status

    query = Appointment.find(filters).sort("-scheduled_start")
    appointments = await query.to_list()
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
    """Reschedule an existing appointment (GAP-6)."""
    if not payload.new_slot_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="new_slot_id is required for rescheduling.",
        )

    apt = await reschedule_appointment_service(
        appointment_id=id,
        user_id=str(current_user.id),
        caller_role=current_user.role,
        new_slot_id=payload.new_slot_id,
        caller_hospital_id=current_user.hospital_id,
        reason=payload.reason,
    )
    return to_appointment_response(apt)


@router.delete("/{id}", response_model=dict)
@router.post("/{id}/cancel", response_model=dict)
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

    if current_user.role in (Role.HOSPITAL_ADMIN, Role.RECEPTIONIST, Role.DOCTOR):
        if current_user.hospital_id and apt.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hospital mismatch: Cannot cancel appointment of another hospital")

    reason = payload.reason if payload else "Cancelled"
    cancelled = await cancel_appointment(appointment_id=str(apt.id), user_id=user_id, reason=reason)
    return to_appointment_response(cancelled)


@router.post("/{id}/confirm", response_model=dict)
async def confirm_appointment_desk(
    id: str,
    current_user: User = Depends(require_roles(Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Front-desk mark confirmation on appointment."""
    apt = await Appointment.get(id)
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if current_user.role in (Role.HOSPITAL_ADMIN, Role.RECEPTIONIST):
        if current_user.hospital_id and apt.hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hospital mismatch: Cannot confirm appointment of another hospital")

    apt.desk_confirmed = True
    apt.updated_at = utcnow()
    await apt.save()
    return {"success": True, "appointment_id": str(apt.id)}
