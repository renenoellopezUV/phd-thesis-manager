-- 1. Fix advisor_id FK: drop old constraint (references profiles), recreate referencing auth.users(id)
alter table public.profiles
  drop constraint if exists profiles_advisor_id_fkey;

alter table public.profiles
  add constraint profiles_advisor_id_fkey
  foreign key (advisor_id) references auth.users(id) on delete set null;

-- 2. Add program_id FK (nullable)
alter table public.profiles
  add column if not exists program_id uuid
  references public.programs(id) on delete set null;

-- 3. Drop free-text program column
alter table public.profiles
  drop column if exists program;
