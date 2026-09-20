"""Database connection and Beanie ODM initialization."""
import logging
from typing import Optional
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# Compatibility fix between Motor 3.7 and Beanie metadata registration
if not hasattr(AsyncIOMotorClient, "append_metadata"):
    AsyncIOMotorClient.append_metadata = lambda self, *args, **kwargs: None

from app.core.config import get_settings
from app.models import DOCUMENT_MODELS

logger = logging.getLogger("chroniq.db")

_client: Optional[AsyncIOMotorClient] = None


async def init_db(database_name: Optional[str] = None):
    """Initialize connection to MongoDB Atlas and configure Beanie documents."""
    global _client
    settings = get_settings()

    db_name = database_name or settings.MONGODB_DB

    if not settings.MONGODB_URI:
        logger.warning(
            "MONGODB_URI is not set. Please configure MONGODB_URI in backend/.env with your "
            "MongoDB Atlas connection string (e.g. mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority)"
        )
        return False

    try:
        _client = AsyncIOMotorClient(settings.MONGODB_URI, tz_aware=True)
        db = _client[db_name]
        await init_beanie(
            database=db,
            document_models=DOCUMENT_MODELS,
        )
        logger.info(f"Connected to MongoDB database '{db_name}' and initialized Beanie models.")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        return False


async def close_db():
    """Close MongoDB connection pool."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB client connection closed.")


def get_client() -> Optional[AsyncIOMotorClient]:
    return _client
