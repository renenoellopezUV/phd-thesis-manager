alter table public.profiles
  add column advisor_id uuid references public.profiles(id) on delete set null;

create index profiles_advisor_id_idx on public.profiles(advisor_id);

alter table public.profiles drop column if exists advisor_email;

drop policy if exists "advisors: read their students"  on public.profiles;
drop policy if exists "admins: update any"             on public.profiles;

create policy "advisors: read their students"
  on public.profiles for select
  using (
    advisor_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'advisor'
  );

create policy "admins: update any"
  on public.profiles for update
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
