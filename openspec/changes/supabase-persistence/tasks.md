## 1. Database Schema & Migrations

- [x] 1.1 Create `supabase/migrations/001_profiles.sql` — `profiles` table with all columns, PK referencing `auth.users.id`, and RLS enabled
- [x] 1.2 Create `supabase/migrations/002_milestones.sql` — `milestones` table with FK to `profiles`, RLS enabled, and index on `profile_id`
- [x] 1.3 Add RLS policies to `profiles`: student owns their row; advisor reads rows where `advisor_email = auth.email()`; admin reads all via `auth.jwt()->'app_metadata'->>'role' = 'admin'`
- [x] 1.4 Add RLS policies to `milestones`: student owns their rows (`profile_id = auth.uid()`); advisor reads milestones of their students
- [x] 1.5 Create `supabase/migrations/003_handle_new_user.sql` — `handle_new_user` trigger function that inserts a `profiles` row and copies `raw_user_meta_data->>'role'` to `raw_app_meta_data` on new auth user creation
- [x] 1.6 Add `supabase/migrations/003_handle_new_user.sql` trigger binding on `auth.users` AFTER INSERT
- [x] 1.7 Add DB index on `profiles(advisor_email)` in `supabase/migrations/002_milestones.sql` or a dedicated migration

## 2. Environment & Types

- [x] 2.1 Add `SUPABASE_SERVICE_ROLE_KEY=` to `.env.local.example` (server-only, no `NEXT_PUBLIC_` prefix)
- [x] 2.2 Create `src/lib/supabase/admin.ts` — exports `createAdminClient()` using `createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY`; mark file as server-only
- [x] 2.3 Update `getUserRole()` in `src/types/index.ts` to read from `user.app_metadata.role` instead of `user.user_metadata.role`

## 3. Remove ThesisContext

- [x] 3.1 Delete `src/context/ThesisContext.tsx`
- [x] 3.2 Remove `ThesisProvider` import and usage from `src/app/layout.tsx`; remove `userId` prop pass-through
- [x] 3.3 Fix TypeScript errors in any component that imported `useThesis` (dashboard, milestones page, timeline page)

## 4. Server Actions

- [x] 4.1 Create `src/app/actions/milestones.ts` with `addMilestone(formData: FormData)` — validates title + due_date, inserts into `milestones` table with `profile_id = auth.uid()`, calls `revalidatePath('/milestones')` and `revalidatePath('/')`
- [x] 4.2 Add `toggleMilestone(id: string)` to `src/app/actions/milestones.ts` — fetches current `completed` state, toggles it, sets `completed_date = CURRENT_DATE` or null, calls `revalidatePath`
- [x] 4.3 Add `deleteMilestone(id: string)` to `src/app/actions/milestones.ts` — deletes milestone row (RLS ensures ownership), calls `revalidatePath`
- [x] 4.4 Create `src/app/actions/profile.ts` with `updateProfile(formData: FormData)` — updates the authenticated user's `profiles` row, calls `revalidatePath('/')`
- [x] 4.5 Create `src/app/actions/admin.ts` with `changeUserRole(userId: string, role: UserRole)` — calls `createAdminClient().auth.admin.updateUserById(userId, { app_metadata: { role } })`

## 5. Dashboard & Profile Pages (DB-backed)

- [x] 5.1 Rewrite `src/app/page.tsx` as an `async` Server Component that fetches the profile and milestones from Supabase; compute stats server-side and pass as props to existing UI components
- [x] 5.2 Add a "complete your profile" empty-state if no `profiles` row exists for the user
- [x] 5.3 Create `src/app/profile/page.tsx` with a profile-edit form whose submit calls the `updateProfile` Server Action

## 6. Milestones Page (DB-backed)

- [x] 6.1 Rewrite `src/app/milestones/page.tsx` as an `async` Server Component that fetches milestones from Supabase for the authenticated user
- [x] 6.2 Wire the add-milestone form to call the `addMilestone` Server Action (replace `dispatch(ADD_MILESTONE)`)
- [x] 6.3 Wire the milestone checkbox to call `toggleMilestone` via a client-side form action or button (replace `dispatch(TOGGLE_MILESTONE)`)
- [x] 6.4 Wire the delete button to call `deleteMilestone` (replace `dispatch(DELETE_MILESTONE)`)

## 7. Timeline Page (DB-backed)

- [x] 7.1 Rewrite `src/app/timeline/page.tsx` as an `async` Server Component that fetches milestones from Supabase; pass sorted milestones as props to the existing client timeline rendering component
- [x] 7.2 Extract the interactive timeline DOM into a `src/components/TimelineClient.tsx` client component that accepts `milestones` as a prop (needed since Server Components can't use `useState`)

## 8. Email Verification

- [x] 8.1 Update `src/middleware.ts` to also check `user.email_confirmed_at`; redirect unverified users to `/verify-email` (exclude `/verify-email` and `/auth/confirm` from this check)
- [x] 8.2 Create `src/app/verify-email/page.tsx` — client component showing the user's email, instructions, and a "Resend" button that calls `supabase.auth.resend()`
- [x] 8.3 Create `src/app/auth/confirm/route.ts` — Route Handler that reads `token_hash` and `type` from search params, calls `supabase.auth.verifyOtp()`, and redirects to `next ?? '/'` on success or `/login?error=invalid_token` on failure
- [x] 8.4 Update `src/app/signup/page.tsx` to redirect to `/verify-email` after successful `signUp` (instead of `/`)

## 9. Role-Based Middleware Guards

- [x] 9.1 Update `src/middleware.ts` role-guard logic to read from `user.app_metadata?.role` (not `user_metadata`)
- [x] 9.2 Add advisor route guard in middleware: redirect non-advisors away from `/advisor/*` to `/`
- [x] 9.3 Add admin route guard in middleware: redirect non-admins away from `/admin/*` to `/`

## 10. Advisor View

- [x] 10.1 Create `src/app/advisor/students/page.tsx` — async Server Component fetching `profiles` where `advisor_email = auth.email()`; renders a student card for each with name, stage, and milestone stats
- [x] 10.2 Create `src/app/advisor/students/[studentId]/page.tsx` — async Server Component fetching a specific student's milestones (verified via RLS); renders read-only milestone list; returns 404 if no matching student

## 11. Admin Panel

- [x] 11.1 Create `src/app/admin/users/page.tsx` — async Server Component calling `createAdminClient().auth.admin.listUsers()`; renders a table of users with email, role, and verification status
- [x] 11.2 Add a role-selector form in the admin user table that calls the `changeUserRole` Server Action on submit
