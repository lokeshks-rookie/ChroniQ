"""Phase 2 Healix Voice & Assistant Models."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.models.common import utcnow


class ChatMessage(BaseModel):
    role: str  # user | assistant | tool
    content: str
    timestamp: datetime = Field(default_factory=utcnow)


class ToolCallLog(BaseModel):
    tool: str
    input: Dict[str, Any]
    output: Dict[str, Any]
    timestamp: datetime = Field(default_factory=utcnow)


class PendingAction(BaseModel):
    type: str  # book | reschedule | cancel
    payload: Dict[str, Any]
    expires_at: datetime


class AssistantSession(Document):
    user_id: str
    language: str = "en"
    messages: List[ChatMessage] = Field(default_factory=list)
    tool_calls: List[ToolCallLog] = Field(default_factory=list)
    pending_action: Optional[PendingAction] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "assistant_sessions"
        indexes = [
            IndexModel([("user_id", ASCENDING), ("updated_at", DESCENDING)]),
        ]


class PatientProfile(Document):
    user_id: str
    allergies: List[str] = Field(default_factory=list)
    chronic_conditions: List[str] = Field(default_factory=list)
    blood_group: Optional[str] = None
    notes: Optional[str] = None
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "patient_profiles"
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True),
        ]
