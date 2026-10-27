import "server-only";
import { db } from "./supabase";

export type HomeCategory = { id: string; name: string; item_count: number };
export type HomeItem = { id: string; name: string; blurb: string | null; href: string | null };

export const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

// Every category, in order, with how many subcategories each has.
export async function getCategories(): Promise<HomeCategory[]> {
  const { data, error } = await db()
    .from("home_categories")
    .select("id, name, home_items(count)")
    .order("position")
    .order("created_at");
  if (error) throw new Error(`Couldn't load categories: ${error.message}`);
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    item_count: (c.home_items as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

// One category and its subcategories. Also returns every category's name, for "Move to".
export async function getCategory(id: string): Promise<{
  category: { id: string; name: string };
  items: HomeItem[];
  all: { id: string; name: string }[];
} | null> {
  if (!isUuid(id)) return null;
  const [cats, items] = await Promise.all([
    db().from("home_categories").select("id, name").order("position").order("created_at"),
    db().from("home_items").select("id, name, blurb, href").eq("category_id", id).order("position").order("created_at"),
  ]);
  if (cats.error) throw new Error(`Couldn't load categories: ${cats.error.message}`);
  if (items.error) throw new Error(`Couldn't load pages: ${items.error.message}`);
  const category = cats.data.find((c) => c.id === id);
  if (!category) return null;
  return { category, items: items.data, all: cats.data };
}
