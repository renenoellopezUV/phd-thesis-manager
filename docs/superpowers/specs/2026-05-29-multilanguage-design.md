# Multilanguage Support (EN/ES) — Design Spec

**Date:** 2026-05-29  
**Status:** Approved  
**Scope:** Full app — all pages, components, and error messages

---

## Overview

Add English/Spanish support to the PhD Thesis Manager using `next-intl` without URL-based routing. Language preference is stored in the user's Supabase profile for authenticated users, and detected from the browser's `Accept-Language` header for public pages.

---

## Architecture

### Locale Resolution (Middleware)

Every request passes through `middleware.ts`, which determines the active locale in this order:

1. Read `NEXT_LOCALE` cookie — if present, use it (acts as cache)
2. If user is authenticated, read `profiles.locale` from Supabase — set cookie to match
3. If unauthenticated, parse `Accept-Language` request header
4. Fallback: `'en'`

The resolved locale is stored in the `NEXT_LOCALE` cookie so downstream Server Components and Client Components can access it without additional DB reads.

### next-intl Configuration

- **Mode:** Without i18n routing (no `/en/`, `/es/` URL prefixes — URLs stay unchanged)
- **Config file:** `src/i18n/request.ts` — reads locale from cookie and passes to next-intl
- **Server Components:** `await getTranslations('namespace')`
- **Client Components:** `useTranslations('namespace')` hook
- **Provider:** `NextIntlClientProvider` in `src/app/layout.tsx`, locale and messages passed as props

### Translation Files

```
messages/
  en.json   ← source of truth
  es.json   ← same shape, Spanish values
```

Organized by namespace:

| Namespace | Covers |
|-----------|--------|
| `nav` | Navigation links, app shell |
| `login` | Login page |
| `profile` | Profile page |
| `milestones` | Milestones page + MilestoneCard |
| `timeline` | Timeline page |
| `admin` | Admin users + programs pages |
| `advisor` | Advisor students pages |
| `setup` | Setup/bootstrap page |
| `common` | Shared labels: save, cancel, loading, error, etc. |

TypeScript enforces valid keys at compile time via next-intl's type inference — `t('invalid-key')` is a compile error.

---

## Database

### Migration

```sql
ALTER TABLE profiles
ADD COLUMN locale text NOT NULL DEFAULT 'en'
CHECK (locale IN ('en', 'es'));
```

File: `supabase/migrations/<timestamp>_add_locale_to_profiles.sql`

### RLS

No new policies needed — `locale` is part of the existing `profiles` row. Existing RLS policies (users can read/update their own profile) already cover this column.

---

## Language Switcher

### Placement

`AppNav.tsx` — visible on all authenticated pages. Also rendered on public pages (login, setup) for unauthenticated users.

### Behavior

**Authenticated user changes language:**
1. Click `EN` or `ES` toggle
2. Call Server Action `updateLocale(locale)` → updates `profiles.locale` via Supabase upsert (consistent with existing `updateProfile` pattern in `src/app/actions/profile.ts`)
3. Set `NEXT_LOCALE` cookie to new locale
4. `router.refresh()` — Server Components reload with new locale, no full page navigation

**Unauthenticated user changes language:**
1. Click toggle
2. Set `NEXT_LOCALE` cookie only (no profile to update)
3. `router.refresh()`

### Component

New Client Component: `src/components/LanguageSwitcher.tsx`  
Renders as a simple `EN | ES` toggle. Active locale is highlighted.

---

## Error Handling

- If Supabase profile read fails in middleware, fall back to `Accept-Language` header
- If `updateLocale` Server Action fails, show an inline error but keep the cookie update so the UI still reflects the change
- If a translation key is missing in `es.json`, next-intl falls back to `en.json` automatically

---

## Testing

Business logic covered by unit tests:
- Locale resolution order in middleware (cookie → profile → Accept-Language → fallback)
- `PATCH /api/profile` updates locale correctly and rejects invalid values

UI components (LanguageSwitcher, translated pages) are not tested in v1 per project convention.

---

## Out of Scope

- More than 2 languages (architecture supports adding more later by adding a new JSON file and updating the DB check constraint)
- RTL language support
- Translating dynamic content stored in Supabase (program names, milestone titles) — only UI strings are translated
- SEO / hreflang tags (no URL-based routing)
