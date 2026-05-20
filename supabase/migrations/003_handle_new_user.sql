-- Function: auto-create profile row and harden role into app_metadata on signup
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

  -- Promote role to admin-controlled app_metadata
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', _role);

  -- Create the profile row
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger: fires before the auth.users row is committed so app_metadata is set correctly
create or replace trigger on_auth_user_created
  before insert on auth.users
  for each row execute procedure public.handle_new_user();
