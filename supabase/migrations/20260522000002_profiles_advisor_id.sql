-- Drop all policies that reference advisor_email BEFORE dropping the column.
-- The milestones advisor policy also references this column via a subquery.
drop policy if exists "advisors: read their students"            on public.profiles;
drop policy if exists "advisors: read their students milestones" on public.milestones;
drop policy if exists "admins: update any"                       on public.profiles;

-- Add advisor_id (nullable — admin assigns after both accounts exist)
alter table public.profiles
  add column if not exists advisor_id uuid references public.profiles(id) on delete set null;

create index if not exists profiles_advisor_id_idx on public.profiles(advisor_id);

-- Now safe to drop the old text-based link
alter table public.profiles drop column if exists advisor_email;

-- Recreate advisor policy using advisor_id FK instead of email text match
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
