"""ChroniQ Real-Time Queue Engine & ETA Calculation Service."""
from datetime import datetime, timedelta, timezone
import logging
from typing import Dict, List, Optional
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.core.sse import broadcaster
from app.models.booking import Appointment, QueueEntry, StatusEvent, TokenCounter
from app.models.common import AppointmentStatus, QueueStatus, utcnow
from app.models.hospitals import Department, Doctor, Hospital
from app.models.system import DoctorAvailabilityState

logger = logging.getLogger("chroniq.queue")


def get_today_ist() -> str:
    """Get today's date string in IST (Asia/Kolkata)."""
    utc_now = datetime.now(timezone.utc)
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    return ist_now.strftime("%Y-%m-%d")


async def get_doctor(doctor_id: str) -> Optional[Doctor]:
    from bson import ObjectId
    doc = await Doctor.find_one(Doctor.custom_id == doctor_id)
    if not doc and ObjectId.is_valid(doctor_id):
        doc = await Doctor.get(doctor_id)
    return doc


async def get_department(dept_id: str) -> Optional[Department]:
    from bson import ObjectId
    dept = await Department.find_one(Department.custom_id == dept_id)
    if not dept and ObjectId.is_valid(dept_id):
        dept = await Department.get(dept_id)
    return dept


async def get_hospital(hosp_id: str) -> Optional[Hospital]:
    from bson import ObjectId
    hosp = await Hospital.find_one(Hospital.custom_id == hosp_id)
    if not hosp and ObjectId.is_valid(hosp_id):
        hosp = await Hospital.get(hosp_id)
    return hosp


async def get_next_token(hospital_id: str, department_id: str) -> str:
    """Atomically increment daily department token counter and format token."""
    today = get_today_ist()
    now = utcnow()
    two_days_later = now + timedelta(days=2)

    dept = await get_department(department_id)
    prefix = dept.token_prefix if dept and dept.token_prefix else "Q"

    counter = await TokenCounter.find_one(
        TokenCounter.hospital_id == hospital_id,
        TokenCounter.department_id == department_id,
        TokenCounter.date == today,
    )
    if not counter:
        counter = TokenCounter(
            hospital_id=hospital_id,
            department_id=department_id,
            date=today,
            seq=1,
            expire_at=two_days_later,
        )
        await counter.insert()
        seq = 1
    else:
        counter.seq += 1
        await counter.save()
        seq = counter.seq

    return f"{prefix}-{seq:03d}"


async def recompute_doctor_queue(doctor_id: str) -> List[QueueEntry]:
    """Recompute positions and ETAs for all waiting patients of a doctor."""
    settings = get_settings()
    today = get_today_ist()

    doctor = await get_doctor(doctor_id)
    avg_minutes = doctor.avg_consult_minutes if doctor else 10.0
    buffer_mult = 1.0 + (settings.ETA_BUFFER_PERCENT / 100.0)

    # Check for doctor delay or break
    avail = await DoctorAvailabilityState.find_one(DoctorAvailabilityState.doctor_id == doctor_id)
    delay_offset = avail.delay_minutes if avail and avail.delay_minutes > 0 else 0

    # Currently in-consultation entry
    active_entry = await QueueEntry.find_one(
        QueueEntry.doctor_id == doctor_id,
        QueueEntry.queue_date == today,
        QueueEntry.status == QueueStatus.IN_CONSULTATION,
    )

    remaining_current = 0.0
    if active_entry and active_entry.started_at:
        elapsed = (utcnow() - active_entry.started_at).total_seconds() / 60.0
        remaining_current = max(0.0, avg_minutes - elapsed)

    # Query all waiting entries sorted by priority ASC, sort_time ASC
    waiting = await QueueEntry.find(
        QueueEntry.doctor_id == doctor_id,
        QueueEntry.queue_date == today,
        QueueEntry.status == QueueStatus.WAITING,
    ).sort([("priority", 1), ("sort_time", 1)]).to_list()

    for idx, entry in enumerate(waiting):
        pos = idx + 1
        eta = remaining_current + (idx * avg_minutes * buffer_mult) + delay_offset
        entry.position = pos
        entry.eta_minutes = max(1, int(round(eta)))
        await entry.save()

    # Broadcast updated live queue over SSE
    await broadcaster.publish(
        channel=f"doctor:{doctor_id}",
        event_name="queue_updated",
        data={"doctor_id": doctor_id, "waiting_count": len(waiting)},
    )

    return waiting


