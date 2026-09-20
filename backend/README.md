# ChroniQ Backend Service

A high-concurrency, multi-hospital appointment booking, transactional slot hold, and real-time live queue engine built with Python 3.11+, FastAPI, Beanie ODM (Pydantic v2), and MongoDB Atlas.

---

## 1. Architecture & Tech Stack

- **Framework:** FastAPI (Asynchronous Python 3.11+)
- **Server:** Uvicorn with ASGI event loop
- **Database & ODM:** MongoDB Atlas Replica Set + Beanie ODM (Motor async driver)
- **Security & Auth:** Bcrypt password hashing, JWT Access & Refresh Tokens, Role-Based Access Control (RBAC)
- **Real-Time Streaming:** Server-Sent Events (SSE) broadcasting patient, doctor, and hospital queue state changes
- **Queue Engine:** Atomic daily token counters, priority-weighted ordering, ETA calculation with exponential moving average (EMA) doctor pacing, and grace period penalty rules
- **Testing:** Pytest, pytest-asyncio, HTTPX, and mongomock-motor for isolated automated testing

---

## 2. Directory Structure

```text
backend/
├── app/
│   ├── core/           # Config, DB connection, Security, RBAC dependencies, Rate limiting, SSE broadcaster
│   ├── models/         # Beanie ODM documents (common, accounts, hospitals, scheduling, booking, system, assistant)
│   ├── routes/         # FastAPI API routers (auth, discovery, slots, appointments, queue, walk-in, patient, doctor, admin, kiosk, notifications, super_admin)
│   ├── schemas/        # Pydantic v2 request/response schemas matching frontend snake_case contracts
│   ├── services/       # Core business logic: slot generation & holds, transactional booking, queue engine & ETAs, multi-channel notifications, document uploads, background tasks
│   └── main.py         # Application entry point, lifespan event manager, CORS, and router registration
├── data/
│   └── uploads/        # Local disk storage for patient medical documents (gitignored)
├── seed/
│   ├── data.py         # Initial mock records matching frontend seed data
│   └── run.py          # Idempotent database seeder (`python -m seed.run`)
├── tests/              # Pytest automated test suite (auth/RBAC, booking slots, queue & ETA, kiosk privacy, reviews)
├── .env.example        # Reference environment variables template with inline documentation
├── pytest.ini          # Pytest path and async configuration
├── README.md           # Backend documentation & setup guide
└── requirements.txt    # Project dependencies
```

---

## 3. Environment Setup & Configuration

1. **Install Python 3.11+**:
   Verify Python is installed:
   ```bash
   python --version
   ```

2. **Install Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Note: `backend/.env` is strictly gitignored to safeguard credentials and secrets.*

---

## 4. Connecting MongoDB Atlas

1. **Log in to MongoDB Atlas** at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Network Access**: Under *Security -> Network Access*, add an IP access rule for your current IP address (or `0.0.0.0/0` for development).
3. **Database Access**: Under *Security -> Database Access*, create a database user (e.g., `chroniq_app`) with read/write privileges on the `chroniq` and `chroniq_test` databases.
4. **Copy Connection String**: Under *Databases -> Cluster -> Connect -> Drivers*, copy the SRV connection string:
   ```text
   mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
   ```
5. **Paste into `.env`**:
   Open `backend/.env` and update:
   ```env
   MONGODB_URI=mongodb+srv://chroniq_app:YourSecurePassword@cluster0.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=chroniq
   MONGODB_DB_TEST=chroniq_test
   ```

---

## 5. Seeding Platform Data

ChroniQ includes an idempotent seeder that initializes City Hospital (`hosp_city_01`), 6 departments, 6 doctors, weekly schedules, rolling slot windows, staff users, and a bootstrap Super Admin:

```bash
cd backend
python -m seed.run
```

### Seed Accounts Created:
- **Super Administrator:**
  - Email: `admin@chroniq.local` (or `SEED_SUPER_ADMIN_EMAIL` in `.env`)
  - Role: `super_admin`
- **Hospital Admin:**
  - Phone: `+91 98401 23456` | Password: `Password@123`
  - Role: `hospital_admin` (`hosp_city_01`)
- **Receptionists:**
  - Phone: `+91 98402 34567` | Password: `Password@123`
- **Lead Doctor (Dr. Anand Ramanathan):**
  - Phone: `+91 98404 56789` | Password: `Password@123`
- **Demo Patient:**
  - Phone: `+91 98765 43210` | Password: `Password@123`

---

## 6. Running Locally

Start the FastAPI application with live-reloading:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will listen at `http://localhost:8000`.

- **Interactive API Documentation (Swagger UI):** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **Health Check:** `http://localhost:8000/health`

---

## 7. Running Tests

Run the comprehensive automated test suite:

```bash
cd backend
python -m pytest -v
```

The test suite runs against the test database `chroniq_test` and includes built-in in-memory fallback support via `mongomock-motor` for offline developer testing.

---

## 8. Real-Time Server-Sent Events (SSE)

Real-time live queue positions, display board call events, and delay notices stream over SSE at:

```http
GET /queue/stream?channel={channel_name}
```

Supported channel formats:
- `patient:{patient_id}`: Checked-in, called, and status change alerts for patient.
- `doctor:{doctor_id}`: Queue list updates, availability changes, consultation triggers.
- `department:{department_id}`: Token calling events for physical waiting hall TV display boards (privacy preserved: tokens and room numbers only, no patient names).
- `hospital:{hospital_id}`: Facility-wide broadcasts and queue synchronization.
