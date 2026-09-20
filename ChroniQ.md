# MediQ — Multi-Hospital Appointment & Queue Platform

> Working title. Hackathon'26 (KLN College) · Development Track · **PS 10: Healthcare Appointment and Queue Management System**
>
> **Final vision:** Healix, the existing AI healthcare assistant, is integrated so a patient can **book, reschedule and cancel appointments entirely by voice** in their own language.

---

## 1. Problem & Goal

**Problem:** Patients queue physically for hours, book by phone with no visibility, and have no idea when they will actually be seen. Hospitals have no live view of doctor load, no-shows or waiting times.

**Goal:** A platform where patients can find a hospital and doctor, book a slot, and follow their live queue position and waiting time, while hospital staff manage doctors, appointments and the queue from an admin dashboard.

**Required by the PS:** hospital appointments, patient queues, doctor availability, estimated waiting times.

---

## 2. Delivery Phases

| Phase | Scope | Outcome |
|---|---|---|
| **Phase 1 — Core Platform** | Multi-hospital booking, queue system, patient portal, admin dashboard | Fully working prototype, demo-ready on its own |
| **Phase 2 — Healix Voice Booking** | Healix agent uses platform APIs as tools, voice in and voice out (Bhashini) | "Book me a cardiologist tomorrow morning" works end to end |

Phase 1 must stand alone. Phase 2 is a layer on top of the same APIs, so build every action (search, slots, book, cancel, queue status) as a clean REST endpoint from day one.

---

## 3. User Roles

| Role | Portal | What they do |
|---|---|---|
| **Patient** | User side (`/app`) | Search, book, track queue, manage appointments and family members |
| **Receptionist (Front Desk)** | Admin dashboard | Walk-in registration, check-in, queue control |
| **Doctor** | Admin dashboard (scoped) | See own queue, call next patient, mark availability |
| **Hospital Admin** | Admin dashboard | Manage doctors, departments, schedules, staff, reports |
| **Super Admin** | Platform console (`/super`) | Onboard and approve hospitals, global analytics, audit logs |

---

## 4. Page Inventory

### 4.1 Public & Authentication

| Route | Page | Purpose / Key elements |
|---|---|---|
| `/` | Landing page | Hero, search bar (specialty, doctor, hospital, city), how it works, featured hospitals, live stats |
| `/hospitals` | Hospital directory | Search and filters (city, specialty, rating, open now), cards, map view toggle |
| `/hospitals/:id` | Hospital details | About, departments, doctors list, facilities, timings, location link, reviews |
| `/doctors/:id` | Doctor profile | Photo, qualifications, experience, fee, languages, next available slots, reviews |
| `/login` | Login | Email or phone + password, role-aware redirect, Google login (optional) |
| `/register` | Patient registration | Name, phone, email, password, consent checkbox |
| `/verify-otp` | OTP verification | Phone or email OTP, resend timer |
| `/forgot-password`, `/reset-password` | Password recovery | Request link or OTP, set new password |
| `/404`, `/403`, `/500` | Error pages | Friendly messages with a way back |

### 4.2 Patient Portal (User Side)

| Route | Page | Purpose / Key elements |
|---|---|---|
| `/app` | Patient dashboard | Next appointment card, live queue widget, quick book, recent activity |
| `/app/search` | Find a doctor | Filters: specialty, hospital, city, date, fee, language, gender, rating; sort by earliest slot |
| `/app/book/:doctorId` | Slot selection | Date strip, time-slot grid (available, held, booked), consultation type, **5-minute slot hold** |
| `/app/book/details` | Patient details | Choose self or family member, reason for visit, symptoms note, attach report (optional) |
| `/app/book/confirm` | Review & confirm | Summary, fee, policy notes, confirm button |
| `/app/book/success` | Booking confirmation | Appointment ID, **QR code**, token preview, add to calendar, share |
| `/app/appointments` | My appointments | Tabs: Upcoming, Past, Cancelled; reschedule, cancel, rebook |
| `/app/appointments/:id` | Appointment detail | Full details, status timeline, QR, directions link, cancellation policy |
| `/app/queue/:appointmentId` | **Live queue tracker** | Token number, patients ahead, estimated wait, status ("Called", "Please proceed to Room 4"), auto-refresh |
| `/app/notifications` | Notifications | Booking, reminder, delay, "you are next" alerts |
| `/app/profile` | Profile & settings | Personal info, language preference, notification preferences, password |
| `/app/family` | Family members | Add or edit dependents for booking on their behalf |
| `/app/records` | Visit history & documents | Past visits, uploaded reports (optional) |
| `/app/reviews/:appointmentId` | Rate & review | Doctor and hospital rating after a completed visit |
| `/app/help` | Help & FAQ | FAQs, contact hospital, report an issue |

### 4.3 Hospital Admin Dashboard

