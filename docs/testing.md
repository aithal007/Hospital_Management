# Authentication Manual Test Cases

This document describes three core manual test cases to verify the correctness and security of the authentication system.

---

## Test Case 1: User Registration & Password Hashing

### Goal
Verify that a new user can successfully register via the registration page and that their password is saved in the PostgreSQL database as a secure, hashed string (using `bcrypt`).

### Prerequisites
- Backend API running (`npm start` or `node src/index.js` on port `5000`).
- Frontend Next.js app running (`npm run dev` on port `3000`).

### Steps
1. Open a browser and navigate to `http://localhost:3000/register`.
2. Enter a unique email address (e.g., `testdoctor@careflow.com`), a name, a password (e.g., `Password123!`), and select the **Doctor** role.
3. Click the **Register** button.
4. Verify that the UI displays a green success message and redirects you to `http://localhost:3000/login` within 1.5 seconds.
5. Connect to the database using `psql` or your database GUI:
   ```sql
   SELECT email, password, role FROM users WHERE email = 'testdoctor@careflow.com';
   ```

### Expected Result
- The registration response is successful (HTTP 201).
- The query returns a single record with the matching email and the `doctor` role.
- The `password` field contains a hashed string starting with `$2b$10$` (indicating a `bcrypt` hash with 10 salt rounds), **not** the plain text password `Password123!`.

---

## Test Case 2: User Login & JWT Issuance

### Goal
Verify that a registered user can log in with valid credentials, receives a signed JWT, and stores it in both browser cookies and `localStorage`.

### Steps
1. Navigate to `http://localhost:3000/login`.
2. Input the credentials of the user registered in Test Case 1 (`testdoctor@careflow.com` and `Password123!`).
3. Click the **Sign In** button.
4. Verify that the user is logged in and redirected to the home page (`http://localhost:3000/`).
5. Open the browser Developer Tools (F12) and inspect:
   - **Cookies:** Go to `Application` > `Storage` > `Cookies` > `http://localhost:3000` and check for the `token` cookie.
   - **Local Storage:** Go to `Application` > `Storage` > `Local Storage` > `http://localhost:3000` and check for the `token` key.
6. Attempt to log in with an incorrect password (e.g., `WrongPassword!`).

### Expected Result
- Valid login returns an HTTP 200 containing a signed JWT token.
- The browser cookie `token` is set with a validity of 24 hours (`max-age=86400`) and the SameSite property set to `Lax`.
- The token is stored successfully in `localStorage`.
- Invalid credentials return an HTTP 401 error with a clean error message, and no redirection occurs.

---

## Test Case 3: Route Protection and Middleware Redirection

### Goal
Verify that the Next.js server-side middleware correctly handles route protection by blocking unauthenticated access to protected routes and preventing logged-in users from seeing the login/register pages.

### Steps
1. **Unauthenticated Check:**
   - Open a private/incognito browser window (ensuring no cookies/tokens are stored).
   - Attempt to navigate directly to a protected route (e.g., `http://localhost:3000/dashboard`).
   - Verify the behavior.
2. **Authenticated Check:**
   - Log in using a valid account on `http://localhost:3000/login`.
   - Once logged in, attempt to navigate to a protected route like `http://localhost:3000/dashboard` or `http://localhost:3000/profile`.
   - Verify the behavior.
3. **Auth Page Access Check:**
   - While still logged in, try to navigate directly to `http://localhost:3000/login` or `http://localhost:3000/register`.
   - Verify the behavior.

### Expected Result
- **Unauthenticated Check:** The middleware detects the lack of a token and immediately redirects the browser to `http://localhost:3000/login?redirect=%2Fdashboard` before rendering any page content.
- **Authenticated Check:** The middleware detects the token, lets the request pass through (will 404 since dashboard pages are not yet built, but no redirection to login happens).
- **Auth Page Access Check:** The middleware detects the existing token and redirects the user back to the homepage (`http://localhost:3000/`).
