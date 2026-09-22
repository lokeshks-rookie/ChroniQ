# ChroniQ MCP Specification — Patient-Only Tools

**Document Version:** 2.0.0
**Previous Version:** 1.0.0
**Revision Date:** 2026-09-21
**Target Audience:** Engineers implementing the separate ChroniQ Model Context Protocol (MCP) Server.
**Scope:** Patient-accessible and public patient-intended capabilities only. All staff and administrative operations are strictly excluded.
**Reference Repository:** `backend/` (`FastAPI`, `Beanie ODM`, `MongoDB Atlas`, `JWT Auth`)
**Specification File Location:** `backend/CHRONIQ_MCP_TOOL_SPEC.md`

---

## 1. Security & Verification Status Summary

> **This specification was produced by direct source inspection of the ChroniQ backend.**
> Every claim is grounded in the actual implementation. Where behavior could not be verified, it is marked **UNVERIFIED**. Where unsafe behavior was found, it is marked as a **BACKEND GAP** and the affected tool is either excluded or flagged.

### 1.1 Critical Findings

| # | Severity | Finding | Affected Tools | Status |
|---|----------|---------|---------------|--------|
| 1 | **CRITICAL** | `check_in_appointment` uses `get_optional_user` — ownership check is bypassed when no auth token is sent | `check_in_appointment` | **BACKEND GAP — Document & mitigate in MCP** |
| 2 | **CRITICAL** | `get_queue_status` has no authentication — any caller can query any appointment's queue position | `get_patient_queue_status` | **BACKEND GAP — Privacy risk** |
| 3 | **HIGH** | `get_doctor_slots` triggers `generate_slots_for_doctor()` which performs DB writes — misclassified as read-only | `get_doctor_slots` | **CORRECTED in spec** |
| 4 | **HIGH** | `GET /reviews/by-appointment/{id}` has no auth — any caller can read any patient's review | `get_appointment_review` | **EXCLUDED from MCP** |
| 5 | **HIGH** | `submit_review` does NOT check `appointment.status == COMPLETED` — reviews can be submitted for non-completed appointments | `submit_appointment_review` | **BACKEND GAP — Documented** |
| 6 | **HIGH** | Rescheduling uses 3 separate `.save()` calls with no MongoDB transaction — partial failure causes data inconsistency | `reschedule_appointment` | **BACKEND GAP — Documented** |
| 7 | **HIGH** | `book_appointment` accepts `patient_name` parameter that overrides authenticated user's name in records | `book_appointment` | **CORRECTED — Field excluded from MCP** |
| 8 | **MEDIUM** | `family_member_id` with invalid ownership silently falls through — no error raised | `book_appointment` | **BACKEND GAP — Documented** |
| 9 | **MEDIUM** | `get_department_queue_board` exposes `appointment_id` of all queued patients without auth | `get_department_queue_board` | **BACKEND GAP — Privacy risk** |
| 10 | **MEDIUM** | `MAX_FAMILY_MEMBERS` is 6, not 10 as previously stated | Spec accuracy | **CORRECTED** |
| 11 | **MEDIUM** | `SupportCategory` and `DocumentCategory` enums were wrong in spec | Schema accuracy | **CORRECTED** |
| 12 | **MEDIUM** | `NotificationPreferences` schema was completely wrong — flat vs nested structure | `update_notification_preferences` | **CORRECTED** |
| 13 | **MEDIUM** | Document deletion does NOT remove physical file from disk | `delete_medical_document` | **BACKEND GAP — Documented** |
| 14 | **MEDIUM** | Account deletion only sets `deletion_requested_at` timestamp — no purge job exists | `request_account_deletion` | **BACKEND GAP — Documented** |
| 15 | **LOW** | Notification model uses `body` field but route returns `message` (runtime mismatch) | `list_notifications` | **BACKEND GAP — Potential bug** |
| 16 | **LOW** | Endpoint count was 115, actual is ~107 | Coverage matrix | **CORRECTED** |
| 17 | **INFO** | `CHRONIQ_AUTH_TOKEN` single-token design blocks multi-patient deployment | Architecture | **Documented** |

### 1.2 Verification Methodology

All claims in this specification are categorized:

- **Verified:** Supported by direct source code inspection and traceable to specific file:line references.
- **Partially Verified:** Some evidence exists from source inspection, but edge cases or error paths remain uncertain.
- **Unverified:** Insufficient evidence from source inspection alone.
- **Blocked:** Unsafe or incomplete behavior prevents MCP exposure until remediated.

---

## 2. Scope & Patient-Only Access Policy

### 2.1 Strict Role Exclusion

