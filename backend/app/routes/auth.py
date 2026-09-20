"""Authentication, Registration, OTP, and User Profile Routes."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jwt import PyJWTError

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.core.rate_limit import rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    hash_otp,
    hash_password,
    verify_otp_hash,
    verify_password,
)
from app.models.accounts import NotificationPreferences, User
from app.models.booking import Appointment
from app.models.common import Role, utcnow
from app.models.system import MedicalDocument, OtpCode, Review
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    UserResponse,
    VerifyContactRequest,
    VerifyOtpRequest,
)
from app.schemas.common import MessageResponse, TokenResponse

router = APIRouter(tags=["Auth & Profile"])


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        name=user.name,
        phone=user.phone,
        email=user.email,
        role=user.role,
        hospital_id=user.hospital_id,
        preferred_language=user.preferred_language,
        is_verified=user.is_verified,
        is_active=user.is_active,
        age=user.age,
        gender=user.gender,
        photo_url=user.photo_url,
        email_verified=user.email_verified,
        notification_preferences=user.notification_preferences,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post(
    "/auth/register",
    response_model=Dict[str, Any],
    dependencies=[Depends(rate_limit(max_requests=10, key_prefix="auth_register"))],
)
async def register(req: RegisterRequest):
    """Register a new patient or staff user."""
    settings = get_settings()

    # Check for duplicate phone
    existing_phone = await User.find_one(User.phone == req.phone)
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this phone number already exists.",
        )

    # Check for duplicate email if provided
    if req.email:
        existing_email = await User.find_one(User.email == req.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

    user = User(
        name=req.name,
        phone=req.phone,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role or Role.PATIENT,
        hospital_id=req.hospital_id,
        preferred_language=req.preferred_language or "en",
        is_verified=False,
    )
    await user.insert()

    # Generate OTP
    code = generate_otp(settings.OTP_LENGTH)
    expires_at = utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    otp_doc = OtpCode(
        target=req.phone,
        purpose="register",
        code_hash=hash_otp(code),
        expires_at=expires_at,
    )
    await otp_doc.insert()

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    resp = {
        "message": "User registered successfully. Please verify your phone OTP.",
        "user": _to_user_response(user),
        "token": token,
    }
    if settings.OTP_DEV_ECHO:
        resp["otp"] = code

    return resp


@router.post(
    "/auth/login",
    response_model=Dict[str, Any],
    dependencies=[Depends(rate_limit(max_requests=20, key_prefix="auth_login"))],
)
async def login(req: LoginRequest):
    """Authenticate user with phone/email and password."""
    identifier = req.identifier or req.phone or req.email
    if not identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone or email is required")

    # Lookup by phone or email
    user = await User.find_one(User.phone == identifier)
    if not user and "@" in identifier:
        user = await User.find_one(User.email == identifier)

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your phone/email and password.",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value, "hospital_id": user.hospital_id})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    user_resp = _to_user_response(user)
    return {
        "token": access_token,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_resp,
    }


@router.post("/auth/verify-otp", response_model=Dict[str, Any])
async def verify_otp(req: VerifyOtpRequest):
    """Verify submitted numeric OTP code."""
    otp_record = await OtpCode.find_one(
        OtpCode.target == req.target,
        OtpCode.purpose == req.purpose,
    )

    now = utcnow()
    if not otp_record or otp_record.expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP code.")

    if not verify_otp_hash(req.code, otp_record.code_hash):
        otp_record.attempts += 1
        await otp_record.save()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect OTP code.")

    # Mark user verified
    user = await User.find_one(User.phone == req.target)
    if not user and "@" in req.target:
        user = await User.find_one(User.email == req.target)

    if user:
        user.is_verified = True
        if "@" in req.target:
            user.email_verified = True
        await user.save()

    # Clean up OTP record
    await otp_record.delete()

    token = create_access_token({"sub": str(user.id), "role": user.role.value}) if user else ""
    return {
        "message": "OTP verified successfully.",
        "user": _to_user_response(user) if user else None,
        "token": token,
    }


@router.post("/auth/resend-otp", response_model=Dict[str, Any])
async def resend_otp(req: ResendOtpRequest):
    """Resend a new OTP for registration or password recovery."""
    settings = get_settings()
    code = generate_otp(settings.OTP_LENGTH)
    expires_at = utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    await OtpCode.find(OtpCode.target == req.target, OtpCode.purpose == req.purpose).delete()

    otp_doc = OtpCode(
        target=req.target,
        purpose=req.purpose,
        code_hash=hash_otp(code),
        expires_at=expires_at,
    )
    await otp_doc.insert()

    resp = {"message": "OTP resent successfully."}
    if settings.OTP_DEV_ECHO:
        resp["otp"] = code
    return resp


@router.post("/auth/forgot-password", response_model=Dict[str, Any])
async def forgot_password(req: ForgotPasswordRequest):
    """Initiate password recovery by sending an OTP."""
    settings = get_settings()
    user = await User.find_one(User.phone == req.target)
    if not user and "@" in req.target:
        user = await User.find_one(User.email == req.target)

    if not user:
        # Don't leak existence, return success
        return {"message": "If an account matches, a recovery OTP was sent.", "success": True}

    code = generate_otp(settings.OTP_LENGTH)
    expires_at = utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    await OtpCode.find(OtpCode.target == req.target, OtpCode.purpose == "reset").delete()

    otp_doc = OtpCode(
        target=req.target,
        purpose="reset",
        code_hash=hash_otp(code),
        expires_at=expires_at,
    )
    await otp_doc.insert()

    resp = {"message": "Password recovery OTP sent.", "success": True}
    if settings.OTP_DEV_ECHO:
        resp["otp"] = code
    return resp


@router.post("/auth/reset-password", response_model=MessageResponse)
async def reset_password(req: ResetPasswordRequest):
    """Complete password reset with verified OTP."""
    otp_record = await OtpCode.find_one(
        OtpCode.target == req.target,
        OtpCode.purpose == "reset",
    )
    now = utcnow()
    if not otp_record or otp_record.expires_at < now or not verify_otp_hash(req.code, otp_record.code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code.")

    user = await User.find_one(User.phone == req.target)
    if not user and "@" in req.target:
        user = await User.find_one(User.email == req.target)

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    user.password_hash = hash_password(req.new_password)
    user.updated_at = now
    await user.save()
    await otp_record.delete()

    return MessageResponse(message="Password reset successfully. You can now login with your new password.")


@router.post("/auth/refresh", response_model=Dict[str, str])
async def refresh_access_token(body: Dict[str, str]):
    """Issue a new access token from a valid refresh token."""
    refresh_token = body.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh_token")

    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = payload.get("sub")
        user = await User.get(user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled")

        new_access = create_access_token({"sub": str(user.id), "role": user.role.value, "hospital_id": user.hospital_id})
        return {"access_token": new_access, "token_type": "bearer"}
    except PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Fetch currently authenticated user's profile."""
    return _to_user_response(current_user)


