## ADDED Requirements

### Requirement: Login page at /login
The system SHALL render a login form at `/login` with fields for email and password. The page SHALL be accessible to unauthenticated users and SHALL NOT require authentication to load.

#### Scenario: Login page renders for unauthenticated users
- **WHEN** an unauthenticated user navigates to `/login`
- **THEN** the login form SHALL be displayed without redirecting

#### Scenario: Authenticated user visiting /login is redirected
- **WHEN** an already-authenticated user navigates to `/login`
- **THEN** the system SHALL redirect them to `/` (or the value of the `redirectTo` query param if present)

### Requirement: Login form submission
The system SHALL call `supabase.auth.signInWithPassword()` when the login form is submitted. On success, the user SHALL be redirected. On failure, an error message SHALL be shown inline.

#### Scenario: Successful login redirects to app
- **WHEN** a user submits valid credentials on `/login`
- **THEN** the session SHALL be established and the user SHALL be redirected to `/` or the `redirectTo` query param path

#### Scenario: Failed login shows error message
- **WHEN** a user submits invalid credentials
- **THEN** an error message SHALL appear below the form (e.g., "Invalid email or password")

#### Scenario: Login form validates required fields before submission
- **WHEN** a user submits the login form with email or password missing
- **THEN** an inline error SHALL appear and the Supabase call SHALL NOT be made

### Requirement: Signup page at /signup
The system SHALL render a signup form at `/signup` with fields for email, password, password confirmation, and a role selector (`student` | `advisor` | `admin`).

#### Scenario: Signup page renders for unauthenticated users
- **WHEN** an unauthenticated user navigates to `/signup`
- **THEN** the signup form SHALL be displayed

### Requirement: Signup form submission
The system SHALL call `supabase.auth.signUp()` with `{ email, password, options: { data: { role } } }`. On success, the user SHALL be signed in and redirected to `/`. On failure, an error message SHALL be shown.

#### Scenario: Successful signup creates session and redirects
- **WHEN** a user submits a valid signup form
- **THEN** a Supabase account SHALL be created, a session cookie SHALL be set, and the user SHALL be redirected to `/`

#### Scenario: Duplicate email shows error
- **WHEN** a user signs up with an email already registered
- **THEN** an error message SHALL appear (e.g., "User already registered")

#### Scenario: Password confirmation mismatch
- **WHEN** the password and password confirmation fields do not match
- **THEN** an inline error SHALL appear and the Supabase call SHALL NOT be made

#### Scenario: Signup form validates required fields
- **WHEN** a user submits the signup form with any required field missing
- **THEN** inline errors SHALL appear for each missing field and the Supabase call SHALL NOT be made

### Requirement: Navigation between login and signup
The system SHALL provide a link from `/login` to `/signup` and vice versa so users can switch between forms.

#### Scenario: Link from login to signup
- **WHEN** a user is on `/login`
- **THEN** a "Create account" or equivalent link SHALL navigate to `/signup`
