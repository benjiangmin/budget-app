import "server-only";
import { db } from "./supabase";

export type Tear = { id: string; body: string; cried_on: string | null; position: number };

const COLUMNS = "id, body, cried_on, position";

// Newest added first. The date doesn't affect the order (so adding a date to an old entry keeps
// it where it is).
export function tearSort(a: Tear, b: Tear) {
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
