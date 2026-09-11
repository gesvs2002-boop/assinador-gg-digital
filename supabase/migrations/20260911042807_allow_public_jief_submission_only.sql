grant insert on table public.gg_event_submissions to anon;

create policy "Public may submit JIEF registrations only"
on public.gg_event_submissions
for insert
to anon
with check (
  event_key = 'jief-2026'
  and event_name = 'JIEF 2026'
  and status = 'aguardando_pagamentos'
  and length(team) between 3 and 100
  and length(team_name) between 2 and 40
  and length(leader_name) between 3 and 90
  and length(leader_phone) between 8 and 24
  and jsonb_typeof(rosters) = 'array'
  and jsonb_array_length(rosters) > 0
);
