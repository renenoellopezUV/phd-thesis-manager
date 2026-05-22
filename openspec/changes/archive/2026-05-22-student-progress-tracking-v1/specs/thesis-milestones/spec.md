## ADDED Requirements

### Requirement: Milestone data model
The system SHALL define a `Milestone` TypeScript type with: `id` (string), `title` (string), `description` (string), `type` (`'exam' | 'defense' | 'chapter' | 'committee-meeting' | 'other'`), `dueDate` (ISO date string), `completedDate` (ISO date string or null), and `completed` (boolean).

#### Scenario: Type resolves across modules
- **WHEN** any component imports `Milestone` from the shared types file
- **THEN** TypeScript SHALL resolve the type without errors

### Requirement: Milestone list view
The system SHALL render all milestones on the `/milestones` page, grouped by completion status (incomplete first, then completed).

#### Scenario: Incomplete milestones listed first
- **WHEN** a user navigates to `/milestones`
- **THEN** the page SHALL display all incomplete milestones above all completed milestones

#### Scenario: Each milestone card shows key fields
- **WHEN** the milestone list renders
- **THEN** each milestone card SHALL display the title, type badge, due date, and a completion indicator

### Requirement: Add milestone
The system SHALL provide a form or modal on `/milestones` that allows the user to add a new milestone with title, description, type, and due date.

#### Scenario: New milestone appears in list after submission
- **WHEN** a user fills in the add-milestone form and submits
- **THEN** the new milestone SHALL appear in the incomplete milestones list immediately

#### Scenario: Form validation — required fields
- **WHEN** a user submits the add-milestone form with title or due date missing
- **THEN** the system SHALL display an inline error and SHALL NOT add the milestone

### Requirement: Toggle milestone completion
The system SHALL allow the user to mark a milestone as complete or incomplete with a single interaction (checkbox or button).

#### Scenario: Marking complete sets completedDate
- **WHEN** a user marks an incomplete milestone as complete
- **THEN** the milestone's `completed` field SHALL become `true` and `completedDate` SHALL be set to today's date

#### Scenario: Marking incomplete clears completedDate
- **WHEN** a user marks a completed milestone as incomplete
- **THEN** the milestone's `completed` field SHALL become `false` and `completedDate` SHALL be set to `null`

### Requirement: Delete milestone
The system SHALL allow the user to delete a milestone from the list.

#### Scenario: Milestone removed from list after deletion
- **WHEN** a user confirms deletion of a milestone
- **THEN** the milestone SHALL no longer appear in the list

### Requirement: Default milestone seed data
The system SHALL seed `ThesisContext` with at least five representative milestones covering different types (exam, defense, chapter, committee-meeting) and a mix of completed and upcoming statuses.

#### Scenario: Milestone list non-empty on first load
- **WHEN** a user opens `/milestones` for the first time
- **THEN** the list SHALL display at least five milestones without any user action
