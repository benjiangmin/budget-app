// One-time import of the bucket list doc, with its 4 photos (SQL alone can't upload pictures).
//
//   node --env-file=.env.local scripts/import-bucket.mjs bucket-import
//
// Reads bucket-import/items.json + bucket-import/images/, uploads the photos to the private
// bucket-photos folder, then adds the items in order. Run it once (it stops if the list isn't empty).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const folder = process.argv[2] ?? "bucket-import";
const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = process.env;
if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY. Run with --env-file=.env.local");
const db = createClient(url, key, { auth: { persistSession: false } });
const fail = (msg, error) => {
  console.error(`✗ ${msg}${error ? `: ${error.message}` : ""}`);
  process.exit(1);
};

const items = JSON.parse(await readFile(join(folder, "items.json"), "utf8"));
const existing = await db.from("bucket_items").select("id").limit(1);
if (existing.error) fail("Couldn't read the bucket list (did you run supabase/bucket.sql?)", existing.error);
if (existing.data.length > 0) fail("The bucket list already has items (already imported?)");

const rows = [];
for (const [i, item] of items.entries()) {
  let photo_path = null;
  if (item.photo) {
    photo_path = `${randomUUID()}.jpg`;
    const up = await db.storage.from("bucket-photos").upload(photo_path, await readFile(join(folder, "images", item.photo)), { contentType: "image/jpeg" });
    if (up.error) fail(`Couldn't upload ${item.photo}`, up.error);
    console.log(`  photo for "${item.name}"`);
  }
  rows.push({ name: item.name, note: item.note, link: item.link, done: item.done, photo_path, position: i });
}
const ins = await db.from("bucket_items").insert(rows);
if (ins.error) fail("Couldn't save the items", ins.error);
console.log(`✓ ${rows.length} bucket list items (${rows.filter((r) => r.done).length} done). Open it from the home page.`);
