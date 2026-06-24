# Auth Module

This module handles user registration, authentication, JWT signing, password hashing, and user role lookup.

## Architecture

- **`auth.routes.js`**: Registers endpoints for registration (`POST /auth/register`), login (`POST /auth/login`), and current user profiling (`GET /auth/me`).
- **`auth.controller.js`**: Translates HTTP requests and maps error codes to JSON responses.
- **`auth.service.js`**: Orchestrates password hashing using `bcryptjs`, JWT token signing via `jsonwebtoken`, and structures details maps.
- **`auth.repository.js`**: Extends `BaseRepository` to execute core database queries on the `users` table.