| Route | Page | Purpose / Key elements |
|---|---|---|
| `/admin` | Dashboard | Today's appointments, patients waiting, average wait, no-show rate, doctor availability, live alerts |
| `/admin/appointments` | Appointments | Table with filters (date, doctor, dept, status), confirm, reschedule, cancel, export |
| `/admin/queue` | **Live queue control** | Per-doctor queue columns, Call Next, Skip, Mark No-Show, Move to Priority, Emergency insert, delay broadcast |
| `/admin/walk-in` | Walk-in registration | Quick form, assign doctor, generate token, print token slip |
| `/admin/checkin` | Check-in desk | Scan patient QR or search by phone or ID, mark arrived |
| `/admin/doctors` | Doctors | List, add, edit, deactivate, assign department |
| `/admin/doctors/:id/schedule` | Schedule & availability | Weekly template, slot duration, breaks, leave and holidays, overrides |
| `/admin/departments` | Departments | Add or edit departments, room numbers, token prefixes |
| `/admin/patients` | Patients | Search, visit history, appointment history, notes |
| `/admin/reports` | Reports & analytics | Footfall, wait times, peak hours, no-show rate, doctor utilization, export CSV or PDF |
| `/admin/staff` | Staff & roles | Add receptionists and doctors, assign roles and permissions |
| `/admin/settings` | Hospital settings | Profile, timings, policies (cancel window, grace period), notification templates |
| `/admin/notifications` | Broadcasts | Send delay or closure messages to affected patients |

### 4.4 Doctor View (scoped inside admin)

| Route | Page | Purpose |
|---|---|---|
| `/doctor` | My day | Today's schedule and summary counts |
| `/doctor/queue` | My queue | Current patient, next patients, Call Next, Complete, add consultation note |
| `/doctor/availability` | Availability | Mark break, late arrival, or leave; the queue ETA updates automatically |

### 4.5 Super Admin Console (multi-hospital layer)

| Route | Page | Purpose |
|---|---|---|
| `/super` | Platform overview | Total hospitals, appointments, active users |
| `/super/hospitals` | Hospitals | Onboarding requests, approve or suspend, create hospital admin |
| `/super/hospitals/:id` | Hospital detail | Stats, staff, activity for one hospital |
| `/super/analytics` | Global analytics | Cross-hospital trends, busiest specialties, city heatmap |
| `/super/users` | Users | Search and manage accounts |
| `/super/audit` | Audit log | Who did what and when (bookings, cancellations, role changes) |
| `/super/settings` | System settings | Global policies, feature flags |

### 4.6 Special Screens (high demo impact)

| Route | Page | Purpose |
|---|---|---|
| `/display/:hospitalId/:deptId` | **Waiting-hall display board** | Full-screen TV view: "Now serving A-014", next tokens, per-doctor status, auto-updating |
| `/checkin/:hospitalId` | Kiosk check-in | Patient enters phone or scans QR, gets a token, no reception needed |

### 4.7 Phase 2 Pages (Healix integration)

| Route | Page | Purpose |
|---|---|---|
| `/app/assistant` | **Healix voice booking assistant** | Chat plus mic button, live transcript, language auto-detect, streaming replies, spoken responses |
| (component) | **Booking confirmation card** | In-chat card showing doctor, hospital, time, fee, with Confirm and Change buttons (voice or tap) |
| (component) | Emergency banner | Reused from Healix; appears instead of booking when red-flag symptoms are detected |

---

## 5. Core Features

### 5.1 Appointment Booking
- Search by specialty, doctor, hospital, city, date, language.
- Slot generation from the doctor's weekly template (slot length, breaks, leaves).
- **Slot holding:** selecting a slot locks it for 5 minutes; expires automatically if not confirmed.
- **No double booking:** enforced in MongoDB with a unique index on `(doctor_id, start)`, an atomic slot-status update, and a transaction when the booking is confirmed (see section 6.6).
- Reschedule and cancel within the hospital's policy window.
- Booking for self or family members.

### 5.2 Queue System
- **Token generation:** department prefix plus daily counter (for example `CARD-014`), reset every day.
- **Appointment status lifecycle:**
  `Booked → Checked-in → In Queue → Called → In Consultation → Completed`
  Alternate ends: `Cancelled`, `No-Show`, `Rescheduled`, `Expired`.
- **Queue ordering rules:**
  1. Emergency or priority (elderly, pregnant, critical) first.
  2. Booked patients by slot time, with a grace period (default 10 minutes).
  3. Walk-ins fitted into gaps or appended in arrival order.
- **Late arrival:** after the grace period the patient moves behind the current queue, or is offered a reschedule.
- **No-show handling:** called twice, then marked No-Show and the slot is released.
- **Doctor delay or break:** all downstream ETAs shift and affected patients are notified.

### 5.3 Estimated Waiting Time
```
expected_duration(doctor) = rolling average of last N completed consultations
                            (fallback: configured slot length)

ETA(patient) = remaining time of current consultation
             + sum of expected_duration for each patient ahead
             + small buffer (5–10%)
```
Recomputed on every queue state change and pushed to clients in real time.

### 5.4 Notifications
- Channels: in-app (must), email (should), SMS or WhatsApp (optional).
- Triggers: booking confirmed, reminder (24 h and 1 h before), doctor delayed, "3 patients ahead", "you are next", cancelled, rescheduled.

### 5.5 Real-Time Updates
- **Server-Sent Events (SSE)** for queue and display board updates (already used in Healix streaming), or WebSockets if two-way is needed.
- Channels: per patient queue, per doctor queue, per department display board.

### 5.6 Analytics (Admin)
- Footfall by hour and day, average wait time, average consultation time.
- No-show and cancellation rates, doctor utilization, peak-hour heatmap.
- Patient satisfaction from reviews.

### 5.7 Security & Privacy
- Role-based access control on every endpoint (patient, receptionist, doctor, hospital admin, super admin).
- Hospital-level data isolation: staff see only their own hospital's data.
- Password hashing (PBKDF2 or bcrypt), JWT sessions, OTP verification, rate limiting on OTP and booking.
- Audit log for sensitive actions. Keep data minimal and use demo data only; consent checkbox at registration.

---

## 6. Database — MongoDB Atlas

