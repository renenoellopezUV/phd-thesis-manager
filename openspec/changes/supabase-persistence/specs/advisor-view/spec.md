## ADDED Requirements

### Requirement: Advisor student list page
The system SHALL render a page at `/advisor/students` accessible only to users with role `'advisor'`. The page SHALL display a list of all student profiles where `advisor_email` matches the logged-in advisor's email, showing each student's name, program, stage, milestone completion rate, and number of overdue milestones.

#### Scenario: Advisor sees only their students
- **WHEN** an advisor with email `"dr.chen@uni.edu"` navigates to `/advisor/students`
- **THEN** the page SHALL display only profiles where `advisor_email = 'dr.chen@uni.edu'`

#### Scenario: Non-advisor is blocked from advisor route
- **WHEN** a user with role `'student'` attempts to access `/advisor/students`
- **THEN** the middleware SHALL redirect them to `/` (or a 403 page)

#### Scenario: Empty state when no students assigned
- **WHEN** an advisor has no students with matching `advisor_email`
- **THEN** the page SHALL display an empty-state message (e.g., "No students assigned yet")

### Requirement: Per-student milestone progress view
The system SHALL render a read-only milestone list for a specific student at `/advisor/students/[studentId]`, accessible only to the student's assigned advisor. It SHALL display all milestones for that student with their type, due date, and completion status.

#### Scenario: Advisor views a student's milestones
- **WHEN** an advisor navigates to `/advisor/students/[studentId]` for a student assigned to them
- **THEN** all milestones for that student SHALL be displayed in read-only mode

#### Scenario: Advisor cannot view unassigned student
- **WHEN** an advisor requests `/advisor/students/[studentId]` for a student not assigned to them
- **THEN** the page SHALL return a 404 or redirect to `/advisor/students`
