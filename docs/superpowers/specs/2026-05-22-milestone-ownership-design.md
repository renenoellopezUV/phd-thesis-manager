# Milestone Ownership Model

**Date:** 2026-05-22
**Status:** Approved

---

## Overview

Restructures milestone ownership so that:
- **Admins** define programs and their milestone definitions, and create all user accounts
- **Advisors** assign programs to their students, set due dates, and manage milestone planning
- **Students** are read-only on planning but can mark milestones as complete

---

## Data Model

### New Tables

```sql
-- Admin-defined programs (e.g. "PhD Program", "Master's Program")
programs
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  name          text NOT NULL
  description   text NOT NULL DEFAULT ''
  created_by    uuid NOT NULL REFERENCES auth.users(id)
  created_at    timestamptz NOT NULL DEFAULT now()

-- Milestone definitions belonging to a program (ordered list)
program_milestones
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  program_id      uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE
  title           text NOT NULL
  type            text NOT NULL  -- exam | defense | chapter | committee-meeting | other
  description     text NOT NULL DEFAULT ''
  display_order   int  NOT NULL DEFAULT 0
  created_at      timestamptz NOT NULL DEFAULT now()
```

### Modified Tables

**`profiles`**
- REMOVE `advisor_email` column
- ADD `advisor_id uuid REFERENCES profiles(id) nullable` — set by admin, links student to advisor

**`milestones`** (existing per-student instances)
- ADD `program_milestone_id uuid REFERENCES program_milestones(id) nullable` — tracks which definition this instance came from
- ADD `created_by uuid REFERENCES auth.users(id) nullable` — the advisor who instantiated it
- Students lose INSERT and DELETE — now advisor-only

---

## Role Permissions

| Capability | Admin | Advisor | Student |
|---|---|---|---|
| Create user accounts (invite) | ✅ | ❌ | ❌ |
| Assign advisor to student | ✅ | ❌ | ❌ |
| Create / edit / delete programs | ✅ | ❌ | ❌ |
| Create / edit / delete program milestone definitions | ✅ | ❌ | ❌ |
| Read programs and definitions | ✅ | ✅ | ✅ |
| Assign program to student (bulk INSERT milestones) | ❌ | ✅ own students | ❌ |
| Edit milestone due dates | ❌ | ✅ own students | ❌ |
| Delete milestone instances | ❌ | ✅ own students | ❌ |
| Mark milestone complete | ❌ | ❌ | ✅ own |
| Read milestone instances | ✅ all | ✅ own students | ✅ own |

### RLS Notes

- `programs` and `program_milestones`: SELECT for all authenticated, INSERT/UPDATE/DELETE for admin only
- `milestones`: advisor INSERT/UPDATE/DELETE scoped by `profiles.advisor_id = auth.uid()`; student SELECT + UPDATE (`completed`, `completed_date` only) scoped by `profile_id = auth.uid()`
- `profiles`: advisor_id assignment via admin only; `advisor_id` RLS replaces previous `advisor_email` approach

---

## User Onboarding

Self-signup is removed. Admin creates all accounts via `supabase.auth.admin.inviteUserByEmail()`. Supabase sends a magic-link email; the user sets their own password on first login. Admin sets the role (`student` or `advisor`) at invite time via `app_metadata`.

---

## UI Routes

### Admin (`/admin`)

| Route | Purpose |
|---|---|
| `/admin/users` | Extended: "Invite Student" and "Invite Advisor" buttons, assign advisor to student |
| `/admin/programs` | List programs, create new |
| `/admin/programs/[id]` | Edit program name/description, manage milestone definitions (add, edit, reorder, delete) |

### Advisor (`/advisor`)

| Route | Purpose |
|---|---|
| `/advisor/students` | List assigned students (no change) |
| `/advisor/students/[id]` | Extended: assign program → set all due dates → save; edit dates later |

### Student

| Route | Change |
|---|---|
| `/milestones` | Remove add/delete UI; keep completion toggle only |
| `/timeline` | No change — already read-only |

### Removed

- `/signup` — nobody self-registers; page removed

---

## Advisor Program Assignment Flow

1. Advisor opens `/advisor/students/[id]`
2. If no program assigned: dropdown of available programs + date fields for each milestone definition in the selected program
3. Advisor sets all due dates and confirms
4. One `milestones` row is inserted per `program_milestones` entry: `profile_id = student.id`, `program_milestone_id`, `due_date`, `created_by = advisor.id`
5. Advisor can return later to edit individual due dates

---

## Backward Compatibility

Existing `milestones` rows have `program_milestone_id = null` and `created_by = null`. They remain visible to students on their timeline and milestone list but are otherwise unmanaged. Advisors can delete them and replace with program-assigned ones.

---

## Out of Scope

- Milestone completion approval workflow (planned for a future change)
- Reusable milestone catalog across programs (not needed — milestones belong to a program)
- Advisor self-registration
- OAuth / social login
