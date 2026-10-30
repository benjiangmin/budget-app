import "server-only";
import { cacheLife } from "next/cache";
import { db } from "./supabase";

export type Park = {
  id: string;
  name: string;
  park_code: string | null;
  visited: boolean;
  note: string | null;
  custom: boolean;
  photo: string | null; // a small photo from the National Park Service, when there's one
};

const COLUMNS = "id, name, park_code, visited, note, custom";
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

// One photo per park code from the National Park Service's free API (needs NPS_API_KEY in
// .env.local / Vercel). Cached for a week, so it's one API call a week, not one per visit.
// No key, or the API is down: no photos (the cards show the park's initials instead).
async function npsPhotos(codes: string): Promise<Record<string, string>> {
  "use cache";
  cacheLife("weeks");
  const key = process.env.NPS_API_KEY;
  if (!key || !codes) return {};
  try {
    const url = `https://developer.nps.gov/api/v1/parks?parkCode=${encodeURIComponent(codes)}&limit=200&fields=images&api_key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const json = (await res.json()) as { data?: { parkCode: string; images?: { url: string }[] }[] };
    const out: Record<string, string> = {};
    for (const p of json.data ?? []) {
      const img = p.images?.[0]?.url;
      // nps.gov can send a small version of its pictures (falls back to the full one if not).
      if (img?.startsWith("https://")) out[p.parkCode] = `${img}?width=120&height=120&mode=crop&quality=80`;
    }
    return out;
  } catch {
    return {};
  }
}

export async function getParks(): Promise<{ visited: Park[]; notYet: Park[] }> {
  const { data, error } = await db().from("parks").select(COLUMNS);
  if (error) throw new Error(`Couldn't load parks: ${error.message}`);
  const codes = [...new Set(data.map((p) => p.park_code).filter(Boolean))].sort().join(",");
  const photos = await npsPhotos(codes);
  const parks = (data as Omit<Park, "photo">[])
    .map((p) => ({ ...p, photo: p.park_code ? (photos[p.park_code] ?? null) : null }))
    .sort(byName);
  return { visited: parks.filter((p) => p.visited), notYet: parks.filter((p) => !p.visited) };
}

export async function searchParks(query: string, limit = 25): Promise<{ results: Omit<Park, "photo">[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("parks")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("name")
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: data, total: count ?? data.length };
}
