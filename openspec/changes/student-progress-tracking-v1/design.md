## Context

Fresh Next.js 16 app with React 19, TypeScript, and Tailwind v4. No existing data model, routes beyond the root placeholder, or persistence layer. This change establishes the foundational architecture for the PhD thesis manager.

Constraints:
- No new runtime dependencies (only Next.js 16, React 19, Tailwind v4 available)
- v1 is intentionally stateless — data lives in React Context seeded from hard-coded defaults; persistence is deferred
- Must work with the Next.js App Router (no Pages Router patterns)

## Goals / Non-Goals

**Goals:**
- Define the core data model (Student, Milestone) as TypeScript types
- Establish page routes: `/` (dashboard), `/milestones`, `/timeline`
- Build reusable UI components for milestone cards, progress display, and timeline rows
- Wire up React Context so all pages share the same student/milestone state

**Non-Goals:**
- Database or API persistence (deferred)
- Multi-user / advisor view (deferred)
- Authentication (deferred)
- Email/notification reminders (deferred)
- Mobile-native layout (responsive web only)

## Decisions

### 1. State management: React Context + useReducer

**Decision**: Use a single `ThesisContext` with `useReducer` for all student and milestone state.

**Rationale**: No external state library is available. `useReducer` gives a predictable dispatch pattern that will make it easy to swap in a server-backed reducer (SWR/tRPC) later without refactoring consumers.

**Alternatives considered**:
- Plain `useState` per page — rejected; state would desync across routes under App Router's segment caching
- Zustand/Jotai — rejected; would add a new dependency for v1 scope that doesn't warrant it

### 2. Data seeding: Hard-coded initial state

**Decision**: `ThesisContext` is initialised with a sample student profile and a set of representative milestones so the UI is never empty on first load.

**Rationale**: Makes the dashboard immediately useful for demos and manual testing without a backend.

### 3. Route structure: three top-level segments

```
app/
  layout.tsx          ← nav shell (sidebar or top nav)
  page.tsx            ← dashboard (/)
  milestones/
    page.tsx          ← milestone list + add/edit (/milestones)
  timeline/
    page.tsx          ← timeline view (/timeline)
```

**Rationale**: Flat App Router segments keep server/client boundaries simple. Each page imports from a shared `components/` directory.

### 4. Milestone types as a discriminated string union

```ts
type MilestoneType = 'exam' | 'defense' | 'chapter' | 'committee-meeting' | 'other'
```

**Rationale**: Enables type-safe filtering and deterministic color/icon mapping without a lookup table.

### 5. Progress calculation: completed milestones / total milestones

**Decision**: Overall progress = `completedCount / totalCount * 100`. Weighted milestones (e.g., defense counts more) are deferred.

**Rationale**: Simple, transparent, and matches what students intuitively expect for v1.

## Risks / Trade-offs

- **Context on every render** → Context updates re-render all consumers. Mitigation: keep milestone list and student profile in separate contexts if profiling shows jank; acceptable for v1 scale (< 50 milestones).
- **No persistence** → Refreshing the page resets state to defaults. Mitigation: clearly label as "demo data" in the UI; persistence is the next planned change.
- **Hard-coded sample data** → If the sample data is too specific it will confuse real users. Mitigation: use clearly fictional names and placeholder dates.
