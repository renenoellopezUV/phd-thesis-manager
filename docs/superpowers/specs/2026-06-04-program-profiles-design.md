# Program-Linked Profiles & Scoped Advisor Assignment — Design Spec

**Date:** 2026-06-04  
**Status:** Approved  
**Scope:** Bug fix for advisor assignment FK + program dropdown on profiles + program-scoped advisor filtering in admin

---

## Overview

Three connected changes:

1. **Bug fix:** `advisor_id` FK references `profiles(id)`, causing silent failure when the advisor hasn't completed their profile. Change FK to `auth.users(id)`.
2. **Program on profiles:** Replace free-text `program` column with `program_id uuid FK → programs(id)`. All users pick their program from a dropdown of admin-created programs.
3. **Scoped advisor assignment:** Admin can only assign an advisor to a student if both share the same program. If the student has no program, the advisor dropdown is disabled.

---

## Section 1: Schema Migration

**File:** `supabase/migrations/20260604000001_program_profiles.sql`

```sql
-- 1. Fix advisor_id FK: drop old constraint (references profiles), recreate referencing auth.users
alter table public.profiles
  drop constraint if exists profiles_advisor_id_fkey;

alter table public.profiles
  add constraint profiles_advisor_id_fkey
  foreign key (advisor_id) references auth.users(id) on delete set null;

-- 2. Add program_id FK (nullable — users may not select a program immediately)
alter table public.profiles
  add column if not exists program_id uuid
  references public.programs(id) on delete set null;

-- 3. Drop old free-text program column
alter table public.profiles
  drop column if exists program;
```

**RLS impact:** None. The existing advisor policies compare `advisor_id = auth.uid()` — the value is still the advisor's UUID; only the FK target changes.

---

## Section 2: Type Updates

**File:** `src/types/database.ts`

Replace `program: string | null` with `program_id: string | null` in `DbProfile`:

```ts
export type DbProfile = {
  id: string
  name: string
  email: string
  advisor_id: string | null
  department: string | null
  program_id: string | null      // replaces program: string | null
  start_date: string | null
  expected_graduation: string | null
  stage: string
  locale: string
  created_at: string
}
```

---

## Section 3: `updateProfile` Server Action

**File:** `src/app/actions/profile.ts`

Changes:
- Replace `program` with `program_id` (UUID or null)
- Only write student-specific fields (`start_date`, `expected_graduation`, `stage`) when the user's role is `student`

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const role = (user.app_metadata as { role?: string } | undefined)?.role ?? 'student'

  const base = {
    id: user.id,
    email: user.email ?? '',
    name: (formData.get('name') as string | null)?.trim() ?? '',
    department: (formData.get('department') as string | null)?.trim() || null,
    program_id: (formData.get('program_id') as string | null) || null,
  }

  const studentFields = role === 'student' ? {
    start_date: (formData.get('startDate') as string | null) || null,
    expected_graduation: (formData.get('expectedGraduation') as string | null) || null,
    stage: (formData.get('stage') as string | null) ?? 'coursework',
  } : {}

  const { error } = await supabase
    .from('profiles')
    .upsert({ ...base, ...studentFields })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/profile')
  return {}
}
```

---

## Section 4: Profile Page & Form

**Files:** `src/app/profile/page.tsx`, `src/app/profile/ProfileForm.tsx`

### `page.tsx`

Fetch programs list alongside the profile. Pass both to `ProfileForm`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const t = await getTranslations('profile')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? 'student'

  const [{ data: profile }, { data: programs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('programs').select('id, name').order('name'),
  ])

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-lg font-semibold">{t('title')}</h1>
      <ProfileForm profile={profile} programs={programs ?? []} role={role} />
    </div>
  )
}
```

### `ProfileForm.tsx`

- Replace `program` text input with a `<select>` populated from `programs` prop
- Show student-only fields (`startDate`, `expectedGraduation`, `stage`) only when `role === 'student'`
- The select's `name` attribute is `program_id`
- A blank "— none —" option (value `""`) is always first

