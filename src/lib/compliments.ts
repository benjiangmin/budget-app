import "server-only";
import { db } from "./supabase";

export type Compliment = {
  id: string;
  said_on: string; // "YYYY-MM-DD"
  date_known: boolean; // false = "Date forgotten"
  person: string;
  compliment: string;
  note: string | null;
};

const COLUMNS = "id, said_on, date_known, person, compliment, note";

// Every compliment, newest first.
export async function getCompliments(): Promise<Compliment[]> {
  const { data, error } = await db()
    .from("compliments")
    .select(COLUMNS)
    .order("said_on", { ascending: false })
    .order("position", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn't load compliments: ${error.message}`);
  return data;
}

// Case-insensitive "contains" search on who said it, what they said, and the note.
export async function searchCompliments(query: string, limit = 25): Promise<{ results: Compliment[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("compliments")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("said_on", { ascending: false })
    .order("position", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: data, total: count ?? data.length };
}
