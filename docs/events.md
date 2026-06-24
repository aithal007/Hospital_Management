# Event Schema Reference

This document details the event schemas and topic names used in the CareFlow Hospital Management System event bus.

## 1. Topic: `appointment-created`
Published when a patient schedules a new appointment. Contains enriched demographics to allow decoupled notification dispatching.

### Payload Schema
* **id** (UUID): Unique identifier of the appointment.
* **patient_id** (UUID): Database ID of the patient.
* **doctor_id** (UUID): Database ID of the doctor.
* **appointment_date** (String): Scheduled date (YYYY-MM-DD).
* **start_time** (String): Scheduled slot start time (HH:MM:SS).
* **end_time** (String): Scheduled slot end time (HH:MM:SS).
* **status** (String): Status of the appointment (defaults to `'pending'`).
* **reason** (String|null): Symptoms description.
* **patient_email** (String): Contact email of the patient.
* **patient_first_name** (String): Legal first name of the patient.
* **doctor_first_name** (String): Legal first name of the doctor.
* **doctor_last_name** (String): Legal last name of the doctor.

### Sample Event
```json
{
  "id": "e4b6c3d9-a78b-4a5e-b92c-c8d1f2e3a4b5",
  "patient_id": "f5c7d4e8-b89c-5a6f-c93d-d8e2f3a4b5c6",
  "doctor_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "appointment_date": "2026-06-25",
  "start_time": "10:00:00",
  "end_time": "10:30:00",
  "status": "pending",
  "reason": "Routine checkup and physical exam",
  "patient_email": "patient@careflow.com",
  "patient_first_name": "Bob",
  "doctor_first_name": "Alice",
  "doctor_last_name": "Smith"
}
```

---

## 2. Topic: `appointment-cancelled`
Published when a doctor, patient, receptionist, or administrator cancels a scheduled appointment.

### Payload Schema
* **id** (UUID): Unique identifier of the appointment.
* **patient_id** (UUID): Database ID of the patient.
* **doctor_id** (UUID): Database ID of the doctor.
* **status** (String): New status of the appointment (`'cancelled'`).

### Sample Event
```json
{
  "id": "e4b6c3d9-a78b-4a5e-b92c-c8d1f2e3a4b5",
  "patient_id": "f5c7d4e8-b89c-5a6f-c93d-d8e2f3a4b5c6",
  "doctor_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "status": "cancelled"
}
```

---

## 3. Topic: `prescription-created` (Placeholder)
To be published when a doctor writes a digital prescription linked to a completed appointment.

### Payload Shape
* **id** (UUID): Unique identifier of the prescription.
* **appointment_id** (UUID): Link to the completed appointment transaction.
* **doctor_id** (UUID): Doctor writing the prescription.
* **patient_id** (UUID): Recipient patient ID.
* **medications** (Array of Objects): List of prescribed items.
  * **name** (String): Name of the medication.
  * **dosage** (String): e.g. 500mg.
  * **frequency** (String): e.g. Twice daily.

---

## 4. Topic: `claim-created` (Placeholder)
To be published when an insurance claim request is auto-submitted to a provider.

### Payload Shape
* **id** (UUID): Unique identifier of the claim.
* **appointment_id** (UUID): Link to the appointment.
* **patient_id** (UUID): Recipient patient ID.
* **insurance_provider** (String): Provider name.
* **insurance_policy_number** (String): Policy identifier.
* **total_amount** (Numeric): Amount submitted for claim calculation.
