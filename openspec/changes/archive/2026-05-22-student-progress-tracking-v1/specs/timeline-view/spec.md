## ADDED Requirements

### Requirement: Timeline page route
The system SHALL serve a timeline view at `/timeline` that renders all milestones on a horizontal chronological axis.

#### Scenario: Route accessible from navigation
- **WHEN** a user clicks the "Timeline" navigation link
- **THEN** the browser SHALL navigate to `/timeline` and render the timeline component

### Requirement: Chronological milestone axis
The system SHALL render milestones in ascending due-date order along a horizontal (or vertical on narrow viewports) time axis. Each milestone SHALL be represented as a node on the axis.

#### Scenario: Milestones appear left-to-right by due date
- **WHEN** milestone A has an earlier due date than milestone B
- **THEN** milestone A's node SHALL appear to the left of milestone B's node on the timeline

#### Scenario: Timeline covers full date range
- **WHEN** the earliest milestone due date is January 2024 and the latest is May 2027
- **THEN** the timeline axis SHALL span at least from January 2024 to May 2027

### Requirement: Past / present / future grouping
The system SHALL visually distinguish milestones into three groups:
- **Past**: due date before today AND completed
- **Overdue**: due date before today AND NOT completed
- **Future**: due date on or after today

#### Scenario: Completed past milestone styled differently from overdue
- **WHEN** a milestone is completed and past its due date
- **THEN** its node SHALL use a "completed" visual style (e.g., filled, muted colour)

#### Scenario: Overdue milestone highlighted
- **WHEN** a milestone is incomplete and its due date has passed
- **THEN** its node SHALL use an "overdue" visual style (e.g., red accent)

### Requirement: Milestone tooltip / detail on hover
The system SHALL display a tooltip or inline detail panel when the user hovers or focuses a milestone node, showing: title, type, due date, and completion status.

#### Scenario: Tooltip appears on hover
- **WHEN** a user hovers over a milestone node
- **THEN** a tooltip SHALL appear showing at minimum the milestone title and due date

#### Scenario: Tooltip accessible via keyboard
- **WHEN** a user tabs to a milestone node and it receives focus
- **THEN** the detail information SHALL be visible or exposed to screen readers via aria attributes

### Requirement: Today marker
The system SHALL render a visible "Today" marker on the timeline axis at the current date position.

#### Scenario: Today marker visible
- **WHEN** the timeline renders
- **THEN** a labelled vertical line or indicator marking today's date SHALL be visible on the axis
