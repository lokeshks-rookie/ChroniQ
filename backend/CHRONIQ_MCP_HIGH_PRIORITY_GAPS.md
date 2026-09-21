# ChroniQ MCP — High-Priority Backend Gaps & Remediation Checklist

**Document Version:** 1.0.0
**Date:** 2026-09-21
**Companion to:** `CHRONIQ_MCP_TOOL_SPEC.md` v2.0.0
**Purpose:** Prioritized remediation checklist for backend security, privacy, and correctness issues that affect MCP tool safety.

---

## Priority Classification

| Priority | Definition | Action Required |
|---|---|---|
| 🔴 **CRITICAL** | Exploitable without authentication; enables unauthorized state mutation or data access for any patient | Immediate backend fix recommended before MCP production deployment |
| 🟠 **HIGH** | Security or data integrity issue mitigated by MCP-layer workarounds but not enforced by backend | Backend fix needed; MCP workaround documented |
| 🟡 **MEDIUM** | Correctness, privacy, or data hygiene issue | Backend fix recommended; not blocking MCP deployment |
| 🔵 **LOW** | Minor or cosmetic issue | Fix at convenience |

---

## Gap Register

### 🔴 GAP-1: `check_in_appointment` — Authentication Not Required

**Affected Route:** `POST /queue/check-in`
**Affected MCP Tool:** `check_in_appointment`
**Source:** [`queue.py:188`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L188)

**Issue:**
The route uses `get_optional_user` which returns `None` when no auth token is provided. The ownership check at line 212 is wrapped in `if current_user:`, so it is **completely skipped** for unauthenticated requests. Any caller who knows an `appointment_id` or `booking_code` can check in any appointment.

**Impact:** An attacker could mass-check-in patients, disrupting queues and causing patients to lose their scheduled positions.

**Recommended Fix:**
```python
# Change from:
current_user: Optional[User] = Depends(get_optional_user)
# To:
current_user: User = Depends(get_current_user)
```
Or at minimum, make the ownership check unconditional when a patient JWT is present, and reject unauthenticated requests from non-kiosk origins.

**MCP Workaround:** MCP server MUST always send `Authorization: Bearer <token>`. This ensures `current_user` is populated and the ownership check executes. This does NOT fix the underlying backend vulnerability.

---

### 🔴 GAP-2: `get_queue_status` — No Authentication or Ownership Check

**Affected Route:** `GET /queue/{appointment_id}`
**Affected MCP Tool:** `get_patient_queue_status`
**Source:** [`queue.py:142-162`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L142-L162)

**Issue:**
The endpoint has no `get_current_user` dependency. Any caller can query any appointment's queue status by providing its ID. The response includes sensitive operational data: `appointment_id`, `doctor_id`, `hospital_id`, `token`, `position`, `eta_minutes`, `checked_in_at`.

**Impact:** Information leakage. An adversary could enumerate appointment IDs to determine patient flow patterns, doctor workloads, and individual patient movements through the system.

**Recommended Fix:**
```python
@router.get("/queue/{appointment_id}")
async def get_queue_status(
    appointment_id: str,
    current_user: User = Depends(get_current_user),  # Add auth
):
    # ... existing lookup logic ...
    # Add ownership check:
    if current_user.role == Role.PATIENT:
        appt = await Appointment.get(appointment_id)
        if appt and appt.patient_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
```

**MCP Workaround:** MCP server sends auth headers (defense in depth) and only queries appointment IDs the patient has previously retrieved via authenticated endpoints (`list_my_appointments`, `get_appointment_details`).

---

### 🟠 GAP-3: `get_doctor_slots` — GET Request Triggers Database Writes

