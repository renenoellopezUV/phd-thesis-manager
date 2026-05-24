# Admin Bootstrap — First-Run Setup Design

**Date:** 2026-05-24  
**Status:** Approved  
**Feature:** First-admin account creation when no admin exists in the system

---

## Problem

The app has a chicken-and-egg bootstrapping problem: only an admin can invite users, but there is no way to create the first admin through the UI. Currently the login page says "Contact your administrator" — which is useless on a fresh deployment.

---

## Goal

When no admin account exists in the system, any visit to the app redirects to a `/setup` page that lets the first user create an admin account. Once an admin exists, the setup route becomes permanently inaccessible and the entire check becomes zero-cost via an environment variable flag.

---

## Flow

```
Any request (unauthenticated)
  │
  ├─ ADMIN_BOOTSTRAPPED=true in env?
  │   └─ Yes → normal auth flow (setup logic skipped forever)
  │
  └─ No → GET /api/check-admin (service role)
        │
        ├─ admin exists → normal auth flow
        │
        └─ no admin →
              ├─ pathname === /setup → allow
              └─ anything else → redirect to /setup

/setup page
  └─ user fills: email + password + confirm password
        └─ POST /api/setup-admin
              ├─ re-check: admin already exists? → 409 (race condition guard)
              ├─ createUser() with app_metadata.role = "admin"
              └─ success →
                    ├─ auto sign-in via signInWithPassword()
                    ├─ redirect to /admin/users
                    └─ show banner: "Set ADMIN_BOOTSTRAPPED=true in Netlify env vars"
```

---

## Components

### New files

| File | Type | Purpose |
|------|------|---------|
| `src/app/api/check-admin/route.ts` | API route (GET) | Returns `{ exists: boolean }`. Uses service role. No auth required. |
| `src/app/api/setup-admin/route.ts` | API route (POST) | Creates first admin. Re-verifies zero admins before acting. |
| `src/app/setup/page.tsx` | Client component | Setup form: email, password, confirm password. |

### Modified files

| File | Change |
|------|--------|
| `src/middleware.ts` | Add setup-guard before existing auth logic. Checks env var, then API, then redirects. |

---

## API Contracts

```
GET /api/check-admin
  Response: 200 { exists: boolean }
  Auth: none (uses service role internally)
  Error: on Supabase failure → 200 { exists: true }  (fail open — avoid locking users out)

POST /api/setup-admin
  Body: { email: string, password: string }
  Response:
    200 { ok: true }                         — admin created
    400 { error: string }                    — validation error
    409 { error: "Admin already exists" }    — race condition guard
    500 { error: string }                    — Supabase error
  Auth: none (bootstrap endpoint — only works when no admin exists)
```

---

## Middleware Change

Add this block at the top of the middleware function, before the existing auth checks. Both `/api/check-admin` and `/setup` must be excluded from the normal auth redirect logic.

```typescript
// Setup guard — runs only when ADMIN_BOOTSTRAPPED env var is not set.
// Skip for /setup, /api/check-admin, and /api/setup-admin to avoid
// infinite recursion (the fetch below would re-enter middleware).
const SETUP_EXCLUDED = new Set(['/setup', '/api/check-admin', '/api/setup-admin'])

if (!process.env.ADMIN_BOOTSTRAPPED && !SETUP_EXCLUDED.has(pathname)) {
  try {
    const res = await fetch(new URL('/api/check-admin', request.url))
    const { exists } = await res.json()
    if (!exists) {
      return NextResponse.redirect(new URL('/setup', request.url))
    }
  } catch {
    // Fail open: if the check itself errors, proceed with normal auth flow
  }
}
```

Add `/setup`, `/api/check-admin`, and `/api/setup-admin` to the `AUTH_ROUTES` set (or equivalent exclusion) so the middleware does not redirect them to `/login` while unauthenticated.

---

## Post-Setup UX

After `POST /api/setup-admin` succeeds:

1. The `/setup` page calls `supabase.auth.signInWithPassword()` client-side with the submitted credentials.
2. On sign-in success, redirect to `/admin/users`.
3. Display a one-time dismissible banner:

> ✅ **Admin account created.** To skip this setup check on future deployments, add `ADMIN_BOOTSTRAPPED=true` to your Netlify environment variables and redeploy.

---

## Security Model

| Threat | Mitigation |
|--------|-----------|
| Calling `POST /api/setup-admin` after admin exists | Route re-checks admin count before creating — returns 409 |
| Visiting `/setup` after admin exists | Middleware allows `/setup` only when no admin found; once admin exists, redirects to `/login` |
| Weak password | Client-side: min 8 chars, passwords must match. Supabase enforces its own policy server-side. |
| `ADMIN_BOOTSTRAPPED` set before any admin created | Normal auth runs — user hits login page and cannot log in. Fix: unset the env var. Document in README. |
| Two simultaneous setup submissions | 409 on second request — only the first wins |
| Middleware calling `/api/check-admin` recursively | `/api/check-admin` and `/api/setup-admin` excluded from setup guard via `SETUP_EXCLUDED` set |
| Supabase outage during check | Fail open: treat as "admin exists," proceed to normal login |

---

## Environment Variable

**`ADMIN_BOOTSTRAPPED=true`**

Set this in Netlify (or `.env.local` for local dev) after the first admin account is created. When set, the middleware skips the admin-exists check entirely — zero runtime overhead.

If accidentally set before an admin exists: unset the variable and redeploy. The setup flow will become active again.

---

## Out of Scope

- Multiple admins created during setup (first only)
- Admin email verification during setup (Supabase handles this; email confirmation is currently disabled in dev)
- OAuth/social login for admin bootstrap
