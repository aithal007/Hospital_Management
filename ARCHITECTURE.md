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

## Phase 2 Target Architecture: Modular Monolith

For Phase 2, we are restructuring the codebase into a Modular Monolith. Instead of a flat layered architecture (`routes/`, `controllers/`), each business domain is co-located inside a dedicated module directory under `src/modules/`. This design establishes clean boundaries and limits direct cross-module coupling, making future microservice extraction straightforward.

### Folder Structure (Option A: Strict Domain-Co-location)

```text
src/
 ├── config/                # Shared configurations
 ├── db/                    # Global database connection/migrations
 ├── middleware/            # Shared express middleware
 └── modules/               # Domain modules
      ├── auth/             # Authentication & Authorization domain
      │    ├── auth.routes.js
      │    ├── auth.controller.js
      │    ├── auth.service.js
      │    └── auth.repository.js
      ├── patients/         # Patient profile management
      │    ├── patients.routes.js
      │    ├── patients.controller.js
      │    ├── patients.service.js
      │    └── patients.repository.js
      ├── doctors/          # Doctor directories & consultation profiles
      │    ├── doctors.routes.js
      │    ├── doctors.controller.js
      │    ├── doctors.service.js
      │    └── doctors.repository.js
      └── appointments/     # Slot coordination & booking management
           ├── appointments.routes.js
           ├── appointments.controller.js
           ├── appointments.service.js
           └── appointments.repository.js
```

### Dependency Direction Rules

To keep domain boundaries clean and ensure future microservice extraction is straightforward, we enforce the following dependency direction rules:

