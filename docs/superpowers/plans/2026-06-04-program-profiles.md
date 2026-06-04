# Program-Linked Profiles & Scoped Advisor Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the advisor assignment FK bug, link profiles to programs via dropdown, and enforce program-scoped advisor filtering in the admin UI.

**Architecture:** One schema migration fixes the `advisor_id` FK (was pointing at `profiles(id)`, now points at `auth.users(id)`) and adds `program_id uuid FK → programs(id)` to profiles. The profile form becomes role-aware (program dropdown for all users, student-only date/stage fields). The admin users page filters the advisor dropdown by program match and disables it when the student has no program.

**Tech Stack:** Next.js App Router · TypeScript · Supabase (Postgres + JS client) · next-intl · Jest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260604000001_program_profiles.sql` | Create | Fix advisor FK + add program_id + drop program text |
| `src/types/database.ts` | Modify | Replace `program: string \| null` with `program_id: string \| null` in DbProfile |
| `src/app/actions/profile.ts` | Modify | Save `program_id`; skip student fields for non-student roles |
| `src/__tests__/actions/profile.test.ts` | Create | Unit tests for updateProfile |
| `src/app/profile/page.tsx` | Modify | Fetch programs list + pass role to form |
| `src/app/profile/ProfileForm.tsx` | Modify | Program dropdown; student-only fields gated by role |
| `src/app/admin/users/page.tsx` | Modify | profileMap includes program_id; per-student advisor filtering |
| `src/app/admin/users/AdvisorAssigner.tsx` | Modify | disabled prop + inline error display |
| `messages/en.json` | Modify | Add `programNone` + `noProgram` keys |
| `messages/es.json` | Modify | Add `programNone` + `noProgram` keys |

---

### Task 1: Schema migration

**Files:**
- Create: `supabase/migrations/20260604000001_program_profiles.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260604000001_program_profiles.sql

-- 1. Fix advisor_id FK: drop constraint pointing at profiles(id),
--    recreate pointing at auth.users(id) so advisors without a profile row can be assigned.
alter table public.profiles
  drop constraint if exists profiles_advisor_id_fkey;

alter table public.profiles
  add constraint profiles_advisor_id_fkey
  foreign key (advisor_id) references auth.users(id) on delete set null;

-- 2. Add program_id FK (nullable — users may not select a program immediately)
alter table public.profiles
  add column if not exists program_id uuid
  references public.programs(id) on delete set null;

-- 3. Drop the old free-text program column
alter table public.profiles
  drop column if exists program;
```

- [ ] **Step 2: Apply the migration**

```bash
supabase db push
```

Expected: migration runs with no errors. Verify in Supabase dashboard: `profiles` table has `program_id uuid` column, no `program` column.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260604000001_program_profiles.sql
git commit -m "feat: fix advisor_id FK to auth.users + add program_id to profiles"
```

---

### Task 2: `updateProfile` server action (TDD)

**Files:**
- Create: `src/__tests__/actions/profile.test.ts`
- Modify: `src/app/actions/profile.ts`

The current action saves a `program` text field. We need it to save `program_id` (UUID) and skip student-specific fields (`start_date`, `expected_graduation`, `stage`) when the user's role is not `student`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/actions/profile.test.ts`:

```ts
// src/__tests__/actions/profile.test.ts
import { revalidatePath } from 'next/cache'

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

import { createClient } from '@/lib/supabase/server'
const mockCreateClient = createClient as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

import { updateProfile } from '@/app/actions/profile'

type FakeUser = {
  id: string
  email: string
  app_metadata: { role?: string }
}

function makeClient({
  user = { id: 'user-1', email: 'u@test.com', app_metadata: { role: 'student' } } as FakeUser | null,
  upsertError = null as Error | null,
} = {}) {
  const mockUpsert = jest.fn().mockResolvedValue({ error: upsertError })
  const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert })
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: mockFrom,
  })
  return { mockUpsert }
}

describe('updateProfile', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns Unauthorized when not logged in', async () => {
    makeClient({ user: null })
    const result = await updateProfile(new FormData())
    expect(result.error).toBe('Unauthorized')
  })

  it('saves program_id from form data', async () => {
    const { mockUpsert } = makeClient()
    const fd = new FormData()
    fd.set('program_id', 'prog-uuid-1')
    await updateProfile(fd)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ program_id: 'prog-uuid-1' })
    )
  })

  it('does NOT include a program text field in the payload', async () => {
    const { mockUpsert } = makeClient()
    await updateProfile(new FormData())
    const payload = mockUpsert.mock.calls[0][0]
    expect(payload).not.toHaveProperty('program')
  })

  it('saves student-specific fields when role is student', async () => {
    const { mockUpsert } = makeClient({
      user: { id: 'u1', email: 'u@test.com', app_metadata: { role: 'student' } },
    })
    const fd = new FormData()
    fd.set('startDate', '2023-09-01')
    fd.set('expectedGraduation', '2028-05-01')
    fd.set('stage', 'research')
    await updateProfile(fd)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: '2023-09-01',
        expected_graduation: '2028-05-01',
        stage: 'research',
      })
    )
  })

  it('skips student-specific fields when role is advisor', async () => {
    const { mockUpsert } = makeClient({
      user: { id: 'u1', email: 'u@test.com', app_metadata: { role: 'advisor' } },
    })
    const fd = new FormData()
    fd.set('startDate', '2023-09-01')
    fd.set('stage', 'research')
    await updateProfile(fd)
    const payload = mockUpsert.mock.calls[0][0]
    expect(payload).not.toHaveProperty('start_date')
    expect(payload).not.toHaveProperty('stage')
  })

  it('calls revalidatePath on success', async () => {
    makeClient()
    await updateProfile(new FormData())
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile')
  })

  it('returns error when upsert fails', async () => {
    makeClient({ upsertError: new Error('DB error') })
    const result = await updateProfile(new FormData())
    expect(result.error).toBe('DB error')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test -- --testPathPattern="actions/profile"
```

