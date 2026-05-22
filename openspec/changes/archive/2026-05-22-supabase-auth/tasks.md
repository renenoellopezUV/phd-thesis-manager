## 1. Dependencies & Environment

- [x] 1.1 Install `@supabase/supabase-js` and `@supabase/ssr` via npm
- [x] 1.2 Create `.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL=` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=` as placeholders
- [x] 1.3 Add `UserRole` type (`'student' | 'advisor' | 'admin'`) and `ROLE_LABELS` map to `src/types/index.ts`
- [x] 1.4 Add `getUserRole(user: User): UserRole` helper to `src/types/index.ts` that reads `user.user_metadata.role` and defaults to `'student'`

## 2. Supabase Client Factories

- [x] 2.1 Create `src/lib/supabase/client.ts` — exports `createClient()` using `createBrowserClient` from `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] 2.2 Create `src/lib/supabase/server.ts` — exports `async createClient()` using `createServerClient` from `@supabase/ssr`, reading and writing session cookies via `await cookies()` from `next/headers`

## 3. Middleware & Route Protection

- [x] 3.1 Create `src/middleware.ts` using `createServerClient` from `@supabase/ssr` to read and refresh the session on every request
- [x] 3.2 In the middleware, redirect unauthenticated requests to `/login?redirectTo=<pathname>` for all protected routes
- [x] 3.3 Redirect authenticated users who visit `/login` or `/signup` to `/`
- [x] 3.4 Configure the middleware `matcher` to exclude `/_next/*`, `/favicon.ico`, `/login`, and `/signup` from the auth check

## 4. Login Page

- [x] 4.1 Create `src/app/login/page.tsx` as a client component with email and password fields
- [x] 4.2 Add client-side validation: show inline errors if email or password is empty on submit
- [x] 4.3 Call `supabase.auth.signInWithPassword()` on submit; on success redirect to `searchParams.get('redirectTo') ?? '/'` using `useRouter().push()`
- [x] 4.4 Display the Supabase error message inline below the form on failed sign-in
- [x] 4.5 Add a "Create account" link from `/login` to `/signup`

## 5. Signup Page

- [x] 5.1 Create `src/app/signup/page.tsx` as a client component with email, password, password confirmation, and role selector fields
- [x] 5.2 Add client-side validation: required fields, password confirmation match; show inline errors without making the Supabase call
- [x] 5.3 Call `supabase.auth.signUp({ email, password, options: { data: { role } } })` on valid submit; on success redirect to `/`
- [x] 5.4 Display Supabase error messages (e.g., "User already registered") inline below the form
- [x] 5.5 Add a "Sign in" link from `/signup` to `/login`

## 6. Nav Bar Updates

- [x] 6.1 Update `src/components/AppNav.tsx` to fetch the current user client-side using `supabase.auth.getUser()` on mount
- [x] 6.2 Display the user's email and role label in the nav when authenticated
- [x] 6.3 Add a sign-out button to the nav that calls `supabase.auth.signOut()` and redirects to `/login`
- [x] 6.4 Hide the nav user info and show nothing (or a "Sign in" link) when unauthenticated

## 7. ThesisContext Update

- [x] 7.1 Update `ThesisContext.tsx` to accept an optional `userId` prop on `ThesisProvider`
- [x] 7.2 In `src/app/layout.tsx`, read the current user server-side (via `createClient()` from `src/lib/supabase/server.ts`) and pass `user?.id` to `ThesisProvider`
- [x] 7.3 In `ThesisContext.tsx`, initialise the seed student's `id` to the received `userId` (falling back to `'student-1'` if undefined)
