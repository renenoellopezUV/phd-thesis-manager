# Multilanguage EN/ES Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add English/Spanish support to all pages using next-intl (no URL routing), with locale stored in the user's Supabase profile.

**Architecture:** next-intl without i18n routing — locale is resolved per-request via cookie (`NEXT_LOCALE`), which is set by middleware from Supabase profile (auth'd) or `Accept-Language` header (unauth'd). `NextIntlClientProvider` in layout.tsx passes messages to all Client Components.

**Tech Stack:** next-intl, Next.js App Router, Supabase, TypeScript

---

## File Map

| Action | File |
|--------|------|
| Create | `messages/en.json` |
| Create | `messages/es.json` |
| Create | `src/lib/locale.ts` |
| Create | `src/i18n/request.ts` |
| Create | `src/global.d.ts` |
| Create | `src/app/actions/locale.ts` |
| Create | `src/components/LanguageSwitcher.tsx` |
| Create | `src/__tests__/lib/locale.test.ts` |
| Create | `supabase/migrations/20260529000001_add_locale_to_profiles.sql` |
| Modify | `next.config.ts` |
| Modify | `src/middleware.ts` |
| Modify | `src/app/layout.tsx` |
| Modify | `src/types/database.ts` |
| Modify | `src/components/AppNav.tsx` |
| Modify | `src/components/HealthBadge.tsx` |
| Modify | `src/components/MilestoneCard.tsx` |
| Modify | `src/components/TimelineClient.tsx` |
| Modify | `src/app/page.tsx` |
| Modify | `src/app/login/page.tsx` |
| Modify | `src/app/verify-email/page.tsx` |
| Modify | `src/app/profile/page.tsx` |
| Modify | `src/app/profile/ProfileForm.tsx` |
| Modify | `src/app/milestones/MilestonesClient.tsx` |
| Modify | `src/app/timeline/page.tsx` |
| Modify | `src/app/setup/page.tsx` |
| Modify | `src/app/admin/users/page.tsx` |
| Modify | `src/app/admin/users/InviteUserForm.tsx` |
| Modify | `src/app/admin/users/RoleSelector.tsx` |
| Modify | `src/app/admin/users/AdvisorAssigner.tsx` |
| Modify | `src/app/admin/programs/page.tsx` |
| Modify | `src/app/admin/programs/CreateProgramButton.tsx` |
| Modify | `src/app/admin/programs/[id]/ProgramForm.tsx` |
| Modify | `src/app/admin/programs/[id]/MilestoneDefinitionList.tsx` |
| Modify | `src/app/advisor/students/page.tsx` |
| Modify | `src/app/advisor/students/[studentId]/page.tsx` |
| Modify | `src/app/advisor/students/[studentId]/AssignProgramForm.tsx` |
| Modify | `src/app/advisor/students/[studentId]/MilestoneDateEditor.tsx` |

---

## Task 1: Install next-intl and create locale foundation

**Files:**
- Create: `src/lib/locale.ts`
- Create: `src/i18n/request.ts`
- Create: `src/global.d.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Install next-intl**

```bash
npm install next-intl
```

Expected output: `added N packages` — no peer dependency errors.

- [ ] **Step 2: Create `src/lib/locale.ts`**

```ts
export type Locale = 'en' | 'es'
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'es']
export const DEFAULT_LOCALE: Locale = 'en'

export function isValidLocale(value: string | undefined | null): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

export function parseAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE
  for (const seg of header.split(',')) {
    const lang = seg.split(';')[0].trim().toLowerCase()
    if (lang.startsWith('es')) return 'es'
    if (lang.startsWith('en')) return 'en'
  }
  return DEFAULT_LOCALE
}
```

- [ ] **Step 3: Create `src/i18n/request.ts`**

```ts
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { isValidLocale, DEFAULT_LOCALE } from '@/lib/locale'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value
  const locale = isValidLocale(raw) ? raw : DEFAULT_LOCALE
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 4: Create `src/global.d.ts`** (enables TypeScript key inference for `t()`)

```ts
import en from '../messages/en.json'

type Messages = typeof en

declare global {
  interface IntlMessages extends Messages {}
}
```

- [ ] **Step 5: Update `next.config.ts`**

```ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {}

export default withNextIntl(nextConfig)
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/locale.ts src/i18n/request.ts src/global.d.ts next.config.ts package.json package-lock.json
git commit -m "feat: install next-intl and scaffold locale foundation"
```

---

## Task 2: Write and run locale utility tests

**Files:**
- Create: `src/__tests__/lib/locale.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { isValidLocale, parseAcceptLanguage, DEFAULT_LOCALE } from '@/lib/locale'

describe('isValidLocale', () => {
  it('accepts en', () => expect(isValidLocale('en')).toBe(true))
  it('accepts es', () => expect(isValidLocale('es')).toBe(true))
  it('rejects fr', () => expect(isValidLocale('fr')).toBe(false))
  it('rejects undefined', () => expect(isValidLocale(undefined)).toBe(false))
  it('rejects null', () => expect(isValidLocale(null)).toBe(false))
  it('rejects empty string', () => expect(isValidLocale('')).toBe(false))
})

describe('parseAcceptLanguage', () => {
  it('returns en for en-US header', () =>
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en'))
  it('returns es when es is first', () =>
    expect(parseAcceptLanguage('es-MX,es;q=0.9,en;q=0.8')).toBe('es'))
  it('returns es for bare es', () =>
    expect(parseAcceptLanguage('es,en-US;q=0.9')).toBe('es'))
  it('returns default for null', () =>
    expect(parseAcceptLanguage(null)).toBe(DEFAULT_LOCALE))
  it('returns default for empty string', () =>
    expect(parseAcceptLanguage('')).toBe(DEFAULT_LOCALE))
  it('returns default for unknown language', () =>
    expect(parseAcceptLanguage('fr-FR,fr;q=0.9')).toBe(DEFAULT_LOCALE))
  it('skips unknown and picks known', () =>
    expect(parseAcceptLanguage('fr;q=0.9,es;q=0.8')).toBe('es'))
})
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --testPathPattern=locale
```

