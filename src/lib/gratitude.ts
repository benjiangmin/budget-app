import "server-only";
import { db } from "./supabase";
import { monthRange } from "./month";

export type GratitudeEntry = {
  id: string;
  entry_date: string; // "YYYY-MM-DD"
  first: string;
  second: string;
  third: string;
};

const COLUMNS = "id, entry_date, first, second, third";

export async function getGratitudeForMonth(monthKey: string): Promise<GratitudeEntry[]> {
  const { start, end } = monthRange(monthKey);
  const { data, error } = await db()
    .from("gratitude_entries")
    .select(COLUMNS)
    .gte("entry_date", start)
    .lt("entry_date", end)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn't load entries: ${error.message}`);
  return data;
}

// Case-insensitive "contains" search across all three items, every month.
// Returns up to `limit` matches, plus how many match in total.
export async function searchGratitude(query: string, limit = 25): Promise<{ results: GratitudeEntry[]; total: number }> {
  // Escape LIKE wildcards so typing % or _ searches for them literally.
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("gratitude_entries")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("entry_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: data, total: count ?? data.length };
}
