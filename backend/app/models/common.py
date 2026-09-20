"""Common Enums and Helper Schemas."""
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, Enum):
    PATIENT = "patient"
    RECEPTIONIST = "receptionist"
    DOCTOR = "doctor"
    HOSPITAL_ADMIN = "hospital_admin"
    SUPER_ADMIN = "super_admin"


class HospitalStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"


class SlotStatus(str, Enum):
    OPEN = "open"
    HELD = "held"
    BOOKED = "booked"
    BLOCKED = "blocked"


class AppointmentStatus(str, Enum):
    BOOKED = "booked"
    CHECKED_IN = "checked_in"
    IN_QUEUE = "in_queue"
    CALLED = "called"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"
    EXPIRED = "expired"


class AppointmentType(str, Enum):
    BOOKED = "booked"
    WALK_IN = "walk_in"


class CreatedVia(str, Enum):
    WEB = "web"
    DESK = "desk"
    KIOSK = "kiosk"
    VOICE = "voice"


class QueueStatus(str, Enum):
    WAITING = "waiting"
    CALLED = "called"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    NO_SHOW = "no_show"
    CANCELLED = "cancelled"


class Channel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"


class NotificationType(str, Enum):
    BOOKING_CONFIRMED = "booking_confirmed"
    REMINDER = "reminder"
    DOCTOR_DELAYED = "doctor_delayed"
    QUEUE_UPDATE = "queue_update"
    YOU_ARE_NEXT = "you_are_next"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"
    SYSTEM = "system"


class DoctorAvailabilityStatus(str, Enum):
    AVAILABLE = "available"
    ON_BREAK = "on_break"
    LATE = "late"
    ON_LEAVE = "on_leave"


class SupportTicketStatus(str, Enum):
    OPEN = "open"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"


class SupportCategory(str, Enum):
    BOOKING_PROBLEM = "booking_problem"
    QUEUE_OR_WAITING = "queue_or_waiting"
    FEE_OR_PAYMENT = "fee_or_payment"
    APP_PROBLEM = "app_problem"
    PRIVACY_CONCERN = "privacy_concern"
    OTHER = "other"


class DocumentCategory(str, Enum):
    LAB_REPORT = "lab_report"
    PRESCRIPTION = "prescription"
    IMAGING = "imaging"
    DISCHARGE_SUMMARY = "discharge_summary"
    OTHER = "other"


class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]
