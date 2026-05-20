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
The system SHALL initialise `ThesisContext` with a sample `Student` record so the UI is populated on first load without any user input.

#### Scenario: Dashboard renders without user setup
- **WHEN** a user opens the app for the first time (no saved state)
- **THEN** the dashboard SHALL display a complete student profile using the seed data
