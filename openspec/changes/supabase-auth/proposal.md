## Why

The application currently has no authentication — anyone with the URL can access all data. Adding Supabase Auth gives each user a real identity, enables advisor and admin views, and is the prerequisite for persisting thesis data server-side in a future change.

## What Changes

- Add Supabase Auth (email/password) for three role types: `student`, `advisor`, `admin`
- Introduce login and signup pages at `/login` and `/signup`
- Protect all existing routes (`/`, `/milestones`, `/timeline`) so unauthenticated users are redirected to `/login`
- Store the user's role in Supabase user metadata (`app_metadata.role`) set at signup
- Add a sign-out action accessible from the nav

## Capabilities

### New Capabilities
- `auth-session`: Supabase Auth session lifecycle — sign in, sign out, session persistence via Supabase cookies, and access to the current user object throughout the app
- `user-roles`: Role assignment (`student` | `advisor` | `admin`) stored in `app_metadata.role`, role enforcement for role-restricted pages, and a role guard utility
- `login-signup-ui`: Login (`/login`) and signup (`/signup`) pages with email/password forms, inline validation, error messaging, and redirect-after-auth
- `route-protection`: Next.js middleware that checks for a valid Supabase session on every request and redirects unauthenticated users to `/login`, preserving the requested URL as a redirect param

### Modified Capabilities
- `student-profile`: The `ThesisContext` seed student will be tied to the authenticated user's ID; the profile's `id` field SHALL match `auth.user.id` rather than a hard-coded string

## Impact

- New dependencies: `@supabase/supabase-js`, `@supabase/ssr`
- New environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- New files: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts`
- New pages: `src/app/login/page.tsx`, `src/app/signup/page.tsx`
- Modified: `src/app/layout.tsx` (sign-out button in nav), `src/context/ThesisContext.tsx` (seed student ID from auth user)
- No database schema migrations yet — roles live in Supabase Auth metadata; thesis data persistence is deferred to a later change
