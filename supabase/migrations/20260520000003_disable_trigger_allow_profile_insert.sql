-- Drop the trigger-based approach for profile creation
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Replace the blanket insert block with a policy that lets each user
-- insert exactly their own profile row (id must match the authenticated uid)
drop policy if exists "profiles: no direct insert" on public.profiles;

create policy "users: insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);
