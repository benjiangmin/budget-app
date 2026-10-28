// One-time import of an unsuspicious document (Google Doc export) into Supabase.
//
// Run from the project folder (everything-log):
//   node --env-file=.env.local journal-import/import.mjs --dry   ← just shows what it would do
//   node --env-file=.env.local journal-import/import.mjs         ← does it
//
// Safe to run again: any day that already has an entry in Supabase is skipped (never overwritten).

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DOC_YEAR = 2021; // this file is document 2021–22
const START_MONTH = 9; // school year: Sep 1 → Aug 31

const here = new URL("./", import.meta.url);
const entries = JSON.parse(readFileSync(new URL("entries.json", here), "utf8"));
const dry = process.argv.includes("--dry");
const pictures = entries.reduce((n, e) => n + (e.body.match(/<img /g) ?? []).length, 0);
console.log(`${entries.length} entries, ${pictures} pictures (${entries[0].date} → ${entries.at(-1).date}).`);

if (dry) {
  for (const e of entries) {
    const words = e.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    const pics = (e.body.match(/<img /g) ?? []).length;
    console.log(`  ${e.date}  ${String(words).padStart(5)} words${pics ? `  + ${pics} picture(s)` : ""}`);
  }
  console.log("Dry run: nothing was saved.");
  process.exit(0);
}

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Missing Supabase keys. Run it from the project folder with: node --env-file=.env.local journal-import/import.mjs");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// Days already in Supabase (skipped).
const { data: existing, error } = await db
  .from("journal_entries")
  .select("entry_date")
  .in("entry_date", entries.map((e) => e.date));
if (error) {
  console.error("Couldn't read the journal table:", error.message, "\nDid you run supabase/journal.sql?");
  process.exit(1);
}
const already = new Set(existing.map((e) => e.entry_date));

const TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
let added = 0;
for (const entry of entries) {
  if (already.has(entry.date)) {
    console.log(`  skip ${entry.date} (already has an entry)`);
    continue;
  }
  // Upload this entry's pictures and point the text at them.
  let body = entry.body;
  for (const file of [...new Set(body.match(/data-file="[^"]+"/g)?.map((m) => m.slice(11, -1)) ?? [])]) {
    const ext = file.split(".").pop().toLowerCase();
    const path = `${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;
    const up = await db.storage
      .from("journal-images")
      .upload(path, readFileSync(new URL(`images/${file}`, here)), { contentType: TYPES[ext] ?? "image/png" });
    if (up.error) {
      console.error(`Picture upload failed on ${entry.date}:`, up.error.message);
      process.exit(1);
    }
    body = body.split(`data-file="${file}"`).join(`data-path="${path}"`);
  }
  const res = await db.from("journal_entries").insert({ entry_date: entry.date, body });
  if (res.error) {
    console.error(`Failed on ${entry.date}:`, res.error.message, "\nFix the problem and run it again; finished days are skipped.");
    process.exit(1);
  }
  added++;
  console.log(`  ✓ ${entry.date}`);
}

// Make this document a school year (only if it hasn't been set yet).
const doc = await db.from("journal_docs").select("year").eq("year", DOC_YEAR).maybeSingle();
if (!doc.data) await db.from("journal_docs").insert({ year: DOC_YEAR, start_month: START_MONTH });

console.log(`Done. Added ${added} entries. You can delete the journal-import folder now.`);
