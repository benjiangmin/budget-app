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

export type SearchHit = Entry & { category_name: string | null; category_color: string | null };

// Case-insensitive "contains" search on notes, across every month.
export async function searchEntries(query: string, limit = 25): Promise<SearchHit[]> {
  // Escape LIKE wildcards so typing % or _ searches for them literally.
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error } = await db()
    .from("entries")
    .select("id, amount, note, spent_on, category_id, categories(name, color)")
    .ilike("note", `%${safe}%`)
    .order("spent_on", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);

  return data.map((e) => {
    // The joined category can come back as an object or a one-item array depending on typing.
    const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories;
    return {
      id: e.id,
      amount: Number(e.amount),
      note: e.note,
      spent_on: e.spent_on,
      category_id: e.category_id,
      category_name: cat?.name ?? null,
      category_color: cat?.color ?? null,
    };
  });
}
