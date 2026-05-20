-- Ensure all NOT NULL columns on profiles have server-side defaults.
-- Safe to run on a table that already has the defaults — SET DEFAULT is idempotent.
alter table public.profiles
  alter column name        set default '',
  alter column stage       set default 'coursework',
  alter column created_at  set default now();
