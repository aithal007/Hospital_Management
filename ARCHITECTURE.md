# System Architecture

This document defines the high-level system architecture of the Hospital Management System and tracks its design evolution.

## Phase 1 Target Architecture: Monolith

For Phase 1, we are building a classic monolith. All core services (Authentication, Profiles, Appointments) live within a single server application and share one relational database.

```text
 +---------------------------------------------+
 |              Next.js Frontend               |  (Client browser application)
 |            (Running on Port 3000)           |
 +---------------------------------------------+
                        │
                        │ HTTP REST Requests (JSON)
                        ▼
 +---------------------------------------------+
 |          Express.js Monolith API            |  (Server application)
 |            (Running on Port 5000)           |
 |                                             |
 |   [Routes]  ──►  [Controllers]  ──►  [DB]   |
 |                                             |
 |   - Authentication & Auth Middlewares       |
 |   - Patient & Doctor Profile Handlers       |
 |   - Appointment Management Logic            |
 +---------------------------------------------+
                        │
                        │ PostgreSQL Protocol (pg client)
                        ▼
 +---------------------------------------------+
 |             PostgreSQL Database             |  (Single relational storage)
 |                                             |
 |   - users Table                             |
 |   - patients Table                          |
 |   - doctors Table                           |
 |   - appointments Table                      |
 +---------------------------------------------+
```

---

## Architecture Evolution Log

This log records the step-by-step changes made to the system's design and structure.

* **Step 1:** Documented the system's core problem statement, scope, and target roles in [PROBLEM.md](file:///c:/Users/Lenovo/Desktop/hospital_managment/PROBLEM.md).
* **Step 2:** Documented the 5 core user roles (Patient, Doctor, Receptionist, Insurance Agent, Administrator) and their high-level capabilities in [docs/roles.md](file:///c:/Users/Lenovo/Desktop/hospital_managment/docs/roles.md).
* **Step 3:** Documented the appointment booking and validation sequence in [docs/flows.md](file:///c:/Users/Lenovo/Desktop/hospital_managment/docs/flows.md) using a text-based ASCII flow diagram.
* **Step 4:** Added a vertical flowchart for the Prescription flow in [docs/flows.md](file:///c:/Users/Lenovo/Desktop/hospital_managment/docs/flows.md), requiring that prescriptions be strictly tied to completed appointments.
* **Step 5:** Added a vertical flowchart for the Hospital-Initiated Insurance Claim flow in [docs/flows.md](file:///c:/Users/Lenovo/Desktop/hospital_managment/docs/flows.md), automating claim generation upon appointment completion when a policy is present.
* **Step 6:** Added a vertical flowchart for the Hybrid Billing flow in [docs/flows.md](file:///c:/Users/Lenovo/Desktop/hospital_managment/docs/flows.md), accommodating online patient self-payment and manual receptionist tracking.
* **Step 7:** Documented the `users` table schema in a clean, vertical list format inside [docs/schemas.md](file:///c:/Users/Lenovo/Desktop/hospital_managment/docs/schemas.md).
* **Step 8:** Documented separate profile table schemas for `patients` and `doctors` in [docs/schemas.md](file:///c:/Users/Lenovo/Desktop/hospital_managment/docs/schemas.md), linking each profile to a core user record via a unique foreign key.
* **Step 9:** Added the `appointments` table schema in [docs/schemas.md](file:///c:/Users/Lenovo/Desktop/hospital_managment/docs/schemas.md), with split date/time fields and check constraints enforcing the four key lifecycle statuses.
* **Step 10:** Created the `ARCHITECTURE.md` file detailing the Phase 1 monolithic architecture and initializing the evolution log.
* **Step 11:** Initialized the Node.js project, configured ES Modules support, and added standard Git and documentation files.
* **Step 12:** Installed Express and set up a minimal server with a `/health` endpoint to verify connectivity.
* **Step 13:** Created routes and controllers folders and refactored the health endpoint into a centralized routing structure.
* **Step 14:** Installed dotenv and created a config module to safely manage environment variables.
* **Step 15:** Installed pg (node-postgres), created a DB connection pool module, and logged a test query connection on server startup.
* **Step 16:** Created a custom Node-based database migration runner and wrote the SQL migration for the `users` table.
* **Step 17:** Created the database migration SQL script for the `patients` profile table.
* **Step 18:** Created the database migration SQL script for the `doctors` profile table.
* **Step 19:** Created the database migration SQL script for the `appointments` table.
* **Step 20:** Wrote a seed script to populate the database with two doctors and one patient.
* **Step 21:** Implemented a custom request logging middleware to monitor incoming server traffic.
* **Step 22:** Created a global error-handling middleware to intercept thrown server exceptions and return structured JSON responses.
* **Step 23:** Installed Zod, created a request validation middleware, and integrated validation checks on a sample endpoint.