1. **No Cross-Module Repository Imports:** A module must never import another module's repository files directly (e.g., `appointments.service.js` must never import `patients.repository.js`). All database operations must go through the module's own repository.
2. **Service-to-Service Communication:** If a module needs to query or mutate data owned by another domain, it must do so by invoking that domain's Service layer rather than accessing its repository or database tables.
3. **Uni-directional Coupling:** Dependencies must flow from orchestrating domains (e.g., `appointments`) toward foundational domains (e.g., `auth`, `patients`, `doctors`). Foundational domains must never import or depend on orchestrating domains, preventing circular dependency graphs.

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
* **Step 24:** Created the Next.js frontend project skeleton inside a dedicated `/frontend` directory and styled the landing homepage.
* **Step 25:** Connected Next.js to Express via server-side fetching on a dedicated backend health status monitor page.
* **Step 26:** Created a modular authentication route and controller, and built the plain-text user registration endpoint `POST /auth/register` with Zod schema checks.
* **Step 27:** Installed bcryptjs and added password hashing to user registration with 10 salt rounds.
* **Step 28:** Installed jsonwebtoken and built the `POST /auth/login` endpoint that verifies hashed passwords and returns a signed 24-hour JWT.
* **Step 29:** Created the `authenticate` middleware to verify incoming JWT Bearer tokens in route request headers.
* **Step 30:** Created the `requireRole` middleware to implement role-based access control (RBAC) gates on endpoints.
* **Step 31:** Built the protected `GET /auth/me` endpoint to retrieve the logged-in user's database profile.
* **Step 32:** Installed CORS on the backend Express server and created a secure, interactive User Registration Page inside the Next.js frontend.
* **Step 33:** Built the interactive User Login Page in the Next.js frontend, sending credentials to the backend login endpoint and saving the returned JWT token to browser cookies and local storage.
* **Step 34:** Added user logout functionality by creating a dedicated `/logout` page that clears the JWT token from cookies and local storage, and dynamically updating navigation links on the homepage.
* **Step 35:** Implemented a Next.js server-side middleware to intercept requests, protecting future dashboard, profile, and appointment routes by redirecting unauthenticated users to the login page.
* **Step 36:** Documented three manual test cases for authentication registration, login, and route protection inside docs/testing.md.
* **Step 37:** Integrated rate limiting on the backend login endpoint (`POST /auth/login`) using the `express-rate-limit` library to prevent brute-force attacks.
* **Step 38:** Created docs/auth-flow.md to explain the end-to-end authentication and authorization flow of CareFlow HMS.
* **Step 39:** Built POST /patients endpoint to create a patient profile (linked to a user in the database) with hybrid self/staff role authorization permissions.
* **Step 40:** Implemented GET /patients/:id endpoint returning complete patient profiles (joining patients and users tables) with strict patient ownership and staff validation.
* **Step 41:** Developed PUT /patients/:id endpoint supporting partial updates to patient profiles with hybrid self/staff role-based security rules.
* **Step 42:** Created POST /doctors endpoint to generate doctor profiles linked to users with hybrid self/staff role-based security rules.
* **Step 43:** Implemented GET /doctors/:id endpoint returning joined doctor profile and user account details, accessible by all authenticated portal users.
* **Step 44:** Implemented GET /doctors endpoint to retrieve all doctor profiles with support for partial case-insensitive filtering by specialization query parameter.
* **Step 45:** Built the Next.js Patient Profile Page (/profile) allowing patient users to set up or update their clinical demographics and insurance information.
* **Step 46:** Developed PUT /doctors/:id backend endpoint and built the Next.js Doctor Profile Page (/doctors/profile) for doctors to set up or update their professional credentials.
* **Step 47:** Built the Next.js Doctor Directory and search page (/doctors) supporting case-insensitive specialization filtering using the backend's query endpoints.
* **Step 48:** Added database pagination support (LIMIT, OFFSET, and counts) to the GET /doctors endpoint, validated via coerced Zod query parameters.
* **Step 49:** Created controller unit tests for patient profile creation and doctor profile retrieval, utilizing Node.js's native test runner without third-party frameworks.
* **Step 50:** Reached Phase 1 checkpoint: tagged the codebase with version v0.1-auth-profiles, completing authentication, patient/doctor profiles, and unit test integrations.
* **Step 51:** Implemented the `POST /appointments` backend endpoint allowing patient self-booking (resolving profile ID automatically from user context) and receptionist/admin booking on behalf of patients, validated via Zod schema checks.
* **Step 52:** Added double-booking and overlap validation checks for patients and doctors during appointment creation, throwing a `409 Conflict` if scheduling overlaps occur.
* **Step 53:** Implemented the `GET /appointments/:id` backend endpoint to retrieve detailed information for a single appointment, enforcing strict role-based access scoping and verifying UUID params via Zod.
* **Step 54 & 55:** Implemented the `GET /appointments` backend endpoint to retrieve a list of appointments, enforcing role-based scoping (patients see their own, doctors see their own, receptionists/admins see all) and returning detailed patient/doctor names and specialties.
* **Step 56 & 57:** Implemented the `PUT /appointments/:id/status` status update backend endpoint, enforcing strict transition validation and role-based permissions (approve/cancel).
* **Step 58:** Built the Next.js Patient Appointment Booking Page (`/appointments/book`) with support for preselected/locked care providers, profile setup gating checks, and premium styling.
* **Step 59, 60 & 61:** Built the Next.js Appointments Listing Dashboard (`/appointments`) incorporating Patient Dashboards, Doctor Dashboards (with approve/cancel controls), and status-colored UI badges.
* **Step 62:** Added a basic email notification console logging stub upon successful appointment creation, resolving patient and doctor emails and names from the database as a preparation milestone for async job queues.
* **Step 63:** Added schema validation unit tests inside tests/controllers.test.js to verify request-level formatting constraints (Zod) on the appointment creation and status update routes.
* **Step 64:** Created docs/appointments-flow.md detailing step-by-step validations, double-booking logic, status transitions, and role-scoped read/write permissions for appointments.
* **Step 65:** Reached the Monolith Core MVP checkpoint, tagging the codebase with version v0.2-monolith-core-complete to lock in booking flow, validation tests, and scheduling dashboards.
* **Step 66:** Created the src/modules/ directory structure plan inside ARCHITECTURE.md outlining strict domain-co-location boundaries for auth, patients, doctors, and appointments.
* **Step 67:** Refactored the authentication domain into a structured module inside src/modules/auth/ consisting of routes, controller, service, and repository layers, and deleted old flat route and controller files.
* **Step 68:** Refactored the patients profile domain into a structured module inside src/modules/patients/ consisting of routes, controller, service, and repository layers, and deleted old flat route and controller files.
* **Step 69:** Refactored the doctors directory domain into a structured module inside src/modules/doctors/ consisting of routes, controller, service, and repository layers, and deleted old flat route and controller files.
* **Step 70:** Refactored the appointments scheduling domain into a structured module inside src/modules/appointments/ consisting of routes, controller, service, and repository layers, and deleted old flat route and controller files.
* **Step 71:** Extracted a shared database repository pattern (BaseRepository class) providing common CRUD methods, and refactored all existing module repositories (auth, patients, doctors, appointments) to inherit from it.
* **Step 72:** Separated business logic into dedicated service layers within each domain module.
* **Step 73:** Refactored controllers to be thin req/res handlers calling service methods.
* **Step 74:** Added a module-level README inside each domain module (auth, patients, doctors, appointments) defining its architecture and boundary responsibilities.
* **Step 75:** Enforced and documented dependency direction rules to prevent modules from directly importing each other's repository files.
* **Step 76:** Implemented co-located integration tests for auth, patients, doctors, and appointments modules using Node's native test runner.
* **Step 77:** Set up ESLint + Prettier for code linting and formatting consistency across the repository.
* **Step 78:** Added the `modules/billing/` skeleton consisting of skeleton controller, service, routes, repository, and README, and mounted the billing routes under `/billing` on the central router.
* **Step 79:** Added the `modules/notifications/` skeleton consisting of skeleton controller, service, routes, repository, and README, and mounted the notifications routes under `/notifications` on the central router.
* **Step 80:** Completed Phase 2 (Modular Monolith) and tagged the codebase as version `v0.3-modular-monolith` to secure the progress.
* **Step 81:** Installed Redis locally and defined a `redis` container service within `docker-compose.yml` to prepare for distributed caching.
* **Step 82:** Installed `ioredis`, created `src/db/redis.js` to connect to the Redis container on startup, and extended `GET /health` to report live PostgreSQL and Redis connectivity status.
* **Step 83:** Implemented Redis caching for doctor overlap/availability lookups, querying all active appointments for a doctor on a given date on a cache miss and verifying conflicts in-memory.
* **Step 84:** Implemented cache invalidation for the doctor availability cache on appointment creation and status changes.
* **Step 85:** Implemented Redis caching for doctor profile details with 5m TTL and automatic invalidation on updates.
* **Step 86:** Implemented JWT blacklist in Redis for token invalidation on logout.
* **Step 87:** Added popular doctors tracking using a Redis Sorted Set (ZSET) to count profile views and return featured records.
* **Step 88:** Created a benchmarking comparison script to evaluate database versus cache retrieval latency.
* **Step 89:** Documented caching strategy, Redis keys, TTLs, and invalidation rules in docs/caching.md.
* **Step 90:** Tagged release version v0.4-redis-caching checkpoint to secure Phase 3 progress.
* **Step 91:** Installed BullMQ and set up a reusable queue connection module in src/db/queue.js.
* **Step 92:** Created the appointment-reminder queue and worker to log background job processing details.
* **Step 93:** Enqueued a delayed reminder job to BullMQ on appointment approval and handled job removal on cancellation.
* **Step 94:** Replaced console email stub with Nodemailer SMTP delivery inside background worker.
* **Step 95:** Added prescription-reminder queue and background worker skeleton.
* **Step 96:** Added bill-generation queue and background worker skeleton.
* **Step 97:** Installed pdfkit and configured bill-generation background worker to compile PDF invoices inside temp_bills/.
* **Step 98:** Added job retry and exponential backoff config inside the appointments service.
* **Step 99:** Installed @bull-board/express and @bull-board/api, integrated the Bull Board UI mounted at `/admin/queues`, and registered all active queues for visual monitoring.
* **Step 101:** Created the notification-service directory and initialized its package.json to begin extraction into an independent microservice.
* **Step 102:** Set up a minimal Express server for the notification-service on port 3010 with a `/health` status endpoint.
* **Step 103:** Configured Resend email delivery inside the notification-service utilizing the official Resend SDK.
* **Step 104:** Built an internal API endpoint `POST /notify/email` inside the notification-service to handle request payloads for dispatching emails.
* **Step 105:** Updated the monolith's appointment-reminder queue worker to delegate email sending to the notification-service over HTTP POST.
* **Step 106:** Added SMS notification capability as a console logging stub and exposed it on a new endpoint `POST /notify/sms` in the notification-service.
* **Step 107:** Added push notification capability as a console logging stub and exposed it on a new endpoint `POST /notify/push` in the notification-service.
* **Step 108:** Added a unified endpoint `POST /notify` in the notification-service that accepts a channel parameter ('email', 'sms', 'push') and dynamically dispatches payloads.
* **Step 109:** Completed configuration templates (.env.example) and wrote microservice documentation (README.md) for the notification-service.
* **Step 110:** Added custom request logging middleware and a global centralized error handler specific to the notification-service.
* **Step 111:** Added Dockerfiles for the monolith and notification-service, and configured them in docker-compose.yml to run in a unified container network.
* **Step 112:** Verified the end-to-end microservice communication flow: booking → queue job → microservice REST delivery → Resend API email dispatch.
* **Step 113:** Documented the microservice decomposition analysis, benefits, and tradeoffs inside docs/service-extraction.md.
* **Step 114:** Implemented a fetch retry mechanism with AbortController timeout and exponential backoff in the monolith's worker to recover from transient notification-service down times.
* **Step 115:** Secured Phase 5 progress by tagging the repository checkpoint as v0.6-first-microservice.
* **Step 116:** Added Kafka container configuration using KRaft mode to docker-compose.yml to lay the foundation for event-driven messaging.
* **Step 117:** Installed kafkajs library and configured a singleton Kafka client that connects the producer on monolith startup.
* **Step 118:** Created the appointment-created Kafka topic on server boot and implemented publishing events upon scheduling a new appointment.
* **Step 119:** Developed a simple Kafka consumer subscribing to appointment-created events and logging incoming message payloads on monolith startup.
* **Step 120:** Created the appointment-cancelled Kafka topic and implemented publishing/consuming of cancellation events whenever an appointment status is updated to cancelled.
* **Step 121:** Registered the prescription-created Kafka topic on server boot to prepare for upcoming digital prescription events.
* **Step 122:** Registered the claim-created Kafka topic on server boot to prepare for upcoming insurance claim processing events.
* **Step 123:** Configured the notification-service microservice to subscribe directly to the Kafka appointment-created topic to send booking confirmations.
* **Step 124:** Documented event schemas and payload structures for all system Kafka topics inside docs/events.md.
* **Step 125:** Added error handling boundaries and Dead-Letter Logging (DLQ stubs) across all Kafka consumers to catch and log failed events.
* **Step 126:** Created a standalone inspect-kafka.js CLI script to query cluster health, list active topics, and view consumer groups for debugging.
* **Step 127:** Secured Phase 6 progress by tagging the repository checkpoint as v0.7-kafka-event-bus.
* **Step 128:** Created the appointment-service microservice skeleton on port 3020 with local configuration templates and Dockerfiles.
* **Step 129:** Created database connection modules and decoupled table schemas for appointment_db, migrating appointments table without monolith foreign keys.
* **Step 130a:** Ported the database repository layer to `appointment-service` (including `BaseRepository` and `AppointmentsRepository`), configuring standalone connections to `appointment_db` and Redis caching.
* **Step 130b & 130c:** Ported service, controllers, routes, and middlewares to `appointment-service`, enabling REST-based profile lookups, Kafka publishing, and BullMQ reminders, and booted on port `3020`.
* **Step 132:** Configured Next.js client environment routing variables (`NEXT_PUBLIC_APPOINTMENT_SERVICE_URL`) to direct appointment bookings and dashboards to the microservice on port `3020`.
* **Step 133:** Shifted Kafka event publishing (`appointment-created` and `appointment-cancelled`) to originate natively from `appointment-service`.
* **Step 134:** Cleaned up the monolith by deleting legacy appointment modules, controllers, routes, schemas, and consumers, ensuring monolith tests pass.
* **Step 135:** Implemented database-aware and cache-aware `/health` status check monitoring on the `appointment-service` and verified the Docker container configuration.
* **Step 136:** Added the `appointment-service` container definition to `docker-compose.yml`, mapping port `3020` and connecting it to the database, Redis, and Kafka.
* **Step 137:** Ran end-to-end integration test validation suite verifying user logins, profile matching, booking creation, status modification, and cleanup natively on port 3020.
* **Step 138:** Documented architectural decisions, database-per-service patterns, and runtime communication tradeoffs for the extracted microservice inside docs/appointment-service-extraction.md.
* **Step 139:** Tagged repository checkpoint release as v0.8-appointment-service-extracted to mark Phase 7 completion.
* **Step 140:** Initialized the `billing-service` microservice skeleton on port `3011` with isolated environment parameters and standard health checks.
* **Step 141:** Configured the isolated `billing_db` database for the `billing-service` and implemented automated creation and migration runner scripts.
* **Step 142:** Designed the `invoices` table schema and executed migration scripts to map the table inside the isolated `billing_db` database.
* **Step 143:** Designed the `payments` table schema and executed migration scripts to map the table inside the isolated `billing_db` database.
* **Step 144:** Implemented `POST /invoices` in `billing-service` to manually create invoices by verifying appointments against the `appointment-service`.
* **Step 145:** Connected `billing-service` to Kafka to consume `appointment-completed` events, auto-generating pending invoices.
* **Step 148:** Created a mock payment endpoint `POST /invoices/:id/payments` in `billing-service` that records transactions and transitions invoice status to paid or covered.
* **Step 164:** Built a "Write Prescription" page in Next.js (`/prescriptions/write`) for doctors to create prescriptions, and updated the Doctor's Appointment Dashboard with "Mark Completed" and "Write Prescription" buttons.
* **Step 165:** Created Dockerfile, .dockerignore, database connection health check, and integrated prescription-service in docker-compose.yml.
* **Step 167:** Created `insurance-service/` directory and initialized package.json, environment configurations, error/auth middlewares, and Express server booting on port 3013.
* **Step 168:** Set up local PostgreSQL connection module, database creation check utility, and dynamic migration runner configuration inside `insurance-service/src/db`.
* **Step 169:** Designed and wrote the migration SQL script for the `policies` table (storing patient policies details) in the `insurance_db` database.
* **Step 170:** Designed and wrote the migration SQL script for the `claims` table (storing patient claims details) in the `insurance_db` database.
* **Step 171:** Built `POST /claims`, `GET /claims`, and `GET /claims/:id` endpoints in `insurance-service` with full role-based access, policy validation, and duplicate-claim prevention.
* **Step 172:** Set up Kafka producer in `insurance-service`, created topics `claim-created`, `claim-approved`, `claim-rejected`, and published a `claim-created` event after every successful claim submission.
* **Step 173:** Built `PATCH /claims/:id/review` in `insurance-service` for insurance agents to approve or reject a claim, recording the reviewer and timestamp, and publishing `claim-approved`/`claim-rejected` Kafka events.
* **Step 174:** Built the full `policies` CRUD module in `insurance-service` — `POST /policies`, `GET /policies`, `GET /policies/:id`, `DELETE /policies/:id` — with role-based access, active-policy duplicate guard, and a patient-scoped view.
* **Step 175:** Created the `/insurance` frontend page in the Next.js app — patients see their active policy and submitted claims, patients can submit new claims via a form, insurance agents can approve or reject pending claims directly from the UI. Added Insurance link to the home navbar.
* **Step 176:** Wired up `claim-approved` and `claim-rejected` Kafka consumers end-to-end — billing-service subscribes to `claim-approved` and marks the linked invoice as `covered`; notification-service subscribes to both and emails the patient with styled HTML approval/rejection emails. Added `GET /patients/:id/email` internal endpoint to monolith for payload enrichment.
* **Step 177:** Insurance Agent dashboard was delivered as part of the `/insurance` frontend page — agents see all claims, approve/reject pending ones directly from the UI (role-adaptive page).
* **Step 178:** Added `Dockerfile` and `.dockerignore` for `insurance-service` (port 3013), added `insurance-service` container to `docker-compose.yml` with env vars for Kafka, monolith, appointment-service, and `insurance_db`. Tagged `v0.11-insurance-service`.
* **Step 179 (Deployment Phase A):** Upgraded root `Dockerfile` to `node:20-alpine` with `npm ci --only=production` for faster, leaner production images. Expanded `.dockerignore` to exclude all microservice folders, secrets, and dev artifacts from the core app image.
* **Step 180 (Deployment Phase A):** Upgraded `appointment-service` `Dockerfile` to `node:20-alpine` with `npm ci --only=production`. Expanded `.dockerignore` for `appointment-service` to exclude build artifacts, environment configuration files, and git history.
* **Step 181 (Deployment Phase A):** Upgraded `notification-service` `Dockerfile` to `node:20-alpine` with `npm ci --only=production`. Expanded `.dockerignore` for `notification-service` to exclude build artifacts, configuration files, and local logs.
* **Step 182 (Deployment Phase A):** Upgraded `billing-service` `Dockerfile` to `node:20-alpine` with `npm ci --only=production`. Expanded `.dockerignore` for `billing-service` to exclude build artifacts, environment configs, and git history.
* **Step 183 (Deployment Phase A):** Upgraded `prescription-service` `Dockerfile` to `node:20-alpine` with `npm ci --only=production`. Expanded `.dockerignore` for `prescription-service` to exclude build artifacts, environment configs, and git history.
* **Step 184 (Deployment Phase A):** Upgraded `insurance-service` `Dockerfile` to `node:20-alpine` with `npm ci --only=production`. Expanded `.dockerignore` for `insurance-service` to exclude build artifacts, environment configs, and git history.
* **Step 185 (Deployment Phase A):** Conducted an environment variable audit across all services. Configured CORS in the monolith to use a configurable `FRONTEND_URL` environment variable. Created/updated `.env.example` templates for all backend microservices to document all dependency and integration parameters.
* **Step 186 (Deployment Phase A):** Checked and aligned the main `docker-compose.yml` configurations with environment variables and verified the stack builds cleanly for local integration. Generated missing `package-lock.json` for `insurance-service` to fix the production `npm ci` build failure.
* **Step 187 (Deployment Phase A):** Configured `.gitignore` to strictly exclude sensitive environment variables (`.env`, `*.env`) while explicitly allowing deployment templates (`.env.example` and `**/*.env.example`). Prepared repository to push safely to GitHub.
* **Step 188 (Deployment Phase A):** Created `docs/ports.md` mapping all internal and external network port allocations for microservices and infrastructure databases.
* **Step 189 (Deployment Phase B):** Prepared core app/monolith and `inspect-kafka.js` debug scripts to support SSL/TLS connections and SASL authentication for managed cloud event brokers like Upstash.













