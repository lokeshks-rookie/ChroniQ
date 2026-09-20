"""ChroniQ Backend Comprehensive Services & Database Audit Runner.
Executes live API endpoint tests across all 12 backend modules against MongoDB Atlas.
"""
import asyncio
from datetime import datetime, timedelta
import logging
import sys
import time
from typing import Any, Dict, List

from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.core.db import close_db, init_db
from app.main import app
from app.models.booking import Appointment, QueueEntry
from app.models.common import AppointmentStatus, Role, utcnow
from app.models.hospitals import Doctor, Hospital
from app.models.scheduling import Slot

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("chroniq.audit")


class AuditResults:
    def __init__(self):
        self.tests: List[Dict[str, Any]] = []

    def record(self, module: str, test_name: str, passed: bool, latency_ms: float, details: str = ""):
        status_str = "PASS" if passed else "FAIL"
        self.tests.append({
            "module": module,
            "test_name": test_name,
            "passed": passed,
            "latency_ms": round(latency_ms, 2),
            "details": details,
        })
        icon = "[OK]" if passed else "[FAIL]"
        logger.info(f"{icon} {module:<16} | {test_name:<38} | {latency_ms:>6.1f}ms | {details}")

    def summary(self) -> Dict[str, Any]:
        total = len(self.tests)
        passed = sum(1 for t in self.tests if t["passed"])
        failed = total - passed
        avg_latency = sum(t["latency_ms"] for t in self.tests) / total if total else 0.0
        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": round((passed / total) * 100, 1) if total else 0,
            "avg_latency_ms": round(avg_latency, 2),
        }


