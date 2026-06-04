# Admin User Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix advisor assignment silently failing for new students, and add inline password reset and one-click email verification to the admin users table.

**Architecture:** All server-side logic lives in `src/app/actions/admin.ts` (Server Actions using the service-role Supabase client). Two new Client Components — `PasswordEditor` and `VerifyButton` — follow the existing `RoleSelector`/`AdvisorAssigner` pattern (one instance per table row, isolated state). `page.tsx` adds a fifth "Password" column and swaps the static verified badge for `VerifyButton`.

**Tech Stack:** Next.js 15 App Router, Supabase (service role), next-intl, TypeScript

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/app/actions/admin.ts` — fix `assignAdvisor`, add `resetUserPassword` + `verifyUserEmail` |
| Create | `src/__tests__/actions/admin.test.ts` — unit tests for all three actions |
| Modify | `messages/en.json` — add 8 keys to `adminUsers` namespace |
| Modify | `messages/es.json` — same 8 keys in Spanish |
| Create | `src/app/admin/users/VerifyButton.tsx` — clickable unverified badge |
| Create | `src/app/admin/users/PasswordEditor.tsx` — inline password input |
| Modify | `src/app/admin/users/page.tsx` — new column + swap components |

---

## Task 1: Fix `assignAdvisor` and add new server actions (TDD)

**Files:**
- Create: `src/__tests__/actions/admin.test.ts`
- Modify: `src/app/actions/admin.ts`

### Background

`src/app/actions/admin.ts` currently has `assignAdvisor` using `.update()` which silently fails when the student has no `profiles` row yet. The fix changes it to `.upsert()` after fetching the student's email from auth. We also add `resetUserPassword` and `verifyUserEmail`.

The file uses `'use server'` at the top — Jest treats this as a harmless string literal. We mock `next/cache` and `@/lib/supabase/admin`.

---

- [ ] **Step 1: Create the test file**

```ts
// src/__tests__/actions/admin.test.ts
import { revalidatePath } from 'next/cache'

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
const mockCreateAdminClient = createAdminClient as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

import { assignAdvisor, resetUserPassword, verifyUserEmail } from '@/app/actions/admin'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAdminClientWithAdvisorSetup({
  getUserByIdResult,
  upsertResult = { error: null },
}: {
  getUserByIdResult: { data: { user: { id: string; email: string } | null }; error: Error | null }
  upsertResult?: { error: Error | null }
}) {
  const mockUpsert = jest.fn().mockResolvedValue(upsertResult)
  const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert })
  mockCreateAdminClient.mockReturnValue({
    auth: { admin: { getUserById: jest.fn().mockResolvedValue(getUserByIdResult) } },
    from: mockFrom,
  })
  return { mockUpsert, mockFrom }
}

function makeAdminClientWithUpdateById(result: { error: Error | null }) {
  const mockUpdateUserById = jest.fn().mockResolvedValue(result)
  mockCreateAdminClient.mockReturnValue({
    auth: { admin: { updateUserById: mockUpdateUserById } },
  })
  return { mockUpdateUserById }
}

// ─── assignAdvisor ────────────────────────────────────────────────────────────

describe('assignAdvisor', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns error when getUserById fails', async () => {
    makeAdminClientWithAdvisorSetup({
      getUserByIdResult: { data: { user: null }, error: new Error('DB error') },
    })
    const result = await assignAdvisor('student-1', 'advisor-1')
    expect(result.error).toBe('DB error')
  })

  it('returns "User not found" when user is null', async () => {
    makeAdminClientWithAdvisorSetup({
      getUserByIdResult: { data: { user: null }, error: null },
    })
    const result = await assignAdvisor('student-1', 'advisor-1')
    expect(result.error).toBe('User not found')
  })

  it('calls upsert with correct payload including email', async () => {
    const { mockUpsert, mockFrom } = makeAdminClientWithAdvisorSetup({
      getUserByIdResult: {
        data: { user: { id: 'student-1', email: 'student@test.com' } },
        error: null,
      },
    })

    await assignAdvisor('student-1', 'advisor-1')

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'student-1', email: 'student@test.com', advisor_id: 'advisor-1' },
      { onConflict: 'id' }
    )
  })

  it('sets advisor_id to null when advisorId is empty string', async () => {
    const { mockUpsert } = makeAdminClientWithAdvisorSetup({
      getUserByIdResult: {
        data: { user: { id: 'student-1', email: 'student@test.com' } },
        error: null,
      },
    })

    await assignAdvisor('student-1', '')

    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'student-1', email: 'student@test.com', advisor_id: null },
      { onConflict: 'id' }
    )
  })

  it('returns error when upsert fails', async () => {
    makeAdminClientWithAdvisorSetup({
      getUserByIdResult: {
        data: { user: { id: 'student-1', email: 'student@test.com' } },
        error: null,
      },
      upsertResult: { error: new Error('Upsert failed') },
    })

    const result = await assignAdvisor('student-1', 'advisor-1')
    expect(result.error).toBe('Upsert failed')
  })

  it('returns {} and revalidates on success', async () => {
    makeAdminClientWithAdvisorSetup({
      getUserByIdResult: {
        data: { user: { id: 'student-1', email: 'student@test.com' } },
        error: null,
      },
    })

    const result = await assignAdvisor('student-1', 'advisor-1')
    expect(result).toEqual({})
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
  })
})