### 6.1 Design principles

- **One database, `mediq`, on MongoDB Atlas.** Collections and fields use `snake_case`. Every document has an `_id` (ObjectId) plus `created_at` / `updated_at` stored in **UTC**; the frontend displays **IST**.
- **Reference by ObjectId** for long-lived entities (hospital, department, doctor, user). **Embed small snapshots** where history must not change or joins would be wasteful: an appointment keeps the doctor, hospital and patient names as they were at booking, plus its own `status_history` timeline.
- **Multi-hospital isolation:** every hospital-scoped document carries `hospital_id`, and every admin query filters by the `hospital_id` taken from the staff member's JWT.
- **No hard deletes** for clinical or audit data; use `status` / `is_active` flags.
- **Concurrency safety** comes from atomic single-document updates plus unique indexes. Booking confirmation uses a multi-document transaction (Atlas clusters are replica sets, so transactions are available).
- **Indexes** are declared inside each model and created by Beanie at startup.
- **Staff** (receptionists, doctors, hospital admins) are simply **users with a `role` and a `hospital_id`**, so there is no separate staff collection.

### 6.2 Collections overview

| Collection | Purpose | Key references |
|---|---|---|
| `users` | Patients, staff, doctors, admins | `hospital_id` (staff only) |
| `family_members` | Dependents a patient books for | `user_id` |
| `hospitals` | Hospital profile, location, policies | — |
| `departments` | Departments, rooms, token prefixes | `hospital_id` |
| `doctors` | Doctor profiles and rolling consultation time | `hospital_id`, `department_id`, `user_id` |
| `doctor_schedules` | Weekly working template (one per doctor) | `doctor_id` |
| `doctor_leaves` | Leave and holiday blocks | `doctor_id` |
| `slots` | Pre-generated bookable slots | `doctor_id` |
| `appointments` | Bookings, both pre-booked and walk-in | patient, doctor, hospital, slot |
| `queue_entries` | Live queue state, tokens and ETA | `appointment_id`, `doctor_id` |
| `token_counters` | Atomic daily token sequence per department | `hospital_id`, `department_id` |
| `notifications` | In-app, email and SMS records | `user_id` |
| `reviews` | Ratings after completed visits | appointment, doctor, hospital |
| `audit_logs` | Trail of sensitive actions | `actor_id` |
| `otp_codes` | Short-lived OTPs (auto-deleted by TTL index) | — |
| `patient_profiles` *(Phase 2)* | Healix health profile | `user_id` |
| `assistant_sessions` *(Phase 2)* | Healix chat and voice sessions, pending confirmations | `user_id` |

### 6.3 Relationships

```
hospitals ──< departments ──< doctors ──┬── doctor_schedules   (1 per doctor)
    │                           │       ├──< doctor_leaves
    │                           │       └──< slots
    └──< users (staff)          │
                                └──< appointments >── users (patient) ──< family_members
                                          │  └── slot
                                          └── queue_entries   (1 per appointment)
```

### 6.4 Models (Beanie ODM, Pydantic-based)

Beanie gives async, typed documents for FastAPI. Indexes live in each model's `Settings`. Shared imports and enums first, then one block per area.

#### Shared imports and enums — `app/models/common.py`

```python
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, Enum):
    PATIENT = "patient"; RECEPTIONIST = "receptionist"; DOCTOR = "doctor"
    HOSPITAL_ADMIN = "hospital_admin"; SUPER_ADMIN = "super_admin"

class HospitalStatus(str, Enum):
    PENDING = "pending"; ACTIVE = "active"; SUSPENDED = "suspended"

class SlotStatus(str, Enum):
    OPEN = "open"; HELD = "held"; BOOKED = "booked"; BLOCKED = "blocked"

class AppointmentStatus(str, Enum):
    BOOKED = "booked"; CHECKED_IN = "checked_in"; IN_QUEUE = "in_queue"
    CALLED = "called"; IN_CONSULTATION = "in_consultation"; COMPLETED = "completed"
    CANCELLED = "cancelled"; NO_SHOW = "no_show"; RESCHEDULED = "rescheduled"; EXPIRED = "expired"

class AppointmentType(str, Enum):
    BOOKED = "booked"; WALK_IN = "walk_in"

class CreatedVia(str, Enum):
    WEB = "web"; DESK = "desk"; KIOSK = "kiosk"; VOICE = "voice"

class QueueStatus(str, Enum):
    WAITING = "waiting"; CALLED = "called"; IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"; SKIPPED = "skipped"; NO_SHOW = "no_show"; CANCELLED = "cancelled"

class Channel(str, Enum):
    IN_APP = "in_app"; EMAIL = "email"; SMS = "sms"

class NotificationType(str, Enum):
    BOOKING_CONFIRMED = "booking_confirmed"; REMINDER = "reminder"
    DOCTOR_DELAYED = "doctor_delayed"; QUEUE_UPDATE = "queue_update"
    YOU_ARE_NEXT = "you_are_next"; CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"; SYSTEM = "system"
```

#### Accounts — `app/models/accounts.py`

```python
class User(Document):
    name: str
    phone: str
    email: Optional[str] = None
    password_hash: str
    role: Role = Role.PATIENT
    hospital_id: Optional[PydanticObjectId] = None     # staff and doctors only
    preferred_language: str = "en"                     # en, ta, hi, te, ml, kn ...
    is_verified: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("phone", ASCENDING)], unique=True),
            # unique only when an email is actually present
            IndexModel([("email", ASCENDING)], unique=True,
                       partialFilterExpression={"email": {"$type": "string"}}),
            IndexModel([("role", ASCENDING), ("hospital_id", ASCENDING)]),
        ]


class FamilyMember(Document):
    user_id: PydanticObjectId
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    relation: str                                      # mother, son, spouse ...
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "family_members"
        indexes = [IndexModel([("user_id", ASCENDING)])]
```

