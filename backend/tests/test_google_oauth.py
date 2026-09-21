"""Test Suite: Google OAuth 2.0 Authentication, Account Linking & Role Safeguards."""
from unittest.mock import AsyncMock, patch
import pytest
import pytest_asyncio
from httpx import AsyncClient, Response

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.accounts import User
from app.models.common import Role


TEST_USER_EMAILS = [
    "new_google_patient@test.local",
    "existing_patient_link@test.local",
    "hospital_admin@hospital.local",
    "conflict_patient@test.local",
    "unverified@test.local",
    "spoof@test.local",
    "code_flow_patient@test.local",
    "standard_pwd_patient@test.local",
]

MOCK_TOKEN_EXCHANGE_RESPONSE = Response(
    200,
    json={
        "id_token": "mock_valid_id_token",
        "access_token": "mock_access_token",
        "token_type": "Bearer",
    },
)


@pytest_asyncio.fixture(autouse=True)
async def cleanup_test_users():
    """Ensure test isolation by removing seeded test users before and after each test."""
    await User.find({"email": {"$in": TEST_USER_EMAILS}}).delete()
    yield
    await User.find({"email": {"$in": TEST_USER_EMAILS}}).delete()


@pytest.mark.asyncio
async def test_google_auth_unconfigured(async_client: AsyncClient, monkeypatch):
    """Verify endpoint returns 503 if GOOGLE_CLIENT_ID is not configured."""
    settings = get_settings()
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", None)

    resp = await async_client.post(
        "/auth/google",
        json={"code": "sample_auth_code", "redirect_uri": "http://localhost:5173/auth/callback"},
    )
    assert resp.status_code == 503
    assert "not configured" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_google_auth_new_patient_registration(async_client: AsyncClient, monkeypatch):
    """Verify new patient registers successfully via Google OAuth with strictly PATIENT role."""
    settings = get_settings()
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-client-secret")

    mock_google_claims = {
        "aud": "test-google-client-id.apps.googleusercontent.com",
        "iss": "https://accounts.google.com",
        "sub": "google_sub_10001",
        "email": "new_google_patient@test.local",
        "email_verified": True,
        "name": "Jane Google Patient",
        "picture": "https://lh3.googleusercontent.com/a/test_avatar.jpg",
    }

    real_post = AsyncClient.post

    async def selective_post(self, url, *args, **kwargs):
        if "oauth2.googleapis.com" in str(url):
            return MOCK_TOKEN_EXCHANGE_RESPONSE
        return await real_post(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "post", selective_post), \
         patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_claims):

        resp = await async_client.post(
            "/auth/google",
            json={"code": "sample_auth_code", "redirect_uri": "http://localhost:5173/auth/callback"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()

        assert "token" in data
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["is_new_user"] is True
        assert data["user"]["role"] == "patient"
        assert data["user"]["email"] == "new_google_patient@test.local"
        assert data["user"]["name"] == "Jane Google Patient"
        assert data["user"]["email_verified"] is True
        assert data["user"]["photo_url"] == "https://lh3.googleusercontent.com/a/test_avatar.jpg"

    # Verify DB state
    created_user = await User.find_one(User.email == "new_google_patient@test.local")
    assert created_user is not None
    assert created_user.role == Role.PATIENT
    assert created_user.google_id == "google_sub_10001"
    assert created_user.password_hash is None


@pytest.mark.asyncio
async def test_google_auth_existing_patient_account_linking(async_client: AsyncClient, monkeypatch):
    """Verify existing patient without google_id is cleanly linked to verified Google email."""
    settings = get_settings()
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-client-secret")

    # Create existing unlinked patient
    existing_patient = User(
        name="Existing Patient",
        email="existing_patient_link@test.local",
        phone="+91 91111 00001",
        password_hash=hash_password("PatientPass123!"),
        role=Role.PATIENT,
        is_verified=True,
        is_active=True,
    )
    await existing_patient.insert()

    mock_google_claims = {
        "aud": "test-google-client-id.apps.googleusercontent.com",
        "iss": "https://accounts.google.com",
        "sub": "google_sub_20002",
        "email": "existing_patient_link@test.local",
        "email_verified": True,
        "name": "Existing Patient",
        "picture": "https://lh3.googleusercontent.com/a/linked_avatar.jpg",
    }

    real_post = AsyncClient.post

    async def selective_post(self, url, *args, **kwargs):
        if "oauth2.googleapis.com" in str(url):
            return MOCK_TOKEN_EXCHANGE_RESPONSE
        return await real_post(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "post", selective_post), \
         patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_claims):

        resp = await async_client.post(
            "/auth/google",
            json={"code": "sample_auth_code", "redirect_uri": "http://localhost:5173/auth/callback"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["is_new_user"] is False
        assert data["user"]["role"] == "patient"
        assert data["user"]["email"] == "existing_patient_link@test.local"

    # Verify linked in DB
    refreshed_user = await User.find_one(User.email == "existing_patient_link@test.local")
    assert refreshed_user.google_id == "google_sub_20002"
    assert refreshed_user.email_verified is True


@pytest.mark.asyncio
async def test_google_auth_staff_admin_privilege_boundary(async_client: AsyncClient, monkeypatch):
    """Verify staff and administrator accounts CANNOT authenticate via Google login (403 Forbidden)."""
    settings = get_settings()
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-client-secret")

    # Seed an admin account
    admin_user = User(
        name="Hospital Director",
        email="hospital_admin@hospital.local",
        phone="+91 92222 00002",
        password_hash=hash_password("AdminPass123!"),
        role=Role.HOSPITAL_ADMIN,
        hospital_id="hosp_city_01",
        is_verified=True,
        is_active=True,
    )
    await admin_user.insert()

    mock_google_claims = {
        "aud": "test-google-client-id.apps.googleusercontent.com",
        "iss": "https://accounts.google.com",
        "sub": "google_sub_30003",
        "email": "hospital_admin@hospital.local",
        "email_verified": True,
        "name": "Hospital Director",
    }

    real_post = AsyncClient.post

    async def selective_post(self, url, *args, **kwargs):
        if "oauth2.googleapis.com" in str(url):
            return MOCK_TOKEN_EXCHANGE_RESPONSE
        return await real_post(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "post", selective_post), \
         patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_claims):

        resp = await async_client.post(
            "/auth/google",
            json={"code": "sample_auth_code", "redirect_uri": "http://localhost:5173/auth/callback"},
        )
        assert resp.status_code == 403
        assert "only available for patient accounts" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_google_auth_conflicting_google_id_rejected(async_client: AsyncClient, monkeypatch):
    """Verify 409 Conflict if email is already linked to a different google_id."""
    settings = get_settings()
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-client-secret")

    linked_user = User(
        name="Already Linked Patient",
        email="conflict_patient@test.local",
        phone="+91 93333 00003",
        password_hash=hash_password("Pass123!"),
        role=Role.PATIENT,
        google_id="original_google_id",
        is_verified=True,
        is_active=True,
    )
    await linked_user.insert()

    mock_google_claims = {
        "aud": "test-google-client-id.apps.googleusercontent.com",
        "iss": "https://accounts.google.com",
        "sub": "conflicting_google_id_999",
        "email": "conflict_patient@test.local",
        "email_verified": True,
        "name": "Impostor",
    }

    real_post = AsyncClient.post

    async def selective_post(self, url, *args, **kwargs):
        if "oauth2.googleapis.com" in str(url):
            return MOCK_TOKEN_EXCHANGE_RESPONSE
        return await real_post(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "post", selective_post), \
         patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_claims):

        resp = await async_client.post(
            "/auth/google",
            json={"code": "sample_auth_code", "redirect_uri": "http://localhost:5173/auth/callback"},
        )
        assert resp.status_code == 409
        assert "already linked to a different Google account" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_google_auth_unverified_email_rejected(async_client: AsyncClient, monkeypatch):
    """Verify 400 Bad Request if Google indicates email is unverified."""
    settings = get_settings()
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-client-secret")

    mock_google_claims = {
        "aud": "test-google-client-id.apps.googleusercontent.com",
        "iss": "https://accounts.google.com",
        "sub": "unverified_google_id",
        "email": "unverified@test.local",
        "email_verified": False,
        "name": "Unverified User",
    }

    real_post = AsyncClient.post

    async def selective_post(self, url, *args, **kwargs):
        if "oauth2.googleapis.com" in str(url):
            return MOCK_TOKEN_EXCHANGE_RESPONSE
        return await real_post(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "post", selective_post), \
         patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_claims):

        resp = await async_client.post(
            "/auth/google",
            json={"code": "sample_auth_code", "redirect_uri": "http://localhost:5173/auth/callback"},
        )
        assert resp.status_code == 400
        assert "not verified" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_google_auth_mismatched_audience_rejected(async_client: AsyncClient, monkeypatch):
    """Verify 401 Unauthorized if Google token was issued for a different client ID."""
    settings = get_settings()
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "our-expected-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-client-secret")

    real_post = AsyncClient.post

    async def selective_post(self, url, *args, **kwargs):
        if "oauth2.googleapis.com" in str(url):
            return MOCK_TOKEN_EXCHANGE_RESPONSE
        return await real_post(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "post", selective_post), \
         patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Token has wrong audience")):

        resp = await async_client.post(
            "/auth/google",
            json={"code": "sample_auth_code", "redirect_uri": "http://localhost:5173/auth/callback"},
        )
        assert resp.status_code == 401
        assert "Google ID token verification failed" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_google_auth_code_exchange_flow(async_client: AsyncClient, monkeypatch):
    """Verify Authorization Code flow exchanging code for token at Google."""
    settings = get_settings()
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-client-secret")

    mock_google_claims = {
        "aud": "test-google-client-id.apps.googleusercontent.com",
        "iss": "https://accounts.google.com",
        "sub": "google_sub_code_flow_40004",
        "email": "code_flow_patient@test.local",
        "email_verified": True,
        "name": "Code Flow Patient",
        "picture": "https://lh3.googleusercontent.com/code_pic.jpg",
    }

    real_post = AsyncClient.post

    async def selective_post(self, url, *args, **kwargs):
        if "oauth2.googleapis.com" in str(url):
            return MOCK_TOKEN_EXCHANGE_RESPONSE
        return await real_post(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "post", selective_post), \
         patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_claims):

        resp = await async_client.post(
            "/auth/google",
            json={
                "code": "sample_auth_code_xyz",
                "redirect_uri": "http://localhost:5173/auth/callback",
            },
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["user"]["email"] == "code_flow_patient@test.local"
        assert data["user"]["role"] == "patient"
        assert data["is_new_user"] is True


@pytest.mark.asyncio
async def test_normal_password_login_unaffected(async_client: AsyncClient):
    """Verify standard email/password authentication remains 100% operational."""
    std_user = User(
        name="Standard Patient",
        email="standard_pwd_patient@test.local",
        phone="+91 94444 00004",
        password_hash=hash_password("ValidPassword123!"),
        role=Role.PATIENT,
        is_verified=True,
        is_active=True,
    )
    await std_user.insert()

    # Success
    resp = await async_client.post(
        "/auth/login",
        json={"identifier": "standard_pwd_patient@test.local", "password": "ValidPassword123!"},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == "standard_pwd_patient@test.local"

    # Incorrect password
    bad_resp = await async_client.post(
        "/auth/login",
        json={"identifier": "standard_pwd_patient@test.local", "password": "WrongPassword!"},
    )
    assert bad_resp.status_code == 401
