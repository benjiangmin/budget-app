import "server-only";
import { db } from "./supabase";
import { monthRange } from "./month";

export type Category = { id: number; name: string; color: string };

export type Entry = {
  id: string;
  amount: number;
  note: string | null;
  spent_on: string;
  category_id: number;
};

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await db()
    .from("categories")
    .select("id, name, color")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Couldn't load categories: ${error.message}`);
  return data;
}

export async function getEntriesForMonth(monthKey: string): Promise<Entry[]> {
  const { start, end } = monthRange(monthKey);
  const { data, error } = await db()
    .from("entries")
    .select("id, amount, note, spent_on, category_id")
    .gte("spent_on", start)
    .lt("spent_on", end)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn't load entries: ${error.message}`);
  // numeric columns come back as strings from PostgREST in some setups
  return data.map((e) => ({ ...e, amount: Number(e.amount) }));
}
