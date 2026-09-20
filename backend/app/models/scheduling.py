"""Doctor Schedules, Leaves, and Bookable Slots Models."""
from datetime import datetime
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel

from app.models.common import SlotStatus, utcnow


class TimeRange(BaseModel):
    start: str  # "HH:MM" (IST)
    end: str


class WeeklyRule(BaseModel):
    weekday: int  # 0 = Monday ... 6 = Sunday
    start: str  # "09:00"
    end: str  # "17:00"
    breaks: List[TimeRange] = Field(default_factory=list)


class DoctorSchedule(Document):
    doctor_id: str
    hospital_id: str
    slot_minutes: int = 15
    weekly: List[WeeklyRule] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "doctor_schedules"
        indexes = [
            IndexModel([("doctor_id", ASCENDING)], unique=True),
            IndexModel([("hospital_id", ASCENDING)]),
        ]


class DoctorLeave(Document):
    doctor_id: str
    hospital_id: str
    date_from: datetime
    date_to: datetime
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "doctor_leaves"
        indexes = [
            IndexModel([("doctor_id", ASCENDING), ("date_from", ASCENDING)]),
            IndexModel([("hospital_id", ASCENDING)]),
        ]


class Slot(Document):
    doctor_id: str
    hospital_id: str
    department_id: str
    start: datetime  # UTC
    end: datetime    # UTC
    status: SlotStatus = SlotStatus.OPEN
    held_by: Optional[str] = None  # user ID holding the slot
    held_until: Optional[datetime] = None
    appointment_id: Optional[str] = None

    class Settings:
        name = "slots"
        indexes = [
            IndexModel([("doctor_id", ASCENDING), ("start", ASCENDING)], unique=True),
            IndexModel([("doctor_id", ASCENDING), ("status", ASCENDING), ("start", ASCENDING)]),
            IndexModel([("status", ASCENDING), ("held_until", ASCENDING)]),
            IndexModel([("hospital_id", ASCENDING)]),
        ]
