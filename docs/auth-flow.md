# Authentication Flow (End-to-End)

This document provides a detailed overview of how authentication and authorization are handled in the CareFlow Hospital Management System (HMS) between the **Next.js Frontend** and the **Express.js Monolith API**.

---

## High-Level Sequence Diagram

```text
  Next.js Frontend (Port 3000)                      Express Backend (Port 5000)
┌────────────────────────────┐                     ┌───────────────────────────┐
│                            │                     │                           │
│   1. POST /auth/register  ─┼────────────────────►│  • Validate inputs (Zod)  │
│      (Name, Email, Role)   │                     │  • Hash pass (bcrypt)     │
│                            │                     │  • Store in PostgreSQL    │
│                            │◄────────────────────┼─ Returns HTTP 201         │
│                            │                     │                           │
│   2. POST /auth/login ─────┼────────────────────►│  • Rate Limiter (max 5)   │
│      (Email, Password)     │                     │  • Verify credentials    │
│                            │                     │  • Sign 24h JWT           │
│                            │◄────────────────────┼─ Returns JWT (HTTP 200)   │
│   • Set Cookie & LocalStore│                     │                           │
│                            │                     │                           │
│   3. GET /dashboard        │                     │                           │
│      (Triggers Middleware) │                     │                           │
│      • If cookie exists    │                     │                           │
│        -> Allow load       │                     │                           │
│      • Else                │                     │                           │
│        -> Redirect /login  │                     │                           │
│                            │                     │                           │
│   4. GET /auth/me ─────────┼────────────────────►│  • Auth Middleware        │
│      (Bearer Token Header) │                     │    (Verify JWT signature) │
│                            │                     │  • RBAC Check (Role)      │
│                            │◄────────────────────┼─ Return Profile (HTTP 200)│
│                            │                     │                           │
└────────────────────────────┘                     └───────────────────────────┘
```

---

## 1. User Registration Flow

1. **Client Submission:** The user fills out the registration form at `/register`, selects their role (e.g. `patient` or `doctor`), and submits the form.
2. **Input Validation:** The backend uses **Zod** schema middleware ([src/middleware/validate.js](file:///c:/Users/Lenovo/Desktop/hospital_managment/src/middleware/validate.js)) to validate fields such as email format, minimum password length, and roles.
3. **Password Hashing:** If validation passes, the user's password is encrypted using **bcryptjs** with `10 salt rounds` inside the register controller before storage.
4. **Database Insertion:** The user record is inserted into the `users` table, and a success response is sent back to redirect the client to the login page.

---

## 2. Login & JWT Issuance

1. **Rate Limiting Protection:** When the user attempts to sign in via `/login`, the request first passes through the `loginLimiter` middleware ([src/middleware/rateLimiter.js](file:///c:/Users/Lenovo/Desktop/hospital_managment/src/middleware/rateLimiter.js)). This blocks brute-force attempts by restricting requests from the same IP to a maximum of **5 attempts per 15 minutes**.
2. **Credential Verification:** The controller compares the input password against the hashed password stored in the database.
3. **Token Signing:** Upon successful authentication, the backend signs a JSON Web Token (JWT) using a secure secret key, configured with an expiration window of 24 hours.
4. **Storage & Persistence:** 
   - The token is returned to the frontend.
   - The frontend stores the token in `document.cookie` (set with `SameSite=Lax` and a 24-hour expiration) so it is sent automatically on subsequent page fetches.
   - The token is also stored in `localStorage` for potential use in client-side API configurations.

---

## 3. Route Protection (Frontend)

To prevent unauthenticated users from seeing pages, we use a server-side Next.js **Middleware** ([frontend/src/middleware.js](file:///c:/Users/Lenovo/Desktop/hospital_managment/frontend/src/middleware.js)).
* When a browser requests a page, the middleware checks if the `token` cookie is present.
* If a request is made to a protected path (e.g., `/dashboard`, `/profile`, `/appointments`, `/patients`, `/doctors`) without a token, the user is redirected to `/login`.
* If a logged-in user tries to access public authentication pages like `/login` or `/register`, the middleware redirects them back to the landing page `/`.

---

## 4. Protected API Endpoints (Backend)

For backend endpoints requiring authentication (such as fetching user info at `GET /auth/me`):
1. **Authorization Header:** The frontend must include the JWT in the `Authorization` header as a Bearer token: `Authorization: Bearer <token>`.
2. **JWT Verification Middleware:** The backend `authenticate` middleware ([src/middleware/auth.js](file:///c:/Users/Lenovo/Desktop/hospital_managment/src/middleware/auth.js)) intercepts the request, verifies the JWT signature, and decodes the token payload to extract user info (like `userId` and `role`).
3. **RBAC Gates:** Specific routes use the role-based middleware (e.g., `requireRole('doctor')`) to compare the user's role against authorized roles before allowing access to route handlers.

---

## 5. Logout

1. The user navigates to `/logout`.
2. Client-side JavaScript clears the `token` cookie (by setting its expiration date in the past) and deletes the `token` item from `localStorage`.
3. The client is redirected to `/login`, and the Next.js router is refreshed to ensure the cookie state updates globally.
