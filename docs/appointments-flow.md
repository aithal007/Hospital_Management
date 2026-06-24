# Appointment Booking & Management Flow

This document details the logical sequence, validation rules, state transitions, and role permissions governing the appointment management subsystem in CareFlow HMS.

---

## 1. Structural Overview

The appointment system connects Patient profiles to Doctor specialists. Bookings are handled via REST endpoints in the Express monolith (Phase 1) and will migrate to an isolated `appointment-service` in Phase 7.

```text
       +------------------+             +-----------------+
       |  Patient Profile |             |  Doctor Profile |
       +------------------+             +-----------------+
                │                                │
                └───────────────┬────────────────┘
                                ▼
                      +──────────────────+
                      |   Appointment    |
                      |   (with status)  |
                      +──────────────────+
```

---

## 2. Step-by-Step Scheduling Sequence

When a request is submitted to `POST /appointments`, the system processes it through the following logical pipeline:

```text
 1. Request Input
    (Body: patient_id*, doctor_id, appointment_date, start_time, end_time, reason)
    *Optional for Patients (resolved via session); Mandatory for Receptionists/Admins
                        │
                        ▼
 2. Zod Schema Verification
    - Validates UUID formatting for patient_id and doctor_id
    - Enforces date format (YYYY-MM-DD)
    - Enforces time format (HH:MM or HH:MM:SS)
                        │
                        ▼
 3. Actor & Role Routing
    - IF Patient: Resolves profile ID from JWT session. Rejects if they supply a different ID.
    - IF Staff (Receptionist/Admin): Resolves profile ID from request body. Checks profile existence.
    - Other Roles: Access Denied (403 Forbidden)
                        │
                        ▼
 4. Chronological Validation
    - Verifies that start_time is before end_time (e.g. 10:00:00 < 11:30:00)
                        │
                        ▼
 5. Conflict & Overlap Check (409 Conflict)
    - Queries database for active (non-cancelled) appointments on the same date.
    - REJECTS if Doctor has a slot where: start_time < end_time AND end_time > start_time.
    - REJECTS if Patient has a slot where: start_time < end_time AND end_time > start_time.
                        │
                        ▼
 6. DB Write & Status Initialization
    - Writes record to `appointments` table with initial status 'pending'.
                        │
                        ▼
 7. Event/Notification Dispatch (Console Stub)
    - Queries patient and doctor user accounts to resolve email addresses.
    - Logs confirmation summary block to backend console in preparation for async queue dispatch.
```

---

## 3. Lifecycle Status & Transition Matrix

The `status` column of an appointment is protected by strict state-transition rules to prevent invalid clinical logs.

### Status Values
*   `pending`: Requested by a patient, waiting for a doctor's review.
*   `approved`: Confirmed by a doctor or staff member.
*   `cancelled`: Dismissed by either patient, doctor, or staff.
*   `completed`: Visit finalized (marked automatically when a doctor writes a prescription).

### Permitted Transitions
The database constraint enforces `CHECK (status IN ('pending', 'approved', 'cancelled', 'completed'))`. Logical checks in `PUT /appointments/:id/status` enforce permissions:

| From Status | To Status | Allowed Roles | Description / Business Rule |
| :--- | :--- | :--- | :--- |
| `pending` | `approved` | `doctor`, `receptionist`, `admin` | Doctor accepts the booking slot request or staff schedules it directly. |
| `pending` | `cancelled` | `patient`, `doctor`, `receptionist`, `admin` | Doctor rejects the slot request or patient withdraws the request. |
| `approved` | `cancelled` | `patient`, `receptionist`, `admin` | Patient cancels upcoming slot, or staff cancels it due to clinic scheduling changes. |
| `approved` | `completed` | `doctor` | Doctor completes consultation (associated with prescription write-up). |
| `completed` | *Any* | *None* | **Terminal State**. Status of a completed appointment can never be updated. |
| `cancelled` | *Any* | *None* | **Terminal State**. Cancelled slots cannot be revived. |

---

## 4. Security & Scoping Rules

To maintain patient privacy (HIPAA compliance goals) and secure provider workloads, visibility of appointments list queries (`GET /appointments`) is scoped automatically on the backend:

1.  **Patients**:
    - Can only query their own appointments. The backend ignores input filter parameters and resolves the logged-in user's profile, querying specifically on `patient_id`.
2.  **Doctors**:
    - Can only view appointments assigned to them. Query is scoped specifically on `doctor_id` resolved from their JWT doctor profile.
3.  **Receptionists & Administrators**:
    - Have global visibility. Can list all system appointments, or search/filter by patient/doctor IDs to manage clinic schedules.
4.  **Insurance Agents / Other Roles**:
    - Blocked from reading appointment lists (403 Forbidden). Must request medical claims records specifically.
