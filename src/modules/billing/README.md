# Billing Module

## Description
This module is responsible for billing operations, including invoice generation, processing payments, handling refunds, and formatting PDF bills.

## Components
- **Routes (`billing.routes.js`)**: Empty skeleton defining API entry points for billing.
- **Controller (`billing.controller.js`)**: Thin controller interface to map HTTP requests/responses to services.
- **Service (`billing.service.js`)**: Business logic layer managing calculations and actions.
- **Repository (`billing.repository.js`)**: Database layer inheriting CRUD operations from `BaseRepository`.
