## ADDED Requirements

### Requirement: Email verification check in middleware
The system SHALL extend the existing middleware session check to also verify `user.email_confirmed_at`. Authenticated users with `email_confirmed_at = null` SHALL be redirected to `/verify-email` for all routes except `/verify-email`, `/auth/confirm`, `/login`, and `/signup`.

#### Scenario: Unverified authenticated user redirected to verify-email
- **WHEN** an authenticated but email-unverified user requests `/milestones`
- **THEN** the middleware SHALL redirect to `/verify-email`

#### Scenario: `/verify-email` excluded from verification check
- **WHEN** an unverified user requests `/verify-email`
- **THEN** the middleware SHALL allow the request through

### Requirement: Role guard for advisor routes
The system SHALL redirect any user whose role is not `'advisor'` away from paths matching `/advisor/*`. Advisors SHALL be allowed through; students and admins SHALL be redirected to `/`.

#### Scenario: Student blocked from /advisor/students
- **WHEN** a user with role `'student'` requests `/advisor/students`
- **THEN** the middleware SHALL redirect to `/`

#### Scenario: Advisor permitted on /advisor/students
- **WHEN** a user with role `'advisor'` requests `/advisor/students`
- **THEN** the middleware SHALL allow the request through

### Requirement: Role guard for admin routes
The system SHALL redirect any user whose role is not `'admin'` away from paths matching `/admin/*`. Admins SHALL be allowed through; all other roles SHALL be redirected to `/`.

#### Scenario: Advisor blocked from /admin/users
- **WHEN** a user with role `'advisor'` requests `/admin/users`
- **THEN** the middleware SHALL redirect to `/`

#### Scenario: Admin permitted on /admin/users
- **WHEN** a user with role `'admin'` requests `/admin/users`
- **THEN** the middleware SHALL allow the request through

### Requirement: Role read from app_metadata in middleware
The system SHALL read the user's role from `user.app_metadata.role` (not `user_metadata.role`) for all middleware role checks, ensuring the value is admin-controlled and cannot be spoofed client-side.

#### Scenario: app_metadata.role used for role checks
- **WHEN** the middleware evaluates role guards
- **THEN** it SHALL use `user.app_metadata?.role` as the authoritative role source
