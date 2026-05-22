# Milestone Ownership Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure milestones so admins define programs, advisors assign and schedule milestones per student, and students are read-only (except marking complete).

**Architecture:** Three new DB objects (`programs`, `program_milestones`, and columns on existing tables), new Server Actions for each role's operations, and role-scoped UI pages. The existing `milestones` table stays as the per-student instance store — new columns link instances back to program definitions.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres + Auth, TypeScript, Tailwind CSS v4, `@supabase/ssr`, `@supabase/supabase-js` (admin client).

> **Note on testing:** No test runner is configured in this project. TDD steps are omitted. Add Vitest + Supabase local dev testing in a separate setup task before adding business logic tests.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260522000001_programs.sql` | Create | programs + program_milestones tables, grants, RLS |
| `supabase/migrations/20260522000002_profiles_advisor_id.sql` | Create | Remove advisor_email, add advisor_id, update RLS |
| `supabase/migrations/20260522000003_milestones_ownership.sql` | Create | Add program_milestone_id + created_by, update RLS |
| `src/types/database.ts` | Modify | Add DbProgram, DbProgramMilestone; update DbProfile |
| `src/app/actions/programs.ts` | Create | Admin Server Actions for programs CRUD |
| `src/app/actions/admin.ts` | Modify | Add inviteUser + assignAdvisor actions |
| `src/app/actions/milestones.ts` | Modify | Remove addMilestone/deleteMilestone; add advisor actions |
| `src/app/admin/programs/page.tsx` | Create | Program list page |
| `src/app/admin/programs/[id]/page.tsx` | Create | Program detail + milestone definitions |
| `src/app/admin/programs/[id]/ProgramForm.tsx` | Create | Client form for program name/description |
| `src/app/admin/programs/[id]/MilestoneDefinitionList.tsx` | Create | Client list for adding/reordering/deleting definitions |
| `src/app/admin/users/InviteUserForm.tsx` | Create | Client form to invite student or advisor |
| `src/app/admin/users/AdvisorAssigner.tsx` | Create | Client dropdown to assign advisor to student |
| `src/app/admin/users/page.tsx` | Modify | Add invite button + advisor assignment column |
| `src/app/advisor/students/[studentId]/page.tsx` | Modify | Replace read-only with program assignment + date editing |
| `src/app/advisor/students/[studentId]/AssignProgramForm.tsx` | Create | Client form: pick program, set all due dates |
| `src/app/advisor/students/[studentId]/MilestoneDateEditor.tsx` | Create | Client list to edit existing milestone due dates |
| `src/app/milestones/MilestonesClient.tsx` | Modify | Remove add/delete UI; completion toggle only |
| `src/app/milestones/page.tsx` | Modify | Remove addMilestone import |
| `src/app/advisor/students/page.tsx` | Modify | Switch advisor_email → advisor_id query |
| `src/components/AppNav.tsx` | Modify | Add Programs link for admin role |
| `src/middleware.ts` | Modify | Update advisor RLS check: advisor_email → advisor_id |
| `src/app/signup/` | Delete | Remove — no self-registration |

---

## Task 1: Migration — programs & program_milestones

**Files:**
- Create: `supabase/migrations/20260522000001_programs.sql`

- [ ] **Step 1.1: Write the migration**

```sql
-- supabase/migrations/20260522000001_programs.sql

create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

create table public.program_milestones (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references public.programs(id) on delete cascade,
  title           text not null,
  type            text not null default 'other',
  description     text not null default '',
  display_order   int  not null default 0,
  created_at      timestamptz not null default now()
);

create index program_milestones_program_id_idx on public.program_milestones(program_id);

-- Enable RLS
alter table public.programs enable row level security;
alter table public.program_milestones enable row level security;

-- All authenticated users can read
create policy "authenticated: read programs"
  on public.programs for select
  using (auth.uid() is not null);

create policy "authenticated: read program milestones"
  on public.program_milestones for select
  using (auth.uid() is not null);

-- Admins only for writes
create policy "admins: manage programs"
  on public.programs for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins: manage program milestones"
  on public.program_milestones for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Grants
