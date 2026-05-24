# Admin Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When no admin account exists, redirect every app visit to a `/setup` page that creates the first admin account with email + password.

**Architecture:** A middleware setup-guard checks `ADMIN_BOOTSTRAPPED` env var first (zero-cost path); if absent, calls `GET /api/check-admin` (service role, no auth) to detect zero admins, and redirects all routes to `/setup` until one is created. `POST /api/setup-admin` re-verifies no admin exists before creating one. After creation the user signs in automatically and sees env-var instructions before navigating to `/admin/users`.

**Tech Stack:** Next.js 16 App Router · TypeScript · Supabase Admin API (`auth.admin.listUsers`, `auth.admin.createUser`) · Jest + ts-jest (route handler tests only)

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/app/api/check-admin/route.ts` | GET — returns `{ exists: boolean }`, fails open |
| Create | `src/app/api/setup-admin/route.ts` | POST — validates, re-checks, creates first admin |
| Create | `src/app/setup/page.tsx` | Client form: email + password + confirm; shows success state with env-var instructions |
| Modify | `src/middleware.ts` | Add setup guard before existing auth logic |
| Create | `src/__tests__/api/check-admin.test.ts` | Unit tests for check-admin route |
| Create | `src/__tests__/api/setup-admin.test.ts` | Unit tests for setup-admin route |
| Create | `jest.config.ts` | Jest configuration with ts-jest and path alias |
| Modify | `package.json` | Add jest deps + `test` script |

---

## Task 1: Configure Jest

No test framework exists yet. Install Jest with ts-jest so API route handlers can be tested with `Request`/`Response` globals (available in Node 18+, which this project requires).

**Files:**
- Create: `jest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Jest and ts-jest**

```bash
npm install --save-dev jest @types/jest ts-jest
```

Expected: packages added to `devDependencies` in `package.json`.

- [ ] **Step 2: Create `jest.config.ts`**

```typescript
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // ts-jest does not support moduleResolution: bundler — override for tests only
        moduleResolution: 'node',
        module: 'commonjs',
      },
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
}

export default config
```

- [ ] **Step 3: Add test script to `package.json`**

