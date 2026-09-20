"""Lifespan Background Worker for Slot Expiry, Reminders, and Slot Generation."""
import asyncio
from datetime import datetime, timedelta, timezone
import logging
from typing import List

from app.models.booking import Appointment
from app.models.common import AppointmentStatus, NotificationType, SlotStatus, utcnow
from app.models.hospitals import Doctor
from app.services.notification_service import send_notification
from app.services.slot_service import generate_slots_for_doctor, release_expired_holds

logger = logging.getLogger("chroniq.worker")

_worker_tasks: List[asyncio.Task] = []
_running = True


async def _hold_expiry_loop():
    """Periodically sweep and release expired slot holds."""
    while _running:
        try:
            count = await release_expired_holds()
            if count > 0:
                logger.info(f"Released {count} expired slot holds.")
        except Exception as e:
            logger.error(f"Error in hold expiry loop: {e}")
        await asyncio.sleep(60)


async def _appointment_reminder_loop():
    """Check and dispatch 24h and 1h appointment reminders."""
    while _running:
        try:
            now = utcnow()
            # 24h reminders (appointments starting between 23h50m and 24h10m from now)
            window_24h_start = now + timedelta(hours=23, minutes=50)
            window_24h_end = now + timedelta(hours=24, minutes=10)

            appts_24h = await Appointment.find(
                Appointment.status == AppointmentStatus.BOOKED,
                Appointment.scheduled_start >= window_24h_start,
                Appointment.scheduled_start <= window_24h_end,
            ).to_list()

            for appt in appts_24h:
                await send_notification(
                    user_id=appt.patient_id,
                    notif_type=NotificationType.REMINDER,
                    title="Appointment Reminder (Tomorrow)",
                    body=f"Your appointment with {appt.doctor_name} is tomorrow at {appt.scheduled_start.strftime('%I:%M %p')}.",
                    data={"appointment_id": str(appt.id)},
                )
        except Exception as e:
            logger.error(f"Error in reminder loop: {e}")
        await asyncio.sleep(600)  # Check every 10 minutes


async def _slot_generation_loop():
    """Ensure rolling window of slots exists for active doctors."""
    while _running:
        try:
            doctors = await Doctor.find(Doctor.is_active == True).to_list()
            for doc in doctors:
                doc_id = doc.custom_id or str(doc.id)
                await generate_slots_for_doctor(doc_id, days=14)
        except Exception as e:
            logger.error(f"Error in slot generation loop: {e}")
        await asyncio.sleep(3600 * 6)  # Run every 6 hours


def start_background_tasks():
    """Start all background loops."""
    global _running, _worker_tasks
    _running = True
    _worker_tasks = [
        asyncio.create_task(_hold_expiry_loop()),
        asyncio.create_task(_appointment_reminder_loop()),
        asyncio.create_task(_slot_generation_loop()),
    ]
    logger.info("Started background worker tasks.")


async def stop_background_tasks():
    """Stop and cancel background loops on shutdown."""
    global _running, _worker_tasks
    _running = False
    for task in _worker_tasks:
        task.cancel()
    await asyncio.gather(*_worker_tasks, return_exceptions=True)
    _worker_tasks = []
    logger.info("Stopped background worker tasks.")
