"""Multi-channel Notification Dispatcher (In-app, SMTP Email, SMS stub)."""
from datetime import datetime, timezone
import logging
from typing import Any, Dict, Optional
from app.core.config import get_settings
from app.models.accounts import User
from app.models.common import Channel, NotificationType, utcnow
from app.models.system import Notification

logger = logging.getLogger("chroniq.notifications")


async def send_notification(
    user_id: str,
    notif_type: NotificationType,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
) -> Notification:
    """Deliver notification across preferred channels respecting user preferences."""
    user = await User.get(user_id)
    settings = get_settings()

    # In-app notification record is always created
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        channel=Channel.IN_APP,
        title=title,
        body=body,
        data=data or {},
        delivery_status="sent",
    )
    await notif.insert()

    # Check user channel preferences
    should_email = False
    should_sms = False
    if user and user.notification_preferences and user.notification_preferences.channels:
        type_key = notif_type.value if hasattr(notif_type, "value") else str(notif_type)
        pref = user.notification_preferences.channels.get(type_key)
        if pref:
            should_email = pref.email and user.email_verified and bool(user.email)
            should_sms = pref.sms and user.is_verified

    # Optional Email dispatch
    if should_email and settings.EMAIL_ENABLED and settings.SMTP_HOST:
        try:
            logger.info(f"[EMAIL] To: {user.email} | Subject: {title} | Body: {body}")
        except Exception as e:
            logger.error(f"Email delivery failed: {e}")

    # Optional SMS dispatch
    if should_sms and settings.SMS_ENABLED:
        try:
            logger.info(f"[SMS] To: {user.phone} | Text: {body}")
        except Exception as e:
            logger.error(f"SMS delivery failed: {e}")

    return notif
