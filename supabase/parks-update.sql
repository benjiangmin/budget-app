-- National parks update. Paste into Supabase → SQL Editor → Run (once), after supabase/parks.sql
-- and the parks import.

-- 1. Your own photo for each visited park (replaces the park service photos).
alter table parks add column if not exists photo_path text; -- file name in the park-photos folder

-- A private folder for the photos.
insert into storage.buckets (id, name, public)
values ('park-photos', 'park-photos', false)
on conflict (id) do nothing;

-- 2. The 4 national parks that were missing from the list (not visited yet).
insert into parks (name, visited, custom)
select v.name, false, false
from (values ('Gateway Arch'), ('Glacier'), ('New River Gorge'), ('White Sands')) as v(name)
where not exists (select 1 from parks p where lower(p.name) = lower(v.name));
