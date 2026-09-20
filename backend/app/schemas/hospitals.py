"""Hospital, Department, and Doctor Schemas."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.common import GeoPoint, HospitalStatus
from app.models.hospitals import HospitalSettings


class HospitalResponse(BaseModel):
    id: str
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
    settings: Optional[HospitalSettings] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DepartmentCreate(BaseModel):
    name: str
    room: Optional[str] = None
    token_prefix: str
    is_active: bool = True


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    room: Optional[str] = None
    token_prefix: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    id: str
    hospital_id: str
    name: str
    room: Optional[str] = None
    token_prefix: str
    is_active: bool = True


class DoctorCreate(BaseModel):
    name: str
    specialty: str
    department_id: str
    fee: int
    qualifications: List[str] = Field(default_factory=list)
    experience_years: int = 0
    languages: List[str] = Field(default_factory=lambda: ["en"])
    room: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    gender: Optional[str] = None
    avg_consult_minutes: float = 10.0


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    department_id: Optional[str] = None
    fee: Optional[int] = None
    qualifications: Optional[List[str]] = None
    experience_years: Optional[int] = None
    languages: Optional[List[str]] = None
    room: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    gender: Optional[str] = None
    avg_consult_minutes: Optional[float] = None
    is_active: Optional[bool] = None


class DoctorResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    hospital_id: str
    department_id: str
    name: str
    specialty: str
    qualifications: List[str] = Field(default_factory=list)
    experience_years: int = 0
    fee: int = 0
    languages: List[str] = Field(default_factory=lambda: ["en"])
    gender: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    avg_consult_minutes: float = 10.0
    rating_avg: float = 0.0
    rating_count: int = 0
    room: Optional[str] = None
    is_active: bool = True
