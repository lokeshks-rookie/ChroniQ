"""Engagement, Clinical Support, and Audit Models."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.models.common import (
    Channel,
    CreatedVia,
    DoctorAvailabilityStatus,
    DocumentCategory,
    NotificationType,
    Role,
    SupportCategory,
    SupportTicketStatus,
    utcnow,
)


class Notification(Document):
    user_id: str
    type: NotificationType
    channel: Channel = Channel.IN_APP
    title: str
    body: str
    data: Dict[str, Any] = Field(default_factory=dict)
    delivery_status: str = "sent"
    sent_at: datetime = Field(default_factory=utcnow)
    read_at: Optional[datetime] = None

    class Settings:
        name = "notifications"
        indexes = [
            IndexModel([("user_id", ASCENDING), ("read_at", ASCENDING), ("sent_at", DESCENDING)]),
        ]


class Review(Document):
    appointment_id: str
    patient_id: str
    doctor_id: str
    hospital_id: str
    doctor_rating: int = Field(ge=1, le=5)
    hospital_rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    wait_as_expected: Optional[str] = None  # 'shorter' | 'as_expected' | 'longer'
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "reviews"
        indexes = [
            IndexModel([("appointment_id", ASCENDING)], unique=True),
            IndexModel([("doctor_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("hospital_id", ASCENDING), ("created_at", DESCENDING)]),
        ]


class AuditLog(Document):
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[Role] = None
    hospital_id: Optional[str] = None
    action: str  # "appointment.cancel", "doctor.create", "queue.call_next" ...
    entity: str  # collection name
    entity_id: Optional[str] = None
    details: Optional[str] = None
    via: CreatedVia = CreatedVia.WEB
    metadata: Dict[str, Any] = Field(default_factory=dict)
    ip: Optional[str] = None
    timestamp: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "audit_logs"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("actor_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("entity", ASCENDING), ("entity_id", ASCENDING)]),
        ]


class OtpCode(Document):
    target: str  # phone or email
    purpose: str  # register | login | reset | verify_contact
    code_hash: str
    attempts: int = 0
    expires_at: datetime

    class Settings:
        name = "otp_codes"
        indexes = [
            IndexModel([("target", ASCENDING), ("purpose", ASCENDING)]),
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
        ]


class SupportTicket(Document):
    reference: str  # "TCK-4F7K2"
    patient_id: str
    category: SupportCategory
    appointment_id: Optional[str] = None
    hospital_id: Optional[str] = None
    description: str
    contact_preference: Channel = Channel.IN_APP
    status: SupportTicketStatus = SupportTicketStatus.OPEN
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "support_tickets"
        indexes = [
            IndexModel([("patient_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("reference", ASCENDING)], unique=True),
        ]


class MedicalDocument(Document):
    patient_id: str
    family_member_id: Optional[str] = None
    appointment_id: Optional[str] = None
    name: str
    category: DocumentCategory
    mime: str
    size_bytes: int
    file_path: str
    uploaded_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "medical_documents"
        indexes = [
            IndexModel([("patient_id", ASCENDING), ("uploaded_at", DESCENDING)]),
        ]


class ConsultationNote(Document):
    appointment_id: str
    doctor_id: str
    patient_id: str
    text: str
    follow_up: str = "none"  # 'none' | '1_week' | '2_weeks' | '1_month' | 'custom'
    follow_up_date: Optional[str] = None
    finalized: bool = False
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "consultation_notes"
        indexes = [
            IndexModel([("appointment_id", ASCENDING)], unique=True),
            IndexModel([("doctor_id", ASCENDING), ("appointment_id", ASCENDING)]),
        ]


class DoctorAvailabilityState(Document):
    doctor_id: str
    status: DoctorAvailabilityStatus = DoctorAvailabilityStatus.AVAILABLE
    until: Optional[str] = None
    delay_minutes: int = 0
    reason: Optional[str] = None
    changed_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "doctor_availability"
        indexes = [
            IndexModel([("doctor_id", ASCENDING)], unique=True),
        ]


class AvailabilityLogEntry(Document):
    doctor_id: str
    status: DoctorAvailabilityStatus
    reason: Optional[str] = None
    duration_minutes: Optional[int] = None
    changed_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "availability_logs"
        indexes = [
            IndexModel([("doctor_id", ASCENDING), ("changed_at", DESCENDING)]),
        ]


class BroadcastLog(Document):
    hospital_id: str
    type: str  # 'delay' | 'closure' | 'custom'
    audience_type: str  # 'doctor' | 'department' | 'all'
    target_id: Optional[str] = None
    target_name: Optional[str] = None
    minutes_delayed: Optional[int] = None
    closure_date_start: Optional[str] = None
    closure_date_end: Optional[str] = None
    channels: List[Channel] = Field(default_factory=lambda: [Channel.IN_APP])
    message: str
    recipients_count: int = 0
    sent_count: int = 0
    failed_count: int = 0
    sent_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "broadcast_logs"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("sent_at", DESCENDING)]),
        ]


class NotificationTemplate(Document):
    hospital_id: str
    type: NotificationType
    label: str
    channels: Dict[str, bool] = Field(default_factory=lambda: {"in_app": True, "email": True, "sms": False})
    template_text: str
    variables: List[str] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "notification_templates"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("type", ASCENDING)], unique=True),
        ]