Expected: 6 failures (tests reference behaviour not yet implemented).

- [ ] **Step 3: Rewrite `src/app/actions/profile.ts`**

Replace the entire file:

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

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm test -- --testPathPattern="actions/profile"
```

Expected: 6 passed.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/profile.ts src/__tests__/actions/profile.test.ts
git commit -m "feat: updateProfile uses program_id + role-conditional student fields"
```

---

### Task 3: DbProfile type + profile page + form

**Files:**
- Modify: `src/types/database.ts`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/profile/ProfileForm.tsx`

These three files are updated together because changing `DbProfile` immediately causes TypeScript errors in `ProfileForm` that must be fixed in the same pass.

- [ ] **Step 1: Update `DbProfile` in `src/types/database.ts`**

Find this line in `DbProfile`:
```ts
  program: string | null
```
Replace it with:
```ts
  program_id: string | null
```

The full updated type looks like:
```ts
export type DbProfile = {
  id: string
  name: string
  email: string
  advisor_id: string | null
  department: string | null
  program_id: string | null
  start_date: string | null
  expected_graduation: string | null
  stage: string
  locale: string
  created_at: string
}
```

- [ ] **Step 2: Replace `src/app/profile/page.tsx`**

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

- [ ] **Step 3: Replace `src/app/profile/ProfileForm.tsx`**

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

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If you see errors referencing `profile.program` in other files, those are pre-existing issues unrelated to this task — do not fix them here.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/types/database.ts src/app/profile/page.tsx src/app/profile/ProfileForm.tsx
git commit -m "feat: profile form — program dropdown + role-aware student fields"
```

---

### Task 4: Admin users page + AdvisorAssigner

**Files:**
- Modify: `src/app/admin/users/AdvisorAssigner.tsx`
- Modify: `src/app/admin/users/page.tsx`

`AdvisorAssigner` needs two additions: a `disabled` prop (renders a static span when the student has no program), and inline error display. The page builds per-student advisor lists filtered by matching `program_id`.

- [ ] **Step 1: Replace `src/app/admin/users/AdvisorAssigner.tsx`**

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

- [ ] **Step 2: Replace `src/app/admin/users/page.tsx`**

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
    .select('id, advisor_id, program_id')

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; advisor_id: string | null; program_id: string | null }) => [p.id, p])
  )

  const allAdvisors = users
    .filter((u) => (u.app_metadata as { role?: string })?.role === 'advisor')
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      programId: profileMap.get(u.id)?.program_id ?? null,
    }))

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
              const studentProgramId = profileMap.get(u.id)?.program_id ?? null
              const eligibleAdvisors = studentProgramId
                ? allAdvisors.filter((a) => a.programId === studentProgramId)
                : []

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
                        advisors={eligibleAdvisors}
                        disabled={!studentProgramId}
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

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/users/AdvisorAssigner.tsx src/app/admin/users/page.tsx
git commit -m "feat: program-scoped advisor filtering + error display in admin users page"
```

---

### Task 5: Translation keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

- [ ] **Step 1: Add keys to `messages/en.json`**

In the `"profile"` object, add `"programNone"` after the `"program"` key:

```json
"program": "Program",
"programNone": "— none —",
```

In the `"advisorAssigner"` object, add `"noProgram"` after `"unassigned"`:

```json
"unassigned": "— unassigned —",
"noProgram": "No program"
```

- [ ] **Step 2: Add keys to `messages/es.json`**

In the `"profile"` object, add `"programNone"` after the `"program"` key:

```json
"program": "Programa",
"programNone": "— ninguno —",
```

In the `"advisorAssigner"` object, add `"noProgram"` after `"unassigned"`:

```json
"unassigned": "— sin asignar —",
"noProgram": "Sin programa"
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "feat: add programNone and noProgram translation keys (EN + ES)"
```