Expected: `9 passed, 0 failed`

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/lib/locale.test.ts
git commit -m "test: add locale utility tests"
```

---

## Task 3: Supabase migration + update DbProfile type

**Files:**
- Create: `supabase/migrations/20260529000001_add_locale_to_profiles.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Create migration file**

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en'
    CHECK (locale IN ('en', 'es'));
```

- [ ] **Step 2: Run migration**

```bash
supabase db push
```

Expected: migration applies with no errors.

- [ ] **Step 3: Update `src/types/database.ts`** — add `locale` field to `DbProfile`

Find the `DbProfile` type and add one line:

```ts
export type DbProfile = {
  id: string
  name: string
  email: string
  advisor_id: string | null
  department: string | null
  program: string | null
  start_date: string | null
  expected_graduation: string | null
  stage: string
  locale: string          // ← add this line
  created_at: string
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260529000001_add_locale_to_profiles.sql src/types/database.ts
git commit -m "feat: add locale column to profiles table"
```

---

## Task 4: Create updateLocale Server Action

**Files:**
- Create: `src/app/actions/locale.ts`

- [ ] **Step 1: Create the action**

```ts
'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isValidLocale, type Locale } from '@/lib/locale'

export async function updateLocale(locale: Locale): Promise<{ error?: string }> {
  if (!isValidLocale(locale)) return { error: 'Invalid locale' }

  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email ?? '', locale })
    if (error) return { error: error.message }
  }

  return {}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/locale.ts
git commit -m "feat: add updateLocale server action"
```

---

## Task 5: Update middleware to detect and set locale

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add locale imports at the top of `src/middleware.ts`**

After the existing imports, add:

```ts
import { isValidLocale, parseAcceptLanguage, DEFAULT_LOCALE, type Locale } from '@/lib/locale'
```

- [ ] **Step 2: Add locale detection block just before `return supabaseResponse` at the end of the middleware function**

Replace the final `return supabaseResponse` with:

```ts
  // ── Locale detection ─────────────────────────────────────────────────────
  const rawLocale = request.cookies.get('NEXT_LOCALE')?.value
  let locale: Locale

  if (isValidLocale(rawLocale)) {
    locale = rawLocale
  } else if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('locale')
        .eq('id', user.id)
        .single()
      locale = isValidLocale(profile?.locale) ? (profile.locale as Locale) : DEFAULT_LOCALE
    } catch {
      locale = DEFAULT_LOCALE
    }
  } else {
    locale = parseAcceptLanguage(request.headers.get('accept-language'))
  }

  supabaseResponse.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  // ── End locale detection ──────────────────────────────────────────────────

  return supabaseResponse
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: detect and set locale cookie in middleware"
```

---

## Task 6: Update layout.tsx with NextIntlClientProvider

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace `src/app/layout.tsx` with:**

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import AppNav from '@/components/AppNav'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PhD Thesis Manager',
  description: 'Track your doctoral thesis milestones and progress',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <NextIntlClientProvider messages={messages}>
          <AppNav />
          <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wrap app in NextIntlClientProvider"
```

---

## Task 7: Create translation files

**Files:**
- Create: `messages/en.json`
- Create: `messages/es.json`

- [ ] **Step 1: Create `messages/en.json`**

