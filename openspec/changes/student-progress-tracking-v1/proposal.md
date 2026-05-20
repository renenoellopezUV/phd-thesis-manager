## Why

PhD students and their advisors lack a structured way to track thesis progress — milestones slip, deadlines go unnoticed, and there's no single place to see where a student stands in their doctoral journey. This is the foundational v1 of the thesis management system, establishing the core tracking capabilities.

## What Changes

- Introduce a student profile that captures program, advisor, department, and start date
- Add a milestone tracking system covering the standard PhD lifecycle (qualifying exam, proposal defense, dissertation chapters, final defense)
- Build a progress dashboard showing milestone completion status, upcoming deadlines, and overall program progress as a percentage
- Add a timeline view rendering milestones on a chronological axis

## Capabilities

### New Capabilities
- `student-profile`: Student's doctoral program details — name, advisor, department, start date, expected graduation, and program stage
- `thesis-milestones`: CRUD for PhD milestones with title, description, due date, completion status, and milestone type (exam, defense, chapter, committee meeting, other)
- `progress-dashboard`: Aggregated view of milestone completion rate, upcoming deadlines (next 30/60/90 days), and program health indicator
- `timeline-view`: Chronological timeline rendering milestones on a horizontal axis with past/present/future grouping

### Modified Capabilities
<!-- None — this is the initial version of the system -->

## Impact

- Creates the foundational data model for the entire application (student + milestones)
- Establishes the main navigation structure (dashboard, timeline, milestones list)
- No external API dependencies in v1 — all data stored in-memory or via local state (persistence deferred to a later change)
- New pages: `/` (dashboard), `/milestones`, `/timeline`
- New components: MilestoneCard, ProgressRing, TimelineRow, DashboardStats
