"""Hospital Admin, Staff, Reports, and Policy Schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.models.common import Channel, CreatedVia, NotificationType, Role
from app.models.scheduling import TimeRange, WeeklyRule


class StaffCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    password: str
    role: Role  # receptionist, doctor, hospital_admin
    linked_doctor_id: Optional[str] = None


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None
    linked_doctor_id: Optional[str] = None


class StaffResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    role: Role
    hospital_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None


class ScheduleUpdate(BaseModel):
    slot_minutes: int = 15
    weekly: List[WeeklyRule] = Field(default_factory=list)


class DoctorLeaveCreate(BaseModel):
    date_from: datetime
    date_to: datetime
    reason: Optional[str] = None


class DoctorLeaveResponse(BaseModel):
    id: str
    doctor_id: str
    hospital_id: str
    date_from: datetime
    date_to: datetime
    reason: Optional[str] = None


class HospitalPoliciesUpdate(BaseModel):
    grace_period_minutes: Optional[int] = None
    cancel_window_hours: Optional[int] = None
    slot_hold_minutes: Optional[int] = None
    walk_ins_enabled: Optional[bool] = None


class HospitalProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    timings: Optional[str] = None
    facilities: Optional[List[str]] = None


class TemplateUpdate(BaseModel):
    template_text: str
    channels: Optional[Dict[str, bool]] = None


class BroadcastDelayRequest(BaseModel):
    doctor_id: str
    minutes_delayed: int
    message: Optional[str] = None
    channels: List[Channel] = Field(default_factory=lambda: [Channel.IN_APP, Channel.SMS])


class BroadcastCreateRequest(BaseModel):
    type: str = "custom"  # delay | closure | custom
    audience_type: str = "all"  # doctor | department | all
    target_id: Optional[str] = None
    message: str
    channels: List[Channel] = Field(default_factory=lambda: [Channel.IN_APP])


class BroadcastResponse(BaseModel):
    id: str
    hospital_id: str
    type: str
    audience_type: str
    message: str
    recipients_count: int
    sent_count: int
    sent_at: datetime


class PatientNoteCreate(BaseModel):
    note: str


class PatientNoteResponse(BaseModel):
    id: str
    patient_id: str
    author_id: str
    author_name: str
    note: str
    created_at: datetime


class AuditLogCreate(BaseModel):
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[Role] = None
    hospital_id: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    via: CreatedVia = CreatedVia.WEB
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime
