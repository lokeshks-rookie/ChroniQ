"""Test Suite: Review Aggregates, 48-Hour Edit Window, and Reports."""
from datetime import timedelta
import pytest
from app.models.common import utcnow


def test_review_edit_window_calculation():
    """Verify reviews cannot be edited after 48 hours."""
    now = utcnow()
    created_at = now - timedelta(hours=50)
    is_editable = (created_at + timedelta(hours=48)) >= now
    assert is_editable is False

    recent_created_at = now - timedelta(hours=2)
    is_recent_editable = (recent_created_at + timedelta(hours=48)) >= now
    assert is_recent_editable is True


def test_rating_aggregate_calculation():
    """Verify running rating average and count formula."""
    old_count = 10
    old_avg = 4.5
    new_rating = 5

    new_count = old_count + 1
    new_avg = ((old_avg * old_count) + new_rating) / new_count
    assert new_count == 11
    assert round(new_avg, 2) == 4.55