```json
{
  "nav": {
    "appName": "PhD Thesis Manager",
    "dashboard": "Dashboard",
    "milestones": "Milestones",
    "timeline": "Timeline",
    "programs": "Programs",
    "users": "Users",
    "students": "Students",
    "signOut": "Sign out",
    "signIn": "Sign in"
  },
  "login": {
    "title": "Sign in",
    "subtitle": "PhD Thesis Manager",
    "email": "Email",
    "password": "Password",
    "submit": "Sign in",
    "submitting": "Signing in…",
    "contactAdmin": "Contact your administrator to create an account.",
    "emailRequired": "Email is required",
    "passwordRequired": "Password is required"
  },
  "dashboard": {
    "profileNotSetup": "Your profile isn't set up yet.",
    "completeProfile": "Complete your profile",
    "editProfile": "Edit profile",
    "advisor": "Advisor",
    "department": "Department",
    "stage": "Stage",
    "started": "Started",
    "expectedGraduation": "Expected Graduation",
    "totalMilestones": "Total Milestones",
    "completed": "Completed",
    "percentDone": "{percent}% done",
    "overdue": "Overdue",
    "overdueNone": "None — great work!",
    "overdueAttention": "Need attention",
    "monthsToGraduation": "Months to Graduation",
    "approx": "approx.",
    "upcomingSection": "Upcoming (next 30 days)",
    "noUpcoming": "No upcoming deadlines"
  },
  "milestones": {
    "title": "Milestones",
    "empty": "No milestones assigned yet. Your advisor will set these up.",
    "upcoming": "Upcoming ({count})",
    "completed": "Completed ({count})"
  },
  "milestoneCard": {
    "overdue": "Overdue",
    "due": "Due:",
    "completedOn": "Completed:",
    "markComplete": "Mark \"{title}\" as complete",
    "markIncomplete": "Mark \"{title}\" as incomplete",
    "deleteLabel": "Delete \"{title}\"",
    "deleteConfirm": "Delete \"{title}\"?"
  },
  "timeline": {
    "title": "Timeline",
    "empty": "No milestones to display on the timeline.",
    "legendCompleted": "Completed",
    "legendOverdue": "Overdue",
    "legendUpcoming": "Upcoming",
    "today": "Today",
    "statusCompleted": "Completed",
    "statusOverdue": "Overdue",
    "statusUpcoming": "Upcoming",
    "due": "Due:"
  },
  "profile": {
    "title": "Profile",
    "name": "Name",
    "department": "Department",
    "program": "Program",
    "startDate": "Start Date",
    "expectedGraduation": "Expected Graduation",
    "stage": "Stage",
    "save": "Save profile",
    "saving": "Saving…",
    "saved": "Profile saved."
  },
  "adminUsers": {
    "title": "Users ({count})",
    "loadError": "Failed to load users: {message}",
    "colEmail": "Email",
    "colRole": "Role",
    "colAdvisor": "Advisor",
    "colVerified": "Verified",
    "verified": "Verified",
    "unverified": "Unverified"
  },
  "inviteUser": {
    "button": "+ Invite User",
    "email": "Email",
    "role": "Role",
    "send": "Send Invite",
    "sending": "Sending…",
    "cancel": "Cancel",
    "emailRequired": "Email is required",
    "success": "Invite sent!"
  },
  "advisorAssigner": {
    "unassigned": "— unassigned —"
  },
  "adminPrograms": {
    "title": "Programs",
    "empty": "No programs yet. Create one to get started.",
    "editArrow": "Edit →"
  },
  "createProgram": {
    "button": "+ New Program",
    "namePlaceholder": "PhD Program",
    "descriptionPlaceholder": "Optional",
    "nameLabel": "Name *",
    "descriptionLabel": "Description",
    "submit": "Create",
    "submitting": "Creating…",
    "cancel": "Cancel"
  },
  "programForm": {
    "delete": "Delete program",
    "deleteConfirm": "Delete program \"{name}\"? This will remove all milestone definitions.",
    "nameLabel": "Name *",
    "descriptionLabel": "Description",
    "save": "Save",
    "saving": "Saving…",
    "saved": "Saved."
  },
  "milestoneDefinitionList": {
    "title": "Milestone Definitions ({count})",
    "remove": "Remove",
    "removeConfirm": "Remove \"{title}\" from this program?",
    "titleLabel": "Title *",
    "titlePlaceholder": "e.g. Qualifying Exam",
    "typeLabel": "Type",
    "descriptionLabel": "Description",
    "descriptionPlaceholder": "Optional",
    "add": "+ Add",
    "adding": "Adding…"
  },
  "advisorStudents": {
    "title": "My Students",
    "empty": "No students assigned yet.",
    "percentComplete": "{pct}% complete"
  },
  "studentDetail": {
    "backToStudents": "← Students",
    "milestonesCount": "Milestones ({count})"
  },
  "assignProgram": {
    "title": "Assign Program",
    "programLabel": "Program",
    "selectPlaceholder": "Select a program…",
    "dueDatesInstruction": "Set due dates for all milestones:",
    "selectRequired": "Select a program",
    "submit": "Assign Program",
    "submitting": "Assigning…"
  },
  "milestoneDateEditor": {
    "done": "✓ Done",
    "removeConfirm": "Remove milestone \"{title}\" from this student?"
  },
  "setup": {
    "title": "First-time setup",
    "subtitle": "No admin account found. Create one to get started.",
    "emailLabel": "Email",
    "passwordLabel": "Password",
    "confirmLabel": "Confirm password",
    "submit": "Create admin account",
    "submitting": "Creating account…",
    "emailRequired": "Email is required",
    "emailInvalid": "Invalid email address",
    "passwordRequired": "Password is required",
    "passwordTooShort": "Password must be at least 8 characters",
    "passwordMismatch": "Passwords do not match",
    "doneTitle": "✅ Admin account created",
    "doneBody": "You’re signed in. To skip this setup check on future deployments, add the following environment variable in Netlify:",
    "doneWarning": "⚠️ Do this now — until the flag is set, the setup endpoint remains accessible to anyone who can reach this deployment.",
    "goToAdmin": "Go to Admin Panel →",
    "signInFailed": "Account created, but automatic sign-in failed. Please log in manually on the login page.",
    "genericError": "Something went wrong",
    "serverError": "Server error ({status})",
    "unexpectedError": "Unexpected error: {message}"
  },
  "verifyEmail": {
    "title": "Check your email",
    "body": "We sent a verification link to {email}. Click the link to activate your account.",
    "resent": "Verification email resent.",
    "resend": "Resend verification email"
  },
  "stages": {
    "coursework": "Coursework",
    "qualifying": "Qualifying Exams",
    "proposal": "Proposal Defense",
    "research": "Research",
    "writing": "Writing",
    "defense": "Final Defense",
    "graduated": "Graduated"
  },
  "milestoneTypes": {
    "exam": "Exam",
    "defense": "Defense",
    "chapter": "Chapter",
    "committee-meeting": "Committee Meeting",
    "other": "Other"
  },
  "roles": {
    "student": "Student",
    "advisor": "Advisor",
    "admin": "Admin"
  },
  "health": {
    "onTrack": "On Track",
    "atRisk": "At Risk",
    "offTrack": "Off Track"
  }
}
```

- [ ] **Step 2: Create `messages/es.json`**

