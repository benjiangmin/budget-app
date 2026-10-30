-- Bible in a year. Paste into Supabase → SQL Editor → Run (once).
-- One row per day. Each day = an Old Testament passage + notes, then a New Testament passage + notes.
-- Notes are a tiny bit of safe HTML (bold / italic / underline / lists), like dreams.
create table if not exists bible_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null unique,
  ot_passage text,          -- e.g. "Isaiah 39:1-40:31"
  ot_notes text,
  nt_passage text,          -- e.g. "Colossians 4"
  nt_notes text,
  updated_at timestamptz not null default now(),
  search_text text generated always as (
    lower(
      coalesce(ot_passage, '') || ' ' || coalesce(nt_passage, '') || ' ' ||
      regexp_replace(coalesce(ot_notes, '') || ' ' || coalesce(nt_notes, ''), '<[^>]*>', ' ', 'g')
    )
  ) stored
);

alter table bible_entries enable row level security; -- no policies: only the server (secret key) can read/write
