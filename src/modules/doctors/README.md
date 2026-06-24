# Doctors Module

This module manages doctor directories, consulting profiles (specialties, bios, fees), search filters, and licensing checks.

## Architecture

- **`doctors.routes.js`**: Registers routes for onboarding doctors, updating profiles, and querying lists.
- **`doctors.controller.js`**: Maps incoming query parameters (specialty, pagination parameters) to search listings.
- **`doctors.service.js`**: Coordinates search page logic, checks license uniqueness, and delegates queries.
- **`doctors.repository.js`**: Extends `BaseRepository` to perform paginated search and count matches on the `doctors` table.