@router.patch("/users/me", response_model=UserResponse)
async def update_me(req: ProfileUpdateRequest, current_user: User = Depends(get_current_user)):
    """Update profile attributes for current patient."""
    if req.name is not None:
        current_user.name = req.name
    if req.age is not None:
        current_user.age = req.age
    if req.gender is not None:
        current_user.gender = req.gender
    if req.preferred_language is not None:
        current_user.preferred_language = req.preferred_language
    if req.photo_url is not None:
        current_user.photo_url = req.photo_url

    current_user.updated_at = utcnow()
    await current_user.save()
    return _to_user_response(current_user)


@router.post("/users/me/verify-contact", response_model=MessageResponse)
async def verify_contact(req: VerifyContactRequest, current_user: User = Depends(get_current_user)):
    """Verify and update phone or email for current account."""
    otp_record = await OtpCode.find_one(
        OtpCode.target == req.target,
        OtpCode.purpose == "verify_contact",
    )
    now = utcnow()
    if not otp_record or otp_record.expires_at < now or not verify_otp_hash(req.code, otp_record.code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code.")

    if req.type == "email":
        current_user.email = req.target
        current_user.email_verified = True
    else:
        current_user.phone = req.target
        current_user.is_verified = True

    current_user.updated_at = now
    await current_user.save()
    await otp_record.delete()

    return MessageResponse(message=f"Contact {req.type} verified and updated successfully.")


@router.patch("/users/me/password", response_model=MessageResponse)
async def change_password(req: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    """Change account password by validating current password."""
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password.")

    current_user.password_hash = hash_password(req.new_password)
    current_user.updated_at = utcnow()
    await current_user.save()
    return MessageResponse(message="Password changed successfully.")


@router.put("/users/me/notification-preferences", response_model=UserResponse)
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: User = Depends(get_current_user),
):
    """Update user's notification channel and timing preferences."""
    current_user.notification_preferences = preferences
    current_user.updated_at = utcnow()
    await current_user.save()
    return _to_user_response(current_user)


@router.post("/users/me/export", response_model=Dict[str, Any])
async def export_my_data(current_user: User = Depends(get_current_user)):
    """Generate and return full JSON export of patient's data."""
    appts = await Appointment.find(Appointment.patient_id == str(current_user.id)).to_list()
    docs = await MedicalDocument.find(MedicalDocument.patient_id == str(current_user.id)).to_list()
    revs = await Review.find(Review.patient_id == str(current_user.id)).to_list()

    return {
        "user": _to_user_response(current_user).dict(),
        "appointments": [a.dict() for a in appts],
        "documents": [d.dict() for d in docs],
        "reviews": [r.dict() for r in revs],
        "exported_at": utcnow().isoformat(),
    }


@router.post("/users/me/delete-request", response_model=MessageResponse)
async def request_account_deletion(current_user: User = Depends(get_current_user)):
    """Place account in deletion grace period."""
    current_user.deletion_requested_at = utcnow()
    await current_user.save()
    return MessageResponse(message="Account deletion requested. Data will be purged after the 30-day grace period.")


@router.delete("/users/me/delete-request", response_model=MessageResponse)
async def cancel_account_deletion(current_user: User = Depends(get_current_user)):
    """Cancel pending account deletion request."""
    current_user.deletion_requested_at = None
    await current_user.save()
    return MessageResponse(message="Account deletion request cancelled.")
