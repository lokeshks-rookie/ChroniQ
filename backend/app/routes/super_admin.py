"""Super Admin Operations Router (Hospital Onboarding, Approvals, Global Analytics)."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user, require_roles
from app.models.accounts import User
from app.models.booking import Appointment, QueueEntry
from app.models.common import HospitalStatus, Role, utcnow
from app.models.hospitals import Department, Doctor, Hospital
from app.models.system import AuditLog

router = APIRouter(prefix="/super", tags=["Super Admin"])


class HospitalCreateBody(BaseModel):
    name: str
    code: Optional[str] = None
    city: str
    address: str
    phone: str
    email: str
    lat: Optional[float] = 13.0827
    lng: Optional[float] = 80.2707


class HospitalStatusBody(BaseModel):
    status: HospitalStatus


@router.get("/hospitals")
async def list_all_hospitals(
    status_filter: Optional[HospitalStatus] = Query(None),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    """List all onboarded hospitals across platform."""
    if status_filter:
        hospitals = await Hospital.find(Hospital.status == status_filter).to_list()
    else:
        hospitals = await Hospital.find_all().to_list()
    return [h.dict() for h in hospitals]


@router.post("/hospitals", status_code=status.HTTP_201_CREATED)
async def onboard_hospital(
    payload: HospitalCreateBody,
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    """Onboard a new hospital to ChroniQ."""
    code = payload.code or payload.name[:4].upper()
    custom_id = f"hosp_{code.lower()}"

    hospital = Hospital(
        custom_id=custom_id,
        name=payload.name,
        city=payload.city,
        address=payload.address,
        phone=payload.phone,
        email=payload.email,
        status=HospitalStatus.ACTIVE,
        location={"type": "Point", "coordinates": [payload.lng or 80.2707, payload.lat or 13.0827]},
    )
    await hospital.insert()
    return hospital.dict()


@router.patch("/hospitals/{id}/status")
async def update_hospital_status(
    id: str,
    payload: HospitalStatusBody,
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    """Approve or suspend hospital account."""
    hosp = await Hospital.find_one(Hospital.custom_id == id)
    if not hosp:
        hosp = await Hospital.get(id)
    if not hosp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

    hosp.status = payload.status
    hosp.updated_at = utcnow()
    await hosp.save()
    return {"success": True, "hospital_id": id, "status": hosp.status}


@router.get("/analytics")
@router.get("/analytics/overview")
async def platform_analytics(
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    """Global system health and throughput metrics."""
    hosp_count = await Hospital.count()
    active_hosp_count = await Hospital.find(Hospital.status == HospitalStatus.ACTIVE).count()
    doctor_count = await Doctor.count()
    active_doctor_count = await Doctor.find(Doctor.is_active == True).count()
    user_count = await User.count()
    appt_count = await Appointment.count()
    queue_count = await QueueEntry.count()

    return {
        "total_hospitals": hosp_count,
        "active_hospitals": active_hosp_count,
        "total_doctors": doctor_count,
        "active_doctors": active_doctor_count,
        "total_users": user_count,
        "total_appointments": appt_count,
        "total_queue_tokens": queue_count,
    }


@router.get("/users")
async def list_platform_users(
    role: Optional[Role] = Query(None),
    limit: int = Query(100),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    """List platform accounts with role filtering."""
    query = User.find(User.role == role) if role else User.find_all()
    users = await query.limit(limit).to_list()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "phone": u.phone,
            "email": u.email,
            "role": u.role,
            "hospital_id": u.hospital_id,
            "is_active": u.is_active,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.get("/audit")
async def global_audit_log(
    limit: int = Query(100),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    """View platform-wide security and operations audit log."""
    logs = await AuditLog.find_all().sort("-timestamp").limit(limit).to_list()
    return [l.dict() for l in logs]
