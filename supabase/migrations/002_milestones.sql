create table public.milestones (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  description    text not null default '',
  type           text not null default 'other',
  due_date       date not null,
  completed      boolean not null default false,
  completed_date date,
  created_at     timestamptz not null default now()
);

create index milestones_profile_id_idx on public.milestones(profile_id);
create index profiles_advisor_email_idx on public.profiles(advisor_email);

alter table public.milestones enable row level security;

-- Students: full access to their own milestones
create policy "students: own milestones"
  on public.milestones
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Advisors: read milestones belonging to their students
create policy "advisors: read their students milestones"
  on public.milestones
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = milestones.profile_id
        and p.advisor_email = auth.email()
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'advisor'
    )
  );
