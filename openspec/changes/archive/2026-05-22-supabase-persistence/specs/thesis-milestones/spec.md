## ADDED Requirements

### Requirement: Milestones fetched from database
The system SHALL fetch the authenticated student's milestones from the `milestones` Postgres table in async Server Components for the `/milestones` and `/` (dashboard) pages, sorted by `due_date` ascending.

#### Scenario: Milestones survive page reload
- **WHEN** a student adds a milestone and reloads the page
- **THEN** the milestone SHALL still appear, fetched from the DB

### Requirement: Add milestone via Server Action
The system SHALL implement an `addMilestone` Server Action that inserts a row into the `milestones` table with `profile_id = auth.uid()` and calls `revalidatePath`. The Server Action SHALL validate that `title` and `due_date` are non-empty before inserting.

#### Scenario: Validation prevents empty title insert
- **WHEN** `addMilestone` is called with an empty title
- **THEN** the action SHALL return an error and SHALL NOT insert a row into the DB

### Requirement: Toggle milestone completion via Server Action
The system SHALL implement a `toggleMilestone` Server Action that updates the `completed` and `completed_date` columns for a given milestone ID, scoped to `auth.uid()` via RLS, and calls `revalidatePath`.

#### Scenario: Completing a milestone sets completed_date in DB
- **WHEN** `toggleMilestone` is called for an incomplete milestone
- **THEN** `completed = true` and `completed_date = CURRENT_DATE` SHALL be set in Postgres

### Requirement: Delete milestone via Server Action
The system SHALL implement a `deleteMilestone` Server Action that deletes the row by ID, scoped to `auth.uid()` via RLS, and calls `revalidatePath`.

#### Scenario: Deleted milestone absent after reload
- **WHEN** `deleteMilestone` succeeds and the page reloads
- **THEN** the deleted milestone SHALL not appear in the list

## REMOVED Requirements

### Requirement: Default milestone seed data
**Reason**: Replaced by DB-backed milestone fetching. The `ThesisContext` reducer and seed milestones are removed.
**Migration**: Delete `ThesisContext`. All milestone reads come from the `milestones` Postgres table. All milestone writes go through Server Actions.