async def run_audit():
    settings = get_settings()
    logger.info("=" * 80)
    logger.info("CHRONIQ LIVE BACKEND SERVICES AUDIT")
    logger.info(f"Target Database: {settings.MONGODB_DB} on MongoDB Atlas")
    logger.info("=" * 80)

    # 1. Connect to Live Database
    db_ok = await init_db()
    if not db_ok:
        logger.error("Database connection failed. Aborting audit.")
        return 1

    results = AuditResults()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test", timeout=15.0) as client:
        # =====================================================================
        # MODULE 1: System Health
        # =====================================================================
        t0 = time.perf_counter()
        resp = await client.get("/health")
        lat = (time.perf_counter() - t0) * 1000
        results.record("1. Health", "GET /health", resp.status_code == 200, lat, f"Status: {resp.json().get('status')}")

        # =====================================================================
        # MODULE 2: Auth Service & RBAC
        # =====================================================================
        # 2.1 Hospital Admin Login
        t0 = time.perf_counter()
        resp = await client.post("/auth/login", json={"email": "admin.suresh@cityhospital.example.com", "password": "Password@123"})
        lat = (time.perf_counter() - t0) * 1000
        admin_data = resp.json()
        admin_token = admin_data.get("access_token")
        results.record("2. Auth", "Admin Login with Password", resp.status_code == 200 and bool(admin_token), lat, f"Role: {admin_data.get('user', {}).get('role')}")

        # 2.2 Doctor Login
        t0 = time.perf_counter()
        resp = await client.post("/auth/login", json={"email": "anand.r@cityhospital.example.com", "password": "Password@123"})
        lat = (time.perf_counter() - t0) * 1000
        doc_data = resp.json()
        doctor_token = doc_data.get("access_token")
        results.record("2. Auth", "Doctor Login with Password", resp.status_code == 200 and bool(doctor_token), lat, f"Role: {doc_data.get('user', {}).get('role')}")

        # 2.3 Patient Login
        t0 = time.perf_counter()
        resp = await client.post("/auth/login", json={"phone": "+91 98765 43210", "password": "Password@123"})
        lat = (time.perf_counter() - t0) * 1000
        patient_data = resp.json()
        patient_token = patient_data.get("access_token")
        results.record("2. Auth", "Patient Login with Password", resp.status_code == 200 and bool(patient_token), lat, f"User: {patient_data.get('user', {}).get('name')}")

        # 2.4 Super Admin Login
        t0 = time.perf_counter()
        resp = await client.post("/auth/login", json={"email": settings.SEED_SUPER_ADMIN_EMAIL, "password": settings.SEED_SUPER_ADMIN_PASSWORD})
        lat = (time.perf_counter() - t0) * 1000
        super_data = resp.json()
        super_token = super_data.get("access_token")
        results.record("2. Auth", "Super Admin Login", resp.status_code == 200 and bool(super_token), lat, f"Role: {super_data.get('user', {}).get('role')}")

        # 2.5 Auth Me with Bearer
        patient_headers = {"Authorization": f"Bearer {patient_token}"}
        t0 = time.perf_counter()
        resp = await client.get("/auth/me", headers=patient_headers)
        lat = (time.perf_counter() - t0) * 1000
        results.record("2. Auth", "GET /auth/me (Token verification)", resp.status_code == 200 and resp.json().get("phone") == "+91 98765 43210", lat, "Verified real DB user")

        # 2.6 RBAC Security Boundary (Patient denied access to Admin endpoint)
        t0 = time.perf_counter()
        resp = await client.get("/admin/staff", headers=patient_headers)
        lat = (time.perf_counter() - t0) * 1000
        results.record("2. Auth", "RBAC Boundary (Patient -> Admin 403)", resp.status_code == 403, lat, "Access forbidden correctly enforced")

        # =====================================================================
        # MODULE 3: Discovery Service (Hospitals & Doctors)
        # =====================================================================
        # 3.1 List all hospitals
        t0 = time.perf_counter()
        resp = await client.get("/hospitals")
        lat = (time.perf_counter() - t0) * 1000
        hospitals = resp.json()
        results.record("3. Discovery", "GET /hospitals (All facilities)", resp.status_code == 200 and len(hospitals) >= 13, lat, f"Found {len(hospitals)} active hospitals")

        # 3.2 Filter hospitals by city
        t0 = time.perf_counter()
        resp = await client.get("/hospitals?city=Chennai")
        lat = (time.perf_counter() - t0) * 1000
        chennai_hosp = resp.json()
        results.record("3. Discovery", "GET /hospitals?city=Chennai", resp.status_code == 200 and len(chennai_hosp) >= 5, lat, f"Filtered {len(chennai_hosp)} hospitals in Chennai")

        # 3.3 Get Hospital Details
        t0 = time.perf_counter()
        resp = await client.get("/hospitals/hosp_city_01")
        lat = (time.perf_counter() - t0) * 1000
        results.record("3. Discovery", "GET /hospitals/hosp_city_01", resp.status_code == 200 and resp.json().get("name") == "City Hospital", lat, "Retrieved full metadata")

        # 3.4 List Doctors by hospital
        t0 = time.perf_counter()
        resp = await client.get("/doctors?hospital_id=hosp_city_01")
        lat = (time.perf_counter() - t0) * 1000
        doctors = resp.json()
        results.record("3. Discovery", "GET /doctors?hospital_id=hosp_city_01", resp.status_code == 200 and len(doctors) >= 6, lat, f"Found {len(doctors)} doctors")

        # 3.5 Get Doctor Profile
        t0 = time.perf_counter()
        resp = await client.get("/doctors/doc_card_1")
        lat = (time.perf_counter() - t0) * 1000
        results.record("3. Discovery", "GET /doctors/doc_card_1", resp.status_code == 200 and "Dr. Anand Ramanathan" in resp.json().get("name", ""), lat, "Doctor profile verified")

        # =====================================================================
        # MODULE 4: Slots Engine (Availability, Holds, Concurrency)
        # =====================================================================
        # 4.1 Query available slots
        target_slot_date = (utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
        t0 = time.perf_counter()
        resp = await client.get(f"/slots/available?doctor_id=doc_card_1&date={target_slot_date}")
        lat = (time.perf_counter() - t0) * 1000
        slots = resp.json() if resp.status_code == 200 and isinstance(resp.json(), list) else []
        results.record("4. Slots", "GET /slots/available", resp.status_code == 200 and len(slots) > 0, lat, f"Retrieved {len(slots)} open slots for {target_slot_date}")

        # 4.2 Slot Hold
        open_slots = [s for s in slots if s.get("status") == "open"]
        test_slot_id = open_slots[0]["id"] if open_slots else (slots[0]["id"] if slots else None)
        if test_slot_id:
            t0 = time.perf_counter()
            resp = await client.post(f"/slots/{test_slot_id}/hold", headers=patient_headers)
            lat = (time.perf_counter() - t0) * 1000
            results.record("4. Slots", "POST /slots/{id}/hold", resp.status_code == 200, lat, f"Held slot {test_slot_id}")

            # 4.3 Double Hold Prevention (from another patient)
            priya_token = (await client.post("/auth/login", json={"phone": "+91 98765 43211", "password": "Password@123"})).json()["access_token"]
            t0 = time.perf_counter()
            resp = await client.post(f"/slots/{test_slot_id}/hold", headers={"Authorization": f"Bearer {priya_token}"})
            lat = (time.perf_counter() - t0) * 1000
            results.record("4. Slots", "Double-Hold Conflict Prevention", resp.status_code == 409, lat, "Returned 409 Conflict as expected")

            # 4.4 Release Hold
            t0 = time.perf_counter()
            resp = await client.post(f"/slots/{test_slot_id}/release", headers=patient_headers)
            lat = (time.perf_counter() - t0) * 1000
            results.record("4. Slots", "POST /slots/{id}/release", resp.status_code == 200, lat, "Released slot hold back to OPEN")

        # =====================================================================
        # MODULE 5: Live Queue & Token Engine
        # =====================================================================
        # 5.1 Query live department queue
        t0 = time.perf_counter()
        resp = await client.get("/queue/hosp_city_01/dept_card")
        lat = (time.perf_counter() - t0) * 1000
        q_data = resp.json()
        entries = q_data.get("entries", [])
        results.record("5. Queue", "GET /queue/{hospitalId}/{deptCode}", resp.status_code == 200 and len(entries) >= 4, lat, f"Found {len(entries)} active tokens in live queue")

        # 5.2 Verify today's queue entry details
        if entries:
            first_appt_id = entries[0]["appointment_id"]
            t0 = time.perf_counter()
            resp = await client.get(f"/queue/{first_appt_id}")
            lat = (time.perf_counter() - t0) * 1000
            q_ent = resp.json()
            results.record("5. Queue", "GET /queue/{appointment_id}", resp.status_code == 200 and "token" in q_ent, lat, f"Token: {q_ent.get('token')}")

        # =====================================================================
        # MODULE 6: Appointments Service
        # =====================================================================
        t0 = time.perf_counter()
        resp = await client.get("/appointments", headers=patient_headers)
        lat = (time.perf_counter() - t0) * 1000
        appts = resp.json()
        results.record("6. Appointments", "GET /appointments (Patient history)", resp.status_code == 200 and len(appts) >= 1, lat, f"Retrieved {len(appts)} appointments for Ravi Kumar")

        # =====================================================================
        # MODULE 7: Patient Service & Family Members
        # =====================================================================
        t0 = time.perf_counter()
        resp = await client.get("/patients/me/profile", headers=patient_headers)
        lat = (time.perf_counter() - t0) * 1000
        results.record("7. Patient", "GET /patients/me/profile", resp.status_code == 200 and resp.json().get("name") == "Ravi Kumar", lat, "Profile data verified")

        t0 = time.perf_counter()
        resp = await client.get("/patients/me/family", headers=patient_headers)
        lat = (time.perf_counter() - t0) * 1000
        fam = resp.json()
        results.record("7. Patient", "GET /patients/me/family", resp.status_code == 200 and len(fam) == 4, lat, f"Found {len(fam)} family members (Kavitha, Aarav, S. Kumar, Lakshmi)")

        # =====================================================================
        # MODULE 8: Doctor Service & Live My-Day Queue
        # =====================================================================
        doc_headers = {"Authorization": f"Bearer {doctor_token}"}
        t0 = time.perf_counter()
        resp = await client.get("/doctor/profile", headers=doc_headers)
        lat = (time.perf_counter() - t0) * 1000
        results.record("8. Doctor", "GET /doctor/profile", resp.status_code == 200 and "Anand" in resp.json().get("name", ""), lat, "Doctor identity resolved from DB")

        t0 = time.perf_counter()
        resp = await client.get("/doctor/queue", headers=doc_headers)
        lat = (time.perf_counter() - t0) * 1000
        doc_queue = resp.json()
        results.record("8. Doctor", "GET /doctor/queue (Live My-Day Queue)", resp.status_code == 200, lat, f"Queue count: {len(doc_queue.get('queue', []))}")

        # =====================================================================
        # MODULE 9: Admin Service (Staff, Departments, Templates)
        # =====================================================================
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        t0 = time.perf_counter()
        resp = await client.get("/admin/departments", headers=admin_headers)
        lat = (time.perf_counter() - t0) * 1000
        results.record("9. Admin", "GET /admin/departments", resp.status_code == 200 and len(resp.json()) >= 6, lat, f"Found {len(resp.json())} departments for hospital")

        t0 = time.perf_counter()
        resp = await client.get("/admin/staff", headers=admin_headers)
        lat = (time.perf_counter() - t0) * 1000
        results.record("9. Admin", "GET /admin/staff", resp.status_code == 200 and len(resp.json()) >= 8, lat, f"Found {len(resp.json())} staff members")

        t0 = time.perf_counter()
        resp = await client.get("/admin/templates", headers=admin_headers)
        lat = (time.perf_counter() - t0) * 1000
        results.record("9. Admin", "GET /admin/templates", resp.status_code == 200 and len(resp.json()) >= 4, lat, f"Found {len(resp.json())} notification templates")

        # =====================================================================
        # MODULE 10: Kiosk Service (Fast Check-in & Privacy Masking)
        # =====================================================================
        t0 = time.perf_counter()
        resp = await client.get("/kiosk/hosp_city_01/lookup-phone?phone=9876543210")
        lat = (time.perf_counter() - t0) * 1000
        kiosk_matches = resp.json().get("appointments", [])
        results.record("10. Kiosk", "GET /kiosk/{hospId}/lookup-phone", resp.status_code == 200 and len(kiosk_matches) >= 1, lat, f"Found appointment masked: {kiosk_matches[0].get('patient_phone_masked') if kiosk_matches else 'none'}")

        # =====================================================================
        # MODULE 11: Notifications Service
        # =====================================================================
        t0 = time.perf_counter()
        resp = await client.get("/notifications", headers=patient_headers)
        lat = (time.perf_counter() - t0) * 1000
        results.record("11. Notifications", "GET /notifications (Patient inbox)", resp.status_code == 200, lat, "Inbox accessible")

        # =====================================================================
        # MODULE 12: Super Admin Operations
        # =====================================================================
        super_headers = {"Authorization": f"Bearer {super_token}"}
        t0 = time.perf_counter()
        resp = await client.get("/super/hospitals", headers=super_headers)
        lat = (time.perf_counter() - t0) * 1000
        all_super_hosp = resp.json()
        results.record("12. Super Admin", "GET /super/hospitals", resp.status_code == 200 and len(all_super_hosp) >= 13, lat, f"Super admin verified {len(all_super_hosp)} hospitals")

        t0 = time.perf_counter()
        resp = await client.get("/super/analytics/overview", headers=super_headers)
        lat = (time.perf_counter() - t0) * 1000
        overview = resp.json()
        results.record("12. Super Admin", "GET /super/analytics/overview", resp.status_code == 200 and "total_hospitals" in overview, lat, f"Overview stats: {overview}")

    await close_db()

    # Final Summary Report
    summary = results.summary()
    logger.info("=" * 80)
    logger.info("AUDIT SUMMARY:")
    logger.info(f"Total Tests Run: {summary['total']}")
    logger.info(f"Passed:          {summary['passed']} ({summary['pass_rate']}%)")
    logger.info(f"Failed:          {summary['failed']}")
    logger.info(f"Average Latency: {summary['avg_latency_ms']} ms")
    logger.info("=" * 80)

    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_audit())
    sys.exit(exit_code)