#### Hospitals, departments, doctors — `app/models/hospitals.py`

```python
class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: list[float]                           # [longitude, latitude]


class HospitalSettings(BaseModel):
    grace_period_minutes: int = 10                     # late-arrival grace
    cancel_window_hours: int = 2                       # latest a patient may cancel
    slot_hold_minutes: int = 5
    walk_ins_enabled: bool = True


class Hospital(Document):
    name: str
    city: str
    address: str
    phone: str
    email: Optional[str] = None
    location: Optional[GeoPoint] = None
    timings: str = "24x7"
    facilities: list[str] = []
    rating_avg: float = 0.0
    rating_count: int = 0
    status: HospitalStatus = HospitalStatus.PENDING
    settings: HospitalSettings = HospitalSettings()
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "hospitals"
        indexes = [
            IndexModel([("city", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("name", "text")]),
            IndexModel([("location", "2dsphere")]),    # "hospitals near me"
        ]


class Department(Document):
    hospital_id: PydanticObjectId
    name: str
    room: Optional[str] = None
    token_prefix: str                                  # e.g. "CARD"
    is_active: bool = True

    class Settings:
        name = "departments"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("token_prefix", ASCENDING)], unique=True),
            IndexModel([("hospital_id", ASCENDING), ("name", ASCENDING)]),
        ]


class Doctor(Document):
    user_id: Optional[PydanticObjectId] = None         # login account, if any
    hospital_id: PydanticObjectId
    department_id: PydanticObjectId
    name: str
    specialty: str
    qualifications: list[str] = []
    experience_years: int = 0
    fee: int = 0                                       # INR
    languages: list[str] = ["en"]
    gender: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    avg_consult_minutes: float = 10.0                  # rolling average, feeds the ETA engine
    rating_avg: float = 0.0
    rating_count: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "doctors"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("department_id", ASCENDING)]),
            IndexModel([("specialty", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("name", "text"), ("specialty", "text")]),
        ]
```

#### Scheduling — `app/models/scheduling.py`

```python
class TimeRange(BaseModel):
    start: str                                         # "HH:MM" (IST)
    end: str


class WeeklyRule(BaseModel):
    weekday: int                                       # 0 = Monday ... 6 = Sunday
    start: str
    end: str
    breaks: list[TimeRange] = []


class DoctorSchedule(Document):                        # exactly one per doctor
    doctor_id: PydanticObjectId
    hospital_id: PydanticObjectId
    slot_minutes: int = 15
    weekly: list[WeeklyRule] = []
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "doctor_schedules"
        indexes = [IndexModel([("doctor_id", ASCENDING)], unique=True)]


class DoctorLeave(Document):
    doctor_id: PydanticObjectId
    hospital_id: PydanticObjectId
    date_from: datetime
    date_to: datetime
    reason: Optional[str] = None

    class Settings:
        name = "doctor_leaves"
        indexes = [IndexModel([("doctor_id", ASCENDING), ("date_from", ASCENDING)])]


class Slot(Document):                                  # generated for a rolling window (e.g. next 14 days)
    doctor_id: PydanticObjectId
    hospital_id: PydanticObjectId
    department_id: PydanticObjectId
    start: datetime                                    # UTC
    end: datetime
    status: SlotStatus = SlotStatus.OPEN
    held_by: Optional[PydanticObjectId] = None         # user holding the slot during booking
    held_until: Optional[datetime] = None
    appointment_id: Optional[PydanticObjectId] = None

    class Settings:
        name = "slots"
        indexes = [
            IndexModel([("doctor_id", ASCENDING), ("start", ASCENDING)], unique=True),  # no duplicate slots
            IndexModel([("doctor_id", ASCENDING), ("status", ASCENDING), ("start", ASCENDING)]),
            IndexModel([("status", ASCENDING), ("held_until", ASCENDING)]),             # expired-hold sweep
        ]
```

#### Appointments and queue — `app/models/booking.py`

