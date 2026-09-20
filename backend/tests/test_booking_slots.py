"""Test Suite: Slot Generation, Slot Hold Expiration, and Booking Concurrency."""
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient

from app.models.common import SlotStatus
from app.services.booking_service import generate_booking_code


def test_booking_code_format():
    """Verify generated booking codes match pattern 'APT-XXXXX'."""
    code = generate_booking_code()
    assert code.startswith("APT-")
    assert len(code) == 9
    assert code[4:].isalnum()


@pytest.mark.asyncio
async def test_slot_hold_requires_authentication(async_client: AsyncClient):
    """Holding a slot without bearer token must be rejected."""
    resp = await async_client.post("/slots/slot_sample_123/hold")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_slot_hold_and_double_booking_prevention(async_client: AsyncClient, test_patient_token: str, test_other_patient_token: str):
    """Holding an already held or booked slot must return HTTP 409 Conflict."""
    from app.models.scheduling import Slot
    from app.models.common import SlotStatus, utcnow

    now = utcnow()
    slot = Slot(
        doctor_id="doc_card_1",
        hospital_id="hosp_city_01",
        department_id="dept_card",
        start=now + timedelta(days=1, hours=10),
        end=now + timedelta(days=1, hours=10, minutes=15),
        status=SlotStatus.OPEN,
    )
    await slot.insert()

    headers = {"Authorization": f"Bearer {test_patient_token}"}

    # 1. First user holds slot -> succeeds
    resp1 = await async_client.post(f"/slots/{str(slot.id)}/hold", headers=headers)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["slot_id"] == str(slot.id)

    # 2. Second user attempts to hold the same slot -> 409 Conflict
    resp2 = await async_client.post(f"/slots/{str(slot.id)}/hold", headers={"Authorization": f"Bearer {test_other_patient_token}"})
    assert resp2.status_code == 409
    assert "no longer available" in resp2.json()["detail"].lower()

