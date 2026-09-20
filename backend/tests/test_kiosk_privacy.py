"""Test Suite: Kiosk Self-Service Privacy Masking and Security."""
import pytest
from app.routes.kiosk import mask_name, mask_phone


def test_kiosk_name_masking():
    """Verify patient names are masked on self-service kiosk screens."""
    assert mask_name("Ramesh Kumar") == "R***** K****"
    assert mask_name("John") == "J***"
    assert mask_name("A") == "A"


def test_kiosk_phone_masking():
    """Verify patient phones are masked on self-service kiosk screens."""
    # 10-digit Indian phone
    masked = mask_phone("+91 98401 23456")
    # Clean digits: 919840123456 (12 digits) -> first 2: 91, last 2: 56
    assert masked.startswith("91")
    assert masked.endswith("56")
    assert "******" in masked
