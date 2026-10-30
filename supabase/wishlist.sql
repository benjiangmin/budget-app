-- Wishlist. Paste into Supabase → SQL Editor → Run (once).
create table if not exists wishlist_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text,                             -- optional: why you want it
  price text,                            -- optional, as written ("$60", "~$20?", "alot")
  link text,                             -- optional web link
  added_on date,                         -- when you added it (optional)
  status text not null default 'want' check (status in ('want', 'got', 'dropped')), -- dropped = changed my mind
  position integer not null default 0,   -- order added
  created_at timestamptz not null default now(),
  search_text text generated always as (lower(name || ' ' || coalesce(note, ''))) stored
);

alter table wishlist_items enable row level security; -- no policies: only the server (secret key) can read/write
