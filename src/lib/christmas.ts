import "server-only";
import { db } from "./supabase";

export type GiftStatus = "todo" | "bought" | "arrived";
export type Gift = {
  id: string;
  year: number;
  person: string;
  item: string | null;
  price: number | null;
  link: string | null;
  status: GiftStatus;
  position: number;
};
export type Person = { name: string; gifts: Gift[]; total: number };

const COLUMNS = "id, year, person, item, price, link, status, position";
const key = (name: string) => name.trim().toLowerCase();

// One year's gifts, grouped by person (in the order you first added them), with totals.
export async function getChristmasYear(year: number): Promise<{ people: Person[]; total: number; gifts: Gift[] }> {
  const { data, error } = await db().from("christmas_gifts").select(COLUMNS).eq("year", year).order("position");
  if (error) throw new Error(`Couldn't load the list: ${error.message}`);
  const gifts = (data as Gift[]).map((g) => ({ ...g, price: g.price === null ? null : Number(g.price) }));
  const people = new Map<string, Person>();
  for (const g of gifts) {
    const p = people.get(key(g.person)) ?? { name: g.person, gifts: [], total: 0 };
    p.gifts.push(g);
    p.total += g.price ?? 0;
    people.set(key(g.person), p);
  }
  return { people: [...people.values()], total: gifts.reduce((n, g) => n + (g.price ?? 0), 0), gifts };
}

export async function searchChristmas(query: string, limit = 30): Promise<{ results: Gift[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("christmas_gifts")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("year", { ascending: false })
    .order("position")
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: data as Gift[], total: count ?? data.length };
}