grant select, insert, update, delete on public.programs to authenticated;
grant select, insert, update, delete on public.program_milestones to authenticated;
```

- [ ] **Step 1.2: Apply in Supabase SQL Editor**

Paste and run the migration. Verify in Table Editor that `programs` and `program_milestones` appear with RLS enabled.

- [ ] **Step 1.3: Commit**

```bash
git add supabase/migrations/20260522000001_programs.sql
git commit -m "chore: add programs and program_milestones tables with RLS"
```

---

## Task 2: Migration — profiles advisor_id

**Files:**
- Create: `supabase/migrations/20260522000002_profiles_advisor_id.sql`

- [ ] **Step 2.1: Write the migration**

```sql
-- supabase/migrations/20260522000002_profiles_advisor_id.sql

-- Add advisor_id (nullable — admin assigns after both accounts exist)
alter table public.profiles
  add column advisor_id uuid references public.profiles(id) on delete set null;

create index profiles_advisor_id_idx on public.profiles(advisor_id);

-- Drop advisor_email column (was a fragile text-based link)
alter table public.profiles drop column if exists advisor_email;

-- Drop old advisor email-based RLS policies
drop policy if exists "advisors: read their students"  on public.profiles;
drop policy if exists "admins: update any"             on public.profiles;

-- New advisor policy: advisors read profiles where advisor_id = their uid
create policy "advisors: read their students"
  on public.profiles for select
  using (
    advisor_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'advisor'
  );

-- Admin can update any profile (including setting advisor_id)
create policy "admins: update any"
  on public.profiles for update
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```

- [ ] **Step 2.2: Apply in Supabase SQL Editor**

Run the migration. Verify `advisor_email` column is gone and `advisor_id` column exists in `profiles`.

- [ ] **Step 2.3: Commit**

```bash
git add supabase/migrations/20260522000002_profiles_advisor_id.sql
git commit -m "chore: replace advisor_email with advisor_id FK on profiles"
```

---

## Task 3: Migration — milestones ownership columns & RLS

**Files:**
- Create: `supabase/migrations/20260522000003_milestones_ownership.sql`

- [ ] **Step 3.1: Write the migration**

```sql
-- supabase/migrations/20260522000003_milestones_ownership.sql

-- Link milestone instances back to the definition they came from
alter table public.milestones
  add column program_milestone_id uuid references public.program_milestones(id) on delete set null,
  add column created_by           uuid references auth.users(id);

-- Drop old blanket student policy
drop policy if exists "students: own milestones"                    on public.milestones;
drop policy if exists "advisors: read their students milestones"    on public.milestones;

-- Students: SELECT own + UPDATE completed status only (column restriction in Server Action)
create policy "students: select own milestones"
  on public.milestones for select
  using (profile_id = auth.uid());

create policy "students: complete own milestones"
  on public.milestones for update
  using  (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Advisors: full control over their students' milestones
create policy "advisors: manage their students milestones"
  on public.milestones for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = milestones.profile_id
        and p.advisor_id = auth.uid()
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'advisor'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = milestones.profile_id
        and p.advisor_id = auth.uid()
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'advisor'
    )
  );
```

- [ ] **Step 3.2: Apply in Supabase SQL Editor**

Run the migration. Verify new columns in `milestones` and check Table Editor → milestones → RLS shows the three new policies.

- [ ] **Step 3.3: Commit**

```bash
git add supabase/migrations/20260522000003_milestones_ownership.sql
git commit -m "chore: add program_milestone_id/created_by to milestones, update RLS"
```

---

## Task 4: TypeScript Types

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 4.1: Update database.ts**

Replace the entire file:

```typescript
import type { Milestone, MilestoneType, StudentStage } from '.'

export type DbProfile = {
  id: string
  name: string
  email: string
  advisor_id: string | null      // replaces advisor_email
  department: string | null
  program: string | null
  start_date: string | null
  expected_graduation: string | null
  stage: string
  created_at: string
}

export type DbMilestone = {
  id: string
  profile_id: string
  program_milestone_id: string | null
  created_by: string | null
  title: string
  description: string
  type: string
  due_date: string
  completed: boolean
  completed_date: string | null
  created_at: string
}

export type DbProgram = {
  id: string
  name: string
  description: string
  created_by: string
  created_at: string
}

export type DbProgramMilestone = {
  id: string
  program_id: string
  title: string
  type: string
  description: string
  display_order: number
  created_at: string
}

export function dbMilestoneToMilestone(row: DbMilestone): Milestone {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as MilestoneType,
    dueDate: row.due_date,
    completedDate: row.completed_date,
    completed: row.completed,
  }
}

