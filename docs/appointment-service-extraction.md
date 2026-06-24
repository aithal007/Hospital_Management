# Architectural Reflection: Appointment Service Extraction

This document reflects on the design decisions, patterns, benefits, and tradeoffs encountered while extracting the **Appointment Service** from the monolith of the CareFlow Hospital Management System.

---

## 1. Context and Rationale

The appointments domain is the core transactional hub of the application. It coordinates schedules, connects patients with doctors, and triggers follow-up notifications, prescriptions, and billing. Under the monolith, this domain suffered from several issues:
- **Tight Coupling**: Direct SQL joins linked the appointments table to users, patients, and doctors tables.
- **Resource Contention**: Heavy booking traffic or database locks impacted unrelated services (like authentication).
- **Hard Dependencies**: Reminders, emails, and slots were validated in a single monolithic execution context.

To resolve these, we extracted the appointments logic into a dedicated, containerized microservice running on port `3020`.

---

## 2. Before vs. After Architecture

### Monolithic Architecture
- **Single Database**: Shared `hospital_db` with strict foreign key constraints between `appointments.patient_id -> patients.id` and `appointments.doctor_id -> doctors.id`.
- **In-Memory Functions**: Domain validations (e.g., checking if a doctor exists) were standard repository query calls within the same process.
- **Shared Event Loop**: Running BullMQ workers and Kafka producers on the monolith's main threads.

### Extracted Microservice Architecture
- **Database-per-Service**: `appointment-service` connects to its own isolated database (`appointment_db`). Tabular references to patients and doctors are maintained via soft foreign key UUIDs without database-level constraints.
- **Synchronous HTTP Inter-Service Communication**: During appointment creation, `appointment-service` queries the monolith (`GET http://app-monolith:5000/auth/me` or `/patients/:id`) via REST to validate profile existence.
- **Asynchronous Event choreography**: On scheduling and cancellation, the microservice publishes events directly to the Kafka cluster (`appointment-created`, `appointment-cancelled`) for other services (such as the notification service) to consume.

---

## 3. Distributed Integration Patterns

### 1. Synchronous REST Lookups
For operations requiring strict, immediate validation before state modification (e.g., confirming a doctor profile exists before allowing a booking), the service uses HTTP REST client lookups.
- **Tradeoff**: Introduces network hop overhead and runtime dependency on the monolith. If the monolith is down, new bookings fail (Fail-fast behavior).

### 2. Asynchronous Kafka Event Sourcing
For downstream tasks that do not block the booking response (e.g., sending emails, queuing reminders), the service publishes JSON event payloads.
- **Benefit**: Fully decouples booking completion from notification system availability. The booking succeeds immediately, and notifications catch up eventually.

---

## 4. Key Trade-offs & Architecture Challenges

1. **Transactional Boundaries**: In the monolith, scheduling an appointment and updating availability could happen in a single SQL transaction. With database-per-service, we rely on event-driven eventual consistency.
2. **Operational Complexity**: Developers must coordinate two distinct databases (`hospital_db` and `appointment_db`), two Express APIs, multiple Docker configurations, and a local message bus (Kafka).
3. **Data Integrity (Soft Relations)**: Removing SQL-level foreign keys means the application must handle orphan references gracefully (e.g., if a doctor profile is deleted, `appointment-service` needs validation checks or event-driven deletions).

---

## 5. Summary of Extracted Components

- **Repository**: [appointments.repository.js](file:///c:/Users/Lenovo/Desktop/hospital_managment/appointment-service/src/modules/appointments/appointments.repository.js) using PostgreSQL pool connection to `appointment_db`.
- **Database Migration**: [01_create_appointments.sql](file:///c:/Users/Lenovo/Desktop/hospital_managment/appointment-service/src/db/migrations/01_create_appointments.sql) creating the schema without rigid foreign key references.
- **Real-Time Health Status**: `/health` endpoint validating PostgreSQL and Redis connections dynamically.
