"""FastAPI Route Dependencies (Authentication, RBAC, Hospital Isolation, Kiosk)."""
from typing import List, Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWTError

from app.core.config import get_settings
from app.core.security import decode_token
from app.models.accounts import User
from app.models.common import Role

security_scheme = HTTPBearer(auto_error=False)

DEFAULT_PERMISSIONS = {
    "hospital_admin": {
        "view_dashboard": True, "manage_appointments": True, "queue_control": True,
        "walk_in_registration": True, "check_in": True, "view_patients": True,
        "manage_doctors": True, "manage_schedules": True, "manage_departments": True,
        "reports_and_export": True, "manage_staff": True, "hospital_settings": True,
        "send_broadcasts": True,
    },
    "receptionist": {
        "view_dashboard": True, "manage_appointments": True, "queue_control": True,
        "walk_in_registration": True, "check_in": True, "view_patients": True,
        "manage_doctors": False, "manage_schedules": False, "manage_departments": False,
        "reports_and_export": False, "manage_staff": False, "hospital_settings": False,
        "send_broadcasts": False,
    },
    "doctor": {
        "view_dashboard": True, "manage_appointments": False, "queue_control": True,
        "walk_in_registration": False, "check_in": False, "view_patients": True,
        "manage_doctors": False, "manage_schedules": True, "manage_departments": False,
        "reports_and_export": False, "manage_staff": False, "hospital_settings": False,
        "send_broadcasts": False,
    },
    "patient": {
        "view_dashboard": False, "manage_appointments": False, "queue_control": False,
        "walk_in_registration": False, "check_in": False, "view_patients": False,
        "manage_doctors": False, "manage_schedules": False, "manage_departments": False,
        "reports_and_export": False, "manage_staff": False, "hospital_settings": False,
        "send_broadcasts": False,
    },
    "super_admin": {
        "view_dashboard": True, "manage_appointments": True, "queue_control": True,
        "walk_in_registration": True, "check_in": True, "view_patients": True,
        "manage_doctors": True, "manage_schedules": True, "manage_departments": True,
        "reports_and_export": True, "manage_staff": True, "hospital_settings": True,
        "send_broadcasts": True,
    },
}


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> User:
    """Validate Bearer token and return User object."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        role_claim = payload.get("role")
        hosp_claim = payload.get("hospital_id")
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = None
    try:
        from bson import ObjectId
        if ObjectId.is_valid(user_id):
            user = await User.get(user_id)
        if not user:
            user = await User.find_one({"$or": [{"phone": user_id}, {"email": user_id}]})
    except Exception:
        pass

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or disabled",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Optional[User]:
    """Return User if valid token is provided, otherwise None."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        from bson import ObjectId
        user = None
        if ObjectId.is_valid(user_id):
            user = await User.get(user_id)
        if not user:
            user = await User.find_one({"$or": [{"phone": user_id}, {"email": user_id}]})
        return user if user and user.is_active else None
    except Exception:
        return None


def require_roles(*allowed_roles: Role):
    """Dependency that restricts route access to specified roles."""
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles and user.role != Role.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{user.role}' not permitted",
            )
        return user

    return role_checker


def require_capability(capability: str):
    """Dependency checking capability matrix for hospital staff."""
    async def capability_checker(user: User = Depends(get_current_user)) -> User:
        if user.role == Role.SUPER_ADMIN:
            return user
        role_caps = DEFAULT_PERMISSIONS.get(user.role.value, {})
        if not role_caps.get(capability, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: missing capability '{capability}'",
            )
        return user

    return capability_checker


def require_kiosk_auth(
    x_kiosk_api_key: Optional[str] = Header(None, alias="x-kiosk-api-key"),
) -> bool:
    """Validate kiosk requests via physical terminal API key."""
    settings = get_settings()
    if not x_kiosk_api_key or x_kiosk_api_key != settings.KIOSK_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing kiosk API key",
        )
    return True
