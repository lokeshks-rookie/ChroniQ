"""Hospital, Department, and Doctor Document Models."""
from datetime import datetime
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, TEXT, IndexModel

from app.models.common import GeoPoint, HospitalStatus, utcnow


class HospitalSettings(BaseModel):
    grace_period_minutes: int = 10
    cancel_window_hours: int = 2
    slot_hold_minutes: int = 5
    walk_ins_enabled: bool = True


class Hospital(Document):
    # Support custom ID like hosp_city_01 via optional code or Document id
    custom_id: Optional[str] = None
    name: str
    city: str
    address: str
    phone: str
    email: Optional[str] = None
    location: Optional[GeoPoint] = None
    timings: str = "24x7"
    facilities: List[str] = Field(default_factory=list)
    rating_avg: float = 0.0
    rating_count: int = 0
    status: HospitalStatus = HospitalStatus.ACTIVE
    settings: HospitalSettings = Field(default_factory=HospitalSettings)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "hospitals"
        indexes = [
            IndexModel([("city", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("name", TEXT)]),
            IndexModel([("location", "2dsphere")]),
            IndexModel([("custom_id", ASCENDING)], unique=True, partialFilterExpression={"custom_id": {"$type": "string"}}),
        ]


class Department(Document):
    custom_id: Optional[str] = None
    hospital_id: str
    name: str
    room: Optional[str] = None
    token_prefix: str  # e.g. "CARD"
    is_active: bool = True

    class Settings:
        name = "departments"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("token_prefix", ASCENDING)], unique=True),
            IndexModel([("hospital_id", ASCENDING), ("name", ASCENDING)]),
            IndexModel([("custom_id", ASCENDING)], unique=True, partialFilterExpression={"custom_id": {"$type": "string"}}),
        ]


class Doctor(Document):
    custom_id: Optional[str] = None
    user_id: Optional[str] = None
    hospital_id: str
    department_id: str
    name: str
    specialty: str
    qualifications: List[str] = Field(default_factory=list)
    experience_years: int = 0
    fee: int = 0  # INR
    languages: List[str] = Field(default_factory=lambda: ["en"])
    gender: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    avg_consult_minutes: float = 10.0
    rating_avg: float = 0.0
    rating_count: int = 0
    room: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "doctors"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("department_id", ASCENDING)]),
            IndexModel([("specialty", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("name", TEXT), ("specialty", TEXT)]),
            IndexModel([("custom_id", ASCENDING)], unique=True, partialFilterExpression={"custom_id": {"$type": "string"}}),
        ]
