-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists categories (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  color      text not null default '#6B7D77',
  sort_order int  not null default 0
);

create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  amount      numeric(12, 2) not null check (amount > 0),
  category_id bigint not null references categories (id) on delete restrict,
  note        text,
  spent_on    date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists entries_spent_on_idx on entries (spent_on);

-- RLS on with no policies = the public (anon) key can't read or write anything.
-- The app talks to Supabase only from the server, using the secret key.
alter table categories enable row level security;
alter table entries    enable row level security;

-- Starter categories. Edit names/colors here or in the Table Editor anytime.
insert into categories (name, color, sort_order) values
  ('Groceries',     '#2F6B5A', 1),
  ('Dining out',    '#D9952B', 2),
  ('Transport',     '#4F76A3', 3),
  ('Rent & bills',  '#7E6596', 4),
  ('Shopping',      '#C2636F', 5),
  ('Fun',           '#7C9A47', 6),
  ('Other',         '#8C8577', 7)
on conflict (name) do nothing;