```python
class PatientSnapshot(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None


class StatusEvent(BaseModel):
    status: AppointmentStatus
    at: datetime = Field(default_factory=utcnow)
    by: Optional[PydanticObjectId] = None              # user who caused the change
    note: Optional[str] = None


class Appointment(Document):
    booking_code: str                                  # human-friendly, e.g. "APT-7K3Q9"
    patient_id: PydanticObjectId                       # the account that booked
    family_member_id: Optional[PydanticObjectId] = None
    patient: PatientSnapshot                           # who the visit is for, as at booking
    hospital_id: PydanticObjectId
    department_id: PydanticObjectId
    doctor_id: PydanticObjectId
    slot_id: Optional[PydanticObjectId] = None         # None for walk-ins
    hospital_name: str                                 # snapshots, so history never changes
    doctor_name: str
    department_name: str
    scheduled_start: datetime
    scheduled_end: datetime
    type: AppointmentType = AppointmentType.BOOKED
    reason: Optional[str] = None
    symptoms_note: Optional[str] = None
    fee: int = 0
    status: AppointmentStatus = AppointmentStatus.BOOKED
    status_history: list[StatusEvent] = []
    created_via: CreatedVia = CreatedVia.WEB
    rescheduled_from: Optional[PydanticObjectId] = None
    cancelled_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "appointments"
        indexes = [
            IndexModel([("booking_code", ASCENDING)], unique=True),
            IndexModel([("patient_id", ASCENDING), ("scheduled_start", DESCENDING)]),
            IndexModel([("doctor_id", ASCENDING), ("scheduled_start", ASCENDING)]),
            IndexModel([("hospital_id", ASCENDING), ("status", ASCENDING), ("scheduled_start", ASCENDING)]),
        ]


class QueueEntry(Document):
    appointment_id: PydanticObjectId
    hospital_id: PydanticObjectId
    department_id: PydanticObjectId
    doctor_id: PydanticObjectId
    queue_date: str                                    # "YYYY-MM-DD" in IST
    token: str                                         # "CARD-014"
    token_number: int
    priority: int = 2                                  # 0 emergency, 1 priority (elderly/pregnant/critical), 2 normal
    status: QueueStatus = QueueStatus.WAITING
    sort_time: datetime                                # slot start for booked patients, arrival time for walk-ins;
                                                       # reset to "now" when a late arrival loses their place
    position: Optional[int] = None                     # 1 = next
    eta_minutes: Optional[int] = None
    call_count: int = 0                                # 2 unanswered calls -> no_show
    checked_in_at: Optional[datetime] = None
    called_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    consult_minutes: Optional[float] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "queue_entries"
        indexes = [
            IndexModel([("appointment_id", ASCENDING)], unique=True),
            IndexModel([("hospital_id", ASCENDING), ("department_id", ASCENDING),
                        ("queue_date", ASCENDING), ("token_number", ASCENDING)], unique=True),
            # the live queue query: one doctor, today, waiting, ordered
            IndexModel([("doctor_id", ASCENDING), ("queue_date", ASCENDING), ("status", ASCENDING),
                        ("priority", ASCENDING), ("sort_time", ASCENDING)]),
        ]


class TokenCounter(Document):                          # atomic $inc source for token numbers
    hospital_id: PydanticObjectId
    department_id: PydanticObjectId
    date: str                                          # "YYYY-MM-DD" in IST
    seq: int = 0
    expire_at: datetime                                # cleaned up automatically

    class Settings:
        name = "token_counters"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("department_id", ASCENDING),
                        ("date", ASCENDING)], unique=True),
            IndexModel([("expire_at", ASCENDING)], expireAfterSeconds=0),
        ]
```

#### Engagement and system — `app/models/system.py`

```python
class Notification(Document):
    user_id: PydanticObjectId
    type: NotificationType
    channel: Channel = Channel.IN_APP
    title: str
    body: str
    data: dict = {}                                    # e.g. {"appointment_id": "..."}
    delivery_status: str = "sent"                      # sent | failed
    sent_at: datetime = Field(default_factory=utcnow)
    read_at: Optional[datetime] = None

    class Settings:
        name = "notifications"
        indexes = [IndexModel([("user_id", ASCENDING), ("read_at", ASCENDING), ("sent_at", DESCENDING)])]


class Review(Document):
    appointment_id: PydanticObjectId
    patient_id: PydanticObjectId
    doctor_id: PydanticObjectId
    hospital_id: PydanticObjectId
    doctor_rating: int = Field(ge=1, le=5)
    hospital_rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "reviews"
        indexes = [
            IndexModel([("appointment_id", ASCENDING)], unique=True),   # one review per visit
            IndexModel([("doctor_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("hospital_id", ASCENDING), ("created_at", DESCENDING)]),
        ]


class AuditLog(Document):
    actor_id: Optional[PydanticObjectId] = None
    actor_role: Optional[Role] = None
    hospital_id: Optional[PydanticObjectId] = None
    action: str                                        # "appointment.cancel", "doctor.create", "queue.call_next" ...
    entity: str                                        # collection name
    entity_id: Optional[PydanticObjectId] = None
    via: CreatedVia = CreatedVia.WEB                   # marks voice-agent actions
    metadata: dict = {}
    ip: Optional[str] = None
    timestamp: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "audit_logs"
        indexes = [
            IndexModel([("hospital_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("actor_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("entity", ASCENDING), ("entity_id", ASCENDING)]),
        ]


class OtpCode(Document):
    target: str                                        # phone or email
    purpose: str                                       # register | login | reset
    code_hash: str
    attempts: int = 0
    expires_at: datetime

    class Settings:
        name = "otp_codes"
        indexes = [
            IndexModel([("target", ASCENDING), ("purpose", ASCENDING)]),
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),   # TTL: auto-delete when expired
        ]
```

#### Phase 2 — Healix — `app/models/assistant.py`

```python
class PatientProfile(Document):                        # migrated from Healix; sensitive, used only with consent
    user_id: PydanticObjectId
    allergies: list[str] = []
    medications: list[str] = []
    chronic_conditions: list[str] = []
    blood_group: Optional[str] = None
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "patient_profiles"
        indexes = [IndexModel([("user_id", ASCENDING)], unique=True)]


class ChatMessage(BaseModel):
    role: str                                          # user | assistant | tool
    content: str
    language: Optional[str] = None
    at: datetime = Field(default_factory=utcnow)


class ToolCallLog(BaseModel):
    name: str                                          # search_doctors, book_appointment ...
    arguments: dict = {}
    ok: bool = True
    at: datetime = Field(default_factory=utcnow)


class PendingAction(BaseModel):                        # what is waiting for the patient's "yes"
    type: str                                          # book | reschedule | cancel
    payload: dict                                      # doctor_id, slot_id, appointment_id ...
    expires_at: datetime


class AssistantSession(Document):
    user_id: PydanticObjectId
    language: str = "en"
    messages: list[ChatMessage] = []                   # cap to the last N messages
    tool_calls: list[ToolCallLog] = []
    pending_action: Optional[PendingAction] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "assistant_sessions"
        indexes = [IndexModel([("user_id", ASCENDING), ("updated_at", DESCENDING)])]
```