// ─── resetUserPassword ────────────────────────────────────────────────────────

describe('resetUserPassword', () => {
  afterEach(() => jest.clearAllMocks())

  it('calls updateUserById with the new password', async () => {
    const { mockUpdateUserById } = makeAdminClientWithUpdateById({ error: null })

    await resetUserPassword('user-1', 'newpassword123')

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', { password: 'newpassword123' })
  })

  it('returns error when updateUserById fails', async () => {
    makeAdminClientWithUpdateById({ error: new Error('Weak password') })

    const result = await resetUserPassword('user-1', 'abc')
    expect(result.error).toBe('Weak password')
  })

  it('returns {} on success', async () => {
    makeAdminClientWithUpdateById({ error: null })

    const result = await resetUserPassword('user-1', 'newpassword123')
    expect(result).toEqual({})
  })

  it('does NOT call revalidatePath (no UI refresh needed)', async () => {
    makeAdminClientWithUpdateById({ error: null })

    await resetUserPassword('user-1', 'newpassword123')
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})

// ─── verifyUserEmail ──────────────────────────────────────────────────────────

describe('verifyUserEmail', () => {
  afterEach(() => jest.clearAllMocks())

  it('calls updateUserById with email_confirm: true', async () => {
    const { mockUpdateUserById } = makeAdminClientWithUpdateById({ error: null })

    await verifyUserEmail('user-1')

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', { email_confirm: true })
  })

  it('returns error when updateUserById fails', async () => {
    makeAdminClientWithUpdateById({ error: new Error('Auth error') })

    const result = await verifyUserEmail('user-1')
    expect(result.error).toBe('Auth error')
  })

  it('returns {} on success', async () => {
    makeAdminClientWithUpdateById({ error: null })

    const result = await verifyUserEmail('user-1')
    expect(result).toEqual({})
  })

  it('revalidates /admin/users on success', async () => {
    makeAdminClientWithUpdateById({ error: null })

    await verifyUserEmail('user-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
  })
})
```

- [ ] **Step 2: Run tests — confirm they all fail**

```bash
npm test -- --testPathPattern=actions/admin
```

Expected: all tests fail with "Cannot find module" or similar since the functions don't exist yet.

- [ ] **Step 3: Replace `src/app/actions/admin.ts` with the complete updated file**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types'

export async function changeUserRole(userId: string, role: UserRole): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  })
  if (error) return { error: error.message }
  return {}
}

export async function inviteUser(
  email: string,
  role: UserRole,
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const redirectTo = `${siteUrl}/auth/confirm`
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}

export async function assignAdvisor(
  studentId: string,
  advisorId: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient()

  const { data: { user }, error: userError } = await admin.auth.admin.getUserById(studentId)
  if (userError) return { error: userError.message }
  if (!user) return { error: 'User not found' }

  const { error } = await admin
    .from('profiles')
    .upsert(
      { id: studentId, email: user.email ?? '', advisor_id: advisorId || null },
      { onConflict: 'id' }
    )

  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: error.message }
  return {}
}

export async function verifyUserEmail(
  userId: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
npm test -- --testPathPattern=actions/admin
```

Expected: all 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/actions/admin.test.ts src/app/actions/admin.ts
git commit -m "feat: fix assignAdvisor upsert + add resetUserPassword and verifyUserEmail actions"
```

---

## Task 2: Add translation keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

The `adminUsers` namespace currently has these keys: `title`, `loadError`, `colEmail`, `colRole`, `colAdvisor`, `colVerified`, `verified`, `unverified`.

- [ ] **Step 1: Add 8 new keys to the `adminUsers` object in `messages/en.json`**

Find the `"adminUsers"` object and add after `"unverified"`:

```json
"colPassword": "Password",
"passwordChange": "Change password",
"newPassword": "New password",
"passwordSave": "Save",
"passwordSaving": "Saving…",
"passwordCancel": "Cancel",
"passwordTooShort": "At least 8 characters",
"verifying": "Verifying…"
```

The complete `adminUsers` object in `en.json` should look like:

```json
"adminUsers": {
  "title": "Users ({count})",
  "loadError": "Failed to load users: {message}",
  "colEmail": "Email",
  "colRole": "Role",
  "colAdvisor": "Advisor",
  "colVerified": "Verified",
  "verified": "Verified",
  "unverified": "Unverified",
  "colPassword": "Password",
  "passwordChange": "Change password",
  "newPassword": "New password",
  "passwordSave": "Save",
  "passwordSaving": "Saving…",
  "passwordCancel": "Cancel",
  "passwordTooShort": "At least 8 characters",
  "verifying": "Verifying…"
},
```

- [ ] **Step 2: Add the same 8 keys to the `adminUsers` object in `messages/es.json`**

```json
"adminUsers": {
  "title": "Usuarios ({count})",
  "loadError": "Error al cargar usuarios: {message}",
  "colEmail": "Correo",
  "colRole": "Rol",
  "colAdvisor": "Asesor",
  "colVerified": "Verificado",
  "verified": "Verificado",
  "unverified": "Sin verificar",
  "colPassword": "Contraseña",
  "passwordChange": "Cambiar contraseña",
  "newPassword": "Nueva contraseña",
  "passwordSave": "Guardar",
  "passwordSaving": "Guardando…",
  "passwordCancel": "Cancelar",
  "passwordTooShort": "Mínimo 8 caracteres",
  "verifying": "Verificando…"
},
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "feat: add password and verify translation keys to adminUsers namespace"
```

---

## Task 3: Create `VerifyButton.tsx`

**Files:**
- Create: `src/app/admin/users/VerifyButton.tsx`

This component replaces the static `<span>` in the Verified column. When the user is already verified, it renders the same green badge as before. When unverified, the amber badge becomes a clickable button.

- [ ] **Step 1: Create `src/app/admin/users/VerifyButton.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { verifyUserEmail } from '@/app/actions/admin'

export default function VerifyButton({
  userId,
  verified,
}: {
  userId: string
  verified: boolean
}) {
  const t = useTranslations('adminUsers')
  const [pending, startTransition] = useTransition()

  if (verified) {
    return (
      <span className="text-green-600 dark:text-green-400 text-xs font-medium">
        {t('verified')}
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await verifyUserEmail(userId)
        })
      }
      className="text-amber-500 dark:text-amber-400 text-xs font-medium hover:text-amber-600 dark:hover:text-amber-300 disabled:opacity-50 transition-colors"
    >
      {pending ? t('verifying') : t('unverified')}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/users/VerifyButton.tsx
git commit -m "feat: add VerifyButton component for admin email verification"
```

---

## Task 4: Create `PasswordEditor.tsx`

**Files:**
- Create: `src/app/admin/users/PasswordEditor.tsx`

Default state: a small lock icon button. Expanded state: password input + Save + Cancel. Validates min 8 chars before calling the action.

- [ ] **Step 1: Create `src/app/admin/users/PasswordEditor.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { resetUserPassword } from '@/app/actions/admin'

export default function PasswordEditor({ userId }: { userId: string }) {
  const t = useTranslations('adminUsers')
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    setLocalError(null)
  }

  function handleCancel() {
    setOpen(false)
    setPassword('')
    setLocalError(null)
  }

  function handleSave() {
    if (password.length < 8) {
      setLocalError(t('passwordTooShort'))
      return
    }
    setLocalError(null)
    startTransition(async () => {
      const result = await resetUserPassword(userId, password)
      if (result.error) {
        setLocalError(result.error)
      } else {
        setOpen(false)
        setPassword('')
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('passwordChange')}
        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-sm"
      >
        🔒
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('newPassword')}
          className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 w-32 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="px-2 py-1 text-xs rounded bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium disabled:opacity-50 transition-colors"
        >
          {pending ? t('passwordSaving') : t('passwordSave')}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          {t('passwordCancel')}
        </button>
      </div>
      {localError && (
        <p className="text-xs text-red-500">{localError}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/users/PasswordEditor.tsx
git commit -m "feat: add PasswordEditor component for inline admin password reset"
```

---

## Task 5: Update `page.tsx`

**Files:**
- Modify: `src/app/admin/users/page.tsx`

Three changes:
1. Import `PasswordEditor` and `VerifyButton`
2. Add "Password" column header (5th column)
3. Replace static verified/unverified `<span>` with `<VerifyButton>`, add `<PasswordEditor>` in the new column

- [ ] **Step 1: Replace `src/app/admin/users/page.tsx` with the updated version**

```tsx
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types'
import RoleSelector from './RoleSelector'
import InviteUserForm from './InviteUserForm'
import AdvisorAssigner from './AdvisorAssigner'
import VerifyButton from './VerifyButton'
import PasswordEditor from './PasswordEditor'
import { getTranslations } from 'next-intl/server'

export default async function AdminUsersPage() {
  const t = await getTranslations('adminUsers')
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">{t('title', { count: 0 })}</h1>
        <p className="text-sm text-red-500">{t('loadError', { message: error.message })}</p>
      </div>
    )
  }

  const users = data.users

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, advisor_id')

  const profileMap = new Map((profiles ?? []).map((p: { id: string; advisor_id: string | null }) => [p.id, p]))

  const advisors = users
    .filter((u) => (u.app_metadata as { role?: string })?.role === 'advisor')
    .map((u) => ({ id: u.id, email: u.email ?? '' }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('title', { count: users.length })}</h1>
        <InviteUserForm />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colEmail')}</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colRole')}</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colAdvisor')}</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colVerified')}</th>
              <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colPassword')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {users.map((u) => {
              const role = ((u.app_metadata as { role?: UserRole } | undefined)?.role) ?? 'student'
              const verified = !!u.email_confirmed_at

              return (
                <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="py-3 pr-4 font-medium">{u.email}</td>
                  <td className="py-3 pr-4">
                    <RoleSelector userId={u.id} currentRole={role} />
                  </td>
                  <td className="py-3 pr-4">
                    {role === 'student' ? (
                      <AdvisorAssigner
                        studentId={u.id}
                        currentAdvisorId={profileMap.get(u.id)?.advisor_id ?? null}
                        advisors={advisors}
                      />
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <VerifyButton userId={u.id} verified={verified} />
                  </td>
                  <td className="py-3">
                    <PasswordEditor userId={u.id} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. If there are type errors related to `email_confirm` (Supabase may type this differently), use `as unknown as { email_confirm: boolean }` cast on the updateUserById call.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass (including the 14 new admin action tests).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users/page.tsx
git commit -m "feat: add PasswordEditor and VerifyButton to admin users table"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ `assignAdvisor` bug fix — uses `upsert` with `getUserById` for email (Task 1)
- ✅ `resetUserPassword` — Task 1
- ✅ `verifyUserEmail` — Task 1
- ✅ Translation keys — Task 2
- ✅ `VerifyButton` component — Task 3
- ✅ `PasswordEditor` component — Task 4
- ✅ `page.tsx` updated — Task 5
- ✅ Tests for all three server actions — Task 1

**Type note:** Supabase's `updateUserById` accepts `AdminUserAttributes`. The `email_confirm` field is a valid attribute in Supabase JS v2. If TypeScript complains, the Supabase types may not include it — add `// @ts-expect-error — email_confirm is valid per Supabase docs` above that line.

**No placeholders:** All steps contain complete code.

**Type consistency:** `resetUserPassword(userId, password)` and `verifyUserEmail(userId)` signatures are consistent between the test file (Task 1) and the implementation (Task 1) and the components that call them (Tasks 3, 4).
