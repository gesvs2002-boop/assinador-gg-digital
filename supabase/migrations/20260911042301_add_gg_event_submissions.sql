create table if not exists public.gg_event_submissions (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  event_name text not null,
  submission_code text not null unique,
  team text not null,
  team_name text not null,
  leader_name text not null,
  leader_phone text not null,
  rosters jsonb not null default '[]'::jsonb,
  status text not null default 'aguardando_pagamentos'
    check (status in ('aguardando_pagamentos','em_conferencia','confirmada','pendencia','cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_key, team)
);

alter table public.gg_event_submissions enable row level security;

revoke all on table public.gg_event_submissions from anon, authenticated;
grant all on table public.gg_event_submissions to service_role;

create index if not exists gg_event_submissions_event_created_idx
  on public.gg_event_submissions (event_key, created_at desc);
