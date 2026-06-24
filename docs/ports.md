# Port Allocation Reference

This document maps all the network ports allocated across the Hospital Management System microservices stack for local development and containerized integration.

## Services & Applications

| Service / App | Port | Protocol | Description |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | `3000` | HTTP | Next.js Client Application |
| **Monolith (Core)** | `5000` | HTTP | Core Monolith Backend (Auth, Patients, Doctors) |
| **Notification Service** | `3010` | HTTP / Kafka | Microservice handling background email/SMS/push queues |
| **Billing Service** | `3011` | HTTP / Kafka | Microservice handling invoice generation & claims tracking |
| **Prescription Service** | `3012` | HTTP / Kafka | Microservice handling prescriptions & medication catalogs |
| **Insurance Service** | `3013` | HTTP / Kafka | Microservice handling policies and claim reviews |
| **Appointment Service** | `3020` | HTTP / Redis / Kafka | Microservice managing slots & bookings |

## Infrastructure & Middleware

| Component | Port (Host) | Port (Docker Container) | Description |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | `5432` | `5432` | Shared relational database host (individual databases per service) |
| **Redis** | `6379` | `6379` | Cache store, session manager, and BullMQ backend |
| **Kafka Broker** | `29092` | `9092` | Event bus message broker (KRaft mode) |
