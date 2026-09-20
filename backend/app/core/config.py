"""ChroniQ Backend Configuration."""
from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ChroniQ"
    APP_ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "info"
    TIMEZONE: str = "Asia/Kolkata"
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Database
    MONGODB_URI: str = ""
    MONGODB_DB: str = "chroniq"
    MONGODB_DB_TEST: str = "chroniq_test"

    # Auth & Cryptography
    JWT_SECRET: str = "default-insecure-dev-secret-replace-in-env-before-production-32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_HASH_ITERATIONS: int = 600000
    OTP_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3
    OTP_DEV_ECHO: bool = True

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 120
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10
    KIOSK_RATE_LIMIT_PER_MINUTE: int = 30

    # Kiosk
    KIOSK_API_KEY: str = "default-kiosk-api-key-replace-in-env-before-production"

    # Booking & Queue Policies
    SLOT_HOLD_MINUTES: int = 5
    SLOT_GENERATION_DAYS: int = 14
    DEFAULT_GRACE_PERIOD_MINUTES: int = 10
    DEFAULT_CANCEL_WINDOW_HOURS: int = 2
    EARLY_CHECKIN_MINUTES: int = 60
    ETA_BUFFER_PERCENT: int = 8
    AVG_CONSULT_EMA_ALPHA: float = 0.2
    MAX_NOSHOW_CALLS: int = 2
    MAX_FAMILY_MEMBERS: int = 6

    # Email
    EMAIL_ENABLED: bool = False
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "ChroniQ <no-reply@example.com>"

    # SMS
    SMS_ENABLED: bool = False
    SMS_PROVIDER: str = "stub"
    SMS_API_KEY: Optional[str] = None
    SMS_SENDER_ID: Optional[str] = None

    # Uploads
    UPLOAD_DIR: str = "./data/uploads"
    MAX_UPLOAD_MB: int = 10
    USER_QUOTA_MB: int = 50

    # Seed & Bootstrap
    SEED_ON_STARTUP: bool = False
    SEED_SUPER_ADMIN_EMAIL: str = "admin@chroniq.local"
    SEED_SUPER_ADMIN_PASSWORD: str = "admin123456"

    # Phase 2 Healix (Optional)
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_EMBEDDING_MODEL: str = "openai/text-embedding-3-small"
    TAVILY_API_KEY: Optional[str] = None
    BHASHINI_INFERENCE_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return [self.FRONTEND_URL]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or len(v) < 16:
            raise ValueError("JWT_SECRET must be at least 16 characters long")
        return v


@lru_cache()
def get_settings() -> Settings:
    return Settings()
