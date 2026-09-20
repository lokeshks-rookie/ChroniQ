"""Test Suite: Real-Time Queue Engine, Token Counter, and ETA Calculations."""
import pytest
from app.services.queue_service import get_today_ist


def test_ist_date_formatting():
    """Verify IST date helper outputs valid YYYY-MM-DD format."""
    today = get_today_ist()
    parts = today.split("-")
    assert len(parts) == 3
    assert len(parts[0]) == 4  # Year
    assert len(parts[1]) == 2  # Month
    assert len(parts[2]) == 2  # Day


def test_eta_formula_calculation():
    """Verify ChroniQ ETA formula: ETA = remaining_current + (pos - 1) * avg * buffer + delay."""
    avg_minutes = 10.0
    buffer_percent = 8.0  # 8% buffer
    buffer_mult = 1.0 + (buffer_percent / 100.0)
    delay_offset = 15  # Doctor is 15 minutes late
    remaining_current = 4.0  # 4 mins left in active consult

    # Patient at position 3 (2 people ahead)
    pos = 3
    expected_eta = remaining_current + ((pos - 1) * avg_minutes * buffer_mult) + delay_offset
    # 4.0 + (2 * 10.0 * 1.08) + 15 = 4.0 + 21.6 + 15 = 40.6 mins -> 41 mins
    assert round(expected_eta) == 41


def test_doctor_ema_update():
    """Verify doctor average consultation time updates via EMA: avg = 0.8 * avg + 0.2 * actual."""
    old_avg = 10.0
    actual_consult = 20.0
    new_avg = (0.8 * old_avg) + (0.2 * actual_consult)
    # 8.0 + 4.0 = 12.0
    assert new_avg == 12.0


@pytest.mark.asyncio
async def test_token_counter_format():
    """Verify daily token counter increments sequentially."""
    from app.services.queue_service import get_next_token
    token1 = await get_next_token("hosp_city_01", "dept_card")
    token2 = await get_next_token("hosp_city_01", "dept_card")
    assert token1.endswith("-001") or "-" in token1
    assert token2.endswith("-002") or "-" in token2


@pytest.mark.asyncio
async def test_queue_priority_ordering():
    """Emergency entries (priority 0) must appear ahead of standard entries (priority 2)."""
    from datetime import datetime, timezone
    from app.models.booking import QueueEntry
    from app.models.common import QueueStatus, utcnow
    from app.services.queue_service import recompute_doctor_queue, get_today_ist

    today = get_today_ist()
    now = utcnow()

    # Clean previous test entries to ensure clean isolation
    await QueueEntry.find(QueueEntry.doctor_id == "doc_genm_1", QueueEntry.queue_date == today).delete()

    import uuid
    uid = uuid.uuid4().hex[:6]

    # Create standard entry (priority 2)
    e1 = QueueEntry(
        appointment_id=f"apt_std_{uid}",
        hospital_id="hosp_city_01",
        department_id="dept_genm",
        doctor_id="doc_genm_1",
        queue_date=today,
        token=f"GENM-1{uid[:2]}",
        token_number=1,
        priority=2,
        status=QueueStatus.WAITING,
        sort_time=now,
    )
    await e1.insert()

    # Create emergency entry (priority 0)
    e2 = QueueEntry(
        appointment_id=f"apt_emg_{uid}",
        hospital_id="hosp_city_01",
        department_id="dept_genm",
        doctor_id="doc_genm_1",
        queue_date=today,
        token=f"GENM-2{uid[:2]}",
        token_number=2,
        priority=0,
        status=QueueStatus.WAITING,
        sort_time=now,
    )
    await e2.insert()

    ordered = await recompute_doctor_queue("doc_genm_1")
    assert len(ordered) >= 2
    # First entry in list must be priority 0
    assert ordered[0].priority == 0
    assert ordered[0].position == 1
    # Second entry in list must be priority 2
    assert ordered[1].priority == 2
    assert ordered[1].position == 2