export function dbProfileStage(stage: string): StudentStage {
  const valid: StudentStage[] = [
    'coursework', 'qualifying', 'proposal', 'research', 'writing', 'defense', 'graduated',
  ]
  return valid.includes(stage as StudentStage) ? (stage as StudentStage) : 'coursework'
}
```

- [ ] **Step 4.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors about `advisor_email` references in other files — fix them in subsequent tasks.

- [ ] **Step 4.3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add DbProgram, DbProgramMilestone types; update DbProfile/DbMilestone"
```

---

## Task 5: Server Actions — Programs CRUD (Admin)

**Files:**
- Create: `src/app/actions/programs.ts`

- [ ] **Step 5.1: Create programs.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProgram(formData: FormData): Promise<{ error?: string; id?: string }> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  if (!name) return { error: 'Name is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('programs')
    .insert({
      name,
      description: (formData.get('description') as string | null)?.trim() ?? '',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/programs')
  return { id: data.id }
}

export async function updateProgram(id: string, formData: FormData): Promise<{ error?: string }> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  if (!name) return { error: 'Name is required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('programs')
    .update({
      name,
      description: (formData.get('description') as string | null)?.trim() ?? '',
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/programs')
  revalidatePath(`/admin/programs/${id}`)
  return {}
}

export async function deleteProgram(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/programs')
  return {}
}

export async function addProgramMilestone(
  programId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const type = (formData.get('type') as string | null) ?? 'other'
  if (!title) return { error: 'Title is required' }

  const supabase = await createClient()

  // Place at end of current list
  const { data: last } = await supabase
    .from('program_milestones')
    .select('display_order')
    .eq('program_id', programId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = last ? last.display_order + 1 : 0

  const { error } = await supabase.from('program_milestones').insert({
    program_id: programId,
    title,
    type,
    description: (formData.get('description') as string | null)?.trim() ?? '',
    display_order: nextOrder,
  })

  if (error) return { error: error.message }
  revalidatePath(`/admin/programs/${programId}`)
  return {}
}

export async function deleteProgramMilestone(
  programId: string,
  milestoneId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('program_milestones')
    .delete()
    .eq('id', milestoneId)

  if (error) return { error: error.message }
  revalidatePath(`/admin/programs/${programId}`)
  return {}
}
```

- [ ] **Step 5.2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no new errors from this file.

- [ ] **Step 5.3: Commit**

```bash
git add src/app/actions/programs.ts
git commit -m "feat: add program CRUD server actions"
```

---

## Task 6: Server Actions — User Invite & Advisor Assignment (Admin)

**Files:**
- Modify: `src/app/actions/admin.ts`

- [ ] **Step 6.1: Update admin.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
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
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}

export async function assignAdvisor(
  studentId: string,
  advisorId: string,
): Promise<{ error?: string }> {
  // Use service-role client to bypass RLS — only admin calls this
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ advisor_id: advisorId || null })
    .eq('id', studentId)

  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}
```

- [ ] **Step 6.2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6.3: Commit**

```bash
git add src/app/actions/admin.ts
git commit -m "feat: add inviteUser and assignAdvisor admin actions"
```

---

## Task 7: Server Actions — Advisor Milestone Management

**Files:**
- Modify: `src/app/actions/milestones.ts`

- [ ] **Step 7.1: Replace milestones.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function revalidateAll(studentId?: string) {
  revalidatePath('/')
  revalidatePath('/milestones')
  revalidatePath('/timeline')
  if (studentId) revalidatePath(`/advisor/students/${studentId}`)
}

// STUDENT: mark own milestone complete/incomplete (completed + completed_date only)
export async function toggleMilestone(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: row, error: fetchError } = await supabase
    .from('milestones')
    .select('completed')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single()

  if (fetchError || !row) return { error: 'Milestone not found' }

  const nowCompleted = !row.completed
  const { error } = await supabase
    .from('milestones')
    .update({
      completed: nowCompleted,
      completed_date: nowCompleted ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id)
    .eq('profile_id', user.id)

  if (error) return { error: error.message }
  revalidateAll()
  return {}
}

// ADVISOR: assign a program to a student (bulk insert milestone instances)
export async function assignProgram(
  studentId: string,
  programId: string,
  dueDates: Record<string, string>, // program_milestone_id → YYYY-MM-DD
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: definitions, error: defError } = await supabase
    .from('program_milestones')
    .select('*')
    .eq('program_id', programId)
    .order('display_order')

  if (defError || !definitions) return { error: defError?.message ?? 'Failed to load program' }

  const rows = definitions.map((def) => ({
    profile_id: studentId,
    program_milestone_id: def.id,
    title: def.title,
    type: def.type,
    description: def.description,
    due_date: dueDates[def.id] ?? '',
    created_by: user.id,
  }))

  // Remove any missing due dates before insert
  const validRows = rows.filter((r) => r.due_date)
  if (validRows.length === 0) return { error: 'At least one due date is required' }

  const { error } = await supabase.from('milestones').insert(validRows)
  if (error) return { error: error.message }
  revalidateAll(studentId)
  return {}
}

// ADVISOR: update a single milestone's due date
export async function updateMilestoneDueDate(
  milestoneId: string,
  dueDate: string,
): Promise<{ error?: string }> {
  if (!dueDate) return { error: 'Due date is required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('milestones')
    .update({ due_date: dueDate })
    .eq('id', milestoneId)

  if (error) return { error: error.message }
  revalidateAll()
  return {}
}

// ADVISOR: delete a milestone instance from a student
export async function deleteMilestone(id: string, studentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateAll(studentId)
  return {}
}
```

- [ ] **Step 7.2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7.3: Commit**

```bash
git add src/app/actions/milestones.ts
git commit -m "feat: replace student milestone CRUD with advisor-scoped actions"
```

---

## Task 8: Admin UI — Invite User Form

**Files:**
- Create: `src/app/admin/users/InviteUserForm.tsx`
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 8.1: Create InviteUserForm.tsx**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { inviteUser } from '@/app/actions/admin'
import type { UserRole } from '@/types'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'advisor', label: 'Advisor' },
]

export default function InviteUserForm() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!email.trim()) { setError('Email is required'); return }

    startTransition(async () => {
      const result = await inviteUser(email.trim(), role)
      if (result.error) { setError(result.error); return }
      setSuccess(true)
      setEmail('')
      setRole('student')
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 transition-colors"
      >
        + Invite User
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@university.edu"
          className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 w-64"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          {ROLES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send Invite'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-400 hover:text-zinc-600">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
      {success && <p className="w-full text-xs text-green-600">Invite sent!</p>}
    </form>
  )
}
```

- [ ] **Step 8.2: Add InviteUserForm to admin/users/page.tsx**

Add the import and render above the table:

```typescript
import InviteUserForm from './InviteUserForm'

// Inside the return, before the <table>:
<div className="flex items-center justify-between">
  <h1 className="text-lg font-semibold">Users ({users.length})</h1>
  <InviteUserForm />
</div>
```

- [ ] **Step 8.3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8.4: Commit**

```bash
git add src/app/admin/users/InviteUserForm.tsx src/app/admin/users/page.tsx
git commit -m "feat: add invite user form to admin panel"
```

---

## Task 9: Admin UI — Assign Advisor to Student

**Files:**
- Create: `src/app/admin/users/AdvisorAssigner.tsx`
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 9.1: Create AdvisorAssigner.tsx**

```typescript
'use client'

import { useTransition } from 'react'
import { assignAdvisor } from '@/app/actions/admin'

type Advisor = { id: string; email: string }

export default function AdvisorAssigner({
  studentId,
  currentAdvisorId,
  advisors,
}: {
  studentId: string
  currentAdvisorId: string | null
  advisors: Advisor[]
}) {
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const advisorId = e.target.value
    startTransition(async () => {
      await assignAdvisor(studentId, advisorId)
    })
  }

  return (
    <select
      defaultValue={currentAdvisorId ?? ''}
      onChange={handleChange}
      disabled={pending}
      className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 disabled:opacity-50"
    >
      <option value="">— unassigned —</option>
      {advisors.map((a) => (
        <option key={a.id} value={a.id}>{a.email}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 9.2: Update admin/users/page.tsx to fetch advisors and render AdvisorAssigner**

The page needs to fetch profiles to get advisor_id for each student and build the advisor list:

```typescript
// Add to imports:
import AdvisorAssigner from './AdvisorAssigner'

// After listing users, fetch profiles to get advisor_id:
const supabase_admin = createAdminClient()
const { data: profiles } = await supabase_admin
  .from('profiles')
  .select('id, advisor_id')

const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

// Build advisor list from users with role 'advisor':
const advisors = users
  .filter((u) => (u.app_metadata as { role?: string })?.role === 'advisor')
  .map((u) => ({ id: u.id, email: u.email ?? '' }))

// In the table, add an Advisor column for student rows:
// In the thead:
<th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Advisor</th>

// In each student row's <td>:
{role === 'student' ? (
  <AdvisorAssigner
    studentId={u.id}
    currentAdvisorId={profileMap.get(u.id)?.advisor_id ?? null}
    advisors={advisors}
  />
) : <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>}
```

- [ ] **Step 9.3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 9.4: Commit**

```bash
git add src/app/admin/users/AdvisorAssigner.tsx src/app/admin/users/page.tsx
git commit -m "feat: add advisor assignment to admin users panel"
```

---

## Task 10: Admin UI — Programs List Page

**Files:**
- Create: `src/app/admin/programs/page.tsx`

- [ ] **Step 10.1: Create programs/page.tsx**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createProgram } from '@/app/actions/programs'
import CreateProgramButton from './CreateProgramButton'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Programs</h1>
        <CreateProgramButton />
      </div>

      {!programs || programs.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 py-12 text-center">
          No programs yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {programs.map((p) => (
            <Link
              key={p.id}
              href={`/admin/programs/${p.id}`}
              className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{p.description}</p>
                )}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Edit →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 10.2: Create CreateProgramButton.tsx (client)**

```typescript
// src/app/admin/programs/CreateProgramButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProgram } from '@/app/actions/programs'

export default function CreateProgramButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('name', name)
    fd.set('description', description)
    startTransition(async () => {
      const result = await createProgram(fd)
      if (result.error) { setError(result.error); return }
      router.push(`/admin/programs/${result.id}`)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 transition-colors"
      >
        + New Program
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="PhD Program"
          className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 w-56"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 w-48"
        />
      </div>
      <button type="submit" disabled={pending} className="px-3 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50">
        {pending ? 'Creating…' : 'Create'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 10.3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 10.4: Commit**

```bash
git add src/app/admin/programs/
git commit -m "feat: add admin programs list page"
```

---

## Task 11: Admin UI — Program Detail Page

**Files:**
- Create: `src/app/admin/programs/[id]/page.tsx`
- Create: `src/app/admin/programs/[id]/ProgramForm.tsx`
- Create: `src/app/admin/programs/[id]/MilestoneDefinitionList.tsx`

- [ ] **Step 11.1: Create page.tsx**

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProgramForm from './ProgramForm'
import MilestoneDefinitionList from './MilestoneDefinitionList'

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single()

  if (!program) notFound()

  const { data: definitions } = await supabase
    .from('program_milestones')
    .select('*')
    .eq('program_id', id)
    .order('display_order')

  return (
    <div className="space-y-8 max-w-2xl">
      <ProgramForm program={program} />
      <MilestoneDefinitionList programId={id} definitions={definitions ?? []} />
    </div>
  )
}
```

- [ ] **Step 11.2: Create ProgramForm.tsx**

```typescript
'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProgram, deleteProgram } from '@/app/actions/programs'
import type { DbProgram } from '@/types/database'

export default function ProgramForm({ program }: { program: DbProgram }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setSuccess(false)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProgram(program.id, fd)
      if (result.error) { setError(result.error); return }
      setSuccess(true)
    })
  }

  function handleDelete() {
    if (!confirm(`Delete program "${program.name}"? This will remove all milestone definitions.`)) return
    startTransition(async () => {
      await deleteProgram(program.id)
      router.push('/admin/programs')
    })
  }

  return (
    <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{program.name}</h1>
        <button onClick={handleDelete} disabled={pending} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
          Delete program
        </button>
      </div>
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Name *</label>
          <input name="name" defaultValue={program.name} className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
          <input name="description" defaultValue={program.description} className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-green-600">Saved.</p>}
        <button type="submit" disabled={pending} className="px-4 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50">
          {pending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 11.3: Create MilestoneDefinitionList.tsx**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { addProgramMilestone, deleteProgramMilestone } from '@/app/actions/programs'
import { MILESTONE_TYPE_LABELS, type MilestoneType } from '@/types'
import type { DbProgramMilestone } from '@/types/database'

const TYPES = Object.entries(MILESTONE_TYPE_LABELS) as [MilestoneType, string][]

export default function MilestoneDefinitionList({
  programId,
  definitions,
}: {
  programId: string
  definitions: DbProgramMilestone[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MilestoneType>('other')
  const [description, setDescription] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('title', title); fd.set('type', type); fd.set('description', description)
    startTransition(async () => {
      const result = await addProgramMilestone(programId, fd)
      if (result.error) { setError(result.error); return }
      setTitle(''); setDescription('')
    })
  }

  function handleDelete(milestoneId: string, milestoneTitle: string) {
    if (!confirm(`Remove "${milestoneTitle}" from this program?`)) return
    startTransition(async () => {
      await deleteProgramMilestone(programId, milestoneId)
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Milestone Definitions ({definitions.length})
      </h2>

      <div className="space-y-2">
        {definitions.map((def) => (
          <div key={def.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mr-2">
                {MILESTONE_TYPE_LABELS[def.type as MilestoneType] ?? def.type}
              </span>
              <span className="text-sm font-medium">{def.title}</span>
              {def.description && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{def.description}</p>}
            </div>
            <button
              onClick={() => handleDelete(def.id, def.title)}
              disabled={pending}
              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Qualifying Exam" className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 w-52" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as MilestoneType)} className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 w-44" />
        </div>
        <button type="submit" disabled={pending} className="px-3 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50">
          {pending ? 'Adding…' : '+ Add'}
        </button>
        {error && <p className="w-full text-xs text-red-500">{error}</p>}
      </form>
    </div>
  )
}
```

- [ ] **Step 11.4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 11.5: Commit**

```bash
git add src/app/admin/programs/
git commit -m "feat: add admin program detail page with milestone definition management"
```

---

## Task 12: Advisor UI — Program Assignment

**Files:**
- Create: `src/app/advisor/students/[studentId]/AssignProgramForm.tsx`
- Create: `src/app/advisor/students/[studentId]/MilestoneDateEditor.tsx`
- Modify: `src/app/advisor/students/[studentId]/page.tsx`

- [ ] **Step 12.1: Create AssignProgramForm.tsx**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignProgram } from '@/app/actions/milestones'
import type { DbProgram, DbProgramMilestone } from '@/types/database'

export default function AssignProgramForm({
  studentId,
  programs,
  definitionsByProgram,
}: {
  studentId: string
  programs: DbProgram[]
  definitionsByProgram: Record<string, DbProgramMilestone[]>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [dueDates, setDueDates] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const definitions = selectedProgramId ? (definitionsByProgram[selectedProgramId] ?? []) : []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedProgramId) { setError('Select a program'); return }
    startTransition(async () => {
      const result = await assignProgram(studentId, selectedProgramId, dueDates)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">Assign Program</h2>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Program</label>
        <select
          value={selectedProgramId}
          onChange={(e) => { setSelectedProgramId(e.target.value); setDueDates({}) }}
          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
        >
          <option value="">Select a program…</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {definitions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Set due dates for all milestones:</p>
          {definitions.map((def) => (
            <div key={def.id} className="flex items-center gap-3">
              <span className="text-sm flex-1">{def.title}</span>
              <input
                type="date"
                value={dueDates[def.id] ?? ''}
                onChange={(e) => setDueDates((prev) => ({ ...prev, [def.id]: e.target.value }))}
                className="px-2 py-1 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={pending || !selectedProgramId || definitions.length === 0}
        className="px-4 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Assigning…' : 'Assign Program'}
      </button>
    </form>
  )
}
```

- [ ] **Step 12.2: Create MilestoneDateEditor.tsx**

```typescript
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMilestoneDueDate, deleteMilestone } from '@/app/actions/milestones'
import { MILESTONE_TYPE_LABELS, type Milestone, type MilestoneType } from '@/types'

export default function MilestoneDateEditor({
  milestones,
  studentId,
}: {
  milestones: Milestone[]
  studentId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDateChange(id: string, date: string) {
    startTransition(async () => {
      await updateMilestoneDueDate(id, date)
      router.refresh()
    })
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Remove milestone "${title}" from this student?`)) return
    startTransition(async () => {
      await deleteMilestone(id, studentId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      {milestones.map((m) => (
        <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {MILESTONE_TYPE_LABELS[m.type as MilestoneType] ?? m.type}
          </span>
          <span className="text-sm font-medium flex-1">{m.title}</span>
          {m.completed && <span className="text-xs text-green-600 dark:text-green-400">✓ Done</span>}
          <input
            type="date"
            defaultValue={m.dueDate}
            onBlur={(e) => { if (e.target.value !== m.dueDate) handleDateChange(m.id, e.target.value) }}
            disabled={pending}
            className="px-2 py-1 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 disabled:opacity-50"
          />
          <button
            onClick={() => handleDelete(m.id, m.title)}
            disabled={pending}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 12.3: Rewrite advisor/students/[studentId]/page.tsx**

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { dbMilestoneToMilestone } from '@/types/database'
import AssignProgramForm from './AssignProgramForm'
import MilestoneDateEditor from './MilestoneDateEditor'
import type { DbProgramMilestone } from '@/types/database'

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: student } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .eq('advisor_id', user!.id)
    .single()

  if (!student) notFound()

  const { data: milestoneRows } = await supabase
    .from('milestones')
    .select('*')
    .eq('profile_id', studentId)
    .order('due_date')

  const milestones = (milestoneRows ?? []).map(dbMilestoneToMilestone)

  // Load programs and their definitions for the assignment form
  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .order('name')

  const { data: allDefinitions } = await supabase
    .from('program_milestones')
    .select('*')
    .order('display_order')

  const definitionsByProgram = (allDefinitions ?? []).reduce<Record<string, DbProgramMilestone[]>>(
    (acc, def) => {
      if (!acc[def.program_id]) acc[def.program_id] = []
      acc[def.program_id].push(def)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/advisor/students" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          ← Students
        </Link>
        <h1 className="text-lg font-semibold">{student.name || student.email}</h1>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{student.program ?? '—'}</p>

      {milestones.length === 0 ? (
        <AssignProgramForm
          studentId={studentId}
          programs={programs ?? []}
          definitionsByProgram={definitionsByProgram}
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Milestones ({milestones.length})
          </h2>
          <MilestoneDateEditor milestones={milestones} studentId={studentId} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 12.4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 12.5: Commit**

```bash
git add src/app/advisor/students/[studentId]/
git commit -m "feat: advisor program assignment and milestone date editing"
```

---

## Task 13: Student UI — Read-Only Milestones

**Files:**
- Modify: `src/app/milestones/MilestonesClient.tsx`

- [ ] **Step 13.1: Rewrite MilestonesClient.tsx — remove add/delete, keep toggle**

```typescript
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import MilestoneCard from '@/components/MilestoneCard'
import { toggleMilestone } from '@/app/actions/milestones'
import type { Milestone } from '@/types'

export default function MilestonesClient({ milestones }: { milestones: Milestone[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const incomplete = milestones.filter((m) => !m.completed)
  const complete = milestones.filter((m) => m.completed)

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleMilestone(id)
      router.refresh()
    })
  }

  // No-op passed for onDelete — MilestoneCard shows button but students can't delete
  function noop() {}

  if (milestones.length === 0) {
    return (
      <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-12">
        No milestones assigned yet. Your advisor will set these up.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Milestones</h1>

      {incomplete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
            Upcoming ({incomplete.length})
          </h2>
          <div className="space-y-2">
            {incomplete.map((m) => (
              <MilestoneCard key={m.id} milestone={m} onToggle={handleToggle} onDelete={noop} />
            ))}
          </div>
        </section>
      )}

      {complete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
            Completed ({complete.length})
          </h2>
          <div className="space-y-2">
            {complete.map((m) => (
              <MilestoneCard key={m.id} milestone={m} onToggle={handleToggle} onDelete={noop} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 13.2: Update MilestoneCard.tsx to hide delete button when onDelete is noop**

In `src/components/MilestoneCard.tsx`, change the delete button to only show when the handler is meaningful. The simplest approach: pass `canDelete` prop:

```typescript
// Add to Props type:
type Props = {
  milestone: Milestone
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  canDelete?: boolean
}

// Update component signature:
export default function MilestoneCard({ milestone, onToggle, onDelete, canDelete = true }: Props)

// Wrap delete button:
{canDelete && (
  <button onClick={handleDelete} ...>✕</button>
)}
```

Update MilestonesClient to pass `canDelete={false}`:
```typescript
<MilestoneCard key={m.id} milestone={m} onToggle={handleToggle} onDelete={noop} canDelete={false} />
```

- [ ] **Step 13.3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 13.4: Commit**

```bash
git add src/app/milestones/MilestonesClient.tsx src/components/MilestoneCard.tsx
git commit -m "feat: student milestone view is read-only (toggle only, no add/delete)"
```

---

## Task 14: Fix advisor/students page & middleware

**Files:**
- Modify: `src/app/advisor/students/page.tsx`
- Modify: `src/middleware.ts`

- [ ] **Step 14.1: Update advisor/students/page.tsx — switch advisor_email → advisor_id**

Change the query from:
```typescript
.eq('advisor_email', user!.email!)
```
to:
```typescript
.eq('advisor_id', user!.id)
```

Also remove any remaining `advisor_email` references.

- [ ] **Step 14.2: Update middleware.ts — remove advisor_email references**

The middleware currently has no `advisor_email` reference (it uses `auth.email()` in RLS, not in middleware code). Verify with:

```bash
grep -r "advisor_email" src/
```

Fix any remaining references. Expected: zero hits after Task 2's migration removed the column.

- [ ] **Step 14.3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 14.4: Commit**

```bash
git add src/app/advisor/students/page.tsx src/middleware.ts
git commit -m "fix: switch advisor query from advisor_email to advisor_id"
```

---

## Task 15: Nav & Remove Signup

**Files:**
- Modify: `src/components/AppNav.tsx`
- Delete: `src/app/signup/` directory

- [ ] **Step 15.1: Add Programs link to AppNav for admin role**

In `AppNav.tsx`, the nav links are currently static. Add role-aware rendering. The user is fetched client-side already via `supabase.auth.getUser()`. Add a Programs link conditionally:

```typescript
// After getting user and role:
const role = user ? getUserRole(user) : null

// In the links section, after the existing links:
{role === 'admin' && (
  <Link href="/admin/programs" className={linkClass('/admin/programs', pathname)}>
    Programs
  </Link>
)}
{role === 'advisor' && (
  <Link href="/advisor/students" className={linkClass('/advisor/students', pathname)}>
    Students
  </Link>
)}
```

Extract the active-link class logic into a helper to avoid duplication:
```typescript
function linkClass(href: string, pathname: string) {
  const active = pathname === href || pathname.startsWith(href + '/')
  return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    active
      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
  }`
}
```

- [ ] **Step 15.2: Remove signup page**

```bash
rm -rf src/app/signup
```

Update middleware matcher to remove `/signup` from `AUTH_ROUTES`:

```typescript
const AUTH_ROUTES = new Set(['/login', '/verify-email', '/auth/confirm'])
```

- [ ] **Step 15.3: Verify TypeScript and no broken imports**

```bash
npx tsc --noEmit
grep -r "signup" src/ --include="*.ts" --include="*.tsx"
```

Expected: zero hits (except possibly in comments or login page's "Create account" link — remove that link too).

Remove "Create account" link from login page:
```typescript
// src/app/login/page.tsx — remove or update the signup link:
// Delete: <Link href="/signup">Create account</Link>
// Replace with plain text or remove entirely
```

- [ ] **Step 15.4: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 15.5: Commit**

```bash
git add src/components/AppNav.tsx src/middleware.ts src/app/login/page.tsx
git rm -r src/app/signup
git commit -m "feat: role-aware nav links; remove signup page"
```

---

## Final Verification

- [ ] Run the app: `npm run dev`
- [ ] Sign in as admin → `/admin/programs` is visible in nav
- [ ] Create a program, add milestone definitions → appear in list
- [ ] `/admin/users` → invite a student and advisor via invite form
- [ ] Assign advisor to student via dropdown → verify in Supabase `profiles.advisor_id`
- [ ] Sign in as advisor → `/advisor/students` shows assigned student
- [ ] Assign a program to student, set due dates → milestones appear in Supabase `milestones` table
- [ ] Edit a due date → updates in DB
- [ ] Sign in as student → `/milestones` shows milestones without add/delete UI
- [ ] Toggle a milestone complete → `completed = true` in DB
- [ ] `/timeline` still renders correctly
- [ ] `npx tsc --noEmit` → zero errors
