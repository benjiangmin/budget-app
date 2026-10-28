// One-time import of the Google Doc dream log into Supabase.
//
// Run from the project folder (everything-log):
//   node --env-file=.env.local dream-import/import.mjs --dry   ← just shows what it would do
//   node --env-file=.env.local dream-import/import.mjs         ← does it
//
// Safe to run again: any night that already has dreams in Supabase is skipped, so a second run
// (or a re-run after an error) won't make duplicates.

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const here = new URL("./", import.meta.url);
const nights = JSON.parse(readFileSync(new URL("dreams.json", here), "utf8"));
const dry = process.argv.includes("--dry");
const total = nights.reduce((n, d) => n + d.dreams.length, 0);
console.log(`${nights.length} nights, ${total} dreams in the file (${nights[0].date} → ${nights.at(-1).date}).`);

if (dry) {
  for (const n of nights) console.log(`  ${n.date}  ${n.dreams.length} dream(s)${n.dreams.some((d) => d.images.length) ? "  + picture" : ""}`);
  console.log("Dry run: nothing was saved.");
  process.exit(0);
}

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Missing Supabase keys. Run it from the project folder with: node --env-file=.env.local dream-import/import.mjs");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// Nights already in Supabase (skipped).
const { data: existing, error } = await db.from("dreams").select("dream_date").in("dream_date", nights.map((n) => n.date));
if (error) {
  console.error("Couldn't read the dreams table:", error.message, "\nDid you run supabase/dreams.sql?");
  process.exit(1);
}
const already = new Set(existing.map((e) => e.dream_date));

let added = 0;
for (const night of nights) {
  if (already.has(night.date)) {
    console.log(`  skip ${night.date} (already has dreams)`);
    continue;
  }
  const rows = [];
  for (const [i, dream] of night.dreams.entries()) {
    const images = [];
    for (const file of dream.images) {
      const path = `${randomUUID()}.${file.split(".").pop()}`;
      const bytes = readFileSync(new URL(`images/${file}`, here));
      const up = await db.storage.from("dream-images").upload(path, bytes, { contentType: "image/png" });
      if (up.error) {
        console.error(`Picture upload failed on ${night.date}:`, up.error.message);
        process.exit(1);
      }
      images.push(path);
    }
    rows.push({ dream_date: night.date, body: dream.body, images, position: i });
  }
  const res = await db.from("dreams").insert(rows);
  if (res.error) {
    console.error(`Failed on ${night.date}:`, res.error.message, "\nFix the problem and run it again; finished nights are skipped.");
    process.exit(1);
  }
  added += rows.length;
  console.log(`  ✓ ${night.date}  ${rows.length} dream(s)`);
}
console.log(`Done. Added ${added} dreams. You can delete the dream-import folder now.`);
