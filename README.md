# Hospital Management System (HMS)

This repository contains the Hospital Management System, starting as a monolithic backend application and evolving into an event-driven microservices architecture.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)

### Installation
1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run the application:
   ```bash
   npm start
   ```

## Documentation
- [Problem Description](PROBLEM.md)
- [System Architecture](ARCHITECTURE.md)
- [Core User Roles](docs/roles.md)
- [Workflow Diagrams](docs/flows.md)
- [Database Schema Design](docs/schemas.md)