async def check_in_patient(
    appointment_id: str,
    hospital_id: Optional[str] = None,
) -> QueueEntry:
    """Check in patient at front desk or kiosk."""
    appointment = await Appointment.get(appointment_id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if appointment.status in (AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_QUEUE, AppointmentStatus.COMPLETED):
        existing = await QueueEntry.find_one(QueueEntry.appointment_id == appointment_id)
        if existing:
            return existing

    today = get_today_ist()
    now = utcnow()

    # Check hospital policies for grace period
    hospital = await get_hospital(appointment.hospital_id)
    grace_minutes = hospital.settings.grace_period_minutes if hospital else 10

    # Late arrival rule
    is_late = False
    sort_time = appointment.scheduled_start
    if now > appointment.scheduled_start + timedelta(minutes=grace_minutes):
        is_late = True
        sort_time = now  # Reset to now so they fall behind on-time patients

    token = appointment.token
    if not token:
        token = await get_next_token(appointment.hospital_id, appointment.department_id)
        appointment.token = token

    token_number = int(token.split("-")[-1]) if "-" in token else 1

    entry = await QueueEntry.find_one(QueueEntry.appointment_id == appointment_id)
    if not entry:
        entry = QueueEntry(
            appointment_id=appointment_id,
            hospital_id=appointment.hospital_id,
            department_id=appointment.department_id,
            doctor_id=appointment.doctor_id,
            queue_date=today,
            token=token,
            token_number=token_number,
            priority=2,
            status=QueueStatus.WAITING,
            sort_time=sort_time,
            checked_in_at=now,
            is_late_arrival=is_late,
        )
        await entry.insert()
    else:
        entry.status = QueueStatus.WAITING
        entry.sort_time = sort_time
        entry.checked_in_at = now
        entry.is_late_arrival = is_late
        await entry.save()

    # Update appointment state
    appointment.status = AppointmentStatus.CHECKED_IN
    appointment.status_history.append(
        StatusEvent(status=AppointmentStatus.CHECKED_IN, at=now, note="Checked in and token issued")
    )
    appointment.updated_at = now
    await appointment.save()

    # Recompute ETAs
    await recompute_doctor_queue(appointment.doctor_id)

    # Publish notification on patient channel
    await broadcaster.publish(
        channel=f"patient:{appointment.patient_id}",
        event_name="checked_in",
        data={"appointment_id": appointment_id, "token": token},
    )

    return entry


async def call_next_patient(doctor_id: str, room: Optional[str] = None) -> Optional[QueueEntry]:
    """Call next patient waiting in the doctor's queue."""
    today = get_today_ist()
    now = utcnow()

    waiting = await QueueEntry.find(
        QueueEntry.doctor_id == doctor_id,
        QueueEntry.queue_date == today,
        QueueEntry.status == QueueStatus.WAITING,
    ).sort([("priority", 1), ("sort_time", 1)]).to_list()

    if not waiting:
        return None

    entry = waiting[0]
    entry.status = QueueStatus.CALLED
    entry.call_count += 1
    entry.called_at = now
    await entry.save()

    appt = await Appointment.get(entry.appointment_id)
    if appt:
        appt.status = AppointmentStatus.CALLED
        appt.status_history.append(
            StatusEvent(status=AppointmentStatus.CALLED, at=now, note=f"Called to {room or 'consultation room'}")
        )
        await appt.save()

    # Emit Call Event for display board and patient
    call_payload = {
        "entry_id": str(entry.id),
        "token": entry.token,
        "doctor_id": doctor_id,
        "department_id": entry.department_id,
        "room": room or "Room 1",
        "call_count": entry.call_count,
        "at": now.isoformat(),
    }
    await broadcaster.publish(f"department:{entry.department_id}", "call", call_payload)
    if appt:
        await broadcaster.publish(f"patient:{appt.patient_id}", "called", call_payload)

    await recompute_doctor_queue(doctor_id)
    return entry


async def complete_consultation(entry_id: str, consult_minutes: Optional[float] = None) -> QueueEntry:
    """Complete a consultation and update doctor's rolling average time."""
    entry = await QueueEntry.get(entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    now = utcnow()
    entry.status = QueueStatus.COMPLETED
    entry.completed_at = now

    actual_minutes = consult_minutes
    if actual_minutes is None and entry.started_at:
        actual_minutes = max(1.0, (now - entry.started_at).total_seconds() / 60.0)
    entry.consult_minutes = actual_minutes or 10.0
    await entry.save()

    appt = await Appointment.get(entry.appointment_id)
    if appt:
        appt.status = AppointmentStatus.COMPLETED
        appt.status_history.append(
            StatusEvent(status=AppointmentStatus.COMPLETED, at=now, note="Consultation completed")
        )
        await appt.save()

    # Update doctor rolling EMA: avg = 0.8 * avg + 0.2 * actual
    doctor = await get_doctor(entry.doctor_id)
    if doctor and entry.consult_minutes:
        doctor.avg_consult_minutes = (0.8 * doctor.avg_consult_minutes) + (0.2 * entry.consult_minutes)
        await doctor.save()

    await recompute_doctor_queue(entry.doctor_id)
    return entry


async def call_again(entry_id: str, room: Optional[str] = None) -> QueueEntry:
    """Call a patient again (increment call_count)."""
    entry = await QueueEntry.get(entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    now = utcnow()
    entry.call_count += 1
    entry.called_at = now
    entry.status = QueueStatus.CALLED
    await entry.save()

    appt = await Appointment.get(entry.appointment_id)
    if appt:
        appt.status_history.append(
            StatusEvent(status=AppointmentStatus.CALLED, at=now, note=f"Recalled (attempt {entry.call_count})")
        )
        await appt.save()

    call_payload = {
        "entry_id": str(entry.id),
        "token": entry.token,
        "doctor_id": entry.doctor_id,
        "department_id": entry.department_id,
        "room": room or "Room 1",
        "call_count": entry.call_count,
        "at": now.isoformat(),
    }
    await broadcaster.publish(f"department:{entry.department_id}", "call", call_payload)
    if appt:
        await broadcaster.publish(f"patient:{appt.patient_id}", "called", call_payload)

    return entry


async def start_consultation(entry_id: str) -> QueueEntry:
    """Doctor starts consultation with called patient."""
    entry = await QueueEntry.get(entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    now = utcnow()
    entry.status = QueueStatus.IN_CONSULTATION
    entry.started_at = now
    await entry.save()

    appt = await Appointment.get(entry.appointment_id)
    if appt:
        appt.status = AppointmentStatus.IN_CONSULTATION
        appt.status_history.append(
            StatusEvent(status=AppointmentStatus.IN_CONSULTATION, at=now, note="Consultation started")
        )
        await appt.save()

    await broadcaster.publish(
        channel=f"doctor:{entry.doctor_id}",
        event_name="consultation_started",
        data={"entry_id": str(entry.id), "token": entry.token},
    )

    await recompute_doctor_queue(entry.doctor_id)
    return entry


async def skip_patient(entry_id: str, reason: Optional[str] = None) -> QueueEntry:
    """Skip a patient in queue: increment skip_count, push 2 positions back."""
    entry = await QueueEntry.get(entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    now = utcnow()
    entry.skip_count += 1
    # Move sort_time forward by 15 minutes to push back in priority
    entry.sort_time = (entry.sort_time or now) + timedelta(minutes=15)
    entry.status = QueueStatus.WAITING
    await entry.save()

    appt = await Appointment.get(entry.appointment_id)
    if appt:
        appt.status = AppointmentStatus.IN_QUEUE
        appt.status_history.append(
            StatusEvent(status=AppointmentStatus.IN_QUEUE, at=now, note=f"Skipped: {reason or 'Patient not present'}")
        )
        await appt.save()

    await recompute_doctor_queue(entry.doctor_id)
    return entry


async def mark_no_show(entry_id: str) -> QueueEntry:
    """Mark a patient as no-show after failed calls."""
    entry = await QueueEntry.get(entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    now = utcnow()
    entry.status = QueueStatus.NO_SHOW
    await entry.save()

    appt = await Appointment.get(entry.appointment_id)
    if appt:
        appt.status = AppointmentStatus.NO_SHOW
        appt.status_history.append(
            StatusEvent(status=AppointmentStatus.NO_SHOW, at=now, note="Marked as no-show after multiple calls")
        )
        await appt.save()

    await recompute_doctor_queue(entry.doctor_id)
    return entry


async def change_entry_priority(entry_id: str, priority: int) -> QueueEntry:
    """Update priority for a queue entry (0 emergency, 1 priority, 2 normal)."""
    entry = await QueueEntry.get(entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found")

    entry.priority = priority
    await entry.save()
    await recompute_doctor_queue(entry.doctor_id)
    return entry


async def emergency_insert(
    doctor_id: str,
    patient_name: str,
    reason: str,
    hospital_id: Optional[str] = None,
    department_id: Optional[str] = None,
) -> QueueEntry:
    """Insert an emergency patient at top of queue (priority 0)."""
    now = utcnow()
    today = get_today_ist()

    doc = await get_doctor(doctor_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    hosp_id = hospital_id or doc.hospital_id
    dept_id = department_id or doc.department_id

    token = await get_next_token(hosp_id, dept_id)
    token_number = int(token.split("-")[-1]) if "-" in token else 1

    # Create dummy appointment for record
    from app.models.booking import PatientSnapshot
    from app.models.common import AppointmentType, CreatedVia
    from app.services.booking_service import generate_booking_code

    dummy_appt = Appointment(
        booking_code=generate_booking_code(),
        patient_id="emergency",
        patient=PatientSnapshot(name=patient_name, phone="9999999999", age=0, gender="other"),
        hospital_id=hosp_id,
        department_id=dept_id,
        doctor_id=doctor_id,
        hospital_name="Hospital",
        doctor_name=doc.name,
        department_name="Emergency",
        scheduled_start=now,
        scheduled_end=now + timedelta(minutes=15),
        type=AppointmentType.WALK_IN,
        reason=f"[EMERGENCY] {reason}",
        fee=0,
        status=AppointmentStatus.CHECKED_IN,
        created_via=CreatedVia.KIOSK,
        token=token,
    )
    await dummy_appt.insert()

    entry = QueueEntry(
        appointment_id=str(dummy_appt.id),
        hospital_id=hosp_id,
        department_id=dept_id,
        doctor_id=doctor_id,
        queue_date=today,
        token=token,
        token_number=token_number,
        priority=0,  # emergency
        status=QueueStatus.WAITING,
        sort_time=datetime(1970, 1, 1, tzinfo=timezone.utc),  # earliest possible
        checked_in_at=now,
    )
    await entry.insert()
    await recompute_doctor_queue(doctor_id)
    return entry

