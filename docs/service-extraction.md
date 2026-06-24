# Architectural Reflection: Notification Service Extraction

This document reflects on the design decisions, benefits, and tradeoffs encountered while extracting the **Notification Service** from the main monolithic backend of the CareFlow Hospital Management System.

---

## 1. Why Notifications First?

When extracting microservices from a monolith, a common pattern is to start with a domain that:
- Has **low coupling** with core business tables (like patients, doctors, and appointments).
- Depends heavily on **third-party integrations** (like Resend for emails, or future Twilio for SMS).
- Can operate purely on request payloads without requiring direct database queries from the monolith.

The Notification domain fits these criteria perfectly. It only requires a recipient address, a message header, and content. It doesn't need to know the state of clinical workflows.

---

## 2. Before vs. After Architecture

### Monolith (Nodemailer + SMTP)
- **Codebase Coupling**: The monolith imported `nodemailer` directly, housing SMTP credentials and rendering templates in background queue files.
- **Dependency Bloat**: Changes to email configurations, template layouts, or SMTP credentials required redeploying the entire monolith.
- **Blocking / Failures**: Network delivery failures could tie up monolithic resources or fail background jobs directly.

### Extracted Microservice (HTTP API + Resend SDK)
- **Decoupled Environment**: The monolith's background worker acts as a simple HTTP client, fetching `POST http://notification-service:3010/notify/email`.
- **SDK Isolation**: The `resend` package and the `RESEND_API_KEY` only exist inside the `notification-service` codebase.
- **Multi-Channel Capability**: The microservice exposes unified endpoints (`POST /notify`) handling Email, SMS, and Push notifications independently from the monolith's runtime.

---

## 3. Architectural Benefits

1. **Dependency Isolation**: The monolith no longer needs to install or import Nodemailer, Resend, or other delivery-specific packages.
2. **Independent Deployability**: We can change our email layouts, swap Resend for SendGrid/Amazon SES, or modify SMS providers without taking down or redeploying the main appointment and auth backend.
3. **Dedicated Resource Allocation**: The notification service can scale independently (e.g. running multiple instances during peak alert volume periods) without affecting the monolith's compute footprint.

---

## 4. Trade-offs & Challenges

1. **Network Overhead & Latency**: A direct local SMTP call was replaced with an HTTP hop (`Monolith Worker -> Notification Service`) followed by another HTTP hop (`Notification Service -> Resend API`). This introduces additional network latency.
2. **Network Failures & Retry Complexity**: In a monolith, SMTP failure is easily caught. In a microservice, if the `notification-service` is down, the monolith worker fails. This is why configuring **BullMQ exponential job retries** (implemented in Step 98) is critical to handle temporary microservice outages.
3. **Orchestration Complexity**: Developers must now manage multiple processes, ports (`5000` and `3010`), and configure complex container networking variables (e.g. `host.docker.internal` for local Postgres, Docker DNS names for Redis) inside `docker-compose.yml`.

---

## 5. Next Roadmap: Asynchronous Events

Currently, the monolith connects to the microservice **synchronously** over HTTP (via `fetch` inside the worker). While simple, this still couples the monolith's runtime to the availability of the notification service. 

In Phase 6, we will transition this to a fully **asynchronous event-driven architecture** using **Kafka**. Instead of making HTTP calls, the monolith will publish an event (e.g. `appointment-created` or `claim-approved`) to Kafka, and the `notification-service` will consume it asynchronously, removing all direct HTTP runtime dependencies.
