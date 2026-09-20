"""Appointments, Queue Entries, and Daily Token Counters."""
from datetime import datetime
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.models.common import AppointmentStatus, AppointmentType, CreatedVia, QueueStatus, utcnow


class PatientSnapshot(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    past_visits_count: Optional[int] = None
    last_visit_date: Optional[str] = None


class StatusEvent(BaseModel):
    status: AppointmentStatus
    at: datetime = Field(default_factory=utcnow)
    by: Optional[str] = None
    note: Optional[str] = None


class Appointment(Document):
    booking_code: str  # e.g. "APT-7K3Q9"
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
    type: AppointmentType = AppointmentType.BOOKED
    reason: Optional[str] = None
    symptoms_note: Optional[str] = None
    fee: int = 0
    status: AppointmentStatus = AppointmentStatus.BOOKED
    status_history: List[StatusEvent] = Field(default_factory=list)
    created_via: CreatedVia = CreatedVia.WEB
    rescheduled_from: Optional[str] = None
    cancelled_reason: Optional[str] = None
    desk_confirmed: Optional[bool] = False
    needs_reschedule: Optional[bool] = False
    token: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "appointments"
        indexes = [
            IndexModel([("booking_code", ASCENDING)], unique=True),
            IndexModel([("patient_id", ASCENDING), ("scheduled_start", DESCENDING)]),
            IndexModel([("doctor_id", ASCENDING), ("scheduled_start", ASCENDING)]),
            IndexModel([("hospital_id", ASCENDING), ("status", ASCENDING), ("scheduled_start", ASCENDING)]),
        ]


class QueueEntry(Document):
    appointment_id: str
    hospital_id: str
    department_id: str
    doctor_id: str
    queue_date: str  # "YYYY-MM-DD" in IST
    token: str       # e.g. "CARD-014"
    token_number: int
    priority: int = 2  # 0 emergency, 1 priority, 2 normal
    status: QueueStatus = QueueStatus.WAITING
    sort_time: datetime  # slot start or arrival time; reset on late arrival
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
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "queue_entries"
        indexes = [
            IndexModel([("appointment_id", ASCENDING)], unique=True),
            IndexModel([("hospital_id", ASCENDING), ("department_id", ASCENDING),
                        ("queue_date", ASCENDING), ("token_number", ASCENDING)], unique=True),
            IndexModel([("doctor_id", ASCENDING), ("queue_date", ASCENDING), ("status", ASCENDING),
                        ("priority", ASCENDING), ("sort_time", ASCENDING)]),
            IndexModel([("hospital_id", ASCENDING), ("queue_date", ASCENDING)]),
        ]


class TokenCounter(Document):
    hospital_id: str
    department_id: str
    date: str  # "YYYY-MM-DD" in IST
    seq: int = 0
    expire_at: datetime

    class Settings:
        name = "token_counters"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("department_id", ASCENDING),
                        ("date", ASCENDING)], unique=True),
            IndexModel([("expire_at", ASCENDING)], expireAfterSeconds=0),
        ]
