"""Hospital Administration Router: Departments, Doctors, Schedules, Leaves, Staff, Settings, Notes, Broadcasts, Audit."""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user, require_roles
from app.core.security import hash_password
from app.models.accounts import PatientNote, User
from app.models.booking import Appointment, QueueEntry
from app.models.common import AppointmentStatus, Channel, CreatedVia, QueueStatus, Role, utcnow
from app.models.hospitals import Department, Doctor, Hospital
from app.models.scheduling import DoctorLeave, DoctorSchedule
from app.models.system import AuditLog, BroadcastLog, NotificationTemplate
from app.schemas.admin import (
    AuditLogCreate,
    BroadcastCreateRequest,
    BroadcastDelayRequest,
    HospitalPoliciesUpdate,
    HospitalProfileUpdate,
    PatientNoteCreate,
    ScheduleUpdate,
    StaffCreate,
    StaffUpdate,
    TemplateUpdate,
)

router = APIRouter(prefix="", tags=["Hospital Admin"])


# ==========================================
# Departments
# ==========================================

@router.get("/admin/departments")
async def list_admin_departments(
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN, Role.RECEPTIONIST)),
):
    """List departments for admin's hospital."""
    hosp_id = current_user.hospital_id or "hosp_city_01"
    depts = await Department.find(Department.hospital_id == hosp_id).to_list()
    return [d.dict() for d in depts]


