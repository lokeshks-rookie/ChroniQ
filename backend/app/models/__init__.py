"""Export all Beanie Document Models."""
from app.models.common import (
    Role,
    HospitalStatus,
    SlotStatus,
    AppointmentStatus,
    AppointmentType,
    CreatedVia,
    QueueStatus,
    Channel,
    NotificationType,
    DoctorAvailabilityStatus,
    SupportCategory,
    SupportTicketStatus,
    DocumentCategory,
    GeoPoint,
    utcnow,
)
from app.models.accounts import (
    User,
    FamilyMember,
    PatientNote,
    NotificationPreferences,
    NotificationChannelPreference,
)
from app.models.hospitals import (
    Hospital,
    HospitalSettings,
    Department,
    Doctor,
)
from app.models.scheduling import (
    DoctorSchedule,
    DoctorLeave,
    Slot,
    WeeklyRule,
    TimeRange,
)
from app.models.booking import (
    Appointment,
    QueueEntry,
    TokenCounter,
    PatientSnapshot,
    StatusEvent,
)
from app.models.system import (
    Notification,
    Review,
    AuditLog,
    OtpCode,
    SupportTicket,
    MedicalDocument,
    ConsultationNote,
    DoctorAvailabilityState,
    AvailabilityLogEntry,
    BroadcastLog,
    NotificationTemplate,
)
from app.models.assistant import (
    AssistantSession,
    PatientProfile,
    ChatMessage,
    ToolCallLog,
    PendingAction,
)

DOCUMENT_MODELS = [
    User,
    FamilyMember,
    PatientNote,
    Hospital,
    Department,
    Doctor,
    DoctorSchedule,
    DoctorLeave,
    Slot,
    Appointment,
    QueueEntry,
    TokenCounter,
    Notification,
    Review,
    AuditLog,
    OtpCode,
    SupportTicket,
    MedicalDocument,
    ConsultationNote,
    DoctorAvailabilityState,
    AvailabilityLogEntry,
    BroadcastLog,
    NotificationTemplate,
    AssistantSession,
    PatientProfile,
]
