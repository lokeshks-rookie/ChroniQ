"""User Accounts and Family Member Models."""
from datetime import datetime
from typing import Dict, Optional
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel

from app.models.common import Role, utcnow


class NotificationChannelPreference(BaseModel):
    in_app: bool = True
    email: bool = True
    sms: bool = False


class NotificationPreferences(BaseModel):
    channels: Dict[str, NotificationChannelPreference] = Field(default_factory=lambda: {
        "booking_confirmed": NotificationChannelPreference(in_app=True, email=True, sms=True),
        "reminder": NotificationChannelPreference(in_app=True, email=True, sms=False),
        "doctor_delayed": NotificationChannelPreference(in_app=True, email=False, sms=True),
        "queue_update": NotificationChannelPreference(in_app=True, email=False, sms=False),
        "you_are_next": NotificationChannelPreference(in_app=True, email=False, sms=True),
        "cancelled": NotificationChannelPreference(in_app=True, email=True, sms=True),
        "rescheduled": NotificationChannelPreference(in_app=True, email=True, sms=False),
        "system": NotificationChannelPreference(in_app=True, email=False, sms=False),
    })
    reminder_24h: bool = True
    reminder_1h: bool = True


class User(Document):
    name: str
    phone: str
    email: Optional[str] = None
    password_hash: str
    role: Role = Role.PATIENT
    hospital_id: Optional[str] = None  # String hospital ID (e.g. hosp_city_01)
    preferred_language: str = "en"  # en, ta, hi, te, ml, kn
    is_verified: bool = False
    is_active: bool = True

    # Patient Portal additions
    age: Optional[int] = None
    gender: Optional[str] = None
    photo_url: Optional[str] = None
    email_verified: bool = False
    deletion_requested_at: Optional[datetime] = None
    notification_preferences: NotificationPreferences = Field(default_factory=NotificationPreferences)

    # Doctor specific link
    linked_doctor_id: Optional[str] = None

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("phone", ASCENDING)], unique=True),
            IndexModel([("email", ASCENDING)], unique=True, partialFilterExpression={"email": {"$type": "string"}}),
            IndexModel([("role", ASCENDING), ("hospital_id", ASCENDING)]),
        ]


class FamilyMember(Document):
    user_id: PydanticObjectId
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    relation: str  # spouse, son, daughter, father, mother, brother, sister, grandparent, other
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "family_members"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
        ]


class PatientNote(Document):
    patient_id: str  # User ID or Patient ID
    author_id: str
    author_name: str
    note: str
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "patient_notes"
        indexes = [
            IndexModel([("patient_id", ASCENDING), ("created_at", ASCENDING)]),
        ]