**Affected Route:** `GET /doctors/{id}/slots`
**Affected MCP Tool:** `get_doctor_slots`
**Source:** [`slots.py:48`](file:///e:/KLN/ChroniQ/backend/app/routes/slots.py#L48), [`slot_service.py:20-108`](file:///e:/KLN/ChroniQ/backend/app/services/slot_service.py#L20-L108)

**Issue:**
The handler calls `generate_slots_for_doctor(id, days=14)` which creates `Slot` documents via `Slot.insert_many()` if slots don't already exist for the requested date range. This violates HTTP semantic safety (GET should be idempotent and side-effect-free).

**Impact:** Repeated calls could create duplicate slot entries if the generation logic has edge cases. GET requests may be retried by proxies, load balancers, or clients, amplifying write load.

**Recommended Fix:**
Move slot generation to a scheduled background task or a separate `POST /admin/generate-slots` endpoint. The GET endpoint should only query existing slots.

**MCP Status:** Documented as State-Changing Side-Effect in spec. Not blocking MCP deployment since the side-effect is "upsert-like" (generates slots that should exist anyway).

---

### 🟠 GAP-4: `GET /reviews/by-appointment/{id}` — No Authentication

**Affected Route:** `GET /reviews/by-appointment/{id}`
**Affected MCP Tool:** **EXCLUDED from MCP** (see `get_appointment_review`)
**Source:** [`patient.py:381-397`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L381-L397)

**Issue:**
This endpoint has no `get_current_user` dependency. Any caller can retrieve any patient's review by appointment ID, exposing `patient_id`, `doctor_rating`, `hospital_rating`, `comment`, and `tags`.

**Impact:** Patient review data leakage.

**Recommended Fix:**
```python
@router.get("/reviews/by-appointment/{id}")
async def get_appointment_review(
    id: str,
    current_user: User = Depends(get_current_user),  # Add auth
):
    review = await Review.find_one(Review.appointment_id == id)
    if not review:
        raise HTTPException(status_code=404)
    # Add ownership check:
    if current_user.role == Role.PATIENT and review.patient_id != str(current_user.id):
        raise HTTPException(status_code=403)
    return review.dict()
```

**MCP Status:** EXCLUDED from tool catalog until fixed.

---

### 🟠 GAP-5: `submit_appointment_review` — No Completion Status Check

**Affected Route:** `POST /reviews`
**Affected MCP Tool:** `submit_appointment_review`
**Source:** [`patient.py:271-306`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L271-L306)

**Issue:**
The backend checks ownership (✅) and duplicate prevention (✅) but does NOT verify `appointment.status == COMPLETED` before accepting a review. A patient could review a `booked`, `checked_in`, or any non-completed appointment.

**Impact:** Nonsensical reviews; rating manipulation before service delivery.

**Recommended Fix:**
```python
if appt.status != AppointmentStatus.COMPLETED:
    raise HTTPException(
        status_code=400,
        detail="Reviews can only be submitted for completed appointments."
    )
```

**MCP Workaround:** The MCP tool implementation should pre-check `appointment.status == "completed"` by calling `get_appointment_details` before invoking `submit_appointment_review`. Include a guard: `"Please wait until your appointment is completed before submitting a review."`

---

### 🟠 GAP-6: `reschedule_appointment` — Non-Atomic Multi-Document Update

**Affected Route:** `PATCH /appointments/{id}/reschedule`
**Affected MCP Tool:** `reschedule_appointment`
**Source:** [`appointments.py:159-198`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L159-L198)

**Issue:**
Three separate `.save()` calls without a MongoDB multi-document transaction:
1. `await old_slot.save()` — frees old slot
2. `await new_slot.save()` — books new slot
3. `await apt.save()` — updates appointment

If step 3 fails (e.g., network error, validation error):
- Old slot is freed permanently (data loss)
- New slot is marked `booked` with no valid appointment pointing to it (orphaned booking)

**Additional issue:** No status pre-check — a `cancelled` or `completed` appointment can be rescheduled.

**Impact:** Data inconsistency; lost slot availability; phantom bookings.

**Recommended Fix:**
```python
async with await Appointment.get_motor_collection().database.client.start_session() as session:
    async with session.start_transaction():
        # Perform all three updates within transaction
```

Also add status pre-check:
```python
if apt.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED):
    raise HTTPException(status_code=400, detail="Cannot reschedule a completed or cancelled appointment.")
```

**MCP Workaround:** Document the risk to patients. After rescheduling, the MCP tool should call `get_appointment_details` to verify the new state. If inconsistent, advise the patient to contact support.

---

### 🟠 GAP-7: `book_appointment` — `patient_name` Override Enables Impersonation

**Affected Route:** `POST /appointments`
**Affected MCP Tool:** `book_appointment`
**Source:** [`booking_service.py:75`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L75)

**Issue:**
The booking service accepts a `patient_name` parameter that overrides the authenticated user's name in the `PatientSnapshot`:
```python
snapshot_name = patient_name or user.name
```
A caller could create appointment records with arbitrary patient names that don't match their account.

**Impact:** Identity misrepresentation in medical records.

**Recommended Fix:**
Remove `patient_name` parameter from the booking service, or restrict it to staff-only callers.

**MCP Workaround:** The MCP tool specification EXCLUDES `patient_name` and `patient` from exposed parameters. The MCP server must never pass these fields.

---

### 🟡 GAP-8: `book_appointment` — `family_member_id` Silent Fallback

**Affected Route:** `POST /appointments`
**Affected MCP Tool:** `book_appointment`
**Source:** [`booking_service.py:79-84`](file:///e:/KLN/ChroniQ/backend/app/services/booking_service.py#L79-L84)

**Issue:**
If `family_member_id` is provided but is invalid (doesn't exist or belongs to another user), the booking silently proceeds using the authenticated patient's own demographics. No error is raised.

**Impact:** Patient may unknowingly book for themselves when intending to book for a family member. Confusing user experience.

**Recommended Fix:**
```python
if family_member_id:
    fm = await FamilyMember.get(family_member_id)
    if not fm or str(fm.user_id) != user_id:
        raise HTTPException(status_code=400, detail="Invalid or unauthorized family member ID.")
    snapshot_name = fm.name
```

**MCP Workaround:** The MCP tool should pre-validate `family_member_id` against `list_family_members` results before passing it to the booking endpoint. Include a guard message if the ID is not found.

---

### 🟡 GAP-9: `get_department_queue_board` — Exposes `appointment_id` Without Auth

**Affected Route:** `GET /queue/{hospital_id}/{department_id}`
**Affected MCP Tool:** `get_department_queue_board`
**Source:** [`queue.py:119-139`](file:///e:/KLN/ChroniQ/backend/app/routes/queue.py#L119-L139)

**Issue:**
The response includes the full `QueueEntry` dict for every patient in the department queue, including `appointment_id`. While this mirrors a physical hospital display board (publicly visible), programmatic access via MCP could enable systematic harvesting of appointment IDs that can then be used to exploit GAP-1 (unauthenticated check-in) or GAP-2 (unauthenticated queue status lookup).

**Impact:** Information leakage when combined with other gaps; enables chaining attacks.

**Recommended Fix:**
Strip `appointment_id` from the public-facing queue board response. Display only: `token`, `token_number`, `position`, `status`, `doctor_id`.

**MCP Status:** Included in tool catalog with privacy warning. Low urgency if GAP-1 and GAP-2 are fixed first.

---

### 🟡 GAP-10: Expired Slot Holds Not Persisted to DB

**Affected Route:** `GET /doctors/{id}/slots`
**Affected MCP Tool:** `get_doctor_slots`
**Source:** [`slots.py:57-62`](file:///e:/KLN/ChroniQ/backend/app/routes/slots.py#L57-L62)

**Issue:**
Expired holds are normalized in-memory (status reset to `open`, `held_by` cleared) but the corrected state is NOT written back to the database. This means:
- The returned API response shows correct status (open)
- The database still shows status as `held` with an expired `held_until`
- The atomic hold operation in `slot_service.py` correctly handles this (checks `held_until` expiry), so this is not exploitable for double-booking

**Impact:** Database state drift. Queries that bypass the API (e.g., admin analytics, background tasks) may count expired holds as active.

**Recommended Fix:**
After normalizing, persist the corrected slots:
```python
for slot in slots:
    if slot.status == SlotStatus.HELD and slot.held_until and slot.held_until < now:
        slot.status = SlotStatus.OPEN
        slot.held_by = None
        await slot.save()  # Persist correction
```

Or implement a background cleanup task.

---

### 🟡 GAP-11: `reschedule_appointment` — No Status Pre-Check

**Affected Route:** `PATCH /appointments/{id}/reschedule`
**Affected MCP Tool:** `reschedule_appointment`
**Source:** [`appointments.py:159-198`](file:///e:/KLN/ChroniQ/backend/app/routes/appointments.py#L159-L198)

**Issue:**
The reschedule handler does NOT check the appointment's current status before proceeding. A `cancelled`, `completed`, `no_show`, or `expired` appointment can be rescheduled, which is logically invalid.

**Impact:** State machine violation; data inconsistency.

**Recommended Fix:**
```python
RESCHEDULABLE_STATUSES = {AppointmentStatus.BOOKED, AppointmentStatus.RESCHEDULED}
if apt.status not in RESCHEDULABLE_STATUSES:
    raise HTTPException(
        status_code=400,
        detail=f"Cannot reschedule appointment with status '{apt.status}'."
    )
```

---

### 🟡 GAP-12: Document Upload Excluded from MCP — No Alternative

**Affected Route:** `POST /documents`
**Affected MCP Tool:** None (excluded — multipart binary)
**Source:** [`patient.py:184-212`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L184-L212)

**Issue:**
The medical document upload endpoint uses `multipart/form-data` with `UploadFile`, which is incompatible with JSON-based MCP tool calling. There is no alternative upload mechanism (e.g., base64 body, presigned URL, or chunked upload).

**Impact:** MCP clients cannot upload medical documents. This limits the utility of the document management tools to read/update/delete only.

**Recommended Fix:**
Implement a base64-encoded upload endpoint or a presigned URL workflow:
```python
@router.post("/documents/upload-base64")
async def upload_document_base64(payload: DocumentBase64Upload, current_user: User = Depends(get_current_user)):
    # Accept base64-encoded file content
    ...
```

---

### 🟡 GAP-13: `delete_medical_document` — Physical File Not Removed

**Affected Route:** `DELETE /documents/{id}`
**Affected MCP Tool:** `delete_medical_document`
**Source:** [`patient.py:233-244`](file:///e:/KLN/ChroniQ/backend/app/routes/patient.py#L233-L244)

**Issue:**
The handler calls `await doc.delete()` which removes the MongoDB `MedicalDocument` record. The physical file at `doc.file_path` is NOT deleted from disk. Storage quota is reclaimed in the logical DB calculation but the file persists on the filesystem.

**Impact:** Disk storage leak; potential privacy violation (patient data persists after deletion request).

**Recommended Fix:**
```python
import os
# Before deleting the record:
if doc.file_path and os.path.exists(doc.file_path):
    os.remove(doc.file_path)
await doc.delete()
```

---

### 🟡 GAP-14: Account Deletion — No Purge Job or Grace Period Enforcement

**Affected Route:** `POST /users/me/delete-request`
**Affected MCP Tool:** `request_account_deletion`
**Source:** [`auth.py:637-642`](file:///e:/KLN/ChroniQ/backend/app/routes/auth.py#L637-L642)

**Issue:**
The handler only sets `deletion_requested_at = utcnow()` on the User document. No background job, scheduled task, or lifecycle hook was found that:
- Purges user data after 30 days
- Cancels active appointments
- Removes medical documents
- Anonymizes reviews
- Deactivates the account

The "30-day grace period" mentioned in the response message is a **UX claim not backed by implementation**.

**Impact:** Patient data is never actually deleted; GDPR/data privacy non-compliance.

**Recommended Fix:**
Implement a background task in `background_tasks.py` that:
1. Periodically scans for users with `deletion_requested_at` older than 30 days
2. Cancels active appointments
3. Deletes medical documents (DB + files)
4. Anonymizes reviews (replace `patient_id` with hash)
5. Deactivates the account (`is_active = False`)
6. Optionally: hard-delete the User document

---

### 🔵 GAP-15: Notification Route Field Mismatch (`body` vs `message`)

**Affected Route:** `GET /notifications`
**Affected MCP Tool:** `list_notifications`
**Source:** [`notifications.py:24`](file:///e:/KLN/ChroniQ/backend/app/routes/notifications.py#L24), [`system.py:26`](file:///e:/KLN/ChroniQ/backend/app/models/system.py#L26)

**Issue:**
The `Notification` model defines a `body` field, but the route at line 24 returns `"message": n.message`. Since `Notification` inherits from `Document` (Beanie), accessing `n.message` would either:
- Raise an `AttributeError` at runtime (if strict attribute access)
- Return `None` (if `getattr` with default is used somewhere)

This is likely a latent bug that hasn't surfaced because notifications may not have been tested via this endpoint.

**Recommended Fix:**
```python
# Change:
"message": n.message,
# To:
"message": n.body,
```

---

## Remediation Priority Matrix

```
┌─────────────────────────────────────────────────────────┐
│  CRITICAL (Fix before MCP production)                   │
│  ├─ GAP-1: check_in auth enforcement                   │
│  └─ GAP-2: queue_status auth + ownership                │
│                                                         │
│  HIGH (Fix for data integrity)                          │
│  ├─ GAP-4: review endpoint auth                         │
│  ├─ GAP-5: review completion check                      │
│  ├─ GAP-6: reschedule atomicity                         │
│  └─ GAP-7: patient_name override                        │
│                                                         │
│  MEDIUM (Fix for correctness/privacy)                   │
│  ├─ GAP-8: family_member_id silent fallback             │
│  ├─ GAP-9: queue board appointment_id exposure          │
│  ├─ GAP-10: expired holds not persisted                 │
│  ├─ GAP-11: reschedule status pre-check                 │
│  ├─ GAP-12: document upload MCP support                 │
│  ├─ GAP-13: document file deletion                      │
│  └─ GAP-14: account deletion purge job                  │
│                                                         │
│  LOW (Fix at convenience)                               │
│  └─ GAP-15: notification body/message field             │
└─────────────────────────────────────────────────────────┘
```
