## MODIFIED Requirements

### Requirement: Default student seed data
The system SHALL initialise `ThesisContext` with a sample `Student` record so the UI is populated on first load without any user input. The seed student's `id` field SHALL be set to the authenticated user's `auth.user.id` when a session is available, falling back to a static placeholder ID when rendering without auth context (e.g., in tests or Storybook).

#### Scenario: Dashboard renders without user setup
- **WHEN** a user opens the app for the first time (no saved state)
- **THEN** the dashboard SHALL display a complete student profile using the seed data

#### Scenario: Seed student ID matches auth user
- **WHEN** an authenticated user with ID `"abc-123"` loads the dashboard
- **THEN** the seed `Student` record's `id` field SHALL equal `"abc-123"`
