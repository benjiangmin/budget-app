-- Home page structure: categories, and the subcategories (pages) inside each one.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to run once.

create table if not exists home_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0,      -- order on the home page (0 = first)
  created_at timestamptz not null default now()
);

create table if not exists home_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references home_categories (id) on delete cascade,
  name text not null,
  blurb text,                           -- the short line under the name
  href text,                            -- the page it opens, e.g. /budget. null = not built yet
  position int not null default 0,      -- order inside its category
  created_at timestamptz not null default now()
);

create index if not exists home_items_category_idx on home_items (category_id, position);

-- Same setup as the other tables: locked to the public, the server uses the secret key.
alter table home_categories enable row level security;
alter table home_items enable row level security;

-- Starting layout.
with c as (
  insert into home_categories (name, position) values
    ('Logs', 0),
    ('Daily', 1),
    ('Unsuspicious documents', 2),
    ('Lists', 3)
  returning id, name
)
insert into home_items (category_id, name, blurb, href, position)
select c.id, v.name, v.blurb, v.href, 0
from c
join (values
  ('Logs', 'Budget', 'Spending by category, month by month.', '/budget'),
  ('Daily', 'Gratitude', 'Three good things, every day.', '/gratitude'),
  ('Unsuspicious documents', 'Journal', 'Whatever''s on my mind.', null)
) as v (category, name, blurb, href) on v.category = c.name;
