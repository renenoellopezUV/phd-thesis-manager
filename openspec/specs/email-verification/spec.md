## ADDED Requirements

### Requirement: Email verification enforcement in middleware
The system SHALL check `user.email_confirmed_at` in the middleware for all authenticated, non-auth routes. If the value is null (unverified), the middleware SHALL redirect to `/verify-email` regardless of the requested path.

#### Scenario: Unverified user redirected after login
- **WHEN** an authenticated but email-unverified user requests `/`
- **THEN** the middleware SHALL redirect to `/verify-email`

#### Scenario: Verified user passes through
- **WHEN** an authenticated user with a non-null `email_confirmed_at` requests `/`
- **THEN** the middleware SHALL allow the request to proceed normally

### Requirement: Verify email holding page
The system SHALL render a page at `/verify-email` that: (1) informs the user to check their inbox, (2) displays the email address the verification link was sent to, and (3) provides a "Resend verification email" button that calls `supabase.auth.resend({ type: 'signup', email })`.

#### Scenario: Resend button triggers Supabase resend
- **WHEN** a user on `/verify-email` clicks "Resend verification email"
- **THEN** `supabase.auth.resend()` SHALL be called and a success or error message SHALL be shown inline

#### Scenario: Verify email page excludes unverified user from app
- **WHEN** an unverified user navigates to `/verify-email`
- **THEN** the page SHALL render without redirecting (it is the designated holding page)

### Requirement: Auth confirmation callback route
The system SHALL implement a Route Handler at `/auth/confirm` that: receives `token_hash` and `type` query parameters from Supabase's verification email link, calls `supabase.auth.verifyOtp({ token_hash, type })`, and on success redirects to `/` (or the `next` query param if present).

#### Scenario: Valid confirmation link verifies user
- **WHEN** a user clicks the Supabase verification link (containing `token_hash` and `type=email`)
- **THEN** the `/auth/confirm` handler SHALL call `verifyOtp`, set the session cookie, and redirect to `/`

#### Scenario: Invalid or expired token shows error
- **WHEN** the `token_hash` is expired or invalid
- **THEN** the handler SHALL redirect to `/login?error=invalid_token` and SHALL NOT set a session

### Requirement: Signup redirects to verify-email page
The system SHALL redirect users to `/verify-email` immediately after a successful `supabase.auth.signUp()` call, instead of redirecting to `/`.

#### Scenario: Post-signup redirect to verification page
- **WHEN** a user completes the signup form and the Supabase call succeeds
- **THEN** the browser SHALL navigate to `/verify-email`
