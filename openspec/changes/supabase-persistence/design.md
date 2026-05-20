## Context

Authentication (Supabase Auth, cookie sessions, middleware route protection) is complete. All thesis data currently lives in `ThesisContext` — an ephemeral React Context that seeds fake data on every page load and discards any changes on reload. Users, advisors, and admins are authenticated but see the same data and the same views.

This change introduces the Postgres layer, enforces email verification, and splits the UI into role-specific views. It is the largest architectural change in the project: `ThesisContext` is removed and the app becomes a real data-backed application.

Constraints:
- Next.js 16 App Router with React Server Components — prefer server reads over client-side fetching
- No new client libraries (no SWR, React Query, Apollo) — use Server Actions and server component data fetching
- Supabase Postgres with Row Level Security — all data access enforced at the DB layer, not just the application layer

## Goals / Non-Goals

**Goals:**
- Postgres schema (`profiles`, `milestones`) with RLS policies so each user can only read/write their own data
- Secure role storage via a Postgres trigger promoting `user_metadata.role` to `app_metadata.role` at signup
- Server Actions for all data mutations (create, update, delete) with `revalidatePath` for cache invalidation
- Email verification enforcement: unverified users see `/verify-email` instead of the app
- Advisor view listing their students; admin panel for user management via Supabase Admin API
- Remove `ThesisContext` entirely — breaking change, accepted

**Non-Goals:**
- Real-time updates via Supabase Realtime (deferred)
- File/document uploads for thesis chapters (deferred)
- Advisor assignment flow (advisors self-assign students) — for v1, advisor sees students whose `profiles.advisor_email` matches the advisor's email
- Pagination on admin user list (deferred; acceptable up to ~100 users)
- Audit logging (deferred)

## Decisions

### 1. Data access: Server Components for reads, Server Actions for writes

**Decision**: Page components are `async` Server Components that call the Supabase server client directly. Mutations (add milestone, update profile, etc.) are Server Actions in `src/app/actions/`.

**Rationale**: Server Components eliminate client-side fetch waterfalls and keep data-access logic out of the browser. Server Actions give a typed, co-located RPC pattern with automatic CSRF protection. Together they match the App Router's intended design.

**Alternatives considered**:
- SWR/React Query — requires `'use client'` on data-fetching components and adds bundle weight; rejected for this scope
- Route Handlers (API routes) — verbose; Server Actions are simpler for form-based mutations

### 2. Schema: `profiles` and `milestones` tables

```sql
-- profiles: one row per authenticated user
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  advisor_email text,
  department  text,
  program     text,
  start_date  date,
  expected_graduation date,
  stage       text default 'coursework',
  created_at  timestamptz default now()
);

-- milestones: many rows per student profile
create table milestones (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  title          text not null,
  description    text default '',
  type           text not null,
  due_date       date not null,
  completed      boolean default false,
  completed_date date,
  created_at     timestamptz default now()
);
```

**RLS policies**:
- `profiles`: users can SELECT/UPDATE their own row (`id = auth.uid()`); advisors can SELECT rows where `advisor_email = auth.email()`; admins can SELECT all (via `app_metadata.role = 'admin'` check using `auth.jwt()->>'role'`).
- `milestones`: users can SELECT/INSERT/UPDATE/DELETE their own (`profile_id = auth.uid()`); advisors can SELECT milestones of their students.

### 3. Role hardening: Postgres trigger

**Decision**: A `handle_new_user` trigger on `auth.users` `AFTER INSERT` copies `new.raw_user_meta_data->>'role'` to `new.raw_app_meta_data` and inserts a skeleton `profiles` row.

**Rationale**: `user_metadata` is client-writable. `app_metadata` requires service role. The trigger runs server-side so the role is immediately trusted. Also auto-creates the profile row, removing the need for a separate "create profile" step after signup.

**Alternatives considered**:
- Server Action called after signup — has a race condition window between signup and profile creation; rejected

### 4. Email verification: check `email_confirmed_at`

**Decision**: Middleware checks `user.email_confirmed_at`. If null, non-auth routes redirect to `/verify-email`. A `/auth/confirm` route handler processes the `?token_hash&type=email` link from the verification email using `supabase.auth.verifyOtp()`.

**Rationale**: Supabase sends the confirmation URL to `<SITE_URL>/auth/confirm`. We handle it as a Next.js Route Handler, verify the OTP, and redirect to `/`.

**Alternatives considered**:
- Disable email confirmation in Supabase dashboard — trades security for simplicity; rejected for a real application

### 5. Advisor–student matching via `advisor_email`

**Decision**: A student's profile stores `advisor_email`. The advisor view queries `profiles where advisor_email = auth.email()`. No explicit relationship table.

**Rationale**: Simple for v1. Avoids a `advisor_assignments` table and a UI for advisors to claim students.

**Risk**: If an advisor changes their email, the link breaks. Mitigation: document this limitation; move to a proper FK relationship in a future change.

### 6. Admin API access: service role key in Server Actions only

**Decision**: `SUPABASE_SERVICE_ROLE_KEY` is a server-only environment variable (no `NEXT_PUBLIC_` prefix). It is used exclusively in Server Actions in `src/app/actions/admin.ts`. The client never sees it.

**Rationale**: Service role bypasses RLS — it must never reach the browser. Server Actions execute on the server, so the key stays server-side.

## Risks / Trade-offs

- **Breaking removal of ThesisContext** → All components that import `useThesis` will break until updated. Mitigation: update all consumer components in the same PR; TypeScript errors will surface every affected file.
- **Migration: existing users have no `profiles` row** → If the trigger only runs on new signups, existing auth users have no profile. Mitigation: include a one-time backfill SQL script in the migration notes.
- **Advisor RLS policy uses `auth.email()`** → This works but is less efficient than a FK. Mitigation: add a DB index on `profiles.advisor_email`.
- **No optimistic UI for mutations** → Page re-renders after each Server Action completes. Mitigation: use `useTransition` + pending states in client components wrapping forms; acceptable for v1 frequency of mutations.

## Open Questions

- Should profile creation at signup happen in the trigger or in a post-signup Server Action? (Design favours trigger for atomicity.)
- Should the admin panel support deleting users (calling `supabase.auth.admin.deleteUser()`)? (Excluded from v1 scope — too destructive without a confirmation flow.)
