## ADDED Requirements

### Requirement: Overall progress metric
The system SHALL calculate and display overall thesis progress as `completedMilestones / totalMilestones * 100`, rounded to the nearest integer.

#### Scenario: Progress percentage reflects completion ratio
- **WHEN** 3 of 10 milestones are completed
- **THEN** the dashboard SHALL display "30%" as the overall progress

#### Scenario: Zero milestones edge case
- **WHEN** there are no milestones
- **THEN** the dashboard SHALL display "0%" and SHALL NOT divide by zero

### Requirement: Progress ring component
The system SHALL render a circular progress indicator (SVG ring) on the dashboard showing the overall progress percentage visually.

#### Scenario: Ring fill matches percentage
- **WHEN** overall progress is 60%
- **THEN** the SVG ring's stroke-dashoffset SHALL reflect a 60% fill

### Requirement: Upcoming deadlines panel
The system SHALL display a panel on the dashboard listing all incomplete milestones with due dates within the next 30 days, sorted by ascending due date.

#### Scenario: Only upcoming incomplete milestones shown
- **WHEN** a milestone is completed but its due date is within 30 days
- **THEN** it SHALL NOT appear in the upcoming deadlines panel

#### Scenario: Panel empty state
- **WHEN** no incomplete milestones are due within 30 days
- **THEN** the panel SHALL display a message such as "No upcoming deadlines"

### Requirement: Program health indicator
The system SHALL display a colour-coded health badge on the dashboard:
- Green ("On Track") when no incomplete milestones are overdue
- Yellow ("At Risk") when 1–2 incomplete milestones are past their due date
- Red ("Off Track") when 3 or more incomplete milestones are past their due date

#### Scenario: Green badge when nothing is overdue
- **WHEN** all incomplete milestones have future due dates
- **THEN** the health badge SHALL be green and labelled "On Track"

#### Scenario: Red badge threshold
- **WHEN** 3 or more incomplete milestones have due dates in the past
- **THEN** the health badge SHALL be red and labelled "Off Track"

### Requirement: Dashboard stats summary
The system SHALL display summary stat cards showing: total milestones, completed milestones, overdue milestones, and months remaining until expected graduation.

#### Scenario: Stats reflect current context state
- **WHEN** a milestone is toggled to complete on the milestones page
- **THEN** navigating back to the dashboard SHALL show updated stats without a page reload
