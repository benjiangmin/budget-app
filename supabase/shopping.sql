-- Shopping list. Paste into Supabase → SQL Editor → Run (once).
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price text,                            -- optional, as written ("32", "<1 (on temu)")
  link text,                             -- optional web link
  added_on date not null default current_date,
  bought boolean not null default false, -- true = in "Bought" (the right-hand box)
  bought_on date,
  position integer not null default 0,   -- order added
  created_at timestamptz not null default now(),
  search_text text generated always as (lower(name || ' ' || coalesce(price, ''))) stored
);

alter table shopping_items enable row level security; -- no policies: only the server (secret key) can read/write