### 6.5 Sample documents

**`appointments`**
```json
{
  "_id": "66f1a0c2b7d3e4a5c6d70011",
  "booking_code": "APT-7K3Q9",
  "patient_id": "66f19f00b7d3e4a5c6d70001",
  "family_member_id": null,
  "patient": { "name": "Arun Kumar", "age": 34, "gender": "male", "phone": "+91XXXXXXXXXX" },
  "hospital_id": "66f19a10b7d3e4a5c6d70101",
  "department_id": "66f19a20b7d3e4a5c6d70201",
  "doctor_id": "66f19a30b7d3e4a5c6d70301",
  "slot_id": "66f19b40b7d3e4a5c6d70401",
  "hospital_name": "City Hospital",
  "doctor_name": "Dr. Meena Raj",
  "department_name": "Cardiology",
  "scheduled_start": "2026-09-25T05:00:00Z",
  "scheduled_end": "2026-09-25T05:15:00Z",
  "type": "booked",
  "reason": "Chest discomfort follow-up",
  "fee": 500,
  "status": "booked",
  "status_history": [
    { "status": "booked", "at": "2026-09-20T09:12:41Z", "by": "66f19f00b7d3e4a5c6d70001", "note": null }
  ],
  "created_via": "voice",
  "created_at": "2026-09-20T09:12:41Z",
  "updated_at": "2026-09-20T09:12:41Z"
}
```

**`queue_entries`**
```json
{
  "_id": "66f1a0c2b7d3e4a5c6d70021",
  "appointment_id": "66f1a0c2b7d3e4a5c6d70011",
  "hospital_id": "66f19a10b7d3e4a5c6d70101",
  "department_id": "66f19a20b7d3e4a5c6d70201",
  "doctor_id": "66f19a30b7d3e4a5c6d70301",
  "queue_date": "2026-09-25",
  "token": "CARD-014",
  "token_number": 14,
  "priority": 2,
  "status": "waiting",
  "sort_time": "2026-09-25T05:00:00Z",
  "position": 3,
  "eta_minutes": 28,
  "call_count": 0,
  "checked_in_at": "2026-09-25T04:41:10Z"
}
```

### 6.6 Key database operations

These are the operations that make booking and the queue safe. Shown in `mongosh` syntax so they are independent of the driver version.

**1. Hold a slot** (atomic; an expired hold counts as free)
```js
db.slots.findOneAndUpdate(
  { _id: slotId,
    $or: [ { status: "open" },
           { status: "held", held_until: { $lt: now } } ] },
  { $set: { status: "held", held_by: userId, held_until: nowPlus5Min } },
  { returnDocument: "after" }          // null result means someone else got it
)
```

**2. Confirm the booking** (one transaction: both writes succeed or neither does)
```js
session.withTransaction(() => {
  const r = db.slots.updateOne(
    { _id: slotId, status: "held", held_by: userId, held_until: { $gt: now } },
    { $set: { status: "booked", appointment_id: apptId } }, { session });
  if (r.matchedCount !== 1) throw new Error("Slot no longer held");
  db.appointments.insertOne(appointmentDoc, { session });
});
```

**3. Issue a token** (atomic counter, resets per day per department)
```js
const c = db.token_counters.findOneAndUpdate(
  { hospital_id, department_id, date: "2026-09-25" },
  { $inc: { seq: 1 }, $setOnInsert: { expire_at: twoDaysLater } },
  { upsert: true, returnDocument: "after" });
// token = department.token_prefix + "-" + String(c.seq).padStart(3, "0")   -> "CARD-014"
```

**4. Read a doctor's live queue**
```js
db.queue_entries.find({ doctor_id, queue_date: today, status: "waiting" })
                .sort({ priority: 1, sort_time: 1 })
```

**5. Recompute ETAs after any queue change**
Load the waiting entries (query 4), then write `position` and `eta_minutes` back in one `bulkWrite`, and push the change to clients over SSE:
`eta = remaining time of current consultation + (position - 1) × doctor.avg_consult_minutes`, plus the small buffer.

**6. Keep the doctor's average current** (after each completed consultation)
`avg_consult_minutes = 0.8 × avg_consult_minutes + 0.2 × consult_minutes` (a moving average, so one long visit does not distort the ETAs).

**7. Release expired holds** (background task, every minute)
```js
db.slots.updateMany(
  { status: "held", held_until: { $lt: now } },
  { $set: { status: "open", held_by: null, held_until: null } })
```

---

## 7. API Overview

All IDs are MongoDB ObjectIds serialized as strings.