```json
{
  "nav": {
    "appName": "PhD Thesis Manager",
    "dashboard": "Inicio",
    "milestones": "Hitos",
    "timeline": "Cronograma",
    "programs": "Programas",
    "users": "Usuarios",
    "students": "Estudiantes",
    "signOut": "Cerrar sesión",
    "signIn": "Iniciar sesión"
  },
  "login": {
    "title": "Iniciar sesión",
    "subtitle": "PhD Thesis Manager",
    "email": "Correo electrónico",
    "password": "Contraseña",
    "submit": "Iniciar sesión",
    "submitting": "Iniciando sesión…",
    "contactAdmin": "Contacta a tu administrador para crear una cuenta.",
    "emailRequired": "El correo electrónico es requerido",
    "passwordRequired": "La contraseña es requerida"
  },
  "dashboard": {
    "profileNotSetup": "Tu perfil aún no está configurado.",
    "completeProfile": "Completa tu perfil",
    "editProfile": "Editar perfil",
    "advisor": "Asesor",
    "department": "Departamento",
    "stage": "Etapa",
    "started": "Inicio",
    "expectedGraduation": "Graduación esperada",
    "totalMilestones": "Total de hitos",
    "completed": "Completados",
    "percentDone": "{percent}% completado",
    "overdue": "Vencidos",
    "overdueNone": "Ninguno — ¡excelente trabajo!",
    "overdueAttention": "Requieren atención",
    "monthsToGraduation": "Meses para graduarse",
    "approx": "aprox.",
    "upcomingSection": "Próximos (30 días)",
    "noUpcoming": "Sin fechas límite próximas"
  },
  "milestones": {
    "title": "Hitos",
    "empty": "Aún no hay hitos asignados. Tu asesor los configurará.",
    "upcoming": "Pendientes ({count})",
    "completed": "Completados ({count})"
  },
  "milestoneCard": {
    "overdue": "Vencido",
    "due": "Fecha límite:",
    "completedOn": "Completado:",
    "markComplete": "Marcar \"{title}\" como completo",
    "markIncomplete": "Marcar \"{title}\" como incompleto",
    "deleteLabel": "Eliminar \"{title}\"",
    "deleteConfirm": "¿Eliminar \"{title}\"?"
  },
  "timeline": {
    "title": "Cronograma",
    "empty": "No hay hitos para mostrar en el cronograma.",
    "legendCompleted": "Completado",
    "legendOverdue": "Vencido",
    "legendUpcoming": "Próximo",
    "today": "Hoy",
    "statusCompleted": "Completado",
    "statusOverdue": "Vencido",
    "statusUpcoming": "Próximo",
    "due": "Fecha límite:"
  },
  "profile": {
    "title": "Perfil",
    "name": "Nombre",
    "department": "Departamento",
    "program": "Programa",
    "startDate": "Fecha de inicio",
    "expectedGraduation": "Graduación esperada",
    "stage": "Etapa",
    "save": "Guardar perfil",
    "saving": "Guardando…",
    "saved": "Perfil guardado."
  },
  "adminUsers": {
    "title": "Usuarios ({count})",
    "loadError": "Error al cargar usuarios: {message}",
    "colEmail": "Correo",
    "colRole": "Rol",
    "colAdvisor": "Asesor",
    "colVerified": "Verificado",
    "verified": "Verificado",
    "unverified": "Sin verificar"
  },
  "inviteUser": {
    "button": "+ Invitar usuario",
    "email": "Correo electrónico",
    "role": "Rol",
    "send": "Enviar invitación",
    "sending": "Enviando…",
    "cancel": "Cancelar",
    "emailRequired": "El correo electrónico es requerido",
    "success": "¡Invitación enviada!"
  },
  "advisorAssigner": {
    "unassigned": "— sin asignar —"
  },
  "adminPrograms": {
    "title": "Programas",
    "empty": "Aún no hay programas. Crea uno para comenzar.",
    "editArrow": "Editar →"
  },
  "createProgram": {
    "button": "+ Nuevo programa",
    "namePlaceholder": "Programa de doctorado",
    "descriptionPlaceholder": "Opcional",
    "nameLabel": "Nombre *",
    "descriptionLabel": "Descripción",
    "submit": "Crear",
    "submitting": "Creando…",
    "cancel": "Cancelar"
  },
  "programForm": {
    "delete": "Eliminar programa",
    "deleteConfirm": "¿Eliminar programa \"{name}\"? Esto eliminará todas las definiciones de hitos.",
    "nameLabel": "Nombre *",
    "descriptionLabel": "Descripción",
    "save": "Guardar",
    "saving": "Guardando…",
    "saved": "Guardado."
  },
  "milestoneDefinitionList": {
    "title": "Definiciones de hitos ({count})",
    "remove": "Eliminar",
    "removeConfirm": "¿Eliminar \"{title}\" de este programa?",
    "titleLabel": "Título *",
    "titlePlaceholder": "ej. Examen de calificación",
    "typeLabel": "Tipo",
    "descriptionLabel": "Descripción",
    "descriptionPlaceholder": "Opcional",
    "add": "+ Agregar",
    "adding": "Agregando…"
  },
  "advisorStudents": {
    "title": "Mis estudiantes",
    "empty": "Aún no hay estudiantes asignados.",
    "percentComplete": "{pct}% completado"
  },
  "studentDetail": {
    "backToStudents": "← Estudiantes",
    "milestonesCount": "Hitos ({count})"
  },
  "assignProgram": {
    "title": "Asignar programa",
    "programLabel": "Programa",
    "selectPlaceholder": "Selecciona un programa…",
    "dueDatesInstruction": "Establece fechas límite para todos los hitos:",
    "selectRequired": "Selecciona un programa",
    "submit": "Asignar programa",
    "submitting": "Asignando…"
  },
  "milestoneDateEditor": {
    "done": "✓ Listo",
    "removeConfirm": "¿Eliminar hito \"{title}\" de este estudiante?"
  },
  "setup": {
    "title": "Configuración inicial",
    "subtitle": "No se encontró cuenta de administrador. Crea una para comenzar.",
    "emailLabel": "Correo electrónico",
    "passwordLabel": "Contraseña",
    "confirmLabel": "Confirmar contraseña",
    "submit": "Crear cuenta de administrador",
    "submitting": "Creando cuenta…",
    "emailRequired": "El correo electrónico es requerido",
    "emailInvalid": "Dirección de correo inválida",
    "passwordRequired": "La contraseña es requerida",
    "passwordTooShort": "La contraseña debe tener al menos 8 caracteres",
    "passwordMismatch": "Las contraseñas no coinciden",
    "doneTitle": "✅ Cuenta de administrador creada",
    "doneBody": "Has iniciado sesión. Para omitir esta verificación en futuros despliegues, agrega la siguiente variable de entorno en Netlify:",
    "doneWarning": "⚠️ Házlo ahora — hasta que la variable esté configurada, el endpoint de configuración es accesible para cualquiera.",
    "goToAdmin": "Ir al Panel de Administración →",
    "signInFailed": "Cuenta creada, pero el inicio de sesión automático falló. Por favor inicia sesión manualmente.",
    "genericError": "Algo salió mal",
    "serverError": "Error del servidor ({status})",
    "unexpectedError": "Error inesperado: {message}"
  },
  "verifyEmail": {
    "title": "Revisa tu correo",
    "body": "Enviamos un enlace de verificación a {email}. Haz clic en el enlace para activar tu cuenta.",
    "resent": "Correo de verificación reenviado.",
    "resend": "Reenviar correo de verificación"
  },
  "stages": {
    "coursework": "Cursos",
    "qualifying": "Exámenes de calificación",
    "proposal": "Defensa de propuesta",
    "research": "Investigación",
    "writing": "Escritura",
    "defense": "Defensa final",
    "graduated": "Graduado"
  },
  "milestoneTypes": {
    "exam": "Examen",
    "defense": "Defensa",
    "chapter": "Capítulo",
    "committee-meeting": "Reunión de comité",
    "other": "Otro"
  },
  "roles": {
    "student": "Estudiante",
    "advisor": "Asesor",
    "admin": "Administrador"
  },
  "health": {
    "onTrack": "Al día",
    "atRisk": "En riesgo",
    "offTrack": "Atrasado"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "feat: add EN and ES translation files"
```

