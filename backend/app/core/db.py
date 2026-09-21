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
_is_connected: bool = False


def is_db_connected() -> bool:
    return _is_connected


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
        _client = AsyncIOMotorClient(settings.MONGODB_URI, tz_aware=True, serverSelectionTimeoutMS=5000)
        db = _client[db_name]
        try:
            await init_beanie(
                database=db,
                document_models=DOCUMENT_MODELS,
            )
        except Exception as idx_err:
            err_str = str(idx_err)
            if "IndexKeySpecsConflict" in err_str or "IndexOptionsConflict" in err_str or "same name as the requested index" in err_str:
                logger.warning(f"Index conflict detected in database '{db_name}'. Dropping outdated indexes on 'users' collection to apply new schema...")
                try:
                    user_indexes = await db["users"].index_information()
                    for idx_name in user_indexes:
                        if idx_name != "_id_":
                            await db["users"].drop_index(idx_name)
                except Exception as drop_err:
                    logger.warning(f"Failed to drop old indexes on 'users': {drop_err}")
                await init_beanie(
                    database=db,
                    document_models=DOCUMENT_MODELS,
                )
            else:
                raise idx_err
        logger.info(f"Connected to MongoDB database '{db_name}' and initialized Beanie models.")
        _is_connected = True
        return True
    except Exception as e:
        _is_connected = False
        logger.error(f"Failed to connect to MongoDB: {e}")
        return False


async def close_db():
    """Close MongoDB connection pool."""
    global _client, _is_connected
    _is_connected = False
    if _client:
        _client.close()
        logger.info("MongoDB client connection closed.")


def get_client() -> Optional[AsyncIOMotorClient]:
    return _client
