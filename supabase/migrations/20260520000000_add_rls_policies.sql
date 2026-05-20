-- Drop existing policies before (re)creating them
drop policy if exists "profiles: no direct insert"   on public.profiles;
drop policy if exists "students: select own row"      on public.profiles;
drop policy if exists "students: update own row"      on public.profiles;
drop policy if exists "advisors: read their students" on public.profiles;
drop policy if exists "admins: read all"              on public.profiles;
drop policy if exists "admins: update any"            on public.profiles;

-- RLS policies for public.profiles
-- Profiles are created only by the handle_new_user trigger (security definer).
-- Block direct client inserts so no row can be created with a mismatched id.
create policy "profiles: no direct insert"
  on public.profiles
  for insert
  with check (false);

-- Students can read their own row
create policy "students: select own row"
  on public.profiles
  for select
  using (id = auth.uid());

-- Students can update their own row (but not delete it — cascade from auth.users handles that)
create policy "students: update own row"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Advisors can read profiles of their students
create policy "advisors: read their students"
  on public.profiles
  for select
  using (
    advisor_email = auth.email()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'advisor'
  );

-- Admins can read all profiles
create policy "admins: read all"
  on public.profiles
  for select
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Admins can update any profile (e.g. correcting stage or program via admin panel)
create policy "admins: update any"
  on public.profiles
  for update
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
