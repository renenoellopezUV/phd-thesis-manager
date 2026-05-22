create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

create table public.program_milestones (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references public.programs(id) on delete cascade,
  title           text not null,
  type            text not null default 'other',
  description     text not null default '',
  display_order   int  not null default 0,
  created_at      timestamptz not null default now()
);

create index program_milestones_program_id_idx on public.program_milestones(program_id);

alter table public.programs enable row level security;
alter table public.program_milestones enable row level security;

create policy "authenticated: read programs"
  on public.programs for select
  using (auth.uid() is not null);

create policy "authenticated: read program milestones"
  on public.program_milestones for select
  using (auth.uid() is not null);

create policy "admins: manage programs"
  on public.programs for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins: manage program milestones"
  on public.program_milestones for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select, insert, update, delete on public.programs to authenticated;
grant select, insert, update, delete on public.program_milestones to authenticated;
