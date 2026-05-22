## ADDED Requirements

### Requirement: Middleware session check
The system SHALL implement `src/middleware.ts` that runs on every request to app routes. The middleware SHALL use `createServerClient` from `@supabase/ssr` to read the current session from cookies and refresh it if needed (by calling `supabase.auth.getUser()`).

#### Scenario: Middleware refreshes expiring session
- **WHEN** a valid but soon-to-expire session cookie is present
- **THEN** the middleware SHALL refresh the session token and update the cookie in the response before the page renders

### Requirement: Unauthenticated redirect
The system SHALL redirect any unauthenticated request to a protected route to `/login`, appending the originally requested path as a `redirectTo` query parameter.

#### Scenario: Unauthenticated user visiting dashboard is redirected
- **WHEN** an unauthenticated user requests `/`
- **THEN** the middleware SHALL respond with a redirect to `/login?redirectTo=/`

#### Scenario: Unauthenticated user visiting milestones is redirected
- **WHEN** an unauthenticated user requests `/milestones`
- **THEN** the middleware SHALL respond with a redirect to `/login?redirectTo=%2Fmilestones`

### Requirement: Auth routes excluded from protection
The system SHALL configure the middleware matcher so that `/login`, `/signup`, and Next.js internal paths (`/_next/*`, `/favicon.ico`, etc.) are NOT subject to the authentication check.

#### Scenario: /login accessible without session
- **WHEN** an unauthenticated user requests `/login`
- **THEN** the middleware SHALL NOT redirect and SHALL allow the request to proceed

#### Scenario: /signup accessible without session
- **WHEN** an unauthenticated user requests `/signup`
- **THEN** the middleware SHALL NOT redirect and SHALL allow the request to proceed

### Requirement: Post-login redirect honour
The system SHALL redirect authenticated users to the path specified in the `redirectTo` query parameter after a successful login, falling back to `/` if the parameter is absent or invalid.

#### Scenario: Redirect to original destination after login
- **WHEN** a user was redirected to `/login?redirectTo=%2Fmilestones` and then successfully logs in
- **THEN** the system SHALL redirect the user to `/milestones`

#### Scenario: Missing redirectTo falls back to root
- **WHEN** a user logs in from `/login` without a `redirectTo` parameter
- **THEN** the system SHALL redirect the user to `/`
