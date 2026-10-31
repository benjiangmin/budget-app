-- Something new I've learned. Paste into Supabase → SQL Editor → Run (once).
create table if not exists learned_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  fact text not null,             -- what you learned
  source text,                    -- where from (optional): "nyt mini crossword", "google"…
  created_at timestamptz not null default now(),
  search_text text generated always as (lower(fact || ' ' || coalesce(source, ''))) stored
);
create index if not exists learned_entries_date on learned_entries (entry_date);

alter table learned_entries enable row level security; -- no policies: only the server (secret key) can read/write
