"""Pytest Configuration and Fixtures for ChroniQ Backend."""
import asyncio
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.core.config import get_settings
from app.core.db import close_db, init_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.accounts import User
from app.models.common import HospitalStatus, Role
from app.models.hospitals import Department, Doctor, Hospital





@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Initialize test database using MONGODB_DB_TEST (or mongomock-motor when offline)."""
    settings = get_settings()
    if settings.MONGODB_URI:
        connected = await init_db(database_name=settings.MONGODB_DB_TEST)
    else:
        import mongomock.database
        _orig_list = mongomock.database.Database.list_collection_names
        def _patched_list(self, *args, **kwargs):
            kwargs.pop("authorizedCollections", None)
            kwargs.pop("nameOnly", None)
            return _orig_list(self, *args, **kwargs)
        mongomock.database.Database.list_collection_names = _patched_list

        from beanie import init_beanie
        from mongomock_motor import AsyncMongoMockClient
        from app.models import DOCUMENT_MODELS
        client = AsyncMongoMockClient()
        db = client[settings.MONGODB_DB_TEST]
        await init_beanie(database=db, document_models=DOCUMENT_MODELS)
        connected = True
    yield connected
    await close_db()


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client for FastAPI testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def test_super_admin_token() -> str:
    return create_access_token(data={"sub": "test_super_admin", "role": Role.SUPER_ADMIN.value})


@pytest.fixture
def test_hospital_admin_token() -> str:
    return create_access_token(data={"sub": "test_admin", "role": Role.HOSPITAL_ADMIN.value, "hospital_id": "hosp_city_01"})


@pytest.fixture
def test_doctor_token() -> str:
    return create_access_token(data={"sub": "test_doc", "role": Role.DOCTOR.value, "hospital_id": "hosp_city_01"})


@pytest.fixture
def test_patient_token() -> str:
    return create_access_token(data={"sub": "test_patient", "role": Role.PATIENT.value})
