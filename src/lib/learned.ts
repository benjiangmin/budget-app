import "server-only";
import { db } from "./supabase";
import { monthRange } from "./month";

export type LearnedEntry = {
  id: string;
  entry_date: string; // "YYYY-MM-DD"
  fact: string;
  source: string | null;
};

const COLUMNS = "id, entry_date, fact, source";

// One month, newest day first (and newest added first within a day).
export async function getLearnedForMonth(monthKey: string): Promise<LearnedEntry[]> {
  const { start, end } = monthRange(monthKey);
  const { data, error } = await db()
    .from("learned_entries")
    .select(COLUMNS)
    .gte("entry_date", start)
    .lt("entry_date", end)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn't load entries: ${error.message}`);
  return data;
}

// Case-insensitive "contains" search across what you learned and where from, every month.
export async function searchLearned(query: string, limit = 25): Promise<{ results: LearnedEntry[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("learned_entries")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("entry_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: data, total: count ?? data.length };
}
