-- Christmas list: gifts by year, grouped by person. Paste into Supabase → SQL Editor → Run (once).
create table if not exists christmas_gifts (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year between 1900 and 2100),
  person text not null,                  -- who it's for (gifts with the same name group together)
  item text,                             -- optional: what you're getting them
  price numeric(10, 2),                  -- optional
  link text,                             -- optional web link
  status text not null default 'todo' check (status in ('todo', 'bought', 'arrived')),
  position integer not null default 0,   -- order added
  created_at timestamptz not null default now(),
  search_text text generated always as (lower(person || ' ' || coalesce(item, ''))) stored
);

create index if not exists christmas_gifts_year_idx on christmas_gifts (year);

alter table christmas_gifts enable row level security; -- no policies: only the server (secret key) can read/write
