"""ChroniQ Backend Application - FastAPI Entry Point."""
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.db import close_db, init_db, is_db_connected
from app.routes.admin import router as admin_router
from app.routes.appointments import router as appointments_router
from app.routes.auth import router as auth_router
from app.routes.discovery import router as discovery_router
from app.routes.doctor import router as doctor_router
from app.routes.kiosk import router as kiosk_router
from app.routes.notifications import router as notifications_router
from app.routes.patient import router as patient_router
from app.routes.queue import router as queue_router
from app.routes.slots import router as slots_router
from app.routes.super_admin import router as super_admin_router
from app.routes.walk_in import router as walk_in_router
from app.services.background_tasks import start_background_tasks, stop_background_tasks

# Setup logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("chroniq.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: init DB, start background tasks, cleanup on shutdown."""
    logger.info(f"Starting {settings.APP_NAME} ({settings.APP_ENV})...")

    # 1. Initialize MongoDB Atlas connection & Beanie ODM
    if not is_db_connected():
        db_connected = await init_db()
    else:
        db_connected = True
    if db_connected:
        logger.info("MongoDB Atlas connected successfully.")
        # 2. Start background worker loops
        start_background_tasks()
    else:
        logger.warning(
            "MongoDB not connected. Live database features will be unavailable until valid MONGODB_URI is provided."
        )

    yield

    # 3. Shutdown cleanup
    logger.info("Shutting down ChroniQ backend...")
    await stop_background_tasks()
    await close_db()
    logger.info("ChroniQ backend shutdown complete.")


# Instantiate FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Hospital Appointment & Live Token Queue Engine for ChroniQ",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# CORS Configuration
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)
cleaned_origins = [o for o in origins if o != "*"]
if not cleaned_origins:
    cleaned_origins = [settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cleaned_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    origin = request.headers.get("origin")
    headers = {}
    if origin and (origin in cleaned_origins or "*" in settings.CORS_ORIGINS):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Allow-Methods"] = "*"

    if not is_db_connected():
        detail = (
            "Database connection unavailable. MongoDB Atlas rejected the connection. "
            "Please ensure your current IP address is added to the IP Access List in MongoDB Atlas (Network Access)."
        )
    else:
        detail = "An internal server error occurred. Please try again later."

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": detail},
        headers=headers,
    )


# Health Check
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for container orchestrators and load balancers."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "timezone": settings.TIMEZONE,
    }


# Include Routers
app.include_router(auth_router)
app.include_router(discovery_router)
app.include_router(slots_router)
app.include_router(appointments_router)
app.include_router(queue_router)
app.include_router(walk_in_router)
app.include_router(patient_router)
app.include_router(doctor_router)
app.include_router(admin_router)
app.include_router(kiosk_router)
app.include_router(notifications_router)
app.include_router(super_admin_router)
