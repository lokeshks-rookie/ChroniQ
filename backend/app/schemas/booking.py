"""Booking, Slots, and Walk-in Schemas."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.booking import PatientSnapshot, StatusEvent
from app.models.common import AppointmentStatus, AppointmentType, CreatedVia, SlotStatus


class SlotResponse(BaseModel):
    id: str
    doctor_id: str
    hospital_id: str
    department_id: str
    start: datetime
    end: datetime
    status: SlotStatus
    held_by: Optional[str] = None
    held_until: Optional[datetime] = None
    appointment_id: Optional[str] = None


class SlotHoldResponse(BaseModel):
    slot_id: str
    held_until: datetime
    expires_in_seconds: int


class AppointmentCreateRequest(BaseModel):
    doctor_id: str
    slot_id: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    family_member_id: Optional[str] = None
    patient_name: Optional[str] = None
    patient: Optional[PatientSnapshot] = None
    reason: Optional[str] = None
    symptoms: Optional[str] = None
    symptoms_note: Optional[str] = None
    patient_id: Optional[str] = None


class RescheduleRequest(BaseModel):
    new_slot_id: Optional[str] = None
    new_date: Optional[str] = None
    new_time: Optional[str] = None
    new_scheduled_start: Optional[datetime] = None
    new_scheduled_end: Optional[datetime] = None
    reason: Optional[str] = None


class CancelRequest(BaseModel):
    reason: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: str
    booking_code: str
    patient_id: str
    family_member_id: Optional[str] = None
    patient: PatientSnapshot
    hospital_id: str
    department_id: str
    doctor_id: str
    slot_id: Optional[str] = None
    hospital_name: str
    doctor_name: str
    department_name: str
    scheduled_start: datetime
    scheduled_end: datetime
    type: AppointmentType
    reason: Optional[str] = None
    symptoms_note: Optional[str] = None
    fee: int = 0
    status: AppointmentStatus
    status_history: List[StatusEvent] = Field(default_factory=list)
    created_via: CreatedVia
    rescheduled_from: Optional[str] = None
    cancelled_reason: Optional[str] = None
    desk_confirmed: Optional[bool] = False
    needs_reschedule: Optional[bool] = False
    token: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class WalkInRequest(BaseModel):
    doctor_id: str
    department_id: Optional[str] = None
    patient: PatientSnapshot
    reason: str
    priority: int = 2  # 0 emergency, 1 priority, 2 normal
