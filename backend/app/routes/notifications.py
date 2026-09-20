"""In-App Notifications Router."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.models.accounts import User
from app.models.common import utcnow
from app.models.system import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[dict])
async def list_my_notifications(current_user: User = Depends(get_current_user)):
    """Fetch notifications for authenticated patient or staff member."""
    user_id = str(current_user.id)
    notes = await Notification.find(Notification.user_id == user_id).sort("-created_at").limit(50).to_list()
    return [
        {
            "id": str(n.id),
            "user_id": n.user_id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "channel": n.channel,
            "read": n.read,
            "sent_at": n.sent_at,
            "created_at": n.created_at,
        }
        for n in notes
    ]


@router.patch("/{id}/read")
async def mark_notification_read(
    id: str,
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    note = await Notification.get(id)
    if not note or note.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    note.read = True
    note.read_at = utcnow()
    await note.save()
    return {"success": True, "id": str(note.id), "read": True}
