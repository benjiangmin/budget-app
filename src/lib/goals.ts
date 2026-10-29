import "server-only";
import { db } from "./supabase";
import { goalSort } from "./goals-sort";

export type GoalStatus = "backlog" | "playing" | "completed" | "stopped";
export type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  started_on: string | null; // "YYYY-MM-DD"
  finished_on: string | null;
  why: string | null;
  proof: string | null;
  position: number;
  note: null; // the board's plain note isn't used (why + proof are shown instead)
};

const COLUMNS = "id, title, status, started_on, finished_on, why, proof, position";

const withNote = (rows: Omit<Goal, "note">[]) => rows.map((g) => ({ ...g, note: null }) as Goal);

export async function getGoals(): Promise<Record<GoalStatus, Goal[]>> {
  const { data, error } = await db().from("goals").select(COLUMNS);
  if (error) throw new Error(`Couldn't load goals: ${error.message}`);
  const out: Record<GoalStatus, Goal[]> = { backlog: [], playing: [], completed: [], stopped: [] };
  for (const g of withNote(data as Omit<Goal, "note">[])) out[g.status]?.push(g);
  for (const list of Object.values(out)) list.sort(goalSort);
  return out;
}

export async function searchGoals(query: string, limit = 25): Promise<{ results: Goal[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("goals")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("position", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: withNote(data as Omit<Goal, "note">[]), total: count ?? data.length };
}
