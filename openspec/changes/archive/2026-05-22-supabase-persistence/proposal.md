## Why

All thesis data currently lives in ephemeral React Context — it vanishes on page reload. Now that authentication is in place, this change wires the app to a real Postgres database via Supabase, enforces email verification so only confirmed users access the app, and adds role-based routing so advisors and admins see different views from students.

## What Changes

- Create Supabase Postgres tables (`profiles`, `milestones`) with Row Level Security policies scoped by auth user
- Replace React Context seed data with Server Actions that read/write the database
- Add email verification enforcement: unverified users are redirected to a "check your email" page; `/auth/confirm` callback processes the verification link
- Add role-based page protection: advisors see a student-list view, admins see a user-management panel; students are blocked from advisor/admin routes
- Harden role storage: a Postgres trigger copies `user_metadata.role` into `app_metadata.role` at signup, preventing client-side role tampering
- **BREAKING**: `ThesisContext` is removed; all data mutations go through Server Actions and page props (no more client-side state as the source of truth)

## Capabilities

### New Capabilities
- `thesis-data-persistence`: Supabase Postgres schema for `profiles` and `milestones` tables; Row Level Security policies; Server Actions for CRUD; DB-backed data replacing React Context ephemeral state
- `email-verification`: `/auth/confirm` route that processes Supabase's email confirmation token; "check your email" holding page (`/verify-email`); middleware blocks unverified users from protected routes
- `advisor-view`: Advisor-only route (`/advisor/students`) listing all students whose `advisor_id` matches the logged-in advisor; read-only milestone progress view per student
- `admin-panel`: Admin-only route (`/admin/users`) listing all registered users with their role and email-verification status; ability to change a user's role via a Server Action calling the Supabase Admin API

### Modified Capabilities
- `student-profile`: Profile is now fetched from the `profiles` DB table keyed by `auth.user.id`; profile fields (advisor name, department, start date, expected graduation, stage) are editable via a form that calls a Server Action; seed data is removed
- `thesis-milestones`: Milestones are now persisted to the `milestones` DB table; CRUD (add, toggle, delete) happens via Server Actions; the React Context reducer is replaced by page-level data fetching and revalidation
- `route-protection`: Middleware is extended to check both authentication AND email-verification status; a new role-guard utility blocks students from `/advisor/*` and students/advisors from `/admin/*`

## Impact

- New Supabase migrations: `profiles` table, `milestones` table, RLS policies, role-sync trigger
- New env variable: `SUPABASE_SERVICE_ROLE_KEY` (server-only, for Admin API calls in the admin panel)
- Removes `ThesisContext` (`src/context/ThesisContext.tsx` deleted) — **breaking** for any component importing it
- All milestone and profile mutations become Server Actions (`src/app/actions/`)
- New pages: `/verify-email`, `/auth/confirm`, `/advisor/students`, `/admin/users`
- Modified: `src/middleware.ts` (add verification + role checks), `src/app/page.tsx`, `src/app/milestones/page.tsx` (switch to server-fetched data)
