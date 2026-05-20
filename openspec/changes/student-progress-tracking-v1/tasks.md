## 1. Types & Data Model

- [x] 1.1 Create `src/types/index.ts` and define the `Student` TypeScript type with all required fields (`id`, `name`, `email`, `advisor`, `department`, `program`, `startDate`, `expectedGraduationDate`, `stage`)
- [x] 1.2 Define the `MilestoneType` union (`'exam' | 'defense' | 'chapter' | 'committee-meeting' | 'other'`) in `src/types/index.ts`
- [x] 1.3 Define the `Milestone` TypeScript type with all required fields in `src/types/index.ts`
- [x] 1.4 Define the `StudentStage` union and a `STAGE_LABELS` map for human-readable stage names

## 2. Context & State

- [x] 2.1 Create `src/context/ThesisContext.tsx` with a `ThesisProvider` wrapping `ThesisContext` using `useReducer`
- [x] 2.2 Define reducer actions: `ADD_MILESTONE`, `DELETE_MILESTONE`, `TOGGLE_MILESTONE`
- [x] 2.3 Add seed data — one sample `Student` and at least five `Milestone` records covering all milestone types with a mix of completed/upcoming/overdue statuses
- [x] 2.4 Export a `useThesis()` hook that reads from `ThesisContext` and throws if used outside the provider
- [x] 2.5 Wrap the root `app/layout.tsx` with `ThesisProvider`

## 3. Navigation Shell

- [x] 3.1 Update `src/app/layout.tsx` to render a persistent nav with links to `/` (Dashboard), `/milestones` (Milestones), and `/timeline` (Timeline)
- [x] 3.2 Add active-link styling so the current route's nav item is highlighted

## 4. Shared Components

- [x] 4.1 Create `src/components/MilestoneCard.tsx` — displays title, type badge, due date, and a complete/incomplete toggle checkbox
- [x] 4.2 Create `src/components/ProgressRing.tsx` — SVG circular progress indicator accepting a `percentage` prop (0–100)
- [x] 4.3 Create `src/components/StatCard.tsx` — labelled number card for the dashboard stats summary
- [x] 4.4 Create `src/components/HealthBadge.tsx` — colour-coded badge (green/yellow/red) accepting `overdueCount` and deriving its label and colour

## 5. Dashboard Page

- [x] 5.1 Replace the placeholder `src/app/page.tsx` with the dashboard layout
- [x] 5.2 Render the student profile section (name, advisor, department, program, start date, expected graduation, stage label)
- [x] 5.3 Render the `ProgressRing` with overall completion percentage
- [x] 5.4 Render four `StatCard` components: total milestones, completed, overdue, months to graduation
- [x] 5.5 Render the `HealthBadge` based on overdue milestone count
- [x] 5.6 Render the upcoming deadlines panel listing incomplete milestones due within 30 days, sorted by due date, with an empty-state message when none exist

## 6. Milestones Page

- [x] 6.1 Create `src/app/milestones/page.tsx` with client component rendering
- [x] 6.2 Render incomplete milestones first, then completed milestones, each as a `MilestoneCard`
- [x] 6.3 Implement add-milestone form/modal with fields: title (required), description, type (select), due date (required)
- [x] 6.4 Add form validation — show inline error if title or due date is missing on submit
- [x] 6.5 Dispatch `ADD_MILESTONE` action on valid form submission and close the form
- [x] 6.6 Dispatch `TOGGLE_MILESTONE` when the checkbox on a `MilestoneCard` is toggled, setting `completedDate` to today or `null`
- [x] 6.7 Add a delete button to `MilestoneCard` that dispatches `DELETE_MILESTONE` after confirmation

## 7. Timeline Page

- [x] 7.1 Create `src/app/timeline/page.tsx` with client component rendering
- [x] 7.2 Sort milestones by ascending `dueDate` and render each as a node on a horizontal timeline axis
- [x] 7.3 Render a "Today" marker on the axis at the current date position
- [x] 7.4 Apply visual grouping: completed-past (muted/filled), overdue (red accent), future (default)
- [x] 7.5 Add a tooltip or inline detail panel on hover/focus showing title, type, due date, and completion status
- [x] 7.6 Add `aria` attributes to milestone nodes so detail information is accessible to screen readers
