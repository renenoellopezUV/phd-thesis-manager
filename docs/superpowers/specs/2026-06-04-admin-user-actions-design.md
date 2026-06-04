# Admin User Actions — Design Spec

**Date:** 2026-06-04  
**Status:** Approved  
**Scope:** Admin users page — bug fix for advisor assignment + new password reset and email verification actions

---

## Overview

Three changes to the admin user management area:

1. **Bug fix:** Advisor assignment silently fails for students who haven't completed their profile yet — fix `assignAdvisor` to use `upsert` instead of `update`.
2. **Password reset:** Admin can set a new password for any user directly from the users table (inline UI).
3. **Email verification:** Admin can manually mark a user's email as verified with one click.

---

## Bug Fix: Advisor Assignment

### Root Cause

`assignAdvisor` in `src/app/actions/admin.ts` calls `.update()` on the `profiles` table. When a student has been invited but has not yet completed their profile, no row exists in `profiles` — the `update` finds nothing and succeeds silently with 0 rows changed.

### Fix

Change `.update()` to `.upsert()`, fetching the student's email from `auth.users` first (needed because `email` is a required column in `profiles`):

```ts
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
      { id: studentId, email: user?.email ?? '', advisor_id: advisorId || null },
      { onConflict: 'id' }
    )

  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}
```

No UI changes required for this fix — `AdvisorAssigner.tsx` stays unchanged.

---

## New Server Actions

Both actions go in `src/app/actions/admin.ts`, using the existing `createAdminClient()` pattern.

### `resetUserPassword`

```ts
export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: error.message }
  return {}
}
```

### `verifyUserEmail`

```ts
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

---

## New UI Components

### `PasswordEditor.tsx`

**File:** `src/app/admin/users/PasswordEditor.tsx`  
**Type:** Client Component (`'use client'`)  
**Pattern:** Same as `RoleSelector` / `AdvisorAssigner` — one instance per table row.

**Behavior:**
- **Collapsed state (default):** Renders a small lock icon button (`🔒`) with `aria-label` from `t('passwordChange')`.
- **Expanded state:** Clicking the lock reveals a password `<input>` (type=`password`) + `"Save"` button + `"Cancel"` button inline.
- **Validation:** If password length < 8, show `t('passwordTooShort')` inline, do not call the action.
- **On save:** Call `resetUserPassword(userId, password)`. On success, collapse back to locked state. On error, show the error message inline.
- **On cancel:** Collapse back without calling the action.

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

  function handleOpen() { setOpen(true); setLocalError(null) }
  function handleCancel() { setOpen(false); setPassword(''); setLocalError(null) }

  function handleSave() {
    if (password.length < 8) { setLocalError(t('passwordTooShort')); return }
    setLocalError(null)
    startTransition(async () => {
      const result = await resetUserPassword(userId, password)
      if (result.error) { setLocalError(result.error) }
      else { setOpen(false); setPassword('') }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('passwordChange')}
        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-xs"
      >
        🔒
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('newPassword')}
        className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 w-32"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="px-2 py-1 text-xs rounded bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-50"
      >
        {pending ? t('passwordSaving') : t('passwordSave')}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800"
      >
        {t('passwordCancel')}
      </button>
      {localError && <p className="text-xs text-red-500">{localError}</p>}
    </div>
  )
}
```

---

### `VerifyButton.tsx`

**File:** `src/app/admin/users/VerifyButton.tsx`  
**Type:** Client Component (`'use client'`)

**Behavior:**
- If `verified` is `true`: renders the green "Verified" badge (static, same as current).
- If `verified` is `false`: renders the amber "Unverified" text as a `<button>`. On click, calls `verifyUserEmail(userId)`. Shows `t('verifying')` while pending. On success, `revalidatePath` causes the Server Component to re-render, flipping the badge to "Verified".

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
      onClick={() => startTransition(async () => { await verifyUserEmail(userId) })}
      className="text-amber-500 dark:text-amber-400 text-xs font-medium hover:text-amber-600 disabled:opacity-50 transition-colors"
    >
      {pending ? t('verifying') : t('unverified')}
    </button>
  )
}
```

---

## Changes to `page.tsx`

1. Import `PasswordEditor` and `VerifyButton`.
2. Replace the static verified/unverified `<span>` with `<VerifyButton userId={u.id} verified={verified} />`.
3. Add a 5th column `"Password"` (header: `{t('colPassword')}`) with `<PasswordEditor userId={u.id} />` per row.

---

## Translation Keys

Add to `adminUsers` namespace in `messages/en.json` and `messages/es.json`:

| Key | EN | ES |
|-----|----|----|
| `colPassword` | `"Password"` | `"Contraseña"` |
| `passwordChange` | `"Change password"` | `"Cambiar contraseña"` |
| `newPassword` | `"New password"` | `"Nueva contraseña"` |
| `passwordSave` | `"Save"` | `"Guardar"` |
| `passwordSaving` | `"Saving…"` | `"Guardando…"` |
| `passwordCancel` | `"Cancel"` | `"Cancelar"` |
| `passwordTooShort` | `"At least 8 characters"` | `"Mínimo 8 caracteres"` |
| `verifying` | `"Verifying…"` | `"Verificando…"` |

---

## Error Handling

- `resetUserPassword`: Server errors (weak password policy, network) shown inline below the input. No fallback needed — admin can retry.
- `verifyUserEmail`: Server errors are swallowed silently (the badge stays as "Unverified" — admin can retry). Could add inline error if needed, but YAGNI for v1.
- `assignAdvisor` (bug fix): The `getUserById` call can fail — return early with error. `AdvisorAssigner.tsx` already renders errors via `useTransition` (silently for now).

---

## Testing

Business logic covered by unit tests:
- `resetUserPassword` calls `admin.auth.admin.updateUserById` with the correct args and returns `{ error }` on failure.
- `verifyUserEmail` calls `updateUserById` with `{ email_confirm: true }` and revalidates.
- `assignAdvisor` (fixed): uses `upsert` and fetches email before upserting.

UI components (`PasswordEditor`, `VerifyButton`) are not tested in v1 per project convention.

---

## Out of Scope

- Password strength meter
- Audit log of admin actions
- Bulk verification
- Sending a notification to the user when their password is changed
