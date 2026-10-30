import "server-only";
import { db } from "./supabase";

export type Regret = { id: string; body: string; position: number };

const COLUMNS = "id, body, position";

// Newest added first.
export function regretSort(a: Regret, b: Regret) {
  return b.position - a.position;
}

export async function getRegrets(): Promise<Regret[]> {
  const { data, error } = await db().from("regrets").select(COLUMNS);
  if (error) throw new Error(`Couldn't load regrets: ${error.message}`);
  return (data as Regret[]).sort(regretSort);
}

export async function searchRegrets(query: string, limit = 25): Promise<{ results: Regret[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("regrets")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("position", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: (data as Regret[]).sort(regretSort), total: count ?? data.length };
}
