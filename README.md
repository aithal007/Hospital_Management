# Hospital Management System

A hospital management platform built as a Next.js frontend plus a service-based backend. The system uses PostgreSQL for persistent records, Redis for cache and background jobs, Kafka for asynchronous event flow, and an API gateway for routing traffic into the backend.

## Project Layout

- `frontend/` - Next.js user interface for patients, doctors, staff, and service workflows
- `src/` - core backend service for auth, patients, and doctors
- `appointment-service/` - dedicated appointment service for booking, availability checks, status updates, and Kafka event publishing
- `billing-service/` - billing service for invoices, payments, and payment status tracking
- `insurance-service/` - insurance service for policies and claims
- `prescription-service/` - prescription service for prescription creation and item management
- `notification-service/` - notification service for Kafka consumers, email delivery, SMS, push, and queue workers
- `api-gateway/` - HTTP gateway that routes frontend requests to the right backend service

## Current Architecture

- Frontend on Vercel or a local container
- API gateway in front of the backend services
- Core service on Railway
- Appointment service on Railway
- Billing service on Railway
- Insurance service on Railway
- Prescription service on Railway
- Notification service on Railway
- One PostgreSQL database per service
- One Redis instance for queues and cache-backed flows
- One Kafka broker for event-driven communication

## How The System Works

The core service handles identity and master records. Patients and doctors are created and managed there, and the frontend uses it for authentication and profile access.

The appointment service owns the scheduling workflow. It validates appointment requests, stores appointment records, and publishes Kafka events when appointments are created, approved, completed, or cancelled.

The supporting services react to the event stream:

- billing records invoices and payment status
- insurance tracks policies and claim handling
- prescription stores prescriptions and line items
- notification listens for events and triggers delivery jobs

## BullMQ And Redis

BullMQ is the background job layer used with Redis.

It is used for work that should happen asynchronously instead of blocking the request cycle:

- appointment reminders
- bill generation jobs
- prescription reminder jobs
- notification queue processing

Redis is the shared backing store for those queues and for any cache-style operations that need fast access.

## Kafka And Events

Kafka carries the system events that tie services together.

Typical flow:

1. An appointment is created or updated.
2. The appointment service publishes an event.
3. Other services consume that event and react to it.

This gives the system loose coupling while still keeping the services in sync.

## Local Development

### Core Service

```bash
npm install
npm start
```

### Appointment Service

```bash
cd appointment-service
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Each service has its own `.env.example` file.

Common variables include:

- `DATABASE_URL`
- `REDIS_URL`
- `KAFKA_BROKER`
- `JWT_SECRET`
- `PORT`

Frontend variables:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APPOINTMENT_SERVICE_URL`

## Database Ownership

Each backend service owns its own database so the data boundary stays clear:

- `core_db`
- `appointment_db`
- `billing_db`
- `prescription_db`
- `insurance_db`

That split keeps the modules easier to reason about and makes service ownership explicit.

## Notes

- The repository currently reflects the full multi-service version of the system.
- Some services are split out as separate folders while the backend architecture is being finalized.
- The deployment layout can be simplified later if needed, but the codebase itself documents the full service split and job/event model.
