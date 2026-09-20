"""Physical Kiosk Terminal Schemas."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.models.booking import PatientSnapshot
from app.models.common import AppointmentStatus, QueueStatus


class KioskAppointmentSummary(BaseModel):
    id: str
    booking_code: str
    patient_name_masked: str
    patient_phone_masked: str
    doctor_name: str
    department_name: str
    scheduled_start: datetime
    status: AppointmentStatus
    can_check_in: bool
    already_checked_in: bool
    token: Optional[str] = None


class KioskLookupPhoneResponse(BaseModel):
    appointments: List[KioskAppointmentSummary]


class KioskLookupQrResponse(BaseModel):
    appointment: KioskAppointmentSummary


class KioskCheckInRequest(BaseModel):
    appointment_id: str
    hospital_id: str


class KioskCheckInResponse(BaseModel):
    success: bool
    token: str
    position: Optional[int] = None
    eta_minutes: Optional[int] = None
    doctor_name: str
    department_name: str
    room: Optional[str] = None
    appointment_time: datetime
    patient_name: str


class KioskWalkInRequest(BaseModel):
    hospital_id: str
    department_id: str
    doctor_id: str
    patient_name: str
    patient_phone: str
    reason: str
    priority: int = 2


class KioskDepartmentResponse(BaseModel):
    id: str
    name: str
    room: Optional[str] = None
    token_prefix: str
    doctors_available_count: int
