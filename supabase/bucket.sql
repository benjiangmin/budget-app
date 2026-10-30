-- Bucket list. Paste into Supabase → SQL Editor → Run (once).
create table if not exists bucket_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,                     -- e.g. "See the aurora lights"
  note text,                              -- optional: the story / thoughts
  link text,                              -- optional web link (or a page on this site, e.g. /parks)
  done boolean not null default false,
  photo_path text,                        -- optional proof photo, in the bucket-photos folder
  position integer not null default 0,    -- order added
  created_at timestamptz not null default now(),
  search_text text generated always as (lower(name || ' ' || coalesce(note, ''))) stored
);

alter table bucket_items enable row level security; -- no policies: only the server (secret key) can read/write

-- A private folder for the photos.
insert into storage.buckets (id, name, public)
values ('bucket-photos', 'bucket-photos', false)
on conflict (id) do nothing;
