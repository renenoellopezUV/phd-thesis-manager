create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text not null default '',
  email               text not null default '',
  advisor_email       text,
  department          text,
  program             text,
  start_date          date,
  expected_graduation date,
  stage               text not null default 'coursework',
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;
