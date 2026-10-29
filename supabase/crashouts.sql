-- Crash outs log (works like Dreams). Paste into Supabase → SQL Editor → Run (once).
create table if not exists crashouts (
  id uuid primary key default gen_random_uuid(),
  crashout_date date not null,
  body text not null default '',          -- safe HTML: bold / italic / underline / lists
  images text[] not null default '{}',    -- picture file names in the crashout-images folder
  position integer not null default 0,    -- order within a day
  created_at timestamptz not null default now(),
  -- the words without formatting, for search
  search_text text generated always as (lower(regexp_replace(body, '<[^>]*>', ' ', 'g'))) stored
);

create index if not exists crashouts_date_idx on crashouts (crashout_date);

alter table crashouts enable row level security; -- no policies: only the server (secret key) can read/write

-- A private folder for crash out pictures (like dream-images).
insert into storage.buckets (id, name, public)
values ('crashout-images', 'crashout-images', false)
on conflict (id) do nothing;
