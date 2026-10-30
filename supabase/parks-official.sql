-- National parks: only the 63 official national parks count. These 4 on your list aren't official
-- national parks, so they move to "Other" (your own parks), which shows apart and isn't counted.
-- Paste into Supabase → SQL Editor → Run (once), after supabase/parks-update.sql.
update parks set custom = true
where lower(name) in ('gettysburg', 'harper’s ferry', 'harper''s ferry', 'organ pipe cactus', 'valley forge');

-- Check: should say 63.
select count(*) as official_parks from parks where not custom;