| Group | Endpoints (examples) |
|---|---|
| **Auth** | `POST /auth/register`, `/auth/login`, `/auth/verify-otp`, `/auth/forgot-password`, `GET /auth/me` |
| **Discovery** | `GET /hospitals`, `/hospitals/{id}`, `/doctors`, `/doctors/{id}`, `/specialties` |
| **Slots** | `GET /doctors/{id}/slots?date=`, `POST /slots/{id}/hold` |
| **Appointments** | `POST /appointments`, `GET /appointments/me`, `GET /appointments/{id}`, `PATCH /appointments/{id}/reschedule`, `DELETE /appointments/{id}` |
| **Queue** | `GET /queue/{appointment_id}`, `POST /queue/check-in`, `POST /queue/call-next`, `/queue/skip`, `/queue/no-show`, `/queue/complete`, `GET /queue/stream` (SSE) |
| **Walk-in** | `POST /walk-in` |
| **Admin** | `CRUD /admin/doctors`, `/admin/departments`, `/admin/schedules`, `/admin/staff`, `GET /admin/reports/*` |
| **Super Admin** | `GET /super/hospitals`, `PATCH /super/hospitals/{id}/approve`, `GET /super/analytics` |
| **Notifications** | `GET /notifications`, `PATCH /notifications/{id}/read` |
| **Voice (existing in Healix)** | `POST /voice/stt`, `POST /voice/tts`, `GET /voice/languages` |
| **Assistant (Phase 2)** | `POST /assistant/chat` (SSE), tool endpoints reused from the groups above |

---

## 8. Tech Stack

Reuse the Healix stack so Phase 2 integration is seamless.

| Layer | Choice |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Zustand, React Router, Recharts (analytics), Lucide icons |
| **Backend** | FastAPI, Uvicorn, Beanie ODM (async, Pydantic models for MongoDB) |
| **Database** | **MongoDB Atlas** (a free M0 cluster is enough for the demo); replica-set transactions protect slot booking |
| **Real-time** | SSE (fallback: WebSockets) |
| **Auth** | JWT plus role-based access, PBKDF2 hashing, OTP |
| **Notifications** | In-app plus email (SMTP or Resend); SMS optional |
| **AI / Voice (Phase 2)** | OpenRouter LLMs, Bhashini ULCA (STT, TTS), MCP tool layer, RAG (ChromaDB) for hospital FAQs and policies, web search for hospital info |

### 8.1 MongoDB Atlas setup

1. Create a free **M0** cluster in Atlas. Pick a region close to where the backend is hosted to keep latency low.
2. Create a database user with a strong password and `readWrite` access to the `mediq` database.
3. **Network Access:** allow the backend host. Free hosting tiers often use changing IPs, so for the demo allow `0.0.0.0/0` with a strong password, and tighten it later.
4. Copy the SRV connection string into the backend environment file:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=mediq
```

5. Initialize Beanie once at startup (FastAPI lifespan). Indexes from every model are created automatically:

```python
# app/core/db.py
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient   # Beanie 1.x; newer Beanie releases use PyMongo's async client

async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB],
        document_models=[
            User, FamilyMember, Hospital, Department, Doctor,
            DoctorSchedule, DoctorLeave, Slot, Appointment, QueueEntry,
            TokenCounter, Notification, Review, AuditLog, OtpCode,
            PatientProfile, AssistantSession,          # Phase 2
        ],
    )
```

6. Load demo data with the seed script (`python -m seed.run`): 3 hospitals, departments, 12+ doctors with schedules, generated slots, and sample patients.

---

## 9. Suggested Project Structure

```
mediq/
├── backend/
│   ├── app/
│   │   ├── core/            # config, db.py (Mongo client + init_beanie), security, roles
│   │   ├── models/          # Beanie documents (one file per area, see section 6.4)
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── hospitals.py
│   │   │   ├── doctors.py
│   │   │   ├── slots.py
│   │   │   ├── appointments.py
│   │   │   ├── queue.py
│   │   │   ├── admin.py
│   │   │   ├── super_admin.py
│   │   │   ├── notifications.py
│   │   │   ├── voice.py         # from Healix
│   │   │   └── assistant.py     # Phase 2
│   │   ├── services/
│   │   │   ├── slot_service.py
│   │   │   ├── queue_service.py     # ordering + ETA engine
│   │   │   ├── notification_service.py
│   │   │   └── bhashini.py          # from Healix
│   │   └── main.py
│   ├── seed/                # demo hospitals, doctors, patients
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/           # public, app, admin, doctor, super, display
│       ├── components/      # slot grid, queue card, token badge, tables, charts
│       ├── services/        # api client, SSE consumer
│       ├── store/           # Zustand stores
│       └── routes.tsx
└── ChroniQ.md
```

---

## 10. Phase 2 — Healix Voice Booking

### 10.1 Idea
Healix becomes an **agent that acts on the platform**, not only a chatbot. The patient speaks, Healix understands, finds real doctors and real slots, asks for confirmation, books, and speaks the result back.

### 10.2 Flow
```
Voice (Tamil / Hindi / English ...)
   ↓  Bhashini STT
Text + auto language detection
   ↓  LLM intent extraction (specialty, date, time, hospital, doctor)
Plan: search → pick slots → confirm → book
   ↓  Tool calls to platform APIs (MCP)
Confirmation card (voice or tap)
   ↓
Booking created → token + QR
   ↓  Bhashini TTS
