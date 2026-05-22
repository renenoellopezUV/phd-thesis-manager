## ADDED Requirements

### Requirement: Supabase browser client
The system SHALL export a `createClient()` factory from `src/lib/supabase/client.ts` that returns a `SupabaseBrowserClient` instance initialised with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This factory MUST only be called inside `'use client'` components.

#### Scenario: Client resolves without error when env vars are set
- **WHEN** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in the environment
- **THEN** calling `createClient()` SHALL return a Supabase client instance without throwing

### Requirement: Supabase server client
The system SHALL export a `createClient()` factory from `src/lib/supabase/server.ts` that returns a `SupabaseServerClient` instance using `createServerClient` from `@supabase/ssr`, reading and writing session cookies via `next/headers` `cookies()`.

#### Scenario: Server client reads session from cookies
- **WHEN** a valid Supabase session cookie is present in the request
- **THEN** `createClient().auth.getUser()` SHALL return the authenticated user without a network round-trip to Supabase

### Requirement: Sign in with email and password
The system SHALL allow a user to sign in by calling `supabase.auth.signInWithPassword({ email, password })`. On success, Supabase SHALL set a session cookie and the user SHALL be considered authenticated for subsequent requests.

#### Scenario: Valid credentials result in authenticated session
- **WHEN** a user submits correct email and password
- **THEN** the auth session SHALL be persisted in cookies and the user SHALL be redirected to the app

#### Scenario: Invalid credentials return an error
- **WHEN** a user submits an incorrect email or password
- **THEN** `signInWithPassword` SHALL return an error and no session cookie SHALL be set

### Requirement: Sign out
The system SHALL allow an authenticated user to sign out by calling `supabase.auth.signOut()`, which clears the session cookie and invalidates the local session.

#### Scenario: Sign out clears session and redirects to login
- **WHEN** a user clicks the sign-out button in the nav
- **THEN** the session cookie SHALL be cleared and the user SHALL be redirected to `/login`

### Requirement: Session persistence across page loads
The system SHALL maintain the user's session across browser reloads and navigation without requiring the user to sign in again, as long as the session token has not expired.

#### Scenario: Authenticated user reloads the page
- **WHEN** an authenticated user reloads any app page
- **THEN** the session SHALL be restored from the cookie and the user SHALL remain authenticated
