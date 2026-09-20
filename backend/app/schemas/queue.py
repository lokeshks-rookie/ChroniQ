"""Queue Schemas and Live State Responses."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.common import QueueStatus


class QueueCheckInRequest(BaseModel):
    appointment_id: Optional[str] = None
    booking_code: Optional[str] = None
    hospital_id: Optional[str] = None


class QueueCallNextRequest(BaseModel):
    doctor_id: str
    room: Optional[str] = None


class QueueCallAgainRequest(BaseModel):
    entry_id: str
    room: Optional[str] = None


class QueueStartRequest(BaseModel):
    entry_id: str


class QueueCompleteRequest(BaseModel):
    entry_id: str
    consult_minutes: Optional[float] = None


class QueueSkipRequest(BaseModel):
    entry_id: str
    reason: Optional[str] = None


class QueueNoShowRequest(BaseModel):
    entry_id: str
    reason: Optional[str] = None


class QueuePriorityUpdateRequest(BaseModel):
    priority: int  # 0 emergency, 1 priority, 2 normal


class EmergencyInsertRequest(BaseModel):
    doctor_id: str
    department_id: Optional[str] = None
    patient_name: str
    patient_phone: Optional[str] = None
    reason: str


class QueueEntryResponse(BaseModel):
    id: str
    appointment_id: str
    hospital_id: str
    department_id: str
    doctor_id: str
    queue_date: str
    token: str
    token_number: int
    priority: int
    status: QueueStatus
    sort_time: datetime
    position: Optional[int] = None
    eta_minutes: Optional[int] = None
    call_count: int = 0
    skip_count: int = 0
    is_late_arrival: bool = False
    checked_in_at: Optional[datetime] = None
    called_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    consult_minutes: Optional[float] = None
    created_at: datetime


class QueueStatusResponse(BaseModel):
    appointment_id: str
    token: str
    status: QueueStatus
    position: Optional[int] = None
    eta_minutes: Optional[int] = None
    doctor_name: str
    department_name: str
    room: Optional[str] = None
    current_token_serving: Optional[str] = None
    patients_ahead: int = 0


class CallEventResponse(BaseModel):
    id: str
    entry_id: str
    token: str
    doctor_id: str
    department_id: str
    room: str
    call_count: int
    at: datetime
