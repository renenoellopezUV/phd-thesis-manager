drop policy if exists "students: own milestones"                    on public.milestones;
drop policy if exists "advisors: read their students milestones"    on public.milestones;

-- Students: full access to their own milestones
create policy "students: own milestones"
  on public.milestones
  for all
  using  (profile_id = auth.uid())
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
