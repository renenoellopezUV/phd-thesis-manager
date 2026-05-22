alter table public.milestones
  add column program_milestone_id uuid references public.program_milestones(id) on delete set null,
  add column created_by           uuid references auth.users(id);

drop policy if exists "students: own milestones"                    on public.milestones;
drop policy if exists "advisors: read their students milestones"    on public.milestones;

create policy "students: select own milestones"
  on public.milestones for select
  using (profile_id = auth.uid());

create policy "students: complete own milestones"
  on public.milestones for update
  using  (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "advisors: manage their students milestones"
  on public.milestones for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = milestones.profile_id
        and p.advisor_id = auth.uid()
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'advisor'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = milestones.profile_id
        and p.advisor_id = auth.uid()
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'advisor'
    )
  );
