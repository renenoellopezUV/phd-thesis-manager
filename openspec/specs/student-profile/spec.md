## ADDED Requirements

### Requirement: Student profile data model
The system SHALL define a `Student` TypeScript type with the following fields: `id` (string), `name` (string), `email` (string), `advisor` (string), `department` (string), `program` (string), `startDate` (ISO date string), `expectedGraduationDate` (ISO date string), and `stage` (one of: `'coursework' | 'qualifying' | 'proposal' | 'research' | 'writing' | 'defense' | 'graduated'`).

#### Scenario: Type is importable across the app
- **WHEN** any module imports `Student` from the shared types file
- **THEN** TypeScript SHALL resolve the type without errors

### Requirement: Student profile display
The system SHALL render the student's name, advisor, department, program, start date, expected graduation date, and current stage on the dashboard page.

#### Scenario: All profile fields visible on dashboard
- **WHEN** a user navigates to `/`
- **THEN** the dashboard SHALL display the student's name, advisor name, department, program, start date, expected graduation, and stage label

#### Scenario: Stage label is human-readable
- **WHEN** the student's `stage` value is `'qualifying'`
- **THEN** the UI SHALL display "Qualifying Exams" (not the raw enum value)

### Requirement: Default student seed data
The system SHALL initialise `ThesisContext` with a sample `Student` record so the UI is populated on first load without any user input. The seed student's `id` field SHALL be set to the authenticated user's `auth.user.id` when a session is available, falling back to a static placeholder ID when rendering without auth context (e.g., in tests or Storybook).

#### Scenario: Dashboard renders without user setup
- **WHEN** a user opens the app for the first time (no saved state)
- **THEN** the dashboard SHALL display a complete student profile using the seed data

#### Scenario: Seed student ID matches auth user
- **WHEN** an authenticated user with ID `"abc-123"` loads the dashboard
- **THEN** the seed `Student` record's `id` field SHALL equal `"abc-123"`

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