---

## Task 8: LanguageSwitcher component + update AppNav

**Files:**
- Create: `src/components/LanguageSwitcher.tsx`
- Modify: `src/components/AppNav.tsx`

- [ ] **Step 1: Create `src/components/LanguageSwitcher.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { updateLocale } from '@/app/actions/locale'
import type { Locale } from '@/lib/locale'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()

  async function handleSwitch(next: Locale) {
    if (next === locale) return
    await updateLocale(next)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      {(['en', 'es'] as Locale[]).map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-zinc-300 dark:text-zinc-600">|</span>}
          <button
            onClick={() => handleSwitch(l)}
            className={
              locale === l
                ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors'
            }
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/components/AppNav.tsx` with translated version**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getUserRole } from '@/types'
import LanguageSwitcher from './LanguageSwitcher'

function linkClass(href: string, pathname: string) {
  const active = pathname === href || pathname.startsWith(href + '/')
  return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    active
      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
  }`
}

export default function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const role = user ? getUserRole(user) : null

  const links = [
    { href: '/', label: t('dashboard') },
    { href: '/milestones', label: t('milestones') },
    { href: '/timeline', label: t('timeline') },
  ]

  return (
    <nav className="flex items-center gap-1 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <span className="mr-4 font-semibold text-sm text-zinc-800 dark:text-zinc-100 shrink-0">
        {t('appName')}
      </span>

      {links.map(({ href, label }) => (
        <Link key={href} href={href} className={linkClass(href, pathname)}>
          {label}
        </Link>
      ))}

      {role === 'admin' && (
        <Link href="/admin/programs" className={linkClass('/admin/programs', pathname)}>
          {t('programs')}
        </Link>
      )}
      {role === 'admin' && (
        <Link href="/admin/users" className={linkClass('/admin/users', pathname)}>
          {t('users')}
        </Link>
      )}
      {role === 'advisor' && (
        <Link href="/advisor/students" className={linkClass('/advisor/students', pathname)}>
          {t('students')}
        </Link>
      )}

      <div className="ml-auto flex items-center gap-3">
        <LanguageSwitcher />
        {user ? (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-tight">
                {user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              {t('signOut')}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            {t('signIn')}
          </Link>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LanguageSwitcher.tsx src/components/AppNav.tsx
git commit -m "feat: add LanguageSwitcher and translate AppNav"
```

---

## Task 9: Translate login and verify-email pages

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/verify-email/page.tsx`

- [ ] **Step 1: Replace `src/app/login/page.tsx`**

```tsx
'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('login')
  const redirectTo = searchParams.get('redirectTo') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const next: typeof errors = {}
    if (!email.trim()) next.email = t('emailRequired')
    if (!password) next.password = t('passwordRequired')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    if (!validate()) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setServerError(error.message); return }
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('email')}
        </label>
        <input
          id="email" type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('password')}
        </label>
        <input
          id="password" type="password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
      </div>
      {serverError && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
          {serverError}
        </p>
      )}
      <button
        type="submit" disabled={loading}
        className="w-full py-2 px-4 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t('submitting') : t('submit')}
      </button>
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">{t('contactAdmin')}</p>
    </form>
  )
}

