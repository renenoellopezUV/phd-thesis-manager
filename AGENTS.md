<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PhD Thesis Manager — Claude Code Instructions

## Project Overview
A web application for managing the PhD thesis process, built with Next.js, Supabase, and deployed on Netlify. Users include students, advisors, and admins.

**Stack**: Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + Postgres) · Netlify

---

## Workflow

This project uses **OpenSpec + Superpowers** as the development workflow. Follow this process for every feature or fix:

### 1. Brainstorm (Superpowers) — always first
Before any proposal, brainstorm the idea with the developer:
- Identify scope, risks, and edge cases
- Clarify what's in and out of scope
- Suggest the simplest approach that solves the problem
- Do NOT skip this step, even for small features

### 2. Propose (OpenSpec)
Once the idea is clear from brainstorming:
```
/opsx:propose [feature name]
```
This generates `proposal.md`, `design.md`, `specs/`, and `tasks.md`. Review all artifacts before proceeding.

### 3. Implement (OpenSpec + Superpowers TDD)
```
/opsx:apply
```
- Apply **TDD for business logic only**: auth flows, data mutations, RLS policies, and utility functions
- UI components and pages do not require tests in v1
- Run tests before marking any business logic task as done

### 4. Archive (OpenSpec)
```
/opsx:archive
```
Always archive when a change is complete. This keeps specs in sync with the codebase.

---

## Flexibility Guidelines
This workflow is a **strong suggestion, not a prison**:
- If the developer says "just fix this quickly", skip brainstorm and propose — go straight to implementation
- If a task is a bug fix under 10 lines, skip the full workflow and fix it directly
- Always suggest the next workflow step, but don't block progress if the developer wants to move fast

---

## Supabase Patterns
- Never use the service role key client-side
- Always use `SUPABASE_SERVICE_ROLE_KEY` only in server-side Next.js routes (`/app/api/`)
- Every new table must have RLS enabled and explicit policies
- New migrations go in `supabase/migrations/` with a descriptive name
- Run `supabase db push` after every migration change
- Use `upsert` with `onConflict: 'id'` for profile saves

## Next.js Patterns
- Use App Router only — no Pages Router patterns
- Server Components by default, Client Components only when needed (interactivity, hooks)
- Environment variables: `NEXT_PUBLIC_` prefix only for client-safe values
- Keep API routes in `/app/api/` for any server-side Supabase admin operations

## TypeScript
- No `any` types — use proper types or `unknown`
- Define types for all Supabase table rows in `/types/database.ts`
- Use `zod` for form validation if added as a dependency

## Git
- Commit after each completed OpenSpec task
- Format: `feat:`, `fix:`, `chore:`, `refactor:`
- Never commit `.env.local` or secrets

---

## Current Status (v1)
- [x] Next.js project initialized
- [x] Supabase project connected
- [x] Auth with roles (student, advisor, admin)
- [x] Student progress tracking (hardcoded → Supabase)
- [x] Deployed to Netlify with auto-migrations
- [x] Profile save bug (fixed — updateProfile now uses upsert)
- [x] Advisor view (program assignment, milestone date editing)
- [x] Milestone ownership model (admin defines programs, advisor assigns, student read-only)
- [x] Admin user management (invite users, assign advisors)
- [ ] Notifications/reminders
- [ ] Password reset flow
- [ ] OAuth/social login

---

## Known Issues
- Email confirmation disabled in development (re-enable before production)
- Dashboard Advisor field shows raw UUID — needs a join to display advisor name
- Signup page removed; users must be invited by admin via `/admin/users`

---

## Auto-Update Instructions
After every `/opsx:archive`, Claude must automatically update this CLAUDE.md file:
- Move completed items from `[ ]` to `[x]` in the Current Status section
- Add any new patterns or conventions discovered during implementation to the relevant section
- Add any new known issues found during the change
- Update the Stack line if new dependencies were added
- Remove resolved items from the Known Issues section

**This is mandatory and part of the archive step — do it without being asked.**

## Git
- After every `/opsx:archive`, run `git add .` and `git commit` with a descriptive message
- Always suggest running `git push origin main` after committing