The ChroniQ backend implements RBAC with five system roles (defined in [`common.py:20-25`](file:///e:/KLN/ChroniQ/backend/app/models/common.py)):

- `patient` *(Eligible for MCP exposure)*
- `receptionist` *(Strictly Excluded)*
- `doctor` *(Strictly Excluded)*
- `hospital_admin` *(Strictly Excluded)*
- `super_admin` *(Strictly Excluded)*

### 2.2 Non-Negotiable Policy

1. **Zero Privileged Tools:** No tools are exposed for staff queue management (`call-next`, `call-again`, `start-consultation`, `complete-consultation`, `skip`, `no-show`, `emergency-insert`, `priority`), staff scheduling, hospital administration, doctor availability overrides, analytics, audit log inspection, or platform configuration.
2. **Shared Endpoint Scoping:** Where a FastAPI endpoint serves both patients and staff (e.g., `GET /appointments`), the MCP tool strictly uses the patient-scoped branch and the MCP server MUST always send a valid patient JWT.
3. **Unestablished Patient Access:** Any backend operation whose patient authorization cannot be verified is designated **REVIEW REQUIRED** and excluded from the callable tool catalog.
4. **No Direct Database Bypasses:** The MCP server must interface exclusively via backend HTTP/REST endpoints. Direct MongoDB queries that bypass Beanie validation, security headers, rate limiters, or audit events are prohibited.

---

## 3. Backend Architecture & Authentication

### 3.1 Technology Stack

- **Framework:** FastAPI 0.115+ (ASGI, async Python 3.11+)
- **Database:** MongoDB Atlas via Motor async driver & Beanie ODM
- **Security:** Passlib (Bcrypt) for password hashing; PyJWT (HS256) for signed access & refresh tokens
- **Real-Time Layer:** In-memory async SSE broadcaster ([`sse.py`](file:///e:/KLN/ChroniQ/backend/app/core/sse.py))
- **Time Standard:** UTC throughout database models and service logic (`utcnow()`, `ensure_utc()`), with IST (UTC+05:30) for daily queue numbering (`get_today_ist()`)

### 3.2 Patient Authentication & Identity Resolution

**Identity Derivation:** The authenticated patient identity **must never** be accepted as an unverified parameter. The MCP server injects `Authorization: Bearer <token>` on every authenticated request.

**Backend Resolution** ([`dependencies.py:53-97`](file:///e:/KLN/ChroniQ/backend/app/core/dependencies.py#L53-L97)):
1. `get_current_user` extracts the `sub` claim from the JWT.
2. Validates `type == "access"`.
3. Resolves the `User` record from MongoDB by ObjectId, phone, or email.
4. Rejects inactive accounts.

**Privilege Escalation Protection:**
- `POST /auth/register` ([`auth.py:93-97`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L92-L97)): Rejects `role != PATIENT` with HTTP 403.
- `POST /auth/google` ([`auth.py:328-332`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L328-L332)): Google OAuth is restricted to patient accounts; staff accounts cannot use Google Sign-In.

**Two Authentication Dependencies:**

| Dependency | Behavior | Used By |
|---|---|---|
| `get_current_user` | **Mandatory auth** — raises 401 if no/invalid token | Most patient routes |
| `get_optional_user` | **Optional auth** — returns `None` if no token | `POST /queue/check-in` ⚠️ |

> [!CAUTION]
> **`get_optional_user` at [`dependencies.py:100-121`](file:///e:/KLN/ChroniQ/backend/app/core/dependencies.py#L100-L121) does NOT enforce authentication.** Routes using this dependency execute even without credentials. The MCP server MUST always send valid credentials on every authenticated request regardless of whether the backend requires it.

### 3.3 MCP Authentication Architecture

```
+------------------+         +-------------------------+         +-------------------------+
|   MCP Client /   |  Tool   |   ChroniQ MCP Server    |  HTTP   |     ChroniQ Backend     |
|  Language Model  | ------> | (Separate Repository)   | ------> |        (FastAPI)        |
+------------------+  Call   +-------------------------+ Req     +-------------------------+
                                 | Injects Verified                 | Validates Bearer JWT
                                 | Authorization: Bearer            | Extracts `current_user`
                                 | Header from Session              | Enforces RBAC & Tenant
```

**MCP Caller Authentication:**
- The MCP server receives a patient's JWT access token via environment variable (`CHRONIQ_AUTH_TOKEN`) or MCP client session headers.
- This token is injected into every backend HTTP request as `Authorization: Bearer <token>`.
- Token expiration: Controlled by `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60 min in [`config.py:28`](file:///e:/KLN/ChroniQ/backend/app/core/config.py#L28)).
- Token refresh: `POST /auth/refresh` accepts a refresh token and issues a new access token. **Not exposed as an MCP tool** — the MCP server should handle refresh internally.

> [!WARNING]
> **Multi-Patient Deployment: BLOCKED**
>
> The `CHRONIQ_AUTH_TOKEN` design supports exactly **one patient per MCP server instance**. There is no session multiplexing. If two patients share an MCP instance, they share credentials and identity.
>
> **Required before multi-patient release:**
> 1. Per-session credential injection via MCP client headers
> 2. Session-to-patient identity mapping
> 3. Token refresh automation per session
> 4. Credential isolation between concurrent callers

---

## 4. Patient-Accessible Tool Catalog

The corrected MCP tool catalog contains **30 tools** categorized by exposure level:
- **Patient Public Read:** 5 tools
- **Patient Public Read (State-Changing Side-Effect):** 1 tool
- **Patient Authenticated Read:** 7 tools
- **Patient Mutation:** 17 tools

**Removed from v1.0 (7 tools):**
- `get_appointment_review` — No auth, leaks patient data (see §7.2)
- `get_doctor_slots` alias `/slots/available` — Merged with primary `get_doctor_slots`
- `GET /appointments` — Shared endpoint; use `/appointments/me` only
- `GET /auth/me` — Redundant with `get_patient_profile`
- `GET /patient/profile` — Alias of primary route
- `GET /family-members` — Alias of primary route
- `DELETE /appointments/{id}` — Alias of `cancel_appointment`

---

### 4.1 Discovery Tools (Patient Public Read)

#### `list_hospitals`
- **Description:** Search and filter active hospitals. Supports city, minimum rating, doctor specialty, text search, and geospatial coordinates.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /hospitals`
- **Authentication:** None required
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `city` | Query param `city` | No | Case-insensitive regex match |
| `specialty` | Query param `specialty` | No | Filters hospitals having doctors with this specialty |
| `rating` | Query param `rating` | No | `number`, min 1.0, max 5.0 |
| `search` | Query param `search` | No | Case-insensitive substring on hospital name |
| `lat` | Query param `lat` | No | Latitude for geospatial search (requires `lng`) |
| `lng` | Query param `lng` | No | Longitude for geospatial search (requires `lat`) |
| `radius_km` | Query param `radius_km` | No | Default 25.0. Used with lat/lng |

- **Output Schema:** Array of `HospitalResponse` (`id`, `name`, `city`, `address`, `phone`, `email`, `rating_avg`, `rating_count`, `timings`, `facilities`, `location`, `status`, `settings`, `created_at`, `updated_at`).
- **Confirmation Required:** No
- **Source:** [`discovery.py:55-96`](file:///e:/KLN/ChroniQ/backend/app/routes/discovery.py#L55-L96) | **Verified**

---

#### `get_hospital_details`
- **Description:** Fetch detailed profile of a specific hospital including active departments and doctors.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /hospitals/{id}`
- **Authentication:** None required
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Hospital ID or `custom_id` (e.g. `hosp_madurai_01`) |

- **Output Schema:** `HospitalResponse` merged with `departments` list (`id`, `name`, `room`, `token_prefix`) and `doctors` list (`DoctorResponse`).
- **Errors:** `404 Not Found`
- **Confirmation Required:** No
- **Source:** [`discovery.py:99-131`](file:///e:/KLN/ChroniQ/backend/app/routes/discovery.py#L99-L131) | **Verified**

---

#### `search_doctors`
- **Description:** Find active doctors by specialty, hospital, city, gender, language, max fee, min rating, or name search.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /doctors`
- **Authentication:** None required
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `specialty` | Query param `specialty` | No | Exact match (e.g. `Cardiology`) |
| `hospital_id` | Query param `hospital_id` | No | Hospital ID |
| `city` | Query param `city` | No | Case-insensitive |
| `gender` | Query param `gender` | No | `male`, `female`, `other` |
| `language` | Query param `language` | No | e.g. `Tamil`, `English` |
| `fee_max` | Query param `fee_max` | No | Integer, max consultation fee INR |
| `rating_min` | Query param `rating_min` | No | Number 1.0–5.0 |
| `search` | Query param `search` | No | Name or specialty substring |

- **Output Schema:** Array of `DoctorResponse` (`id`, `user_id`, `hospital_id`, `department_id`, `name`, `specialty`, `qualifications`, `experience_years`, `fee`, `languages`, `gender`, `bio`, `photo_url`, `avg_consult_minutes`, `rating_avg`, `rating_count`, `room`, `is_active`).
- **Confirmation Required:** No
- **Source:** [`discovery.py:134-176`](file:///e:/KLN/ChroniQ/backend/app/routes/discovery.py#L134-L176) | **Verified**

---

#### `get_doctor_profile`
- **Description:** Retrieve the full public clinical profile of a doctor.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /doctors/{id}`
- **Authentication:** None required
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Doctor ID or `custom_id` |

- **Output Schema:** `DoctorResponse` (same fields as `search_doctors` item).
- **Errors:** `404 Not Found`
- **Confirmation Required:** No
- **Source:** [`discovery.py:179-187`](file:///e:/KLN/ChroniQ/backend/app/routes/discovery.py#L179-L187) | **Verified**

---

#### `list_specialties`
- **Description:** Retrieve all distinct medical specialties offered by active doctors.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /specialties`
- **Authentication:** None required
- **Input Schema:** None
- **Output Schema:** Array of strings (sorted alphabetically).
- **Confirmation Required:** No
- **Source:** [`discovery.py:190-195`](file:///e:/KLN/ChroniQ/backend/app/routes/discovery.py#L190-L195) | **Verified**

---

### 4.2 Slot Discovery & Hold Tools

#### `get_doctor_slots`
- **Description:** List bookable time slots for a doctor on a specific date. **Warning: This endpoint has write side-effects** — it triggers 14-day slot generation if needed via `generate_slots_for_doctor()`.
- **Classification:** ⚠️ **State-Changing Side-Effect on Read**
- **HTTP Route:** `GET /doctors/{id}/slots`
- **Authentication:** None required
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `doctor_id` | URL path `{id}` | **Yes** | Doctor ID or `custom_id` |
| `date` | Query param `date` | **Yes** | `YYYY-MM-DD` format |

- **Output Schema:** Array of `SlotResponse` (`id`, `doctor_id`, `hospital_id`, `department_id`, `start`, `end`, `status`, `held_by`, `held_until`, `appointment_id`). Status is one of `open`, `held`, `booked`, `blocked`.

> [!WARNING]
> **State-Changing Side-Effect:**
> At [`slots.py:48`](file:///e:/KLN/ChroniQ/backend/app/routes/slots.py#L48), the handler calls `await generate_slots_for_doctor(id, days=14)` which creates new `Slot` documents in MongoDB via `Slot.insert_many()` ([`slot_service.py:97`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py#L97)). This is a database mutation triggered by a GET request.
>
> Additionally, expired holds are normalized in-memory (lines 57-62) but NOT persisted back to the database — only the returned view shows corrected statuses.
>
> **Recommendation for backend review:** Slot generation should be moved to a background task or a separate POST endpoint.

- **Confirmation Required:** No
- **Source:** [`slots.py:32-63`](file:///e:/KLN/ChroniQ/backend/app/routes/slots.py#L32-L63), [`slot_service.py:20-108`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py#L20-L108) | **Verified**

---

#### `hold_appointment_slot`
- **Description:** Reserve an open slot for 5 minutes to prevent double-booking during checkout.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `POST /slots/{id}/hold`
- **Authentication:** **Required** — `get_current_user`
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `slot_id` | URL path `{id}` | **Yes** | Slot MongoDB ObjectId |

- **Output Schema:**

| Field | Type | Description |
|---|---|---|
| `slot_id` | string | ID of the held slot |
| `held_until` | datetime (ISO 8601) | UTC expiry timestamp |
| `expires_in_seconds` | integer | Seconds remaining |

- **Concurrency:** Handled atomically via MongoDB `find_one_and_update` at [`slot_service.py:111-154`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py#L111-L154). The atomic condition accepts: `status == OPEN`, expired `HELD`, or re-hold by same user. Returns `409 Conflict` if unavailable.
- **Hold Duration:** Configured by `SLOT_HOLD_MINUTES` (default 5 in [`config.py:50`](file:///e:/KLN/ChroniQ/backend/app/core/config.py#L50)).
- **Confirmation Required:** Yes (confirms intent to begin reservation)
- **Source:** [`slots.py:66-88`](file:///e:/KLN/ChroniQ/backend/app/routes/slots.py#L66-L88) | **Verified**

---

#### `release_appointment_slot`
- **Description:** Manually release a previously held slot if the patient decides not to book.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `POST /slots/{id}/release`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** Backend requires `held_by == current_user.id` ([`slot_service.py:164-167`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py#L164-L167)).
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `slot_id` | URL path `{id}` | **Yes** | Slot MongoDB ObjectId |

- **Output Schema:** `{ "success": bool, "slot_id": string }`
- **Confirmation Required:** No
- **Source:** [`slots.py:91-99`](file:///e:/KLN/ChroniQ/backend/app/routes/slots.py#L91-L99), [`slot_service.py:157-179`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py#L157-L179) | **Verified**

---

### 4.3 Appointment Management Tools

#### `book_appointment`
- **Description:** Finalize an appointment using a valid held slot. Generates a unique booking code, links patient/family details, and transitions slot to `booked`.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `POST /appointments`
- **Authentication:** **Required** — `get_current_user`
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `slot_id` | `payload.slot_id` | **Yes** | Slot MongoDB ObjectId; must be held by caller |
| `doctor_id` | `payload.doctor_id` | **Yes** | Doctor ID or `custom_id` |
| `family_member_id` | `payload.family_member_id` | No | Must belong to authenticated patient (see §8) |
| `reason` | `payload.reason` | No | Free text visit reason |
| `symptoms_note` | `payload.symptoms_note` or `payload.symptoms` | No | Additional symptoms text |

> [!CAUTION]
> **Excluded Fields (Security):**
> - `patient_name` — **MUST NOT be exposed via MCP.** At [`booking_service.py:75`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L75), this field overrides the authenticated user's name in the `PatientSnapshot`. Exposing it allows name impersonation in appointment records. The MCP server should never pass this field.
> - `patient` (PatientSnapshot object) — Same risk. The backend falls back to the authenticated user's data when omitted.
> - `date`, `time` — Only used when `slot_id` is absent. MCP booking MUST use the hold→book workflow.

- **Output Schema:** Full `AppointmentResponse` dict (see §4.3.1).
- **State Transition:** Slot `held` → `booked` (atomic via [`booking_service.py:127-148`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L127-L148)). Appointment status = `booked`.
- **Ownership Enforcement:** `slot.held_by == user_id` checked at [`booking_service.py:49-53`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L49-L53).
- **Confirmation Required:** **YES** (High-impact mutation; user confirmation required)
- **Source:** [`appointments.py:56-75`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L56-L75), [`booking_service.py:22-151`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L22-L151) | **Verified**

##### 4.3.1 AppointmentResponse Schema

| Field | Type | Notes |
|---|---|---|
| `id` | string | MongoDB ObjectId |
| `booking_code` | string | e.g. `APT-7K3Q9` |
| `patient_id` | string | Authenticated user ID |
| `family_member_id` | string \| null | If booking for dependent |
| `patient` | PatientSnapshot | `{name, age, gender, phone}` |
| `hospital_id` | string | |
| `department_id` | string | |
| `doctor_id` | string | |
| `slot_id` | string \| null | |
| `hospital_name` | string | |
| `doctor_name` | string | |
| `department_name` | string | |
| `scheduled_start` | datetime | UTC |
| `scheduled_end` | datetime | UTC |
| `type` | enum | `booked` or `walk_in` |
| `reason` | string \| null | |
| `symptoms_note` | string \| null | |
| `fee` | integer | INR |
| `status` | AppointmentStatus | See §6.1 |
| `status_history` | array[StatusEvent] | |
| `created_via` | enum | `web`, `desk`, `kiosk`, `voice` |
| `rescheduled_from` | string \| null | |
| `cancelled_reason` | string \| null | |
| `desk_confirmed` | bool | |
| `needs_reschedule` | bool | |
| `token` | string \| null | Queue token when checked in |
| `created_at` | datetime | |
| `updated_at` | datetime | |

---

#### `list_my_appointments`
- **Description:** Fetch all appointments for the authenticated patient.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /appointments/me`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** Scoped to `Appointment.patient_id == str(current_user.id)` ([`appointments.py:90-91`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L90-L91)).
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| *(none)* | — | — | — |

> [!NOTE]
> The backend also supports `GET /appointments` which serves both patient and staff views based on role. The MCP server MUST use `/appointments/me` exclusively to guarantee patient-scoped results.

- **Output Schema:** Array of `AppointmentResponse` sorted descending by `scheduled_start`.
- **Confirmation Required:** No
- **Source:** [`appointments.py:78-92`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L78-L92) | **Verified**

---

#### `get_appointment_details`
- **Description:** Retrieve details of a specific appointment by ID or booking code.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /appointments/{id}`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** For patients, `apt.patient_id == str(current_user.id)` enforced at [`appointments.py:130-131`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L130-L131). Returns `403 Forbidden` on mismatch.
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Appointment MongoDB ID or booking code |

- **Output Schema:** `AppointmentResponse`.
- **Errors:** `404 Not Found`, `403 Forbidden`
- **Confirmation Required:** No
- **Source:** [`appointments.py:116-137`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L116-L137) | **Verified**

---

#### `reschedule_appointment`
- **Description:** Move an existing appointment to a new open/held slot. Frees the previously allocated slot.
- **Classification:** State-Changing (Patient Mutation) ⚠️
- **HTTP Route:** `PATCH /appointments/{id}/reschedule`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** `apt.patient_id == str(current_user.id)` enforced at [`appointments.py:152-153`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L152-L153).
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Appointment ID |
| `new_slot_id` | `payload.new_slot_id` | **Yes** | New slot to book |
| `reason` | `payload.reason` | No | Reason for rescheduling |

> [!WARNING]
> **Atomicity Gap (BACKEND GAP #6):**
> The reschedule handler at [`appointments.py:159-198`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L159-L198) performs 3 separate `.save()` calls:
> 1. Free old slot (line 167)
> 2. Book new slot (line 178)
> 3. Update appointment (line 197)
>
> There is no MongoDB multi-document transaction wrapping these operations. If step 3 fails:
> - The old slot is lost (freed)
> - The new slot is marked `booked` with no valid appointment
>
> **Additional gap:** The handler does NOT check if the appointment is already `cancelled` or `completed` before rescheduling.
>
> **MCP Mitigation:** The MCP client should verify the response is a success before considering the reschedule complete. If an error occurs, the patient should be advised to check their appointments list.

- **Preconditions:** New slot must be `open` or `held`. Previous slot is freed to `open`.
- **Confirmation Required:** **YES** (Modifies scheduled healthcare appointment)
- **Source:** [`appointments.py:140-198`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L140-L198) | **Verified — Atomicity gap documented**

---

#### `cancel_appointment`
- **Description:** Cancel an upcoming appointment and release its allocated slot.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `POST /appointments/{id}/cancel`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** `apt.patient_id == str(current_user.id)` enforced at [`appointments.py:214-215`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L214-L215).
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Appointment ID |
| `reason` | `payload.reason` | No | Default: `"Cancelled by user"` |

- **Output Schema:** `AppointmentResponse` with status `cancelled`.
- **Preconditions:** Appointment must not already be `completed` or `cancelled` ([`booking_service.py:160-161`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L160-L161)).
- **Side Effects:** Releases slot to `open`; cancels any associated queue entry.
- **Reversibility:** **Not reversible.** Once cancelled, a new booking must be made.
- **Confirmation Required:** **YES** (Permanent appointment cancellation)
- **Source:** [`appointments.py:201-223`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L201-L223), [`booking_service.py:154-188`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L154-L188) | **Verified**

---

### 4.4 Queue & Live Tracking Tools

#### `get_patient_queue_status`
- **Description:** Query live queue token position, ETA, and status for an appointment.
- **Classification:** Read-Only ⚠️ (Privacy risk)
- **HTTP Route:** `GET /queue/{appointment_id}`
- **Authentication:** ⚠️ **None required by backend**

> [!CAUTION]
> **Privacy Gap (BACKEND GAP #2):**
> This endpoint at [`queue.py:142-162`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L142-L162) has **no `get_current_user` dependency** and **no ownership check**. Any caller who knows an `appointment_id` can retrieve the queue entry, which contains: `appointment_id`, `doctor_id`, `hospital_id`, `token`, `token_number`, `status`, `position`, `eta_minutes`, `checked_in_at`, `consult_minutes`.
>
> **MCP Mitigation:** The MCP server MUST always send the patient's auth token. The MCP tool should only accept appointment IDs that the patient has previously retrieved via `list_my_appointments` or `get_appointment_details`.

- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `appointment_id` | URL path `{appointment_id}` | **Yes** | Appointment ID or Queue Entry ID |

- **Output Schema:** If queue entry exists: full queue entry dict (`id`, `appointment_id`, `hospital_id`, `department_id`, `doctor_id`, `queue_date`, `token`, `token_number`, `priority`, `status`, `position`, `eta_minutes`, `call_count`, `skip_count`, `is_late_arrival`, `checked_in_at`, `called_at`, `started_at`, `completed_at`, `consult_minutes`). If no queue entry: `{appointment_id, status, token, position: null, eta_minutes: null}`.
- **Confirmation Required:** No
- **Source:** [`queue.py:142-162`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L142-L162) | **Verified — Privacy gap documented**

---

#### `get_department_queue_board`
- **Description:** View the live active token queue for a hospital department (mirrors physical display boards).
- **Classification:** Read-Only ⚠️ (Privacy risk)
- **HTTP Route:** `GET /queue/{hospital_id}/{department_id}`
- **Authentication:** ⚠️ **None required by backend**

> [!WARNING]
> **Privacy Gap (BACKEND GAP #9):**
> This endpoint at [`queue.py:119-139`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L119-L139) returns all queue entries including `appointment_id` for every patient in the queue. While this mirrors a physical display board, programmatic access via MCP could enable data harvesting.

- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `hospital_id` | URL path `{hospital_id}` | **Yes** | Hospital ID |
| `department_id` | URL path `{department_id}` | **Yes** | Department ID |
| `date` | Query param `date` | No | `YYYY-MM-DD`, defaults to today IST |

- **Output Schema:** `{ hospital_id, department_id, date, total_entries, entries: [QueueEntry...] }`
- **Confirmation Required:** No
- **Source:** [`queue.py:119-139`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L119-L139) | **Verified — Privacy gap documented**

---

#### `check_in_appointment`
- **Description:** Check in for an appointment on day of visit. Issues a live queue token.
- **Classification:** State-Changing (Patient Mutation) ⚠️
- **HTTP Route:** `POST /queue/check-in`
- **Authentication:** ⚠️ **Optional** — `get_optional_user`

> [!CAUTION]
> **Security Gap (BACKEND GAP #1):**
> At [`queue.py:188`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L188), the handler uses `get_optional_user`. When `current_user` is `None` (no auth token), the ownership check at line 212 is completely skipped:
> ```python
> if current_user:  # ← Skipped when None
>     if current_user.role == Role.PATIENT and appt.patient_id != str(current_user.id):
>         raise HTTPException(...)
> ```
> This means **any unauthenticated request can check in any appointment** if the caller knows the appointment ID or booking code.
>
> **MCP Mandatory Mitigation:** The MCP server MUST always send a valid patient JWT. This ensures `current_user` is populated and the ownership check executes.

- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `appointment_id` | `payload.appointment_id` | Conditional | One of `appointment_id` or `booking_code` required |
| `booking_code` | `payload.booking_code` | Conditional | Alphanumeric booking reference |

- **Output Schema:** `{ success, queue_entry: QueueEntry, appointment: Appointment, token }`
- **Confirmation Required:** **YES** (Commits patient arrival at clinic)
- **Source:** [`queue.py:185-224`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L185-L224), [`queue_service.py:129-212`](file:///e:/KLN/ChroniQ/backend/app/services/queue_service.py#L129-L212) | **Verified — Security gap documented**

---

### 4.5 Patient Profile, Family, & Documents Tools

#### `get_patient_profile`
- **Description:** Fetch the authenticated patient's profile.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /patients/me/profile`
- **Authentication:** **Required** — `get_current_user`
- **Input Schema:** None
- **Output Schema:** `{ id, name, phone, email, age, gender, preferred_language, role, photo_url, email_verified, is_verified, created_at }`
- **Confirmation Required:** No
- **Source:** [`patient.py:37-54`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L37-L54) | **Verified**

---

#### `update_patient_profile`
- **Description:** Update personal demographics (name, phone, email, age, gender, language, photo).
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `PATCH /users/me`
- **Authentication:** **Required** — `get_current_user`
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `name` | `req.name` | No | String, trimmed |
| `phone` | `req.phone` | No | String; duplicate check performed |
| `email` | `req.email` | No | String, lowercased; duplicate check performed |
| `age` | `req.age` | No | Integer |
| `gender` | `req.gender` | No | String |
| `preferred_language` | `req.preferred_language` | No | String |
| `photo_url` | `req.photo_url` | No | URL string |

- **Output Schema:** `UserResponse` (see [`auth.py:70-87`](file:///e:/KLN/ChroniQ/backend/app/schemas/auth.py#L70-L87)).
- **Confirmation Required:** No (unless modifying verified contact info)
- **Source:** [`auth.py:539-569`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L539-L569) | **Verified**

---

#### `update_notification_preferences`
- **Description:** Configure per-event-type notification channel preferences and reminder settings.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `PUT /users/me/notification-preferences`
- **Authentication:** **Required** — `get_current_user`

> [!IMPORTANT]
> **Schema Correction from v1.0:**
> The actual `NotificationPreferences` model at [`accounts.py:17-29`](file:///e:/KLN/ChroniQ/backend/app/models/accounts.py#L17-L29) is a **nested structure**, not the flat schema previously documented:
> ```json
> {
>   "channels": {
>     "booking_confirmed": {"in_app": true, "email": true, "sms": true},
>     "reminder": {"in_app": true, "email": true, "sms": false},
>     "doctor_delayed": {"in_app": true, "email": false, "sms": true},
>     "queue_update": {"in_app": true, "email": false, "sms": false},
>     "you_are_next": {"in_app": true, "email": false, "sms": true},
>     "cancelled": {"in_app": true, "email": true, "sms": true},
>     "rescheduled": {"in_app": true, "email": true, "sms": false},
>     "system": {"in_app": true, "email": false, "sms": false}
>   },
>   "reminder_24h": true,
>   "reminder_1h": true
> }
> ```
> There is **no `whatsapp` channel** and **no `lead_time_minutes` field**.

- **Output Schema:** `UserResponse`
- **Confirmation Required:** No
- **Source:** [`auth.py:609-618`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L609-L618) | **Verified**

---

#### `export_patient_data`
- **Description:** Export patient data (demographics, appointments, document metadata, reviews) as JSON.
- **Classification:** Read-Only ✅ (POST method but no state change)
- **HTTP Route:** `POST /users/me/export`
- **Authentication:** **Required** — `get_current_user`
- **Input Schema:** None
- **Output Schema:** `{ user: UserResponse, appointments: [], documents: [], reviews: [], exported_at }`
- **Confirmation Required:** No
- **Source:** [`auth.py:621-634`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L621-L634) | **Verified**

---

#### `request_account_deletion`
- **Description:** Initiate account deletion request by setting `deletion_requested_at` timestamp.
- **Classification:** State-Changing (Patient Mutation) ⚠️
- **HTTP Route:** `POST /users/me/delete-request`
- **Authentication:** **Required** — `get_current_user`
- **Input Schema:** None

> [!WARNING]
> **BACKEND GAP #14 — Account Deletion Lifecycle:**
> The handler at [`auth.py:637-642`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L637-L642) only sets `deletion_requested_at = utcnow()` and saves the user record. **No background job, scheduled purge, grace period enforcement, or data anonymization logic was found in the codebase.** The "30-day grace period" mentioned in the response message is **UNVERIFIED** — the timestamp is set but never acted upon.
>
> **What actually happens:**
> - `deletion_requested_at` is set on the User document
> - The user account remains fully active and accessible
> - No appointments are cancelled
> - No data is purged
> - No dependent records are affected
>
> **What does NOT happen:**
> - No scheduled deletion job
> - No reauthentication or confirmation flow
> - No email/SMS notification of deletion request

- **Output Schema:** `{ message: "Account deletion requested..." }`
- **Reversibility:** Yes, via `cancel_account_deletion`
- **Confirmation Required:** **YES** (High-impact privacy action)
- **Source:** [`auth.py:637-642`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L637-L642) | **Partially Verified — Purge logic unverified**

---

#### `cancel_account_deletion`
- **Description:** Cancel a pending account deletion request.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `DELETE /users/me/delete-request`
- **Authentication:** **Required** — `get_current_user`
- **Input Schema:** None
- **Output Schema:** `{ message: "Account deletion request cancelled." }`
- **Confirmation Required:** Yes
- **Source:** [`auth.py:645-650`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L645-L650) | **Verified**

---

#### `list_family_members`
- **Description:** List dependent family members for the authenticated patient.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /patients/me/family`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** Scoped to `user_id == current_user.id` ([`patient.py:62`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L62)).
- **Input Schema:** None
- **Output Schema:** Array of `{ id, user_id, name, age, gender, relation, created_at }`
- **Confirmation Required:** No
- **Source:** [`patient.py:57-75`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L57-L75) | **Verified**

---

#### `add_family_member`
- **Description:** Add a dependent family member (subject to quota).
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `POST /family-members`
- **Authentication:** **Required** — `get_current_user`
- **Quota:** `MAX_FAMILY_MEMBERS = 6` ([`config.py:58`](file:///e:/KLN/ChroniQ/backend/app/core/config.py#L58)), enforced at [`patient.py:88`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L88).
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `name` | `payload.name` | **Yes** | String |
| `age` | `payload.age` | No | Integer |
| `gender` | `payload.gender` | No | String |
| `relation` | `payload.relation` | **Yes** | String (e.g. `Spouse`, `Child`, `Parent`) |

- **Output Schema:** `{ id, user_id, name, age, gender, relation, created_at }`
- **Confirmation Required:** No
- **Source:** [`patient.py:78-111`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L78-L111) | **Verified**

---

#### `update_family_member`
- **Description:** Update a family member's details.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `PATCH /family-members/{id}`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** `fm.user_id == current_user.id` ([`patient.py:122`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L122)). Returns `404` on mismatch.
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Family member MongoDB ID |
| `name` | `payload.name` | No | String |
| `age` | `payload.age` | No | Integer |
| `gender` | `payload.gender` | No | String |
| `relation` | `payload.relation` | No | String |

- **Output Schema:** Updated `{ id, user_id, name, age, gender, relation, created_at }`
- **Confirmation Required:** No
- **Source:** [`patient.py:114-143`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L114-L143) | **Verified**

---

#### `delete_family_member`
- **Description:** Remove a dependent family member from the patient account.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `DELETE /family-members/{id}`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** `fm.user_id == current_user.id` ([`patient.py:153`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L153)). Returns `404` on mismatch.
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Family member MongoDB ID |

- **Output Schema:** `{ success: true, message: "Family member deleted." }`
- **Reversibility:** Not reversible — must re-add.
- **Confirmation Required:** **YES**
- **Source:** [`patient.py:146-157`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L146-L157) | **Verified**

---

#### `list_medical_documents`
- **Description:** List metadata of medical documents uploaded by the patient.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /documents`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** Scoped to `patient_id == str(current_user.id)` ([`patient.py:167`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L167)).
- **Input Schema:** None
- **Output Schema:** Array of `{ id, patient_id, family_member_id, appointment_id, name, category, mime, size_bytes, uploaded_at }`

> [!NOTE]
> The response does NOT include `file_path` or download URLs. Only metadata is returned.

- **Confirmation Required:** No
- **Source:** [`patient.py:164-181`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L164-L181) | **Verified**

---

#### `update_medical_document`
- **Description:** Update document display label or category.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `PATCH /documents/{id}`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** `doc.patient_id == str(current_user.id)` ([`patient.py:222`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L222)). Returns `404` on mismatch.
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Document MongoDB ID |
| `name` | `payload.name` | No | Display label |
| `category` | `payload.category` | No | Enum: `lab_report`, `prescription`, `imaging`, `discharge_summary`, `other` |

> [!IMPORTANT]
> **Enum correction from v1.0:** The `DocumentCategory` enum at [`common.py:115-120`](file:///e:/KLN/ChroniQ/backend/app/models/common.py#L115-L120) uses `imaging` (not `scan`).

- **Output Schema:** `{ id, name, category }`
- **Confirmation Required:** No
- **Source:** [`patient.py:214-230`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L214-L230) | **Verified**

---

#### `delete_medical_document`
- **Description:** Delete a medical document's database record.
- **Classification:** State-Changing (Patient Mutation) ⚠️
- **HTTP Route:** `DELETE /documents/{id}`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** `doc.patient_id == str(current_user.id)` ([`patient.py:240`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L240)). Returns `404` on mismatch.

> [!WARNING]
> **BACKEND GAP #13 — Physical File Not Deleted:**
> The handler at [`patient.py:233-244`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L233-L244) calls `await doc.delete()` which only removes the MongoDB `MedicalDocument` record. The physical file at `doc.file_path` is **NOT deleted from disk**. Storage quota is freed in the logical DB calculation but the file persists on the filesystem.

- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Document MongoDB ID |

- **Output Schema:** `{ success: true, message: "Document deleted" }`
- **Reversibility:** Not reversible (DB record deleted; physical file orphaned).
- **Confirmation Required:** **YES**
- **Source:** [`patient.py:233-244`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L233-L244) | **Verified — File deletion gap documented**

---

### 4.6 Reviews, Feedback, Tickets, & Notifications Tools

#### `list_my_reviews`
- **Description:** List all reviews submitted by the authenticated patient.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /reviews`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** Scoped to `patient_id == str(current_user.id)` ([`patient.py:251`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L251)).
- **Input Schema:** None
- **Output Schema:** Array of `{ id, appointment_id, patient_id, doctor_id, hospital_id, doctor_rating, hospital_rating, comment, tags, wait_as_expected, created_at, updated_at }`
- **Confirmation Required:** No
- **Source:** [`patient.py:248-268`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L248-L268) | **Verified**

---

#### ~~`get_appointment_review`~~ — **EXCLUDED**

> [!CAUTION]
> **This tool has been EXCLUDED from the MCP catalog.**
>
> `GET /reviews/by-appointment/{id}` at [`patient.py:381-397`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L381-L397) has **no authentication dependency** and **no ownership check**. Any caller who knows an appointment ID can read the full review including `patient_id`, ratings, and comment text.
>
> This endpoint should NOT be exposed via MCP until the backend adds authentication and ownership verification.

---

#### `submit_appointment_review`
- **Description:** Submit ratings and comments for an appointment. One review per appointment enforced.
- **Classification:** State-Changing (Patient Mutation) ⚠️
- **HTTP Route:** `POST /reviews`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** `appt.patient_id == str(current_user.id)` ([`patient.py:281-282`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L281-L282)).
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `appointment_id` | `payload.appointment_id` | **Yes** | Must belong to authenticated patient |
| `doctor_rating` | `payload.doctor_rating` | **Yes** | Integer 1–5 |
| `hospital_rating` | `payload.hospital_rating` | **Yes** | Integer 1–5 |
| `comment` | `payload.comment` | No | Free text |
| `tags` | `payload.tags` | No | Array of strings |
| `wait_as_expected` | `payload.wait_as_expected` | No | `shorter`, `as_expected`, `longer` |

> [!WARNING]
> **BACKEND GAP #5 — No Completion Check:**
> The backend at [`patient.py:271-306`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L271-L306) does NOT check `appointment.status == COMPLETED` before allowing review submission. A patient could submit a review for a `booked`, `checked_in`, or any non-completed appointment.
>
> **Enforcement that DOES exist:**
> - Ownership check: ✅ `appt.patient_id == current_user.id`
> - Duplicate prevention: ✅ `409 Conflict` if review already exists (unique index on `appointment_id` in [`system.py:55`](file:///e:/KLN/ChroniQ/backend/app/models/system.py#L55))
> - Rating aggregates: ✅ Doctor and hospital averages updated on submission

- **Errors:** `404 Not Found`, `403 Forbidden`, `409 Conflict` (duplicate review)
- **Confirmation Required:** Yes
- **Source:** [`patient.py:271-344`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L271-L344) | **Verified — Completion check gap documented**

---

#### `update_appointment_review`
- **Description:** Edit an existing review within the 48-hour editing window.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `PATCH /reviews/{id}`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** `review.patient_id == str(current_user.id)` ([`patient.py:355`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L355)). Returns `404` on mismatch.
- **Edit Window:** `review.created_at + 48 hours < now` rejects with `400 Bad Request` ([`patient.py:359-363`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L359-L363)).
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Review MongoDB ID |
| `doctor_rating` | `payload.doctor_rating` | No | Integer 1–5 |
| `hospital_rating` | `payload.hospital_rating` | No | Integer 1–5 |
| `comment` | `payload.comment` | No | Free text |
| `tags` | `payload.tags` | No | Array of strings |
| `wait_as_expected` | `payload.wait_as_expected` | No | `shorter`, `as_expected`, `longer` |

- **Output Schema:** `{ id, success: true, updated_at }`
- **Confirmation Required:** No
- **Source:** [`patient.py:347-378`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L347-L378) | **Verified**

---

#### `list_support_tickets`
- **Description:** List patient support tickets and statuses.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /support/tickets`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** Scoped to `patient_id == str(current_user.id)` ([`patient.py:436`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L436)).
- **Input Schema:** None
- **Output Schema:** Array of `{ id, reference, category, status, description, created_at }`
- **Confirmation Required:** No
- **Source:** [`patient.py:433-447`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L433-L447) | **Verified**

---

#### `create_support_ticket`
- **Description:** File a support ticket.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `POST /support/tickets`
- **Authentication:** **Required** — `get_current_user`
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `category` | `payload.category` | **Yes** | Enum: `booking_problem`, `queue_or_waiting`, `fee_or_payment`, `app_problem`, `privacy_concern`, `other` |
| `description` | `payload.description` | **Yes** | Free text |
| `appointment_id` | `payload.appointment_id` | No | Reference appointment |
| `hospital_id` | `payload.hospital_id` | No | Reference hospital |
| `contact_preference` | `payload.contact_preference` | No | Enum: `in_app`, `email`, `sms`. Default `in_app` |

> [!IMPORTANT]
> **Enum correction from v1.0:** The `SupportCategory` enum at [`common.py:106-112`](file:///e:/KLN/ChroniQ/backend/app/models/common.py#L106-L112) uses descriptive names: `booking_problem`, `queue_or_waiting`, `fee_or_payment`, `app_problem`, `privacy_concern`, `other`. The v1.0 spec listed `booking`, `billing`, `technical`, `medical`, `general` which are NOT valid.

- **Output Schema:** `{ id, reference, status, description, created_at }`
- **Confirmation Required:** Yes
- **Source:** [`patient.py:404-430`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L404-L430) | **Verified**

---

#### `list_notifications`
- **Description:** Fetch recent in-app notifications.
- **Classification:** Read-Only ✅
- **HTTP Route:** `GET /notifications`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** Scoped to `user_id == str(current_user.id)` ([`notifications.py:17`](file:///e:/KLN/ChroniQ/backend/app/routes/notifications.py#L17)). Limit 50.
- **Input Schema:** None
- **Output Schema:** Array of `{ id, user_id, title, message, type, channel, read, sent_at, created_at }`

> [!NOTE]
> **Potential Backend Bug (GAP #15):** The Notification model at [`system.py:26`](file:///e:/KLN/ChroniQ/backend/app/models/system.py#L26) uses field `body` but the route at [`notifications.py:24`](file:///e:/KLN/ChroniQ/backend/app/routes/notifications.py#L24) returns `n.message`. This may cause a runtime `AttributeError` unless `message` is defined elsewhere. The MCP server should handle missing fields gracefully.

- **Confirmation Required:** No
- **Source:** [`notifications.py:13-31`](file:///e:/KLN/ChroniQ/backend/app/routes/notifications.py#L13-L31) | **Partially Verified — field name mismatch noted**

---

#### `mark_notification_as_read`
- **Description:** Mark a specific notification as read.
- **Classification:** State-Changing (Patient Mutation) ✅
- **HTTP Route:** `PATCH /notifications/{id}/read`
- **Authentication:** **Required** — `get_current_user`
- **Ownership:** `note.user_id == str(current_user.id)` ([`notifications.py:41`](file:///e:/KLN/ChroniQ/backend/app/routes/notifications.py#L41)). Returns `404` on mismatch.
- **Input Schema:**

| MCP field | Backend field | Required? | Validation |
|---|---|---|---|
| `id` | URL path `{id}` | **Yes** | Notification MongoDB ID |

- **Output Schema:** `{ success: true, id, read: true }`
- **Confirmation Required:** No
- **Source:** [`notifications.py:34-47`](file:///e:/KLN/ChroniQ/backend/app/routes/notifications.py#L34-L47) | **Verified**

---

## 5. Authorization, Ownership, & Tenant Isolation

### 5.1 Mandatory Security Tenets

1. **Patient Credential Verification:** The MCP server MUST resolve authentication via Bearer JWT. The user ID is extracted from the token's `sub` claim by FastAPI. Tool arguments must NEVER accept an unverified `patient_id`.

2. **Strict Record Ownership (Verified by source inspection):**

| Domain | Ownership Check | Source Location | Verified |
|---|---|---|---|
| Appointments (list) | `patient_id == str(current_user.id)` | [`appointments.py:90-91`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L90-L91) | ✅ |
| Appointments (detail) | `apt.patient_id != user_id` → 403 | [`appointments.py:130-131`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L130-L131) | ✅ |
| Appointments (reschedule) | `apt.patient_id != user_id` → 403 | [`appointments.py:152-153`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L152-L153) | ✅ |
| Appointments (cancel) | `apt.patient_id != user_id` → 403 | [`appointments.py:214-215`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L214-L215) | ✅ |
| Queue Check-In | `appt.patient_id != current_user.id` → 403 | [`queue.py:212-213`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L212-L213) | ⚠️ Conditional on auth |
| Queue Status | **NO CHECK** | [`queue.py:142-162`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L142-L162) | ❌ Gap |
| Family Members | `fm.user_id != current_user.id` → 404 | [`patient.py:122`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L122), [`patient.py:153`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L153) | ✅ |
| Documents | `doc.patient_id != str(current_user.id)` → 404 | [`patient.py:222`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L222), [`patient.py:240`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L240) | ✅ |
| Reviews (list) | `patient_id == str(current_user.id)` | [`patient.py:251`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L251) | ✅ |
| Reviews (submit) | `appt.patient_id != str(current_user.id)` → 403 | [`patient.py:281-282`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L281-L282) | ✅ |
| Reviews (update) | `review.patient_id != str(current_user.id)` → 404 | [`patient.py:355`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L355) | ✅ |
| Reviews (by-appointment) | **NO CHECK** | [`patient.py:381-397`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L381-L397) | ❌ Excluded |
| Notifications | `note.user_id != str(current_user.id)` → 404 | [`notifications.py:41`](file:///e:/KLN/ChroniQ/backend/app/routes/notifications.py#L41) | ✅ |
| Support Tickets | `patient_id == str(current_user.id)` | [`patient.py:436`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L436) | ✅ |
| Slot Hold | `held_by == user_id` (atomic) | [`slot_service.py:131`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py#L131) | ✅ |
| Slot Release | `held_by == user_id` (atomic) | [`slot_service.py:167`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py#L167) | ✅ |

3. **Quota Protections:**
   - Maximum Family Members: **6** (`MAX_FAMILY_MEMBERS = 6` in [`config.py:58`](file:///e:/KLN/ChroniQ/backend/app/core/config.py#L58))
   - Document Storage Limit: **50 MB** per patient (`USER_QUOTA_MB = 50` in [`config.py:77`](file:///e:/KLN/ChroniQ/backend/app/core/config.py#L77))
   - Maximum single file: **10 MB** (`MAX_UPLOAD_MB = 10` in [`config.py:76`](file:///e:/KLN/ChroniQ/backend/app/core/config.py#L76))

4. **Review Edit Window:** 48 hours from `created_at` ([`patient.py:359`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L359)).

---

## 6. Booking & Queue State Machine

### 6.1 Slot & Appointment Lifecycle

```
       +---------------------------------------------+
       |                                             |
       v                                             |
[ OPEN SLOT ] --(hold_appointment_slot)--> [ HELD SLOT (5 min) ]
       |                                         |
       | (Expired > 5m)                          | (book_appointment)
       v                                         v
 [ OPEN SLOT ] <---(cancel_appointment)--- [ BOOKED APPOINTMENT ]
                                                 |
                                                 | (check_in_appointment)
                                                 v
                                        [ CHECKED_IN / IN_QUEUE ]
                                                 |
                                                 | (Doctor Consult Workflow - Staff Only)
                                                 v
                                           [ COMPLETED ]
                                                 |
                                                 | (submit_appointment_review)
                                                 v
                                           [ REVIEWED ]
```

### 6.2 AppointmentStatus Enum Values

Defined at [`common.py:41-51`](file:///e:/KLN/ChroniQ/backend/app/models/common.py#L41-L51):

`booked` | `checked_in` | `in_queue` | `called` | `in_consultation` | `completed` | `cancelled` | `no_show` | `rescheduled` | `expired`

### 6.3 Preconditions & Concurrency Protections

1. **Slot Hold:** Slot must be `open`, or `held` with `held_until < utcnow()`, or `held` by same user. Atomic MongoDB `find_one_and_update` at [`slot_service.py:124-149`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py#L124-L149). ✅ Verified.

2. **Booking:** Slot must be `held` and `held_by == user_id`. If expired or held by another, `409 Conflict`. Atomic slot status transition to `booked` at [`booking_service.py:127-148`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L127-L148). ✅ Verified.

3. **Rescheduling:** ⚠️ NOT atomic. Three separate `.save()` calls. See §4.3 `reschedule_appointment` for gap details. Does NOT check if appointment is `cancelled` or `completed`.

4. **Cancellation:** Appointment must not be `completed` or `cancelled` ([`booking_service.py:160-161`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L160-L161)). Releases associated slot and cancels queue entry. ✅ Verified.

5. **Check-In Window:** Service checks for late arrival using `grace_period_minutes` from hospital settings. Late patients get `sort_time = now` (pushed behind on-time patients) at [`queue_service.py:157-161`](file:///e:/KLN/ChroniQ/backend/app/services/queue_service.py#L157-L161). ✅ Verified. The `EARLY_CHECKIN_MINUTES = 60` in config is for kiosk display, not enforced in queue check-in service.

---

## 7. Queue & Review Privacy Rules

### 7.1 Queue Privacy

| Endpoint | Auth | Ownership Check | Patient Data Exposed | Privacy Status |
|---|---|---|---|---|
| `GET /queue/{appointment_id}` | **None** | **None** | `appointment_id`, `doctor_id`, `token`, `position`, `eta_minutes`, `checked_in_at` | ⚠️ **GAP** |
| `GET /queue/{hospital_id}/{department_id}` | **None** | **None** | All queue entries including `appointment_id` for every patient | ⚠️ **GAP** |
| `POST /queue/check-in` | **Optional** | **Conditional** | Appointment details, queue token | ⚠️ **GAP** |

**MCP Mitigation Requirements:**
- The MCP server MUST always send valid patient JWT on all queue requests.
- `get_patient_queue_status` should only be called with appointment IDs the patient is known to own.
- `get_department_queue_board` shows publicly-visible information (mirrors hospital display boards) but should be used judiciously.

### 7.2 Review Privacy

| Endpoint | Auth | Ownership Check | Privacy Status |
|---|---|---|---|
| `GET /reviews` | ✅ Required | ✅ `patient_id == current_user.id` | ✅ Safe |
| `POST /reviews` | ✅ Required | ✅ `appt.patient_id == current_user.id` | ✅ Safe (completion check missing) |
| `PATCH /reviews/{id}` | ✅ Required | ✅ `review.patient_id == current_user.id` | ✅ Safe |
| `GET /reviews/by-appointment/{id}` | ❌ None | ❌ None | ❌ **EXCLUDED** |

---

## 8. Dependent & Identity Validation Rules

### 8.1 Family Member Ownership

Family member operations correctly enforce `fm.user_id == str(current_user.id)` for update and delete. The add operation sets `user_id = str(current_user.id)` automatically. ✅ Verified.

### 8.2 Family Member in Booking

When `family_member_id` is provided to `book_appointment`:

```python
# booking_service.py:79-84
if family_member_id:
    fm = await FamilyMember.get(family_member_id)
    if fm and str(fm.user_id) == user_id:
        snapshot_name = fm.name
        snapshot_age = fm.age
        snapshot_gender = fm.gender
```

**Behavior:** If the `family_member_id` is invalid or belongs to another user, the booking **silently proceeds** using the authenticated patient's own name/demographics. **No error is raised.**

**MCP Recommendation:** The MCP tool should validate `family_member_id` against `list_family_members` results before passing it to `book_appointment`.

### 8.3 Identity Override Protection

| Field | Accepted by Backend | MCP Exposure | Risk |
|---|---|---|---|
| `patient_name` | Yes — overrides snapshot name | **EXCLUDED** | Impersonation in records |
| `patient` (PatientSnapshot) | Yes — overrides snapshot | **EXCLUDED** | Impersonation in records |
| `patient_id` | Not accepted — derived from JWT `sub` | N/A | ✅ Safe |
| `family_member_id` | Yes — validated if provided | **INCLUDED** | Silent fallback on invalid ID |

---

## 9. Confirmation Requirements for Sensitive Actions

| Tool | Exposed | Confirmation Required | Information to Show Before Confirmation | Reversible | Failure Behavior |
|---|---|---|---|---|---|
| `book_appointment` | ✅ | **YES** | Doctor name, date/time, fee, patient name | No (must cancel) | Slot may expire; re-hold needed |
| `cancel_appointment` | ✅ | **YES** | Appointment details, doctor, date/time | **No** | Returns error; appointment unchanged |
| `reschedule_appointment` | ✅ | **YES** | Old and new date/time, doctor | No (must re-reschedule) | ⚠️ Partial failure possible (see §4.3) |
| `check_in_appointment` | ✅ | **YES** | Appointment details, doctor, queue info | No (already in queue) | Returns error; appointment unchanged |
| `hold_appointment_slot` | ✅ | **YES** | Slot time, doctor, 5-min expiry | Yes (auto-expires or release) | Returns 409; try another slot |
| `request_account_deletion` | ✅ | **YES** | Warning about data purge, grace period | Yes (cancel_account_deletion) | Returns error; account unchanged |
| `cancel_account_deletion` | ✅ | Yes | Confirm intent to keep account | Yes | Returns error |
| `delete_family_member` | ✅ | **YES** | Family member name, relation | **No** | Returns error; member unchanged |
| `delete_medical_document` | ✅ | **YES** | Document name, category | **No** | Returns error; document unchanged |
| `create_support_ticket` | ✅ | Yes | Category, description summary | No (ticket filed) | Returns error |
| `submit_appointment_review` | ✅ | Yes | Ratings, comment text | Yes (update within 48h) | Returns error |

**Distinction:** Confirmation is an **MCP client interaction requirement**. The backend does NOT enforce confirmation — it processes any valid request immediately.

---

## 10. Account Deletion & Medical Document Behavior

### 10.1 Account Deletion

| Aspect | Actual Behavior | Evidence |
|---|---|---|
| Trigger | Sets `deletion_requested_at = utcnow()` | [`auth.py:640-641`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L640-L641) |
| Immediate effect | None — account remains fully active | Verified |
| Active appointments | **Not affected** | Verified — no cancellation logic |
| Dependent records | **Not affected** | Verified — no cascade logic |
| Deletion timing | **UNVERIFIED** — no purge job found | No background task in [`background_tasks.py`](file:///e:/KLN/ChroniQ/backend/app/services/background_tasks.py) |
| Grace period | **UNVERIFIED** — 30-day claim in response message only | Response text only |
| Reauthentication | Not required | Verified |
| Cancellation | Sets `deletion_requested_at = None` | [`auth.py:648`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L648) |
| Idempotent | Yes — overwrites previous timestamp | Verified |

### 10.2 Medical Documents

| Aspect | Actual Behavior | Evidence |
|---|---|---|
| Ownership check | `patient_id == str(current_user.id)` | [`patient.py:222`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L222), [`patient.py:240`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L240) |
| List response | Metadata only (no `file_path`, no download URL) | [`patient.py:168-181`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L168-L181) |
| Upload | `POST /documents` — multipart/form-data | Excluded from MCP (binary) |
| Download | **No download endpoint exists** | Verified |
| Update | Label and category only | [`patient.py:214-230`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L214-L230) |
| Delete | DB record deleted; **physical file NOT deleted** | [`patient.py:233-244`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L233-L244) |
| Quota enforcement | `USER_QUOTA_MB = 50` checked on upload | [`document_service.py:49-57`](file:///e:/KLN/ChroniQ/backend/app/services/document_service.py#L49-L57) |
| Allowed file types | PDF, PNG, JPG, WEBP | [`document_service.py:11-17`](file:///e:/KLN/ChroniQ/backend/app/services/document_service.py#L11-L17) |

---

## 11. Error Handling & Safe Error Mapping

| HTTP Status | Backend Meaning | MCP Agent Guidance |
|---|---|---|
| `400 Bad Request` | Validation failure (invalid date, rating, enum) | Clarify input arguments with patient |
| `401 Unauthorized` | Missing, invalid, or expired JWT | Session expired; re-authentication required |
| `403 Forbidden` | Ownership mismatch or role restriction | Record belongs to another patient or restricted |
| `404 Not Found` | Entity does not exist | Inform patient item not found |
| `409 Conflict` | Slot held/booked, duplicate review | Explain conflict; offer alternatives |
| `429 Too Many Requests` | Rate limit exceeded | Ask patient to wait |
| `500 / 503` | Server error | Return: *"ChroniQ service is temporarily unavailable."* |

---

## 12. Complete Endpoint Coverage Matrix

Every registered FastAPI route discovered by source inspection is classified below. Total: **107 distinct route registrations** across 12 router files.

| # | HTTP Method | Route | Router File | Auth Dependency | Patient-Accessible? | MCP Tool | Classification |
|---|---|---|---|---|---|---|---|
| 1 | `GET` | `/health` | `main.py` | None | **Excluded** | — | Infrastructure health check |
| 2 | `GET` | `/hospitals` | `discovery.py` | None | **Included** | `list_hospitals` | Public Read |
| 3 | `GET` | `/hospitals/{id}` | `discovery.py` | None | **Included** | `get_hospital_details` | Public Read |
| 4 | `GET` | `/doctors` | `discovery.py` | None | **Included** | `search_doctors` | Public Read |
| 5 | `GET` | `/doctors/{id}` | `discovery.py` | None | **Included** | `get_doctor_profile` | Public Read |
| 6 | `GET` | `/specialties` | `discovery.py` | None | **Included** | `list_specialties` | Public Read |
| 7 | `GET` | `/doctors/{id}/slots` | `slots.py` | None | **Included** | `get_doctor_slots` | ⚠️ State-Changing Side-Effect |
| 8 | `GET` | `/slots/available` | `slots.py` | None | **Excluded** | — | Alias; use `get_doctor_slots` |
| 9 | `POST` | `/slots/{id}/hold` | `slots.py` | `get_current_user` | **Included** | `hold_appointment_slot` | Mutation |
| 10 | `POST` | `/slots/{id}/release` | `slots.py` | `get_current_user` | **Included** | `release_appointment_slot` | Mutation |
| 11 | `POST` | `/appointments` | `appointments.py` | `get_current_user` | **Included** | `book_appointment` | Mutation |
| 12 | `GET` | `/appointments/me` | `appointments.py` | `get_current_user` | **Included** | `list_my_appointments` | Auth Read |
| 13 | `GET` | `/appointments` | `appointments.py` | `get_current_user` | **Excluded** | — | Shared route; use `/me` |
| 14 | `GET` | `/appointments/{id}` | `appointments.py` | `get_current_user` | **Included** | `get_appointment_details` | Auth Read |
| 15 | `PATCH` | `/appointments/{id}/reschedule` | `appointments.py` | `get_current_user` | **Included** | `reschedule_appointment` | ⚠️ Mutation (atomicity gap) |
| 16 | `POST` | `/appointments/{id}/cancel` | `appointments.py` | `get_current_user` | **Included** | `cancel_appointment` | Mutation |
| 17 | `DELETE` | `/appointments/{id}` | `appointments.py` | `get_current_user` | **Excluded** | — | Alias of cancel |
| 18 | `POST` | `/appointments/{id}/confirm` | `appointments.py` | `require_roles(REC,HA,SA)` | **Excluded** | — | Staff only |
| 19 | `GET` | `/queue/{hospital_id}/{department_id}` | `queue.py` | None | **Included** ⚠️ | `get_department_queue_board` | ⚠️ Public Read (privacy gap) |
| 20 | `GET` | `/queue/entry/{appointment_id}` | `queue.py` | None | **Excluded** | — | Alias; use `get_patient_queue_status` |
| 21 | `GET` | `/queue/{appointment_id}` | `queue.py` | None | **Included** ⚠️ | `get_patient_queue_status` | ⚠️ Public Read (privacy gap) |
| 22 | `POST` | `/queue/check-in` | `queue.py` | `get_optional_user` | **Included** ⚠️ | `check_in_appointment` | ⚠️ Mutation (auth gap) |
| 23 | `GET` | `/queue/stream` | `queue.py` | None | **Excluded** | — | SSE stream; incompatible with MCP |
| 24 | `POST` | `/queue/call-next` | `queue.py` | `require_roles(DOC,REC,HA,SA)` | **Excluded** | — | Staff only |
| 25 | `POST` | `/queue/call-again` | `queue.py` | `require_roles(DOC,REC,HA,SA)` | **Excluded** | — | Staff only |
| 26 | `POST` | `/queue/start` | `queue.py` | `require_roles(DOC,REC,HA,SA)` | **Excluded** | — | Staff only |
| 27 | `POST` | `/queue/start-consultation` | `queue.py` | `require_roles(DOC,REC,HA,SA)` | **Excluded** | — | Staff only |
| 28 | `POST` | `/queue/complete` | `queue.py` | `require_roles(DOC,REC,HA,SA)` | **Excluded** | — | Staff only |
| 29 | `POST` | `/queue/skip` | `queue.py` | `require_roles(DOC,REC,HA,SA)` | **Excluded** | — | Staff only |
| 30 | `POST` | `/queue/no-show` | `queue.py` | `require_roles(DOC,REC,HA,SA)` | **Excluded** | — | Staff only |
| 31 | `PATCH` | `/queue/{entry_id}/priority` | `queue.py` | `require_roles(DOC,REC,HA,SA)` | **Excluded** | — | Staff only |
| 32 | `POST` | `/queue/emergency-insert` | `queue.py` | `require_roles(DOC,REC,HA,SA)` | **Excluded** | — | Staff only |
| 33 | `GET` | `/patients/me/profile` | `patient.py` | `get_current_user` | **Included** | `get_patient_profile` | Auth Read |
| 34 | `GET` | `/patient/profile` | `patient.py` | `get_current_user` | **Excluded** | — | Alias |
| 35 | `GET` | `/patients/me/family` | `patient.py` | `get_current_user` | **Included** | `list_family_members` | Auth Read |
| 36 | `GET` | `/family-members` | `patient.py` | `get_current_user` | **Excluded** | — | Alias |
| 37 | `POST` | `/family-members` | `patient.py` | `get_current_user` | **Included** | `add_family_member` | Mutation |
| 38 | `PATCH` | `/family-members/{id}` | `patient.py` | `get_current_user` | **Included** | `update_family_member` | Mutation |
| 39 | `DELETE` | `/family-members/{id}` | `patient.py` | `get_current_user` | **Included** | `delete_family_member` | Mutation |
| 40 | `GET` | `/documents` | `patient.py` | `get_current_user` | **Included** | `list_medical_documents` | Auth Read |
| 41 | `POST` | `/documents` | `patient.py` | `get_current_user` | **Review Required** | — | Multipart binary; MCP incompatible |
| 42 | `PATCH` | `/documents/{id}` | `patient.py` | `get_current_user` | **Included** | `update_medical_document` | Mutation |
| 43 | `DELETE` | `/documents/{id}` | `patient.py` | `get_current_user` | **Included** | `delete_medical_document` | Mutation |
| 44 | `GET` | `/reviews` | `patient.py` | `get_current_user` | **Included** | `list_my_reviews` | Auth Read |
| 45 | `POST` | `/reviews` | `patient.py` | `get_current_user` | **Included** | `submit_appointment_review` | Mutation |
| 46 | `PATCH` | `/reviews/{id}` | `patient.py` | `get_current_user` | **Included** | `update_appointment_review` | Mutation |
| 47 | `GET` | `/reviews/by-appointment/{id}` | `patient.py` | **None** | **Excluded** | — | ❌ No auth, leaks patient data |
| 48 | `GET` | `/support/tickets` | `patient.py` | `get_current_user` | **Included** | `list_support_tickets` | Auth Read |
| 49 | `POST` | `/support/tickets` | `patient.py` | `get_current_user` | **Included** | `create_support_ticket` | Mutation |
| 50 | `GET` | `/notifications` | `notifications.py` | `get_current_user` | **Included** | `list_notifications` | Auth Read |
| 51 | `PATCH` | `/notifications/{id}/read` | `notifications.py` | `get_current_user` | **Included** | `mark_notification_as_read` | Mutation |
| 52 | `GET` | `/auth/me` | `auth.py` | `get_current_user` | **Excluded** | — | Redundant with `get_patient_profile` |
| 53 | `PATCH` | `/users/me` | `auth.py` | `get_current_user` | **Included** | `update_patient_profile` | Mutation |
| 54 | `PUT` | `/users/me/notification-preferences` | `auth.py` | `get_current_user` | **Included** | `update_notification_preferences` | Mutation |
| 55 | `POST` | `/users/me/export` | `auth.py` | `get_current_user` | **Included** | `export_patient_data` | Auth Read (POST) |
| 56 | `POST` | `/users/me/delete-request` | `auth.py` | `get_current_user` | **Included** | `request_account_deletion` | Mutation |
| 57 | `DELETE` | `/users/me/delete-request` | `auth.py` | `get_current_user` | **Included** | `cancel_account_deletion` | Mutation |
| 58 | `POST` | `/auth/login` | `auth.py` | None (rate limited) | **Excluded** | — | Credential leak risk in LLM context |
| 59 | `POST` | `/auth/register` | `auth.py` | None (rate limited) | **Excluded** | — | Credential leak risk in LLM context |
| 60 | `POST` | `/auth/google` | `auth.py` | None (rate limited) | **Excluded** | — | OAuth browser exchange |
| 61 | `POST` | `/auth/verify-otp` | `auth.py` | None | **Excluded** | — | OTP verification flow |
| 62 | `POST` | `/auth/resend-otp` | `auth.py` | None | **Excluded** | — | OTP resend flow |
| 63 | `POST` | `/auth/forgot-password` | `auth.py` | None | **Excluded** | — | Password recovery |
| 64 | `POST` | `/auth/reset-password` | `auth.py` | None | **Excluded** | — | Password reset |
| 65 | `POST` | `/auth/refresh` | `auth.py` | None | **Excluded** | — | Internal token refresh |
| 66 | `POST` | `/users/me/verify-contact` | `auth.py` | `get_current_user` | **Excluded** | — | OTP verification flow |
| 67 | `PATCH` | `/users/me/password` | `auth.py` | `get_current_user` | **Excluded** | — | Password in LLM context risk |
| 68 | `POST` | `/walk-in` | `walk_in.py` | `get_current_user` | **Excluded** | — | Staff/kiosk only |
| 69 | `GET` | `/kiosk/{hospitalId}/lookup-phone` | `kiosk.py` | None | **Excluded** | — | Physical terminal only |
| 70 | `GET` | `/kiosk/{hospitalId}/lookup-qr` | `kiosk.py` | None | **Excluded** | — | Physical terminal only |
| 71 | `POST` | `/kiosk/check-in` | `kiosk.py` | None | **Excluded** | — | Physical terminal only |
| 72 | `POST` | `/kiosk/walk-in` | `kiosk.py` | None | **Excluded** | — | Physical terminal only |
| 73 | `GET` | `/kiosk/{hospitalId}/departments` | `kiosk.py` | None | **Excluded** | — | Physical terminal only |
| 74 | `GET` | `/doctor/profile` | `doctor.py` | `get_current_user` | **Excluded** | — | Doctor portal |
| 75 | `GET` | `/doctor/day-summary` | `doctor.py` | `get_current_user` | **Excluded** | — | Doctor portal |
| 76 | `GET` | `/doctor/queue` | `doctor.py` | `get_current_user` | **Excluded** | — | Doctor portal |
| 77 | `POST` | `/consultations/draft` | `doctor.py` | `get_current_user` | **Excluded** | — | Doctor portal |
| 78 | `GET` | `/doctor/availability` | `doctor.py` | `get_current_user` | **Excluded** | — | Doctor portal |
| 79 | `POST` | `/doctor/availability` | `doctor.py` | `get_current_user` | **Excluded** | — | Doctor portal |
| 80 | `POST` | `/doctor/leaves` | `doctor.py` | `get_current_user` | **Excluded** | — | Doctor portal |
| 81 | `DELETE` | `/doctor/leaves/{id}` | `doctor.py` | `get_current_user` | **Excluded** | — | Doctor portal |
| 82 | `GET` | `/admin/departments` | `admin.py` | `require_roles(HA,SA,REC)` | **Excluded** | — | Admin only |
| 83 | `POST` | `/admin/departments` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 84 | `PUT` | `/admin/departments/{id}` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 85 | `PATCH` | `/admin/departments/{id}/status` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 86 | `GET` | `/admin/doctors` | `admin.py` | `require_roles(HA,SA,REC)` | **Excluded** | — | Admin only |
| 87 | `POST` | `/admin/doctors` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 88 | `PUT` | `/admin/doctors/{id}` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 89 | `PATCH` | `/admin/doctors/{id}/status` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 90 | `GET` | `/admin/schedules/{doctor_id}` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 91 | `PUT` | `/admin/schedules/{doctor_id}` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 92 | `POST` | `/admin/doctors/{id}/leaves` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 93 | `DELETE` | `/admin/doctors/leaves/{leave_id}` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 94 | `PATCH` | `/admin/settings/policies` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 95 | `PATCH` | `/admin/settings/profile` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 96 | `PUT` | `/admin/settings/templates/{type}` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 97 | `GET` | `/admin/settings/templates` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 98 | `GET` | `/admin/templates` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 99 | `GET` | `/admin/staff` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 100 | `POST` | `/admin/staff` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 101 | `PUT` | `/admin/staff/{id}` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 102 | `PATCH` | `/admin/staff/{id}/status` | `admin.py` | `require_roles(HA,SA)` | **Excluded** | — | Admin only |
| 103 | `POST` | `/patients/{id}/notes` | `admin.py` | Staff auth | **Excluded** | — | Admin only |
| 104 | `POST` | `/notifications/broadcast-delay` | `admin.py` | Staff auth | **Excluded** | — | Admin only |
| 105 | `POST` | `/audit/log` | `admin.py` | Staff auth | **Excluded** | — | Admin only |
| 106 | `GET` | `/audit/log` | `admin.py` | Staff auth | **Excluded** | — | Admin only |
| 107 | `GET` | `/admin/queue` | `admin.py` | Staff auth | **Excluded** | — | Admin only |
| 108 | `GET` | `/admin/dashboard/stats` | `admin.py` | Staff auth | **Excluded** | — | Admin only |
| 109 | `GET` | `/super/hospitals` | `super_admin.py` | `require_roles(SA)` | **Excluded** | — | Super Admin only |
| 110 | `POST` | `/super/hospitals` | `super_admin.py` | `require_roles(SA)` | **Excluded** | — | Super Admin only |
| 111 | `PATCH` | `/super/hospitals/{id}/status` | `super_admin.py` | `require_roles(SA)` | **Excluded** | — | Super Admin only |
| 112 | `GET` | `/super/analytics` | `super_admin.py` | `require_roles(SA)` | **Excluded** | — | Super Admin only |
| 113 | `GET` | `/super/analytics/overview` | `super_admin.py` | `require_roles(SA)` | **Excluded** | — | Super Admin only |
| 114 | `GET` | `/super/users` | `super_admin.py` | `require_roles(SA)` | **Excluded** | — | Super Admin only |
| 115 | `GET` | `/super/audit` | `super_admin.py` | `require_roles(SA)` | **Excluded** | — | Super Admin only |

**Summary:**
- **Included (Patient MCP Tools):** 30 routes → 30 tools
- **Excluded (Staff/Admin/Infrastructure):** 77 routes
- **Review Required:** 1 route (`POST /documents` — binary upload)
- **Privacy-Flagged Included:** 3 routes (queue endpoints with auth gaps)

---

## 13. Unresolved Backend Gaps & Blocked Tools

See [`CHRONIQ_MCP_HIGH_PRIORITY_GAPS.md`](file:///e:/KLN/ChroniQ/backend/CHRONIQ_MCP_HIGH_PRIORITY_GAPS.md) for the complete prioritized remediation checklist.

**Summary of gaps affecting MCP tools:**

| Gap # | Severity | Tool Affected | Issue | Workaround |
|---|---|---|---|---|
| 1 | CRITICAL | `check_in_appointment` | `get_optional_user` — no auth enforcement | MCP MUST send JWT always |
| 2 | CRITICAL | `get_patient_queue_status` | No auth, no ownership check | MCP limits to known appointment IDs |
| 5 | HIGH | `submit_appointment_review` | No appointment completion check | MCP validates status before calling |
| 6 | HIGH | `reschedule_appointment` | Non-atomic multi-save | Document risk; patient checks result |
| 7 | HIGH | `book_appointment` | `patient_name` override | MCP excludes field |
| 8 | MEDIUM | `book_appointment` | `family_member_id` silent fallback | MCP pre-validates |
| 9 | MEDIUM | `get_department_queue_board` | Exposes all `appointment_id`s | Accept for public display mirroring |
| 13 | MEDIUM | `delete_medical_document` | Physical file not deleted | Document gap |
| 14 | MEDIUM | `request_account_deletion` | No purge job exists | Document gap |
| 15 | LOW | `list_notifications` | `body` vs `message` field mismatch | Handle gracefully |

---

## 14. Verification Evidence

### 14.1 Files Inspected

| File | Purpose | Lines |
|---|---|---|
| [`app/main.py`](file:///e:/KLN/ChroniQ/backend/app/main.py) | Router registration | 149 |
| [`app/core/dependencies.py`](file:///e:/KLN/ChroniQ/backend/app/core/dependencies.py) | Auth, RBAC, kiosk auth | 164 |
| [`app/core/security.py`](file:///e:/KLN/ChroniQ/backend/app/core/security.py) | JWT, bcrypt, OTP | 76 |
| [`app/core/config.py`](file:///e:/KLN/ChroniQ/backend/app/core/config.py) | All settings | 119 |
| [`app/routes/discovery.py`](file:///e:/KLN/ChroniQ/backend/app/routes/discovery.py) | Public browse | 196 |
| [`app/routes/slots.py`](file:///e:/KLN/ChroniQ/backend/app/routes/slots.py) | Slot routes | 110 |
| [`app/routes/appointments.py`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py) | Appointment CRUD | 244 |
| [`app/routes/queue.py`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py) | Queue + SSE | 377 |
| [`app/routes/patient.py`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py) | Family, docs, reviews, tickets | 448 |
| [`app/routes/auth.py`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py) | Auth, profile, deletion | 651 |
| [`app/routes/notifications.py`](file:///e:/KLN/ChroniQ/backend/app/routes/notifications.py) | Notifications | 48 |
| [`app/routes/doctor.py`](file:///e:/KLN/ChroniQ/backend/app/routes/doctor.py) | Doctor portal (excluded) | 327 |
| [`app/routes/admin.py`](file:///e:/KLN/ChroniQ/backend/app/routes/admin.py) | Admin panel (excluded) | 694 |
| [`app/routes/super_admin.py`](file:///e:/KLN/ChroniQ/backend/app/routes/super_admin.py) | Super admin (excluded) | 143 |
| [`app/routes/kiosk.py`](file:///e:/KLN/ChroniQ/backend/app/routes/kiosk.py) | Kiosk (excluded) | 276 |
| [`app/routes/walk_in.py`](file:///e:/KLN/ChroniQ/backend/app/routes/walk_in.py) | Walk-in (excluded) | 123 |
| [`app/services/slot_service.py`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py) | Slot gen, hold, release | 199 |
| [`app/services/booking_service.py`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py) | Booking, cancel | 189 |
| [`app/services/queue_service.py`](file:///e:/KLN/ChroniQ/backend/app/services/queue_service.py) | Check-in, recompute | 507 |
| [`app/services/document_service.py`](file:///e:/KLN/ChroniQ/backend/app/services/document_service.py) | Upload/storage | 83 |
| [`app/models/common.py`](file:///e:/KLN/ChroniQ/backend/app/models/common.py) | Enums, helpers | 126 |
| [`app/models/accounts.py`](file:///e:/KLN/ChroniQ/backend/app/models/accounts.py) | User, FamilyMember | 97 |
| [`app/models/booking.py`](file:///e:/KLN/ChroniQ/backend/app/models/booking.py) | Appointment, QueueEntry | 115 |
| [`app/models/system.py`](file:///e:/KLN/ChroniQ/backend/app/models/system.py) | Notification, Review, docs | 221 |
| [`app/models/hospitals.py`](file:///e:/KLN/ChroniQ/backend/app/models/hospitals.py) | Hospital, Doctor, Dept | — |
| [`app/models/scheduling.py`](file:///e:/KLN/ChroniQ/backend/app/models/scheduling.py) | Slot, Schedule, Leave | — |
| [`app/schemas/booking.py`](file:///e:/KLN/ChroniQ/backend/app/schemas/booking.py) | Request/response schemas | 92 |
| [`app/schemas/patient.py`](file:///e:/KLN/ChroniQ/backend/app/schemas/patient.py) | Patient portal schemas | 101 |
| [`app/schemas/auth.py`](file:///e:/KLN/ChroniQ/backend/app/schemas/auth.py) | Auth schemas | 99 |

### 14.2 Tests Executed & Verification Traceability

The test suite was executed against the backend test environment during this specification task (`pytest`, 62 collected tests):
- **Total Tests:** 62
- **Passed:** 59
- **Failed:** 3 (confirming documented Backend Gaps #4 and #6)
- **Duration:** 71.86s

| Test Suite | Tests Run | Result | Traceability & Verified Claims |
|---|---|---|---|
| `tests/test_auth_rbac.py` | 3 | **3 Passed** | Verified patient role isolation, non-patient endpoint blocking (403), super admin boundary protection. |
| `tests/test_booking_slots.py` | 3 | **3 Passed** | Verified slot hold reservation (5 min), transition to booked, conflict rejection (409) for overlapping/held slots. |
| `tests/test_security_hardening.py` | 11 | **11 Passed** | Verified slot hold theft prevention, family member ownership/quota (max 6), document quota limits (50 MB), contact verification safeguards. |
| `tests/test_google_oauth.py` | 9 | **9 Passed** | Verified Google OAuth restricted strictly to `patient` role; staff login rejection via OAuth. |
| `tests/test_queue_eta.py` | 5 | **5 Passed** | Verified queue token sequencing, priority sorting, ETA calculations, late-arrival sorting penalty. |
| `tests/test_reviews_reports.py` | 2 | **2 Passed** | Verified review creation, duplicate review rejection (409), 48-hour review modification window. |
| `tests/test_kiosk_privacy.py` | 2 | **2 Passed** | Verified kiosk patient lookup privacy protections (phone/QR masking). |
| `tests/test_gaps_4_5_6_7.py` | 27 | **24 Passed, 3 Failed** | Passed tests verify name derivations, dependent booking, review constraints. Failed tests confirm **Gap #4** (`GET /reviews/by-appointment/{id}` lack of 404/auth) and **Gap #6** (reschedule unheld slot handling and slot timestamp consistency). |

---

## 15. Implementation Guidance for the MCP Repository

1. **Protocol Framework:** Use the official Model Context Protocol SDK (Python `mcp` or TypeScript `@modelcontextprotocol/sdk`).
2. **Session Configuration:** Accept the patient's JWT access token via `CHRONIQ_AUTH_TOKEN` environment variable or MCP client session headers.
3. **HTTP Client:**
   - Base URL: ChroniQ backend (e.g. `http://127.0.0.1:8000`)
   - Timeout: 10-second connect and read
   - **Always inject `Authorization: Bearer <token>`** on all requests — including those to endpoints that don't require it (defense in depth against backend gaps).
4. **Tool Annotations:** Decorate high-impact mutations (`book_appointment`, `cancel_appointment`, `reschedule_appointment`, `check_in_appointment`, `request_account_deletion`, `delete_family_member`, `delete_medical_document`) with confirmation prompts.
5. **Data Minimization:** Strip internal fields (`password_hash`, internal `_id` duplicates, `file_path`, admin audit tags) before returning to model context.
6. **Timezone Awareness:** Validate input dates as `YYYY-MM-DD` or ISO 8601. Inform patients that appointments follow IST (UTC+05:30).
7. **Field Exclusion:** Never pass `patient_name`, `patient` (PatientSnapshot), or `patient_id` as tool parameters. Identity is always derived from the JWT.