```tsx
'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { updateProfile } from '@/app/actions/profile'
import { type StudentStage } from '@/types'
import type { DbProfile, DbProgram } from '@/types/database'

const STAGE_KEYS: StudentStage[] = [
  'coursework', 'qualifying', 'proposal', 'research',
  'writing', 'defense', 'graduated',
]

export default function ProfileForm({
  profile,
  programs,
  role,
}: {
  profile: DbProfile | null
  programs: Pick<DbProgram, 'id' | 'name'>[]
  role: string
}) {
  const t = useTranslations('profile')
  const tStages = useTranslations('stages')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) { setError(result.error) }
      else { setSuccess(true); router.refresh() }
    })
  }

  const field = (label: string, name: string, type = 'text', defaultVal?: string) => (
    <div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultVal ?? ''}
        className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
      {field(t('name'), 'name', 'text', profile?.name ?? '')}
      {field(t('department'), 'department', 'text', profile?.department ?? '')}

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t('program')}</label>
        <select
          name="program_id"
          defaultValue={profile?.program_id ?? ''}
          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <option value="">{t('programNone')}</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {role === 'student' && (
        <>
          {field(t('startDate'), 'startDate', 'date', profile?.start_date ?? '')}
          {field(t('expectedGraduation'), 'expectedGraduation', 'date', profile?.expected_graduation ?? '')}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t('stage')}</label>
            <select
              name="stage"
              defaultValue={profile?.stage ?? 'coursework'}
              className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              {STAGE_KEYS.map((value) => (
                <option key={value} value={value}>{tStages(value)}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400">{t('saved')}</p>}

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {pending ? t('saving') : t('save')}
      </button>
    </form>
  )
}
```

---

## Section 5: Admin Users Page

**File:** `src/app/admin/users/page.tsx`

Changes:
- `profileMap` now selects `id, advisor_id, program_id`
- Advisor list is built per-student: only advisors whose profile `program_id` matches the student's `program_id`
- Pass `disabled={!studentProgramId}` to `AdvisorAssigner` when student has no program

```tsx
// In the page component — profileMap now selects 'id, advisor_id, program_id'
// (profileMap is keyed by user id; same map used for both students and advisors)

// Build full advisors list (all users with advisor role)
const allAdvisors = users
  .filter((u) => (u.app_metadata as { role?: string })?.role === 'advisor')
  .map((u) => ({ id: u.id, email: u.email ?? '', programId: profileMap.get(u.id)?.program_id ?? null }))

// In the table row, per student:
const studentProgramId = profileMap.get(u.id)?.program_id ?? null
const eligibleAdvisors = studentProgramId
  ? allAdvisors.filter((a) => a.programId === studentProgramId)
  : []

// Render:
<AdvisorAssigner
  studentId={u.id}
  currentAdvisorId={profileMap.get(u.id)?.advisor_id ?? null}
  advisors={eligibleAdvisors}
  disabled={!studentProgramId}
/>
```

---

## Section 6: `AdvisorAssigner` Component

**File:** `src/app/admin/users/AdvisorAssigner.tsx`

Changes:
- Accept `disabled?: boolean` prop
- Show inline error when `assignAdvisor` returns `{ error }`
- When `disabled`, render a static `<span>` instead of a `<select>`

```tsx
'use client'

import { useTransition, useState } from 'react'
import { assignAdvisor } from '@/app/actions/admin'
import { useTranslations } from 'next-intl'

type Advisor = { id: string; email: string; programId: string | null }

export default function AdvisorAssigner({
  studentId,
  currentAdvisorId,
  advisors,
  disabled = false,
}: {
  studentId: string
  currentAdvisorId: string | null
  advisors: Advisor[]
  disabled?: boolean
}) {
  const t = useTranslations('advisorAssigner')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (disabled) {
    return <span className="text-zinc-300 dark:text-zinc-600 text-xs">{t('noProgram')}</span>
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const advisorId = e.target.value
    setError(null)
    startTransition(async () => {
      const result = await assignAdvisor(studentId, advisorId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        defaultValue={currentAdvisorId ?? ''}
        onChange={handleChange}
        disabled={pending}
        className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 disabled:opacity-50"
      >
        <option value="">{t('unassigned')}</option>
        {advisors.map((a) => (
          <option key={a.id} value={a.id}>{a.email}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
```

---

## Section 7: Translation Keys

### `profile` namespace — add one key

| Key | EN | ES |
|-----|----|----|
| `programNone` | `"— none —"` | `"— ninguno —"` |

### `advisorAssigner` namespace — add one key

| Key | EN | ES |
|-----|----|----|
| `noProgram` | `"No program"` | `"Sin programa"` |

---

## Testing

Business logic covered by unit tests:
- `updateProfile`: saves `program_id` (not `program`); skips student fields when role is not `student`
- `assignAdvisor`: existing tests remain valid (upsert behavior unchanged)

UI components (`ProfileForm`, `AdvisorAssigner`) not tested in v1 per project convention.

---

## Out of Scope

- Admin editing another user's program directly (admin manages programs, users self-assign)
- Changing a student's program after an advisor is assigned (advisor_id stays, could be stale — future concern)
- RLS enforcement of program matching (enforced at UI level only)
- Advisor visibility into students from other programs
