import "server-only";
import { db } from "./supabase";

export type ShoppingItem = {
  id: string;
  name: string;
  price: string | null;
  link: string | null;
  added_on: string; // "YYYY-MM-DD"
  bought: boolean;
  bought_on: string | null;
  position: number;
};

const COLUMNS = "id, name, price, link, added_on, bought, bought_on, position";

// Newest day first; inside a day, in the order they were added.
export function shoppingSort(a: ShoppingItem, b: ShoppingItem) {
  if (a.added_on !== b.added_on) return b.added_on.localeCompare(a.added_on);
  return a.position - b.position;
}

export async function getShopping(): Promise<{ toBuy: ShoppingItem[]; bought: ShoppingItem[] }> {
  const { data, error } = await db().from("shopping_items").select(COLUMNS);
  if (error) throw new Error(`Couldn't load the list: ${error.message}`);
  const items = (data as ShoppingItem[]).sort(shoppingSort);
  return { toBuy: items.filter((i) => !i.bought), bought: items.filter((i) => i.bought) };
}

export async function searchShopping(query: string, limit = 25): Promise<{ results: ShoppingItem[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("shopping_items")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("added_on", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: (data as ShoppingItem[]).sort(shoppingSort), total: count ?? data.length };
}
