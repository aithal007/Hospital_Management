# Notifications Module

## Description
This module is responsible for sending notifications (e.g., email, SMS, push notifications) to patients and doctors. In later phases, it will support asynchronous workers and event-driven triggers.

## Components
- **Routes (`notifications.routes.js`)**: Empty skeleton defining API entry points for notifications.
- **Controller (`notifications.controller.js`)**: Thin controller interface mapping HTTP requests/responses to services.
- **Service (`notifications.service.js`)**: Business logic layer managing templates and dispatch channels.
- **Repository (`notifications.repository.js`)**: Database layer inheriting CRUD operations from `BaseRepository`.