Open `package.json` and add `"test": "jest"` to the `"scripts"` section:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "jest"
},
```

- [ ] **Step 4: Create test directory and verify setup**

```bash
mkdir -p src/__tests__/api
```

Create a smoke-test file to verify Jest works:

```typescript
// src/__tests__/api/smoke.test.ts
describe('jest is configured', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run it:

```bash
npm test -- --testPathPattern=smoke
```

Expected output: `Tests: 1 passed, 1 total`

- [ ] **Step 5: Delete the smoke test**

```bash
rm src/__tests__/api/smoke.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add jest.config.ts package.json package-lock.json src/__tests__
git commit -m "chore: configure jest + ts-jest for route handler tests"
```

---

## Task 2: GET /api/check-admin — TDD

This route returns `{ exists: boolean }`. It uses the service role client (no user auth needed). On any Supabase error it returns `{ exists: true }` — the "fail open" policy that prevents locking users out during an outage.

**Files:**
- Create: `src/__tests__/api/check-admin.test.ts`
- Create: `src/app/api/check-admin/route.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/api/check-admin.test.ts
import { GET } from '@/app/api/check-admin/route'

// Mock the admin Supabase client so tests never call real Supabase
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

// Import the mock AFTER jest.mock so we can control its return value per test
import { createAdminClient } from '@/lib/supabase/admin'
const mockCreateAdminClient = createAdminClient as jest.Mock

describe('GET /api/check-admin', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns { exists: false } when no users exist', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
        },
      },
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(res.status).toBe(200)
    expect(body.exists).toBe(false)
  })

  it('returns { exists: false } when users exist but none are admin', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: {
              users: [
                { id: 'u1', app_metadata: { role: 'student' } },
                { id: 'u2', app_metadata: {} },
                { id: 'u3', app_metadata: { role: 'advisor' } },
              ],
            },
            error: null,
          }),
        },
      },
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(body.exists).toBe(false)
  })

  it('returns { exists: true } when at least one admin user exists', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: {
              users: [
                { id: 'u1', app_metadata: { role: 'student' } },
                { id: 'u2', app_metadata: { role: 'admin' } },
              ],
            },
            error: null,
          }),
        },
      },
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(body.exists).toBe(true)
  })

  it('returns { exists: true } when Supabase returns an error (fail open)', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Supabase unavailable'),
          }),
        },
      },
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(res.status).toBe(200)
    expect(body.exists).toBe(true)
  })

  it('returns { exists: true } when createAdminClient throws (fail open)', async () => {
    mockCreateAdminClient.mockImplementation(() => {
      throw new Error('Missing env vars')
    })

    const res = await GET()
    const body = await res.json() as { exists: boolean }

    expect(body.exists).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=check-admin
```

Expected: FAIL — `Cannot find module '@/app/api/check-admin/route'`

- [ ] **Step 3: Implement the route**

```typescript
// src/app/api/check-admin/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
    if (error || !data) {
      // Fail open — treat as "admin exists" to avoid locking users out
      return NextResponse.json({ exists: true })
    }
    const hasAdmin = data.users.some(
      (u) => (u.app_metadata as { role?: string } | undefined)?.role === 'admin'
    )
    return NextResponse.json({ exists: hasAdmin })
  } catch {
    return NextResponse.json({ exists: true })
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=check-admin
```

Expected: `Tests: 5 passed, 5 total`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/check-admin/route.ts src/__tests__/api/check-admin.test.ts
git commit -m "feat: add GET /api/check-admin route with tests"
```

---

## Task 3: POST /api/setup-admin — TDD

Creates the first admin account. Validates input, re-checks that no admin exists (race guard), then calls `admin.auth.admin.createUser` with `email_confirm: true` so the new account can sign in immediately without email verification.

**Files:**
- Create: `src/__tests__/api/setup-admin.test.ts`
- Create: `src/app/api/setup-admin/route.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/api/setup-admin.test.ts
import { POST } from '@/app/api/setup-admin/route'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
const mockCreateAdminClient = createAdminClient as jest.Mock

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/setup-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/setup-admin', () => {
  afterEach(() => jest.clearAllMocks())

  // ── Input validation ────────────────────────────────────────────────────
  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'password123' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/email/i)
  })

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'admin@test.com' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/password/i)
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'short' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/8 characters/i)
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/setup-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ── Race condition guard ────────────────────────────────────────────────
  it('returns 409 when an admin already exists', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: {
              users: [{ id: 'existing', app_metadata: { role: 'admin' } }],
            },
            error: null,
          }),
          createUser: jest.fn(), // should never be called
        },
      },
    })

    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(res.status).toBe(409)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Admin already exists')
  })

  it('does not call createUser when admin already exists', async () => {
    const mockCreateUser = jest.fn()
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [{ id: 'u1', app_metadata: { role: 'admin' } }] },
            error: null,
          }),
          createUser: mockCreateUser,
        },
      },
    })

    await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  // ── Happy path ──────────────────────────────────────────────────────────
  it('creates admin user and returns { ok: true } when no admin exists', async () => {
    const mockCreateUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
          createUser: mockCreateUser,
        },
      },
    })

    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('calls createUser with correct payload', async () => {
    const mockCreateUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
          createUser: mockCreateUser,
        },
      },
    })

    await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'password123',
      email_confirm: true,
      app_metadata: { role: 'admin' },
    })
  })

  // ── Supabase errors ─────────────────────────────────────────────────────
  it('returns 500 when listUsers fails', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('DB error'),
          }),
          createUser: jest.fn(),
        },
      },
    })

    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(res.status).toBe(500)
  })

  it('returns 500 when createUser fails', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
          createUser: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Email already registered'),
          }),
        },
      },
    })

    const res = await POST(makeRequest({ email: 'admin@test.com', password: 'password123' }))
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Email already registered')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=setup-admin
```

Expected: FAIL — `Cannot find module '@/app/api/setup-admin/route'`

- [ ] **Step 3: Implement the route**

```typescript
// src/app/api/setup-admin/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  let email: string
  let password: string

  try {
    const body = await request.json() as { email?: unknown; password?: unknown }
    email = typeof body.email === 'string' ? body.email.trim() : ''
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Re-verify no admin exists — prevents race conditions and direct API abuse
  const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (listError || !listData) {
    return NextResponse.json({ error: 'Failed to verify system state' }, { status: 500 })
  }

  const hasAdmin = listData.users.some(
    (u) => (u.app_metadata as { role?: string } | undefined)?.role === 'admin'
  )
  if (hasAdmin) {
    return NextResponse.json({ error: 'Admin already exists' }, { status: 409 })
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,        // allow immediate sign-in without email verification
    app_metadata: { role: 'admin' },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=setup-admin
```

Expected: `Tests: 10 passed, 10 total`

- [ ] **Step 5: Run all tests to confirm nothing is broken**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/setup-admin/route.ts src/__tests__/api/setup-admin.test.ts
git commit -m "feat: add POST /api/setup-admin route with tests"
```

---

## Task 4: Update middleware with setup guard

Add the setup guard to the top of the middleware. It runs before the Supabase client is created, so there's no unnecessary auth overhead when redirecting to `/setup`.

**Files:**
- Modify: `src/middleware.ts`

The setup guard logic:
- Skip entirely for `/api/check-admin` and `/api/setup-admin` (prevents recursion — the `fetch` to `/api/check-admin` would re-enter middleware)
- Skip entirely when `ADMIN_BOOTSTRAPPED=true` env var is set
- If no admin and not on `/setup` → redirect to `/setup`
- If no admin and on `/setup` → return early (allow, skip all auth checks)
- If admin exists and on `/setup` → redirect to `/`
- On any fetch error → fail open (proceed with normal auth flow)

- [ ] **Step 1: Replace `src/middleware.ts` with the updated version**

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

const AUTH_ROUTES = new Set(['/login', '/verify-email', '/auth/confirm'])
// These routes implement the setup check/creation — exclude them from the guard
// to prevent the middleware's own fetch('/api/check-admin') from re-entering this block
const SETUP_API_ROUTES = new Set(['/api/check-admin', '/api/setup-admin'])
const ADVISOR_PREFIX = '/advisor'
const ADMIN_PREFIX = '/admin'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Setup guard ───────────────────────────────────────────────────────────
  // When ADMIN_BOOTSTRAPPED=true, skip entirely — zero cost in production.
  if (!process.env.ADMIN_BOOTSTRAPPED && !SETUP_API_ROUTES.has(pathname)) {
    try {
      const checkRes = await fetch(new URL('/api/check-admin', request.url))
      const { exists } = await checkRes.json() as { exists: boolean }

      if (!exists) {
        if (pathname === '/setup') {
          // No admin yet — allow /setup to load, skip all auth checks below
          return NextResponse.next({ request })
        }
        // Any other route — redirect to setup
        return NextResponse.redirect(new URL('/setup', request.url))
      }
    } catch {
      // Fail open — Supabase or network error; proceed with normal auth flow
    }
  }

  // /setup is only valid during bootstrap; redirect away once an admin exists
  // (also handles the case where ADMIN_BOOTSTRAPPED is set and user visits /setup)
  if (pathname === '/setup') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  // ── End setup guard ───────────────────────────────────────────────────────

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = AUTH_ROUTES.has(pathname)

  // Unauthenticated: redirect to login (except auth routes)
  if (!user && !isAuthRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    // Authenticated users visiting login → send to app
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Email verification check (skip /verify-email and /auth/confirm)
    if (!isAuthRoute && !user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }

    // Role-based guards (read from admin-controlled app_metadata)
    const role = (user.app_metadata as { role?: UserRole } | undefined)?.role ?? 'student'

    if (pathname.startsWith(ADVISOR_PREFIX) && role !== 'advisor') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (pathname.startsWith(ADMIN_PREFIX) && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add setup guard to middleware for admin bootstrap"
```

---

## Task 5: Create /setup page

Client component. Shows a form (email, password, confirm). On submit: calls `POST /api/setup-admin`, then auto-signs in the new admin via `supabase.auth.signInWithPassword`. On success, switches to a success state that shows the `ADMIN_BOOTSTRAPPED` env-var instruction and a link to `/admin/users`. No auto-redirect — the user must see the env-var instruction before proceeding.

**Files:**
- Create: `src/app/setup/page.tsx`

No unit tests required — this is a UI component (per AGENTS.md).

- [ ] **Step 1: Create `src/app/setup/page.tsx`**

```typescript
// src/app/setup/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirm?: string
  }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function validate(): boolean {
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'Email is required'
    if (!password) next.password = 'Password is required'
    else if (password.length < 8) next.password = 'Password must be at least 8 characters'
    if (password !== confirm) next.confirm = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    if (!validate()) return

    setLoading(true)

    const res = await fetch('/api/setup-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const body = await res.json() as { error?: string }
      setServerError(body.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    // Auto sign-in so the admin is authenticated before they reach /admin/users
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      // Account created but sign-in failed — user can log in manually
      setServerError(
        'Account created, but automatic sign-in failed. Please log in manually on the login page.'
      )
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 space-y-3">
            <h2 className="font-semibold text-emerald-800 dark:text-emerald-300">
              ✅ Admin account created
            </h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              You&rsquo;re signed in. To skip this setup check on future deployments, add the
              following environment variable in Netlify:
            </p>
            <code className="block text-xs bg-emerald-100 dark:bg-emerald-900/40 rounded-md px-3 py-2 font-mono text-emerald-900 dark:text-emerald-200 select-all">
              ADMIN_BOOTSTRAPPED=true
            </code>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">
              Without this, the app will call Supabase to check for admins on every page load.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="block w-full text-center py-2 px-4 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Go to Admin Panel →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
            First-time setup
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            No admin account found. Create one to get started.
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {errors.confirm && (
                <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create admin account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests to confirm nothing is broken**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/setup/page.tsx
git commit -m "feat: add /setup page for first-admin bootstrap"
```

---

## Task 6: Manual verification

Start the dev server and walk through the bootstrap flow end-to-end.

- [ ] **Step 1: Ensure `ADMIN_BOOTSTRAPPED` is NOT set in `.env.local`**

Check that `.env.local` does not contain `ADMIN_BOOTSTRAPPED`. If it does, remove the line.

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Visit `http://localhost:3000`**

Expected: redirected to `http://localhost:3000/setup`.

- [ ] **Step 4: Fill in the setup form and submit**

Use any valid email and a password ≥ 8 characters.

Expected:
- Success state appears with the `ADMIN_BOOTSTRAPPED=true` instruction
- "Go to Admin Panel →" link is visible

- [ ] **Step 5: Click "Go to Admin Panel →"**

Expected:
- Lands on `/admin/users`
- The new admin account appears in the user table with role "Admin"

- [ ] **Step 6: Verify `/setup` is now inaccessible**

Visit `http://localhost:3000/setup` directly.

Expected: redirected to `/` (the dashboard).

- [ ] **Step 7: Test `ADMIN_BOOTSTRAPPED` env var**

Add to `.env.local`:
```
ADMIN_BOOTSTRAPPED=true
```

Restart the dev server (`Ctrl+C`, then `npm run dev`), visit `http://localhost:3000/setup`.

Expected: redirected to `/` immediately (no Supabase call made for the bootstrap check).

- [ ] **Step 8: Remove the test env var from `.env.local`**

The project uses a real Supabase instance, so leaving the flag set locally is fine for ongoing development — but remove it if you want the setup flow to be active again in dev.

- [ ] **Step 9: Final commit with any minor fixes found during manual testing**

```bash
git add -A
git commit -m "fix: manual verification adjustments (if any)"
git push origin main
```

---

## Summary of env var to set in Netlify

After first deployment and admin creation:

```
ADMIN_BOOTSTRAPPED=true
```

Set this in **Netlify → Site → Environment variables**, then trigger a redeploy. The setup guard will be skipped entirely on all future requests.