@router.post("/admin/departments", status_code=status.HTTP_201_CREATED)
async def create_department(
    dept_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Create a new department."""
    hosp_id = current_user.hospital_id if current_user.role == Role.HOSPITAL_ADMIN else dept_data.get("hospital_id", current_user.hospital_id or "hosp_city_01")
    custom_id = dept_data.get("id") or f"dept_{dept_data.get('code', 'gen').lower()}"

    dept = Department(
        custom_id=custom_id,
        hospital_id=hosp_id,
        name=dept_data.get("name", "New Department"),
        code=dept_data.get("code", "NEW"),
        token_prefix=dept_data.get("token_prefix", "Q"),
        icon=dept_data.get("icon", "Stethoscope"),
        is_active=dept_data.get("is_active", True),
    )
    await dept.insert()
    return dept.dict()


@router.put("/admin/departments/{id}")
async def update_department(
    id: str,
    dept_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Update department details."""
    dept = await Department.find_one(Department.custom_id == id)
    if not dept:
        dept = await Department.get(id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if current_user.role == Role.HOSPITAL_ADMIN and dept.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's department")

    if "name" in dept_data:
        dept.name = dept_data["name"]
    if "code" in dept_data:
        dept.code = dept_data["code"]
    if "token_prefix" in dept_data:
        dept.token_prefix = dept_data["token_prefix"]
    if "icon" in dept_data:
        dept.icon = dept_data["icon"]
    if "is_active" in dept_data:
        dept.is_active = dept_data["is_active"]

    await dept.save()
    return dept.dict()


@router.patch("/admin/departments/{id}/status")
async def toggle_department_status(
    id: str,
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Toggle department active status."""
    dept = await Department.find_one(Department.custom_id == id)
    if not dept:
        dept = await Department.get(id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if current_user.role == Role.HOSPITAL_ADMIN and dept.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's department")

    dept.is_active = not dept.is_active
    await dept.save()
    return {"success": True, "is_active": dept.is_active}


# ==========================================
# Doctors
# ==========================================

@router.get("/admin/doctors")
async def list_admin_doctors(
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN, Role.RECEPTIONIST)),
):
    """List doctors in admin's hospital."""
    hosp_id = current_user.hospital_id or "hosp_city_01"
    doctors = await Doctor.find(Doctor.hospital_id == hosp_id).to_list()
    return [d.dict() for d in doctors]


@router.post("/admin/doctors", status_code=status.HTTP_201_CREATED)
async def create_doctor(
    doc_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Create a new doctor."""
    hosp_id = current_user.hospital_id if current_user.role == Role.HOSPITAL_ADMIN else doc_data.get("hospital_id", current_user.hospital_id or "hosp_city_01")
    custom_id = doc_data.get("id") or f"doc_{len(await Doctor.all().to_list()) + 1}"

    doctor = Doctor(
        custom_id=custom_id,
        hospital_id=hosp_id,
        department_id=doc_data.get("department_id", "dept_gen"),
        name=doc_data.get("name", "Dr. Unknown"),
        qualification=doc_data.get("qualification", "MBBS"),
        specialty=doc_data.get("specialty", "General"),
        room=doc_data.get("room", "Room 1"),
        fee=doc_data.get("fee", 500),
        avg_consult_minutes=doc_data.get("avg_consult_minutes", 10.0),
        is_active=doc_data.get("is_active", True),
        email=doc_data.get("email"),
        phone=doc_data.get("phone"),
    )
    await doctor.insert()
    return doctor.dict()


@router.put("/admin/doctors/{id}")
async def update_doctor(
    id: str,
    doc_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Update doctor details."""
    doc = await Doctor.find_one(Doctor.custom_id == id)
    if not doc:
        doc = await Doctor.get(id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    if current_user.role == Role.HOSPITAL_ADMIN and doc.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's doctor")

    for field in ["name", "qualification", "specialty", "room", "fee", "avg_consult_minutes", "is_active", "department_id", "photo_url"]:
        if field in doc_data:
            setattr(doc, field, doc_data[field])

    doc.updated_at = utcnow()
    await doc.save()
    return doc.dict()


@router.patch("/admin/doctors/{id}/status")
async def toggle_doctor_status(
    id: str,
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Toggle doctor active status."""
    doc = await Doctor.find_one(Doctor.custom_id == id)
    if not doc:
        doc = await Doctor.get(id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    if current_user.role == Role.HOSPITAL_ADMIN and doc.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's doctor")

    doc.is_active = not doc.is_active
    doc.updated_at = utcnow()
    await doc.save()
    return {"success": True, "affectedCount": 1, "is_active": doc.is_active}


# ==========================================
# Schedules & Leaves
# ==========================================

@router.get("/admin/schedules/{doctor_id}")
async def get_doctor_schedule(doctor_id: str):
    """Get schedule for a doctor."""
    sched = await DoctorSchedule.find_one(DoctorSchedule.doctor_id == doctor_id)
    if not sched:
        return {"doctor_id": doctor_id, "slot_minutes": 15, "weekly": []}
    return sched.dict()


@router.put("/admin/schedules/{doctor_id}")
async def save_doctor_schedule(
    doctor_id: str,
    sched_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)),
):
    """Save or update a doctor's weekly shift schedule."""
    doc = await Doctor.find_one(Doctor.custom_id == doctor_id)
    if not doc:
        doc = await Doctor.get(doctor_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # Authorization
    if current_user.role == Role.DOCTOR:
        linked = current_user.linked_doctor_id or str(current_user.id)
        if linked not in (doctor_id, doc.custom_id, str(doc.id)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot edit another doctor's schedule")
    elif current_user.role == Role.HOSPITAL_ADMIN and doc.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's doctor schedule")

    hosp_id = doc.hospital_id if doc else (current_user.hospital_id or "hosp_city_01")

    sched = await DoctorSchedule.find_one(DoctorSchedule.doctor_id == doctor_id)
    if not sched:
        sched = DoctorSchedule(
            doctor_id=doctor_id,
            hospital_id=hosp_id,
            slot_minutes=sched_data.get("slot_minutes", 15),
            weekly=sched_data.get("weekly", []),
            updated_at=utcnow(),
        )
        await sched.insert()
    else:
        sched.slot_minutes = sched_data.get("slot_minutes", sched.slot_minutes)
        if "weekly" in sched_data:
            sched.weekly = sched_data["weekly"]
        sched.updated_at = utcnow()
        await sched.save()

    return {"success": True, "schedule": sched.dict()}


@router.post("/admin/doctors/{id}/leaves")
async def add_admin_doctor_leave(
    id: str,
    leave_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)),
):
    """Add a leave period for a doctor."""
    doc = await Doctor.find_one(Doctor.custom_id == id)
    if not doc:
        doc = await Doctor.get(id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # Authorization
    if current_user.role == Role.DOCTOR:
        linked = current_user.linked_doctor_id or str(current_user.id)
        if linked not in (id, doc.custom_id, str(doc.id)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot submit leave for another doctor")
    elif current_user.role == Role.HOSPITAL_ADMIN and doc.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's doctor leave")

    hosp_id = doc.hospital_id if doc else (current_user.hospital_id or "hosp_city_01")

    leave = DoctorLeave(
        doctor_id=id,
        hospital_id=hosp_id,
        date_from=leave_data.get("date_from", leave_data.get("start_date", "")),
        date_to=leave_data.get("date_to", leave_data.get("end_date", "")),
        reason=leave_data.get("reason", "Leave"),
        created_at=utcnow(),
    )
    await leave.insert()

    # Mark affected appointments
    affected = await Appointment.find(Appointment.doctor_id == id, Appointment.status == AppointmentStatus.BOOKED).to_list()
    affected_count = 0
    for a in affected:
        d_str = a.scheduled_start.strftime("%Y-%m-%d")
        if leave.date_from <= d_str <= leave.date_to:
            a.needs_reschedule = True
            await a.save()
            affected_count += 1

    return {"success": True, "affectedCount": affected_count, "leave_id": str(leave.id)}


@router.delete("/admin/doctors/leaves/{leave_id}")
async def delete_doctor_leave(
    leave_id: str,
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)),
):
    """Delete a scheduled doctor leave."""
    leave = await DoctorLeave.get(leave_id)
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave record not found")

    if current_user.role == Role.HOSPITAL_ADMIN and leave.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this hospital's leave record")

    await leave.delete()
    return {"success": True}


# ==========================================
# Settings & Policies
# ==========================================

@router.patch("/admin/settings/policies")
async def update_hospital_policies(
    settings_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Update hospital queuing and booking policies."""
    hosp_id = current_user.hospital_id or "hosp_city_01"
    hosp = await Hospital.find_one(Hospital.custom_id == hosp_id)
    if not hosp:
        hosp = await Hospital.get(hosp_id)
    if not hosp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

    for k, v in settings_data.items():
        if hasattr(hosp.settings, k):
            setattr(hosp.settings, k, v)

    hosp.updated_at = utcnow()
    await hosp.save()
    return {"success": True, "settings": hosp.settings.dict()}


@router.patch("/admin/settings/profile")
async def update_hospital_profile(
    profile_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Update hospital profile details."""
    hosp_id = current_user.hospital_id or "hosp_city_01"
    hosp = await Hospital.find_one(Hospital.custom_id == hosp_id)
    if not hosp:
        hosp = await Hospital.get(hosp_id)
    if not hosp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

    for k in ["name", "phone", "email", "address", "timings", "facilities"]:
        if k in profile_data:
            setattr(hosp, k, profile_data[k])

    hosp.updated_at = utcnow()
    await hosp.save()
    return {"success": True, "hospital": hosp.dict()}


@router.put("/admin/settings/templates/{type}")
async def save_notification_template(
    type: str,
    template_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Save or update notification template."""
    hosp_id = current_user.hospital_id or "hosp_city_01"
    now = utcnow()

    tpl = await NotificationTemplate.find_one(
        NotificationTemplate.hospital_id == hosp_id,
        NotificationTemplate.type == type,
    )
    if not tpl:
        tpl = NotificationTemplate(
            hospital_id=hosp_id,
            type=type,
            template_text=template_data.get("template_text", ""),
            channels=template_data.get("channels", {"sms": True, "email": True, "in_app": True}),
            updated_at=now,
        )
        await tpl.insert()
    else:
        tpl.template_text = template_data.get("template_text", tpl.template_text)
        if "channels" in template_data:
            tpl.channels = template_data["channels"]
        tpl.updated_at = now
        await tpl.save()

    return {"success": True, "template": tpl.dict()}


@router.get("/admin/settings/templates")
@router.get("/admin/templates")
async def list_admin_templates(
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """List notification templates for current hospital."""
    hosp_id = current_user.hospital_id or "hosp_city_01"
    templates = await NotificationTemplate.find(NotificationTemplate.hospital_id == hosp_id).to_list()
    return [t.dict() for t in templates]


# ==========================================
# Staff Management
# ==========================================

@router.get("/admin/staff")
async def list_admin_staff(current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN))):
    """List staff members of current hospital."""
    hosp_id = current_user.hospital_id or "hosp_city_01"
    staff = await User.find(
        User.hospital_id == hosp_id,
        User.role != Role.PATIENT,
    ).to_list()
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
        for u in staff
    ]


@router.post("/admin/staff", status_code=status.HTTP_201_CREATED)
async def create_staff(
    staff_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Create a new staff user."""
    requested_role = Role(staff_data.get("role", "receptionist"))
    if current_user.role == Role.HOSPITAL_ADMIN:
        hosp_id = current_user.hospital_id or "hosp_city_01"
        if requested_role not in (Role.DOCTOR, Role.RECEPTIONIST):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hospital administrators can only create doctor and receptionist accounts.",
            )
    else:
        hosp_id = staff_data.get("hospital_id") or current_user.hospital_id or "hosp_city_01"

    password = staff_data.get("password") or "ChroniQ@Staff123"

    user = User(
        name=staff_data.get("name", "Staff Member"),
        phone=staff_data.get("phone", "9000000000"),
        email=staff_data.get("email"),
        password_hash=hash_password(password),
        role=requested_role,
        hospital_id=hosp_id,
        is_active=True,
        is_verified=True,
    )
    await user.insert()
    return {"success": True, "user_id": str(user.id)}


@router.put("/admin/staff/{id}")
async def update_staff(
    id: str,
    staff_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Update staff details."""
    user = await User.get(id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found")

    if current_user.role == Role.HOSPITAL_ADMIN:
        if user.hospital_id != current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot edit staff belonging to another hospital.",
            )
        if "role" in staff_data:
            target_role = Role(staff_data["role"])
            if target_role not in (Role.DOCTOR, Role.RECEPTIONIST):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Hospital administrators cannot promote accounts to administrative roles.",
                )

    for k in ["name", "phone", "email", "role", "is_active"]:
        if k in staff_data:
            if k == "role":
                user.role = Role(staff_data[k])
            else:
                setattr(user, k, staff_data[k])

    user.updated_at = utcnow()
    await user.save()
    return {"success": True, "user_id": str(user.id)}


@router.patch("/admin/staff/{id}/status")
async def toggle_staff_status(
    id: str,
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Toggle staff user active state."""
    user = await User.get(id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found")

    if current_user.role == Role.HOSPITAL_ADMIN and user.hospital_id != current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot toggle status of staff from another hospital.",
        )

    user.is_active = not user.is_active
    user.updated_at = utcnow()
    await user.save()
    return {"success": True, "is_active": user.is_active}


# ==========================================
# Patient Notes, Broadcasts, Audit Logs
# ==========================================

@router.post("/patients/{id}/notes")
async def add_patient_note(
    id: str,
    note_data: Dict[str, Any],
    current_user: User = Depends(require_roles(Role.RECEPTIONIST, Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Add front-desk / staff note to patient record."""
    note = PatientNote(
        patient_id=id,
        author_id=note_data.get("author_id", str(current_user.id)),
        author_name=note_data.get("author_name", current_user.name),
        note=note_data.get("note", ""),
        created_at=utcnow(),
    )
    await note.insert()
    return {"success": True, "note_id": str(note.id)}


@router.post("/notifications/broadcast-delay")
async def broadcast_delay(
    payload: BroadcastDelayRequest,
    current_user: User = Depends(require_roles(Role.RECEPTIONIST, Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Broadcast doctor delay alert to all waiting patients."""
    from app.services.notification_service import send_multi_channel_notification

    hosp_id = current_user.hospital_id or "hosp_city_01"
    today = utcnow().strftime("%Y-%m-%d")

    # Find affected queue entries
    entries = await QueueEntry.find(
        QueueEntry.doctor_id == payload.doctor_id,
        QueueEntry.queue_date == today,
    ).to_list()

    sent_count = 0
    message = payload.message or f"Your doctor is delayed by approximately {payload.minutes_delayed} minutes. Please check the live queue."
    for e in entries:
        appt = await Appointment.get(e.appointment_id)
        if appt and appt.patient_id:
            await send_multi_channel_notification(
                user_id=appt.patient_id,
                title="Doctor Delay Notice",
                message=message,
                channels=payload.channels,
            )
            sent_count += 1

    # Log broadcast
    log = BroadcastLog(
        hospital_id=hosp_id,
        type="delay",
        audience_type="doctor",
        target_id=payload.doctor_id,
        message=message,
        recipients_count=len(entries),
        sent_count=sent_count,
        sent_at=utcnow(),
    )
    await log.insert()

    return {"success": True, "recipients_count": len(entries), "sent_count": sent_count}


@router.post("/audit/log")
async def log_audit(
    log_data: Dict[str, Any],
    current_user: Optional[User] = Depends(get_current_user),
):
    """Record an audit log entry."""
    entry = AuditLog(
        actor_id=str(current_user.id) if current_user else "system",
        actor_name=current_user.name if current_user else "System",
        actor_role=current_user.role if current_user else Role.RECEPTIONIST,
        hospital_id=current_user.hospital_id if current_user else None,
        action=log_data.get("action", "action"),
        entity=log_data.get("entity", "system"),
        entity_id=log_data.get("entity_id"),
        details=log_data.get("details"),
        via=CreatedVia.WEB,
        timestamp=utcnow(),
    )
    await entry.insert()
    return {"success": True, "log_id": str(entry.id)}


@router.get("/audit/log")
async def get_audit_logs(
    limit: int = Query(50),
    current_user: User = Depends(require_roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Retrieve hospital audit trail."""
    query = AuditLog.find()
    if current_user.role == Role.HOSPITAL_ADMIN:
        hosp_id = current_user.hospital_id or "hosp_city_01"
        query = AuditLog.find(AuditLog.hospital_id == hosp_id)

    logs = await query.sort("-timestamp").limit(limit).to_list()
    return [l.dict() for l in logs]


@router.get("/admin/queue")
async def get_hospital_queue(
    hospital_id: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    current_user: User = Depends(require_roles(Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)),
):
    """Get active live queue entries for the hospital."""
    from app.services.queue_service import get_today_ist
    if current_user.role in (Role.HOSPITAL_ADMIN, Role.RECEPTIONIST):
        hosp_id = current_user.hospital_id or "hosp_city_01"
    else:
        hosp_id = hospital_id or current_user.hospital_id or "hosp_city_01"

    target_date = date or get_today_ist()
    entries = await QueueEntry.find(
        QueueEntry.hospital_id == hosp_id,
        QueueEntry.queue_date == target_date,
    ).sort([("status", 1), ("token_number", 1)]).to_list()
    return [e.dict() for e in entries]


@router.get("/admin/dashboard/stats")
async def get_admin_dashboard_stats(
    hospital_id: Optional[str] = Query(None),
    current_user: User = Depends(require_roles(Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)),
):
    """Get summarized dashboard KPIs for the hospital today."""
    from app.services.queue_service import get_today_ist
    if current_user.role in (Role.HOSPITAL_ADMIN, Role.RECEPTIONIST):
        hosp_id = current_user.hospital_id or "hosp_city_01"
    else:
        hosp_id = hospital_id or current_user.hospital_id or "hosp_city_01"

    today = get_today_ist()
    appts = await Appointment.find(Appointment.hospital_id == hosp_id).to_list()
    queue = await QueueEntry.find(QueueEntry.hospital_id == hosp_id, QueueEntry.queue_date == today).to_list()

    completed = len([a for a in appts if a.status == AppointmentStatus.COMPLETED])
    waiting = len([q for q in queue if q.status == QueueStatus.WAITING])
    in_consult = len([q for q in queue if q.status in (QueueStatus.IN_CONSULTATION, QueueStatus.CALLED)])
    no_shows = len([a for a in appts if a.status == AppointmentStatus.NO_SHOW])
    waiting_items = [q for q in queue if q.status == QueueStatus.WAITING]
    avg_wait = round(sum(q.eta_minutes or 10 for q in waiting_items) / len(waiting_items)) if waiting_items else 14

    return {
        "total_appointments_today": len(appts),
        "completed_appointments": completed,
        "remaining_appointments": max(0, len(appts) - completed),
        "waiting_patients_now": waiting,
        "in_consultation_count": in_consult,
        "no_show_count": no_shows,
        "avg_wait_minutes": avg_wait,
    }

