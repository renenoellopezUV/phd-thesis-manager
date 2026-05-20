## ADDED Requirements

### Requirement: Profile fetched from database
The system SHALL fetch the authenticated user's profile from the `profiles` Postgres table on every render of the dashboard and profile pages, using the Supabase server client in an async Server Component. If no profile row exists, the page SHALL show a setup prompt.

#### Scenario: Profile loads from DB on dashboard render
- **WHEN** an authenticated user navigates to `/`
- **THEN** the dashboard SHALL display profile data read from the `profiles` table, not from React Context or seed data

#### Scenario: Missing profile shows setup prompt
- **WHEN** a user is authenticated but has no `profiles` row (e.g., a legacy user pre-trigger)
- **THEN** the dashboard SHALL render a "Complete your profile" prompt instead of throwing an error

### Requirement: Profile edit form
The system SHALL render a profile edit form on a `/profile` page (or as an inline section on the dashboard) allowing the student to update: name, advisor email, department, program, start date, expected graduation date, and stage. Submission SHALL call the `updateProfile` Server Action.

#### Scenario: Profile changes persist after reload
- **WHEN** a student updates their program name and submits the profile form
- **THEN** reloading the dashboard SHALL show the updated program name fetched from the DB

## REMOVED Requirements

### Requirement: Default student seed data
**Reason**: Replaced by DB-backed profile fetching. Seed data was a temporary placeholder; the `profiles` table and the `handle_new_user` trigger now create real profile rows at signup.
**Migration**: Remove `ThesisContext` and the `seedStudent` constant. Profile data is fetched via the Supabase server client in Server Components.