Spoken confirmation in the patient's language
```

### 10.3 Tools exposed to the agent
| Tool | Purpose |
|---|---|
| `search_doctors(specialty, hospital?, city?, language?)` | Find matching doctors |
| `get_available_slots(doctor_id, date_range)` | Real slots from the database |
| `book_appointment(doctor_id, slot_id, patient_id)` | Create booking (needs confirmation) |
| `reschedule_appointment(appointment_id, new_slot_id)` | Move a booking |
| `cancel_appointment(appointment_id)` | Cancel a booking |
| `get_queue_status(appointment_id)` | "How long is my wait?" |
| `suggest_department(symptoms)` | Map symptoms to a department (guidance only, no diagnosis) |

### 10.4 Guardrails (keep the safety-first identity)
- **Never write to the database without explicit confirmation** from the patient (voice "yes" or a tap).
- **Grounded only:** doctors, slots and hospitals come from tool results, never invented. Slot availability is re-verified at booking time.
- **Emergency first:** red-flag symptoms (chest pain, breathing difficulty, stroke signs) trigger the emergency banner and guidance instead of a booking flow.
- Department suggestions are informational and never a diagnosis.
- Every agent action is written to the audit log with `created_via = voice`.

### 10.5 Example conversation
> **Patient (voice):** "Naalaikku morning cardiologist appointment venum."
> **Healix:** "I found 2 cardiologists with morning slots tomorrow. Dr. A at City Hospital at 10:30, or Dr. B at Sunrise Hospital at 9:45. Which would you like?"
> **Patient:** "First one."
> **Healix:** "Confirm: Dr. A, City Hospital, tomorrow 10:30 AM, fee ₹500?" → **[Confirm] [Change]**
> **Patient:** "Yes."
> **Healix:** "Booked. Your token is CARD-014. I'll remind you an hour before."

### 10.6 Merging Healix's data layer into MongoDB

- Healix currently keeps accounts, patient profiles and chat sessions in SQLite, and document vectors in a local ChromaDB folder. For the merged app, move them into Atlas: accounts into `users`, health profiles into `patient_profiles`, and chat history into `assistant_sessions`.
- Free hosting tiers typically have an ephemeral disk, so anything stored only on local disk can disappear on redeploy. Keep persistent data in Atlas.
- For RAG, either keep ChromaDB for short-lived, per-session document uploads, or move the vectors to **Atlas Vector Search** so a single database serves everything.

---

## 11. UI/UX Guidelines

- **Mobile-first**, since patients mostly use phones; the admin dashboard is desktop-first but responsive.
- Clean medical look: calm palette, high contrast, clear status colors (green available, amber held, red booked or urgent).
- Big, readable token numbers on the queue tracker and the display board.
- Skeleton loaders, empty states and inline errors on every list and form.
- Accessibility: keyboard navigation, ARIA labels, dark mode, language switcher, large-text option.
- Consistent design tokens (colors, spacing, radius) in a single theme file.

---

## 12. Build Roadmap (Hackathon Priorities)

### Must have (MVP)
- [ ] Auth (patient and admin roles)
- [ ] Hospital and doctor listing with search and filters
- [ ] Slot generation and booking flow with confirmation and QR
- [ ] My appointments (view, cancel, reschedule)
- [ ] Admin dashboard: appointments, doctors, schedules
- [ ] **Live queue: token, position, ETA, Call Next** (patient tracker plus admin control)
- [ ] Seed data: 3 hospitals, 12+ doctors, sample patients

### Should have
- [ ] Walk-in registration and check-in
- [ ] Waiting-hall display board
- [ ] Notifications (in-app plus email)
- [ ] Analytics page
- [ ] Super admin hospital onboarding

### Phase 2 (Healix)
- [ ] Assistant page with mic and TTS
- [ ] Tool layer over the booking APIs
- [ ] Confirmation card and guardrails
- [ ] Multilingual voice demo

### Nice to have
- [ ] Kiosk check-in, reviews, family members, PDF or CSV export, map view

### Suggested order
1. Atlas cluster, Beanie models and indexes, seed data, auth
2. Discovery APIs and pages (hospital, doctor, search)
3. Slots and booking flow
4. Queue engine (ordering plus ETA) and live tracker
5. Admin dashboard and queue control
6. Display board, notifications, analytics
7. Healix voice booking integration
8. Polish, deploy, demo rehearsal

---

## 13. Demo Plan (5 minutes)

1. **Problem:** long waits and no visibility (30 s).
2. **Patient books** an appointment on mobile and receives a QR and token (60 s).
3. **Admin dashboard:** the queue moves as the receptionist checks in and the doctor calls the next patient; the patient's ETA and the waiting-hall board update live (90 s).
4. **Delay scenario:** the doctor takes a break, ETAs shift, patients are notified (30 s).
5. **Healix voice booking** in Tamil, from speech to confirmed token (90 s).
6. **Impact and future scope** (30 s).

**Pitch line:** *"Book in your own voice, know your exact wait, and never stand in a hospital queue blind again."*

---

## 14. Future Scope

- Hospital system (HIS/EMR) and ABDM integration.
- Teleconsultation with video and prescriptions.
- Smart no-show prediction and overbooking optimization.
- WhatsApp and IVR booking for feature-phone users.
- Multi-branch hospital groups, insurance and payment integration.
- Ambulance and emergency coordination handoff.

---

## 15. Notes & Risks

- **Concurrency:** test simultaneous bookings for the same slot; rely on the atomic slot update, the unique `(doctor_id, start)` index and the booking transaction, not only UI checks.
- **Atlas hygiene:** keep the connection string only in environment variables, never in the repository, and rotate the database password if it is ever exposed.
- **Time zones:** store every timestamp in UTC and convert to IST only in the UI; `queue_date` and `token_counters.date` use the IST calendar day.
- **ETA credibility:** seed realistic consultation durations so the demo queue behaves believably.
- **Data:** use demo data only; no real patient information.
- **Voice reliability:** keep tap-based fallbacks for every voice action in case of noise or network issues.
- **Disclaimer:** the assistant provides scheduling and general information only, not medical diagnosis.
