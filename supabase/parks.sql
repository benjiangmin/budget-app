-- National parks progress. Paste into Supabase → SQL Editor → Run (once).
create table if not exists parks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  park_code text,                        -- the National Park Service's code (e.g. 'yell'), for its photo
  visited boolean not null default false,
  note text,                             -- optional, e.g. "best stars i've seen"
  custom boolean not null default false, -- added by hand (not a national park, out of the country…)
  created_at timestamptz not null default now(),
  search_text text generated always as (lower(name || ' ' || coalesce(note, ''))) stored
);

alter table parks enable row level security; -- no policies: only the server (secret key) can read/write
