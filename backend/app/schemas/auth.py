"""Authentication and User Profile Schemas."""
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, EmailStr, Field

from app.models.accounts import NotificationPreferences
from app.models.common import Role


class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    password: str
    role: Optional[Role] = Role.PATIENT
    hospital_id: Optional[str] = None
    preferred_language: Optional[str] = "en"


class LoginRequest(BaseModel):
    # Support phone, email, or general identifier
    identifier: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    password: str


class VerifyOtpRequest(BaseModel):
    target: str
    code: str
    purpose: str = "register"  # register | login | reset | verify_contact


class ResendOtpRequest(BaseModel):
    target: str
    purpose: str = "register"


class ForgotPasswordRequest(BaseModel):
    target: str  # phone or email


class ResetPasswordRequest(BaseModel):
    target: str
    code: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class VerifyContactRequest(BaseModel):
    target: str
    code: str
    type: str = "phone"  # phone | email


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    preferred_language: Optional[str] = None
    photo_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    role: Role
    hospital_id: Optional[str] = None
    linked_doctor_id: Optional[str] = None
    preferred_language: str = "en"
    is_verified: bool = False
    is_active: bool = True
    age: Optional[int] = None
    gender: Optional[str] = None
    photo_url: Optional[str] = None
    email_verified: bool = False
    notification_preferences: Optional[NotificationPreferences] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
