import "server-only";
import { db } from "./supabase";

export const PARK_BUCKET = "park-photos";

export type Park = {
  id: string;
  name: string;
  visited: boolean;
  note: string | null;
  custom: boolean;
  photo_path: string | null; // your photo (proof you went), in the private park-photos folder
  photo: string | null; // a temporary link to show it
};

const COLUMNS = "id, name, visited, note, custom, photo_path";
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

export async function getParks(): Promise<{ visited: Park[]; notYet: Park[] }> {
  const { data, error } = await db().from("parks").select(COLUMNS);
  if (error) throw new Error(`Couldn't load parks: ${error.message}`);

  // The folder is private, so make a temporary link (6 hours) for each photo.
  const paths = data.map((p) => p.photo_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await db().storage.from(PARK_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
    if (signed.error) throw new Error(`Couldn't load photos: ${signed.error.message}`);
    for (const s of signed.data) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  const parks = (data as Omit<Park, "photo">[])
    .map((p) => ({ ...p, photo: p.photo_path ? (urls.get(p.photo_path) ?? null) : null }))
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
