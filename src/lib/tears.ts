import "server-only";
import { db } from "./supabase";

export type Tear = { id: string; body: string; cried_on: string | null; position: number };

const COLUMNS = "id, body, cried_on, position";

// Newest first: dated ones by date, then the undated ones by when they were added.
export function tearSort(a: Tear, b: Tear) {
  if (a.cried_on && b.cried_on && a.cried_on !== b.cried_on) return b.cried_on.localeCompare(a.cried_on);
  if (a.cried_on && !b.cried_on) return -1;
  if (!a.cried_on && b.cried_on) return 1;
  return b.position - a.position;
}

export async function getTears(): Promise<Tear[]> {
  const { data, error } = await db().from("tears").select(COLUMNS);
  if (error) throw new Error(`Couldn't load tears: ${error.message}`);
  return (data as Tear[]).sort(tearSort);
}

export async function searchTears(query: string, limit = 25): Promise<{ results: Tear[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("tears")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("position", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: (data as Tear[]).sort(tearSort), total: count ?? data.length };
}