export default function LoginPage() {
  const t = useTranslations('login')
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">{t('title')}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('subtitle')}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <Suspense><LoginForm /></Suspense>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/app/verify-email/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const t = useTranslations('verifyEmail')
  const [email, setEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  async function handleResend() {
    if (!email) return
    setStatus('idle'); setErrorMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) { setStatus('error'); setErrorMsg(error.message) }
    else setStatus('sent')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-sm w-full text-center space-y-4 p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="text-3xl">✉️</div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('body', { email: <span key="email" className="font-medium text-zinc-700 dark:text-zinc-300">{email ?? '…'}</span> })}
        </p>
        {status === 'sent' && <p className="text-sm text-green-600 dark:text-green-400">{t('resent')}</p>}
        {status === 'error' && <p className="text-sm text-red-500">{errorMsg}</p>}
        <button
          onClick={handleResend}
          className="mt-2 px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {t('resend')}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx src/app/verify-email/page.tsx
git commit -m "feat: translate login and verify-email pages"
```

---

## Task 10: Translate dashboard + HealthBadge

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/HealthBadge.tsx`

- [ ] **Step 1: Make `src/components/HealthBadge.tsx` async (Server Component) with translations**

```tsx
import { getTranslations } from 'next-intl/server'

type Props = { overdueCount: number }

export default async function HealthBadge({ overdueCount }: Props) {
  const t = await getTranslations('health')

  let key: 'onTrack' | 'atRisk' | 'offTrack'
  let className: string

  if (overdueCount === 0) {
    key = 'onTrack'
    className = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  } else if (overdueCount <= 2) {
    key = 'atRisk'
    className = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  } else {
    key = 'offTrack'
    className = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      {t(key)}
    </span>
  )
}
```

- [ ] **Step 2: Update `src/app/page.tsx`** — add `getTranslations` and replace all hardcoded strings

Add at the top of the file (after existing imports):
```ts
import { getTranslations } from 'next-intl/server'
```

Inside `DashboardPage`, add as the first line:
```ts
const t = await getTranslations('dashboard')
```

Replace hardcoded strings:

| Old | New |
|-----|-----|
| `"Your profile isn't set up yet."` | `{t('profileNotSetup')}` |
| `"Complete your profile"` | `{t('completeProfile')}` |
| `"Edit profile"` | `{t('editProfile')}` |
| `"Advisor"` | `{t('advisor')}` |
| `"Department"` | `{t('department')}` |
| `"Stage"` | `{t('stage')}` |
| `"Started"` | `{t('started')}` |
| `"Expected Graduation"` | `{t('expectedGraduation')}` |
| `STAGE_LABELS[stage]` | `t(`stages.${stage}` as any)` — add `const tStages = await getTranslations('stages')` and use `tStages(stage)` |
| `<StatCard label="Total Milestones" ...` | `<StatCard label={t('totalMilestones')} ...` |
| `<StatCard label="Completed" sub={\`${percentage}% done\`} ...` | `<StatCard label={t('completed')} sub={t('percentDone', { percent: percentage })} ...` |
| `<StatCard label="Overdue" sub={overdue === 0 ? 'None — great work!' : 'Need attention'} ...` | `<StatCard label={t('overdue')} sub={overdue === 0 ? t('overdueNone') : t('overdueAttention')} ...` |
| `<StatCard label="Months to Graduation" sub="approx." ...` | `<StatCard label={t('monthsToGraduation')} sub={t('approx')} ...` |
| `"Upcoming (next 30 days)"` | `{t('upcomingSection')}` |
| `"No upcoming deadlines"` | `{t('noUpcoming')}` |
| `toLocaleDateString('en-US', ...)` | `toLocaleDateString(locale, ...)` — add `import { getLocale } from 'next-intl/server'` and `const locale = await getLocale()` |

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/components/HealthBadge.tsx
git commit -m "feat: translate dashboard and HealthBadge"
```

---

## Task 11: Translate milestones

**Files:**
- Modify: `src/app/milestones/MilestonesClient.tsx`
- Modify: `src/components/MilestoneCard.tsx`

- [ ] **Step 1: Update `src/app/milestones/MilestonesClient.tsx`**

Add import: `import { useTranslations } from 'next-intl'`

Inside the component, add: `const t = useTranslations('milestones')`

Replace:
- `"No milestones assigned yet. Your advisor will set these up."` → `{t('empty')}`
- `<h1 className="text-lg font-semibold">Milestones</h1>` → `<h1 className="text-lg font-semibold">{t('title')}</h1>`
- `` `Upcoming (${incomplete.length})` `` → `{t('upcoming', { count: incomplete.length })}`
- `` `Completed (${complete.length})` `` → `{t('completed', { count: complete.length })}`

- [ ] **Step 2: Update `src/components/MilestoneCard.tsx`**

Add import: `import { useTranslations } from 'next-intl'`

Add to top of component body:
```tsx
const t = useTranslations('milestoneCard')
const tTypes = useTranslations('milestoneTypes')
```

Replace:
- `MILESTONE_TYPE_LABELS[milestone.type]` → `tTypes(milestone.type as any)`
- `"Overdue"` badge → `{t('overdue')}`
- `aria-label={`Mark "${milestone.title}" as ${milestone.completed ? 'incomplete' : 'complete'}`}` → `aria-label={milestone.completed ? t('markIncomplete', { title: milestone.title }) : t('markComplete', { title: milestone.title })}`
- `Due: {due.toLocaleDateString(...)}` → `` {t('due')} {due.toLocaleDateString(...)} ``
- `· Completed: ...` → `` · {t('completedOn')} ... ``
- `` confirm(`Delete "${milestone.title}"?`) `` → `confirm(t('deleteConfirm', { title: milestone.title }))`
- `aria-label={`Delete "${milestone.title}"`}` → `aria-label={t('deleteLabel', { title: milestone.title })}`

Remove the `MILESTONE_TYPE_LABELS` import from `@/types` since it's no longer used.

- [ ] **Step 3: Commit**

```bash
git add src/app/milestones/MilestonesClient.tsx src/components/MilestoneCard.tsx
git commit -m "feat: translate milestones and MilestoneCard"
```

---

## Task 12: Translate timeline

**Files:**
- Modify: `src/app/timeline/page.tsx`
- Modify: `src/components/TimelineClient.tsx`

- [ ] **Step 1: Update `src/app/timeline/page.tsx`**

Add: `import { getTranslations } from 'next-intl/server'`

Make the function async, add `const t = await getTranslations('timeline')`.

Replace `"Timeline"` → `{t('title')}`.

- [ ] **Step 2: Update `src/components/TimelineClient.tsx`**

Add imports:
```tsx
import { useTranslations } from 'next-intl'
```

Add to component body:
```tsx
const t = useTranslations('timeline')
const tTypes = useTranslations('milestoneTypes')
```

Replace:
- `"No milestones to display on the timeline."` → `{t('empty')}`
- Legend `"Completed"` → `{t('legendCompleted')}`
- Legend `"Overdue"` → `{t('legendOverdue')}`
- Legend `"Upcoming"` → `{t('legendUpcoming')}`
- `"Today"` (both occurrences) → `{t('today')}`
- In aria-label: `MILESTONE_TYPE_LABELS[milestone.type]` → `tTypes(milestone.type as any)`
- In aria-label: `'Completed'`, `'Overdue'`, `'Upcoming'` → `t('statusCompleted')`, `t('statusOverdue')`, `t('statusUpcoming')`
- Tooltip `<p className="text-zinc-500...">` for type → `tTypes(milestone.type as any)`
- Tooltip `"Due:"` → `{t('due')}`
- Tooltip status strings → `t('statusCompleted')`, `t('statusOverdue')`, `t('statusUpcoming')`

Remove `MILESTONE_TYPE_LABELS` import from `@/types`.

- [ ] **Step 3: Commit**

```bash
git add src/app/timeline/page.tsx src/components/TimelineClient.tsx
git commit -m "feat: translate timeline"
```

---

## Task 13: Translate profile

**Files:**
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/profile/ProfileForm.tsx`

- [ ] **Step 1: Update `src/app/profile/page.tsx`**

Read the file first. Add `getTranslations` import, make it async if not already, and replace the page `<h1>` with `t('profile.title')`.

- [ ] **Step 2: Update `src/app/profile/ProfileForm.tsx`**

Add import: `import { useTranslations } from 'next-intl'`

Add inside component:
```tsx
const t = useTranslations('profile')
const tStages = useTranslations('stages')
```

Replace hardcoded field labels in the `field()` calls:
- `field('Name', ...)` → `field(t('name'), ...)`
- `field('Department', ...)` → `field(t('department'), ...)`
- `field('Program', ...)` → `field(t('program'), ...)`
- `field('Start Date', ...)` → `field(t('startDate'), ...)`
- `field('Expected Graduation', ...)` → `field(t('expectedGraduation'), ...)`
- `<label>Stage</label>` → `<label>{t('stage')}</label>`
- Stage options: `STAGES.map(([value, label]) => ...)` → iterate over stage keys and use `tStages(value)` as label

Remove `STAGE_LABELS` import (no longer needed); keep `type StudentStage` import.

Replace button text:
- `{pending ? 'Saving…' : 'Save profile'}` → `{pending ? t('saving') : t('save')}`

Replace feedback messages:
- `"Profile saved."` → `{t('saved')}`

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/page.tsx src/app/profile/ProfileForm.tsx
git commit -m "feat: translate profile page"
```

---

## Task 14: Translate admin users pages

**Files:**
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/users/InviteUserForm.tsx`
- Modify: `src/app/admin/users/RoleSelector.tsx`
- Modify: `src/app/admin/users/AdvisorAssigner.tsx`

- [ ] **Step 1: Update `src/app/admin/users/page.tsx`**

Add: `import { getTranslations } from 'next-intl/server'`

Add: `const t = await getTranslations('adminUsers')`

Replace:
- `"Users"` heading → `` {t('title', { count: users.length })} ``
- Error: `` `Failed to load users: ${error.message}` `` → `{t('loadError', { message: error.message })}`
- Column headers: `"Email"` → `{t('colEmail')}`, `"Role"` → `{t('colRole')}`, `"Advisor"` → `{t('colAdvisor')}`, `"Verified"` → `{t('colVerified')}`
- `"Verified"` badge → `{t('verified')}`
- `"Unverified"` badge → `{t('unverified')}`
- Remove the `ROLE_LABELS` line at the bottom (role labels are now in translation file).

- [ ] **Step 2: Update `src/app/admin/users/InviteUserForm.tsx`**

Add import: `import { useTranslations } from 'next-intl'`

Add: `const t = useTranslations('inviteUser')` and `const tRoles = useTranslations('roles')`

Replace:
- `"+ Invite User"` → `{t('button')}`
- `"Email"` label → `{t('email')}`
- `"Role"` label → `{t('role')}`
- `"Send Invite"` / `"Sending…"` → `{pending ? t('sending') : t('send')}`
- `"Cancel"` → `{t('cancel')}`
- `'Email is required'` → `t('emailRequired')`
- `"Invite sent!"` → `{t('success')}`
- ROLES array: replace hardcoded labels with `tRoles(value)`:
  ```tsx
  const ROLE_VALUES: UserRole[] = ['student', 'advisor']
  // in the select: {ROLE_VALUES.map(v => <option key={v} value={v}>{tRoles(v)}</option>)}
  ```

- [ ] **Step 3: Update `src/app/admin/users/RoleSelector.tsx`**

Add import: `import { useTranslations } from 'next-intl'`

Add: `const tRoles = useTranslations('roles')`

Change the ROLES options to use translated labels:
```tsx
const ROLE_KEYS: UserRole[] = ['student', 'advisor', 'admin']
// in select: {ROLE_KEYS.map(v => <option key={v} value={v}>{tRoles(v)}</option>)}
```

Remove `ROLE_LABELS` import.

- [ ] **Step 4: Update `src/app/admin/users/AdvisorAssigner.tsx`**

Add import: `import { useTranslations } from 'next-intl'`

Add: `const t = useTranslations('advisorAssigner')`

Replace `"— unassigned —"` → `{t('unassigned')}`

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/users/
git commit -m "feat: translate admin users pages"
```

---

## Task 15: Translate admin programs pages

**Files:**
- Modify: `src/app/admin/programs/page.tsx`
- Modify: `src/app/admin/programs/CreateProgramButton.tsx`
- Modify: `src/app/admin/programs/[id]/ProgramForm.tsx`
- Modify: `src/app/admin/programs/[id]/MilestoneDefinitionList.tsx`

- [ ] **Step 1: Update `src/app/admin/programs/page.tsx`**

Add: `import { getTranslations } from 'next-intl/server'`

Add: `const t = await getTranslations('adminPrograms')`

Replace: `"Programs"` → `{t('title')}`, `"No programs yet. Create one to get started."` → `{t('empty')}`, `"Edit →"` → `{t('editArrow')}`

- [ ] **Step 2: Update `src/app/admin/programs/CreateProgramButton.tsx`**

Add: `import { useTranslations } from 'next-intl'`

Add: `const t = useTranslations('createProgram')`

Replace:
- `"+ New Program"` → `{t('button')}`
- `"Name *"` label → `{t('nameLabel')}`
- `"Description"` label → `{t('descriptionLabel')}`
- `placeholder="PhD Program"` → `placeholder={t('namePlaceholder')}`
- `placeholder="Optional"` → `placeholder={t('descriptionPlaceholder')}`
- `"Create"` / `"Creating…"` → `{pending ? t('submitting') : t('submit')}`
- `"Cancel"` → `{t('cancel')}`

- [ ] **Step 3: Update `src/app/admin/programs/[id]/ProgramForm.tsx`**

Add: `import { useTranslations } from 'next-intl'`

Add: `const t = useTranslations('programForm')`

Replace:
- `"Delete program"` button → `{t('delete')}`
- `` confirm(`Delete program "${program.name}"? ...`) `` → `confirm(t('deleteConfirm', { name: program.name }))`
- `"Name *"` label → `{t('nameLabel')}`
- `"Description"` label → `{t('descriptionLabel')}`
- `"Saved."` → `{t('saved')}`
- `"Save"` / `"Saving…"` → `{pending ? t('saving') : t('save')}`

- [ ] **Step 4: Update `src/app/admin/programs/[id]/MilestoneDefinitionList.tsx`**

Add: `import { useTranslations } from 'next-intl'`

Add:
```tsx
const t = useTranslations('milestoneDefinitionList')
const tTypes = useTranslations('milestoneTypes')
```

Replace:
- `` `Milestone Definitions (${definitions.length})` `` → `{t('title', { count: definitions.length })}`
- `MILESTONE_TYPE_LABELS[def.type as MilestoneType]` → `tTypes(def.type as any)`
- `"Remove"` button → `{t('remove')}`
- `` confirm(`Remove "${milestoneTitle}" from this program?`) `` → `confirm(t('removeConfirm', { title: milestoneTitle }))`
- `"Title *"` label → `{t('titleLabel')}`
- `placeholder="e.g. Qualifying Exam"` → `placeholder={t('titlePlaceholder')}`
- `"Type"` label → `{t('typeLabel')}`
- `"Description"` label → `{t('descriptionLabel')}`
- `placeholder="Optional"` → `placeholder={t('descriptionPlaceholder')}`
- `"+ Add"` / `"Adding…"` → `{pending ? t('adding') : t('add')}`
- Type select options: use `tTypes(v)` as labels for each type value
- Remove `MILESTONE_TYPE_LABELS` import.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/programs/
git commit -m "feat: translate admin programs pages"
```

---

## Task 16: Translate advisor pages

**Files:**
- Modify: `src/app/advisor/students/page.tsx`
- Modify: `src/app/advisor/students/[studentId]/page.tsx`
- Modify: `src/app/advisor/students/[studentId]/AssignProgramForm.tsx`
- Modify: `src/app/advisor/students/[studentId]/MilestoneDateEditor.tsx`

- [ ] **Step 1: Update `src/app/advisor/students/page.tsx`**

Add: `import { getTranslations } from 'next-intl/server'`

Add: `const t = await getTranslations('advisorStudents')`

Replace:
- Both `"My Students"` → `{t('title')}`
- `"No students assigned yet."` → `{t('empty')}`
- `` `${pct}% complete` `` → `{t('percentComplete', { pct })}`
- `STAGE_LABELS[stage]` — add `const tStages = await getTranslations('stages')` and use `tStages(stage)`

Remove `STAGE_LABELS` import.

- [ ] **Step 2: Update `src/app/advisor/students/[studentId]/page.tsx`**

Add: `import { getTranslations } from 'next-intl/server'`

Add: `const t = await getTranslations('studentDetail')`

Replace:
- `"← Students"` → `{t('backToStudents')}`
- `` `Milestones (${milestones.length})` `` → `{t('milestonesCount', { count: milestones.length })}`

- [ ] **Step 3: Update `src/app/advisor/students/[studentId]/AssignProgramForm.tsx`**

Add: `import { useTranslations } from 'next-intl'`

Add: `const t = useTranslations('assignProgram')`

Replace:
- `"Assign Program"` heading → `{t('title')}`
- `"Program"` label → `{t('programLabel')}`
- `"Select a program…"` option → `{t('selectPlaceholder')}`
- `"Set due dates for all milestones:"` → `{t('dueDatesInstruction')}`
- `'Select a program'` validation error → `t('selectRequired')`
- `"Assign Program"` / `"Assigning…"` button → `{pending ? t('submitting') : t('submit')}`

- [ ] **Step 4: Update `src/app/advisor/students/[studentId]/MilestoneDateEditor.tsx`**

Add: `import { useTranslations } from 'next-intl'`

Add:
```tsx
const t = useTranslations('milestoneDateEditor')
const tTypes = useTranslations('milestoneTypes')
```

Replace:
- `MILESTONE_TYPE_LABELS[m.type as MilestoneType]` → `tTypes(m.type as any)`
- `"✓ Done"` → `{t('done')}`
- `` confirm(`Remove milestone "${title}" from this student?`) `` → `confirm(t('removeConfirm', { title }))`

Remove `MILESTONE_TYPE_LABELS` import.

- [ ] **Step 5: Commit**

```bash
git add src/app/advisor/
git commit -m "feat: translate advisor pages"
```

---

## Task 17: Translate setup page

**Files:**
- Modify: `src/app/setup/page.tsx`

- [ ] **Step 1: Update `src/app/setup/page.tsx`**

Add: `import { useTranslations } from 'next-intl'`

Add at top of `SetupPage`: `const t = useTranslations('setup')`

Replace all hardcoded strings using the `setup.*` keys defined in `messages/en.json`:
- `"First-time setup"` → `{t('title')}`
- `"No admin account found. Create one to get started."` → `{t('subtitle')}`
- `"Email"` label → `{t('emailLabel')}`
- `"Password"` label → `{t('passwordLabel')}`
- `"Confirm password"` label → `{t('confirmLabel')}`
- `"Create admin account"` / `"Creating account…"` → `{loading ? t('submitting') : t('submit')}`
- All validation messages → `t('emailRequired')`, `t('emailInvalid')`, `t('passwordRequired')`, `t('passwordTooShort')`, `t('passwordMismatch')`
- `'Something went wrong'` → `t('genericError')`
- `` `Server error (${res.status})` `` → `t('serverError', { status: res.status })`
- `` `Unexpected error: ${...}` `` → `t('unexpectedError', { message: ... })`
- Done state: `"✅ Admin account created"` → `{t('doneTitle')}`, body text → `{t('doneBody')}`, warning → `{t('doneWarning')}`, link → `{t('goToAdmin')}`
- Sign-in failed error → `t('signInFailed')`

- [ ] **Step 2: Commit**

```bash
git add src/app/setup/page.tsx
git commit -m "feat: translate setup page"
```

---

## Task 18: Final verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding (common: `as any` on translation keys for dynamic lookups like `tStages(stage)` — use proper typed keys if TS complains).

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all existing tests pass plus the 9 new locale tests.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: successful build. Fix any import errors or missing translation keys if the build fails.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript and build issues after i18n integration"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ next-intl without URL routing (Task 1)
- ✅ Locale in Supabase profile (Tasks 3, 4)
- ✅ Middleware: cookie → profile → Accept-Language → fallback (Task 5)
- ✅ layout.tsx NextIntlClientProvider (Task 6)
- ✅ Translation files EN + ES (Task 7)
- ✅ LanguageSwitcher in AppNav (Task 8)
- ✅ All pages translated (Tasks 9–17)
- ✅ Tests for locale utility (Task 2)

**Type notes:** For dynamic translation key lookups (e.g., `tStages(stage)` where `stage` is a string), TypeScript will error because it expects a literal key. Use `tStages(stage as keyof typeof import('../messages/en.json')['stages'])` or simply cast with `as any` — the `src/global.d.ts` setup gives type safety for static keys.

**Missing from this plan (out of scope per spec):** Dynamic content translation (program names, milestone titles stored in Supabase), RTL support, SEO hreflang tags.
