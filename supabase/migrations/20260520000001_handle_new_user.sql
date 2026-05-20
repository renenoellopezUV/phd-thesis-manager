-- Drop trigger first, then the function it depends on
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Function: auto-create a profile row and harden role into app_metadata on signup.
-- Runs as SECURITY DEFINER so it can write to public.profiles despite RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text;
begin
  -- Read the role the user selected at signup
  _role := coalesce(new.raw_user_meta_data ->> 'role', 'student');

  -- Validate role; fall back to 'student' if unrecognised
  if _role not in ('student', 'advisor', 'admin') then
    _role := 'student';
  end if;

  -- Promote role into admin-controlled app_metadata so it can't be spoofed client-side
  new.raw_app_meta_data :=
    coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', _role);

  -- Create the profile row.
  -- All NOT NULL columns are supplied explicitly so the insert succeeds
  -- even if column-level defaults have not been applied yet.
  insert into public.profiles (id, email, name, stage, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    'coursework',
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger: fires BEFORE INSERT on auth.users so app_metadata is set on the same row
create trigger on_auth_user_created
  before insert on auth.users
  for each row execute procedure public.handle_new_user();
