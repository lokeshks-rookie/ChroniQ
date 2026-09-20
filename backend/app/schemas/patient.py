"""Patient Portal Schemas (Family, Documents, Reviews, Support)."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.common import Channel, DocumentCategory, SupportCategory, SupportTicketStatus


class FamilyMemberCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    relation: str


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    relation: Optional[str] = None


class FamilyMemberResponse(BaseModel):
    id: str
    user_id: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    relation: str
    created_at: datetime


class ReviewCreate(BaseModel):
    appointment_id: str
    doctor_rating: int = Field(ge=1, le=5)
    hospital_rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    wait_as_expected: Optional[str] = None  # 'shorter' | 'as_expected' | 'longer'


class ReviewUpdate(BaseModel):
    doctor_rating: Optional[int] = Field(None, ge=1, le=5)
    hospital_rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    tags: Optional[List[str]] = None
    wait_as_expected: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    appointment_id: str
    patient_id: str
    doctor_id: str
    hospital_id: str
    doctor_rating: int
    hospital_rating: int
    comment: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    wait_as_expected: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SupportTicketCreate(BaseModel):
    category: SupportCategory
    appointment_id: Optional[str] = None
    hospital_id: Optional[str] = None
    description: str
    contact_preference: Channel = Channel.IN_APP


class SupportTicketResponse(BaseModel):
    id: str
    reference: str
    patient_id: str
    category: SupportCategory
    appointment_id: Optional[str] = None
    hospital_id: Optional[str] = None
    description: str
    contact_preference: Channel
    status: SupportTicketStatus
    created_at: datetime


class DocumentResponse(BaseModel):
    id: str
    patient_id: str
    family_member_id: Optional[str] = None
    appointment_id: Optional[str] = None
    name: str
    category: DocumentCategory
    mime: str
    size_bytes: int
    uploaded_at: datetime


class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[DocumentCategory] = None
