# Patients Module

This module manages patient profiles, demographical info (gender, date of birth, address), and insurance policies.

## Architecture

- **`patients.routes.js`**: Exposes profile creation, updating, and viewing routes.
- **`patients.controller.js`**: Validates request parameters and handles HTTP response envelopes.
- **`patients.service.js`**: Enforces strict patient ownership policies (patients can only view or modify their own files) and gates profile creation.
- **`patients.repository.js`**: Extends `BaseRepository` to store, update, and search patient details inside the `patients` table.
