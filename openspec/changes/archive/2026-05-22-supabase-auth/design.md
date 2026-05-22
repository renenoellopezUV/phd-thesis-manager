## Context

The app is a Next.js 16 / React 19 application with Tailwind v4 and no current authentication. All routes are publicly accessible and state is ephemeral (React Context only). This change introduces Supabase Auth using the `@supabase/ssr` package, which is the current recommended approach for Next.js App Router (replacing the deprecated `@supabase/auth-helpers-nextjs`).

Two Supabase client instances are required: a browser client for client components and a server client for middleware and server components.

## Goals / Non-Goals

**Goals:**
- Email/password auth for three roles: `student`, `advisor`, `admin`
- Cookie-based session management (persists across page loads, works with SSR)
- Middleware-level route protection — all app routes require authentication
- Role stored in Supabase `user_metadata` set at signup
- Sign-out accessible from the nav bar

**Non-Goals:**
- OAuth / social login (deferred)
- Admin role enforcement at the page level (admin-only pages deferred; roles are stored but not gate-checked beyond authentication in v1)
- Server-side data persistence for thesis data (separate change)
- Email verification enforcement (can be enabled in Supabase dashboard; not coded here)
- Password reset flow (deferred)

## Decisions

### 1. Session transport: cookies via `@supabase/ssr`

**Decision**: Use `@supabase/ssr`'s `createBrowserClient` and `createServerClient` to manage sessions via HTTP-only cookies.

**Rationale**: Supabase's official recommendation for Next.js App Router. Cookies enable the session to be read in middleware and server components without extra requests. `localStorage`-based sessions would not work server-side.

**Alternatives considered**:
- `@supabase/auth-helpers-nextjs` — deprecated; migration path points to `@supabase/ssr`
- Manual JWT handling — adds complexity with no benefit here

### 2. Role storage: `user_metadata` at signup

**Decision**: Store `role` in `user.user_metadata.role` at signup by passing it in the `data` option of `supabase.auth.signUp()`.

**Rationale**: Simplest approach requiring no backend changes or service-role key in the frontend. Sufficient for v1 where role enforcement is limited to redirecting unauthenticated users.

**Known limitation**: `user_metadata` is user-controlled — a user could technically change their own role via the Supabase client. A production-hardened version should use a Postgres trigger or Edge Function to copy/validate the role into `app_metadata` (admin-controlled). Flagged in Risks.

**Alternatives considered**:
- Role in a `profiles` DB table — requires a separate schema migration and DB call on every auth check; deferred to a later change
- `app_metadata` set via service-role key — requires a server-side route (Server Action or Route Handler) to avoid leaking the service-role key; over-engineered for v1

### 3. Route protection: Next.js middleware

**Decision**: Use `src/middleware.ts` with `createServerClient` from `@supabase/ssr` to check session on every request. Unauthenticated requests to protected routes are redirected to `/login?redirectTo=<path>`. `/login` and `/signup` are excluded from protection.

**Rationale**: Middleware runs before page rendering, preventing flash-of-unauthenticated-content. Centralised — no per-page redirect logic needed.

**Alternatives considered**:
- Per-page guard in `layout.tsx` — runs after the server component renders; visible flicker; duplicated across pages

### 4. Supabase client factories: two files

**Decision**:
- `src/lib/supabase/client.ts` — exports `createClient()` using `createBrowserClient` (called inside `'use client'` components)
- `src/lib/supabase/server.ts` — exports `createClient()` using `createServerClient` with `cookies()` from `next/headers` (called in middleware and server contexts)

**Rationale**: Mirrors the Supabase SSR documentation pattern. Keeps the two contexts explicit and prevents accidental use of a browser client in server code.

## Risks / Trade-offs

- **`user_metadata` role is user-modifiable** → Mitigation: acceptable for v1; document this as a known gap; add a future task to harden via `app_metadata` and a Postgres trigger.
- **Supabase env vars required at dev time** → Mitigation: document in README; provide `.env.local.example`; the app will show a clear error if vars are missing.
- **Middleware runs on every request** → Mitigation: `@supabase/ssr` caches the session in the cookie; no extra Supabase API call per request unless the token is expired.

## Open Questions

- Should `admin` role users have a distinct home page or dashboard in v1, or are all authenticated users directed to the same `/` dashboard? (Assumed: same dashboard for all roles in v1.)
- Should signup be open (anyone can create an account) or invite-only? (Assumed: open for v1.)
