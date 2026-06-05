# PhD Thesis Manager

A web application for managing the PhD thesis process. Students track their progress through dissertation stages, advisors manage their students' milestones, and admins control users, programs, and assignments.

## Features

- **Student view** — dashboard with stage progress, milestone tracking, and timeline
- **Advisor view** — manage assigned students' milestones and program assignments
- **Admin view** — invite users, assign roles, set advisor–student relationships scoped by program, reset passwords, verify emails
- **Multilingual** — English and Spanish, with per-user locale preference persisted in profile
- **Program model** — admin creates programs; advisors and students self-assign to a program; advisor assignment is restricted to matching programs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth & Database | Supabase (Postgres + Auth) |
| Internationalization | next-intl v4 |
| Testing | Jest + ts-jest |
| Deployment | Netlify (auto-migration on deploy) |

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + site URL vars
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first run, visit `/setup` to bootstrap the first admin account.

### Environment variables

See `.env.local.example` for all required variables. The minimum set:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

### Database

Migrations live in `supabase/migrations/`. Apply locally with:

```bash
supabase db push
```

Netlify runs migrations automatically on every deploy via `netlify.toml`.

## Project Structure

```
src/
  app/
    actions/          # Server actions (auth, profile, admin ops)
    admin/            # Admin pages: users, programs
    advisor/          # Advisor pages: student management
    milestones/       # Student milestone tracking
    profile/          # User profile editing
    timeline/         # Milestone timeline view
  components/         # Shared UI (nav, health badge, language switcher)
  lib/supabase/       # Supabase client factories (server, admin, browser)
  types/              # TypeScript types (database rows, domain types)
  __tests__/          # Unit tests for server actions
messages/             # i18n translation files (en.json, es.json)
supabase/migrations/  # SQL migrations
docs/superpowers/
  specs/              # Approved design documents
  plans/              # Step-by-step implementation plans
```

## Development Workflow

This project uses **Spec-Driven Development** with **Superpowers** (a Claude Code skill set) and a **multiagent execution model**.

### Process

```
Brainstorm → Design Spec → Implementation Plan → Multiagent Execution → Review → Merge
```

1. **Brainstorm** (`superpowers:brainstorming`) — collaborative dialogue to define scope, surface edge cases, and choose an approach before writing any code
2. **Design spec** — saved to `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md`; reviewed and approved by the developer before planning begins
3. **Implementation plan** (`superpowers:writing-plans`) — bite-sized TDD tasks with exact file paths and complete code; saved to `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`
4. **Multiagent execution** (`superpowers:subagent-driven-development`) — a controller dispatches a fresh subagent per task; each task goes through two review gates before the next begins:
   - **Spec compliance review** — does the code match the spec exactly?
   - **Code quality review** — is it well-written, type-safe, and free of dead code?
5. **Final review** — a holistic cross-file review of the entire feature
6. **Finish** (`superpowers:finishing-a-development-branch`) — tests verified, pushed to remote

### Why multiagent?

Each subagent gets a focused, self-contained context — no session history to pollute its reasoning. The controller coordinates without implementing, keeping its own context clean for review and replanning. Two-stage review gates catch both spec drift and quality issues before they compound into larger problems.

### TDD policy

Business logic (server actions, auth flows, data mutations) is tested first — tests are written before implementation. UI components are not unit-tested in v1.

## Current Status

- [x] Auth with roles (student, advisor, admin)
- [x] Bootstrap flow (`/setup`) for first admin
- [x] Student progress dashboard and milestone tracking
- [x] Advisor milestone management
- [x] Admin user management (invite, role assignment, password reset, email verification)
- [x] Program model (admin creates programs; users self-assign; advisors scoped to program)
- [x] Multilingual (English / Spanish)
- [ ] Email notifications and reminders
- [ ] OAuth / social login
