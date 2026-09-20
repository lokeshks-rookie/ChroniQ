"""ChroniQ Security Hardening & Isolation Test Suite (Phase 3)."""
from datetime import timedelta
import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.accounts import User
from app.models.booking import Appointment, PatientSnapshot, QueueEntry
from app.models.common import AppointmentStatus, QueueStatus, Role, SlotStatus, utcnow
from app.models.hospitals import Department, Doctor, Hospital
from app.models.scheduling import Slot


@pytest.mark.asyncio
async def test_public_registration_privilege_escalation_prevented(async_client: AsyncClient):
    """Test FIND-01: Public self-registration rejects arbitrary non-patient roles."""
    # Attempt super_admin registration
    res = await async_client.post(
        "/auth/register",
        json={
            "name": "Attacker",
            "phone": "+91 99999 00001",
            "email": "attacker1@evil.com",
            "password": "Password123!",
            "role": "super_admin",
        },
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"
    assert "Self-registration is restricted to patient accounts" in res.json()["detail"]

    # Attempt hospital_admin registration
    res2 = await async_client.post(
        "/auth/register",
        json={
            "name": "Attacker2",
            "phone": "+91 99999 00002",
            "email": "attacker2@evil.com",
            "password": "Password123!",
            "role": "hospital_admin",
        },
    )
    assert res2.status_code == 403


@pytest.mark.asyncio
async def test_staff_management_rbac_and_privilege_escalation(
    async_client: AsyncClient,
    test_patient_token: str,
    test_hospital_admin_token: str,
):
    """Test FIND-02: RBAC and role boundaries for staff creation."""
    headers_patient = {"Authorization": f"Bearer {test_patient_token}"}
    headers_hosp_admin = {"Authorization": f"Bearer {test_hospital_admin_token}"}

    # 1. Patient attempting to create staff -> 403 Forbidden
    res = await async_client.post(
        "/admin/staff",
        headers=headers_patient,
        json={"name": "Fake Staff", "role": "receptionist"},
    )
    assert res.status_code == 403

    # 2. Hospital admin attempting to create super_admin -> 403 Forbidden
    res2 = await async_client.post(
        "/admin/staff",
        headers=headers_hosp_admin,
        json={"name": "Rogue Super Admin", "role": "super_admin", "phone": "+91 99999 00003"},
    )
    assert res2.status_code == 403
    assert "Hospital administrators can only create doctor and receptionist accounts" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_cross_hospital_isolation_on_departments(
    async_client: AsyncClient,
    test_patient_token: str,
    test_hospital_admin_token: str,
):
    """Test FIND-03: Hospital Admin cannot modify departments of another hospital."""
    # Create test department belonging to another hospital 'hosp_other_99'
    dept = Department(
        custom_id="dept_isolated_test",
        hospital_id="hosp_other_99",
        name="Isolated Dept",
        code="ISO",
        token_prefix="ISO",
        is_active=True,
    )
    await dept.insert()

    # Patient attempting to modify department -> 403 Forbidden
    headers_patient = {"Authorization": f"Bearer {test_patient_token}"}
    res_patient = await async_client.put(
        f"/admin/departments/{dept.custom_id}",
        headers=headers_patient,
        json={"name": "Hacked Dept"},
    )
    assert res_patient.status_code == 403

    # Hospital admin (belonging to hosp_city_01) attempting to modify dept of hosp_other_99 -> 403 Forbidden
    headers_hosp_admin = {"Authorization": f"Bearer {test_hospital_admin_token}"}
    res_admin = await async_client.put(
        f"/admin/departments/{dept.custom_id}",
        headers=headers_hosp_admin,
        json={"name": "Hacked Dept"},
    )
    assert res_admin.status_code == 403
    assert "Access denied to this hospital's department" in res_admin.json()["detail"]

    # Cleanup
    await dept.delete()


@pytest.mark.asyncio
async def test_queue_operations_rbac_and_cross_patient_checkin(
    async_client: AsyncClient,
    test_patient_token: str,
    test_other_patient_token: str,
):
    """Test FIND-04: Queue mutation endpoints reject patients and cross-patient check-in."""
    headers_patient = {"Authorization": f"Bearer {test_patient_token}"}

    # 1. Patient attempting call-next -> 403 Forbidden
    res_call = await async_client.post(
        "/queue/call-next",
        headers=headers_patient,
        json={"doctor_id": "doc_test_1"},
    )
    assert res_call.status_code == 403

    # 2. Patient attempting complete -> 403 Forbidden
    res_comp = await async_client.post(
        "/queue/complete",
        headers=headers_patient,
        json={"entry_id": "some_entry_id"},
    )
    assert res_comp.status_code == 403

    # 3. Patient attempting check-in on another patient's appointment
    victim_user = await User.find_one(User.email == "other_patient")
    victim_id = str(victim_user.id) if victim_user else "victim_id_1"

    victim_appt = Appointment(
        booking_code="APT-VICTIM",
        patient_id=victim_id,
        patient=PatientSnapshot(name="Victim Patient", age=30, gender="male", phone="+91 90000 00005"),
        hospital_id="hosp_city_01",
        hospital_name="City Hospital",
        department_id="dept_gen",
        department_name="General Medicine",
        doctor_id="doc_test_1",
        doctor_name="Dr. Test Doctor",
        slot_id="slot_dummy",
        scheduled_start=utcnow(),
        scheduled_end=utcnow() + timedelta(minutes=15),
        status=AppointmentStatus.BOOKED,
    )
    await victim_appt.insert()

    # Attacker patient calls check-in for victim's appointment -> 403 Forbidden
    res_checkin = await async_client.post(
        "/queue/check-in",
        headers=headers_patient,
        json={"appointment_id": str(victim_appt.id)},
    )
    assert res_checkin.status_code == 403
    assert "Cannot check in another patient's appointment" in res_checkin.json()["detail"]

    # Cleanup
    await victim_appt.delete()


@pytest.mark.asyncio
async def test_slot_hold_ownership_and_theft_prevention(
    async_client: AsyncClient,
    test_patient_token: str,
    test_other_patient_token: str,
):
    """Test FIND-05: Patient B cannot book a slot actively held by Patient A."""
    now = utcnow()
    slot = Slot(
        doctor_id="doc_test_hold",
        hospital_id="hosp_city_01",
        department_id="dept_gen",
        start=now + timedelta(hours=2),
        end=now + timedelta(hours=2, minutes=15),
        status=SlotStatus.OPEN,
    )
    await slot.insert()

    headers_a = {"Authorization": f"Bearer {test_patient_token}"}
    headers_b = {"Authorization": f"Bearer {test_other_patient_token}"}

    # Patient A holds slot
    hold_res = await async_client.post(f"/slots/{str(slot.id)}/hold", headers=headers_a)
    assert hold_res.status_code == 200

    # Ensure Doctor exists for booking
    doc = await Doctor.find_one(Doctor.custom_id == "doc_test_hold")
    if not doc:
        doc = Doctor(
            custom_id="doc_test_hold",
            hospital_id="hosp_city_01",
            department_id="dept_gen",
            name="Dr. Test Hold",
            specialty="General",
            fee=500,
        )
        await doc.insert()

    # Patient B attempts to book Patient A's held slot -> 403 Forbidden
    book_res_b = await async_client.post(
        "/appointments",
        headers=headers_b,
        json={
            "slot_id": str(slot.id),
            "doctor_id": "doc_test_hold",
            "reason": "Trying to steal slot",
        },
    )
    assert book_res_b.status_code == 403
    assert "You do not hold this slot" in book_res_b.json()["detail"]

    # Patient A books their own slot -> 201 Created
    book_res_a = await async_client.post(
        "/appointments",
        headers=headers_a,
        json={
            "slot_id": str(slot.id),
            "doctor_id": "doc_test_hold",
            "reason": "Legitimate booking",
        },
    )
    assert book_res_a.status_code == 201

    # Cleanup
    await Appointment.find_one(Appointment.slot_id == str(slot.id)).delete()
    await slot.delete()
    await doc.delete()


@pytest.mark.asyncio
async def test_queue_state_machine_validation(async_client: AsyncClient):
    """Test FIND-06: State machine rejects check-in for cancelled appointments."""
    await Appointment.find(Appointment.booking_code == "APT-CANCELLED").delete()
    now = utcnow()
    cancelled_appt = Appointment(
        booking_code="APT-CANCELLED",
        patient_id="patient_test_id",
        patient=PatientSnapshot(name="Cancelled Patient", age=45, gender="female", phone="+91 90000 00004"),
        hospital_id="hosp_city_01",
        hospital_name="City Hospital",
        department_id="dept_gen",
        department_name="General Medicine",
        doctor_id="doc_test_1",
        doctor_name="Dr. Test Doctor",
        slot_id="slot_dummy_2",
        scheduled_start=now,
        scheduled_end=now + timedelta(minutes=15),
        status=AppointmentStatus.CANCELLED,
    )
    await cancelled_appt.insert()

    # Attempt check-in on cancelled appointment
    res = await async_client.post(
        "/queue/check-in",
        json={"appointment_id": str(cancelled_appt.id)},
    )
    assert res.status_code == 400
    assert "Cannot check in a cancelled appointment" in res.json()["detail"]

    # Cleanup
    await cancelled_appt.delete()


@pytest.mark.asyncio
async def test_security_headers_present(async_client: AsyncClient):
    """Test FIND-08: Security headers are added to HTTP responses."""
    res = await async_client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
