import "server-only";
import { db } from "./supabase";

export type WishStatus = "want" | "got" | "dropped"; // dropped = changed my mind
export type Wish = {
  id: string;
  name: string;
  note: string | null;
  price: string | null;
  link: string | null;
  added_on: string | null; // "YYYY-MM-DD"
  status: WishStatus;
  position: number;
};

const COLUMNS = "id, name, note, price, link, added_on, status, position";

// Newest day first (undated ones last); inside a day, in the order they were added.
export function wishSort(a: Wish, b: Wish) {
  if (a.added_on !== b.added_on) {
    if (!a.added_on) return 1;
    if (!b.added_on) return -1;
    return b.added_on.localeCompare(a.added_on);
  }
  return a.position - b.position;
}

export async function getWishlist(): Promise<{ want: Wish[]; got: Wish[]; dropped: Wish[] }> {
  const { data, error } = await db().from("wishlist_items").select(COLUMNS);
  if (error) throw new Error(`Couldn't load the wishlist: ${error.message}`);
  const items = (data as Wish[]).sort(wishSort);
  return {
    want: items.filter((i) => i.status === "want"),
    got: items.filter((i) => i.status === "got"),
    dropped: items.filter((i) => i.status === "dropped"),
  };
}

export async function searchWishlist(query: string, limit = 25): Promise<{ results: Wish[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("wishlist_items")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("position", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: (data as Wish[]).sort(wishSort), total: count ?? data.length };
}
