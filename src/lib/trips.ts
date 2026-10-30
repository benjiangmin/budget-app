import "server-only";
import { db } from "./supabase";
import { tripHref } from "./home-pages";
import { cleanJournalHtml, journalText } from "./journal-html";
import { withPictureLinks } from "./journal";

// A recreational record = one trip / break. Days are its entries (Day 1, Day 2, …).
export type Trip = { id: string; start_date: string | null };
export type TripDay = { id: string; day: number; title: string | null; body: string }; // body = safe HTML

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function getTrip(id: string): Promise<Trip | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await db().from("trips").select("id, start_date").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the trip: ${error.message}`);
  return data;
}

// What the trip's card on the home page is called.
export async function getTripName(id: string): Promise<string | null> {
  const { data } = await db().from("home_items").select("name").eq("href", tripHref(id)).limit(1).maybeSingle();
  return data?.name ?? null;
}

// Every day of a trip, Day 1 first, with picture links.
export async function getTripDays(tripId: string): Promise<TripDay[]> {
  const { data, error } = await db()
    .from("trip_days")
    .select("id, day_number, title, body")
    .eq("trip_id", tripId)
    .order("day_number");
  if (error) throw new Error(`Couldn't load the days: ${error.message}`);
  const bodies = await withPictureLinks(data.map((d) => d.body));
  return data.map((d, i) => ({ id: d.id, day: d.day_number, title: d.title, body: bodies[i] }));
}

// trip = which trip page to open; tripName = its card's name (for "All trips" headings).
export type TripHit = { id: string; trip_id: string; tripName: string; day: number; title: string | null; snippet: string };

// Case-insensitive "contains" search over days' titles and text. tripId: only that trip.
export async function searchTrips(query: string, tripId?: string, limit = 50): Promise<{ results: TripHit[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  let search = db()
    .from("trip_days")
    .select("id, trip_id, day_number, title, body", { count: "exact" })
    .ilike("search_text", `%${safe}%`);
  if (tripId && isUuid(tripId)) search = search.eq("trip_id", tripId);
  const { data, error, count } = await search.order("trip_id").order("day_number").limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  const cards = await db().from("home_items").select("name, href").like("href", "/trips/%");
  const names = new Map((cards.data ?? []).map((c) => [c.href as string, c.name as string]));
  const results = data.map((d) => {
    const text = journalText(cleanJournalHtml(d.body));
    const at = Math.max(0, text.toLowerCase().indexOf(query.toLowerCase()));
    const start = Math.max(0, at - 30);
    return {
      id: d.id,
      trip_id: d.trip_id,
      tripName: names.get(tripHref(d.trip_id)) ?? "Recreational record",
      day: d.day_number,
      title: d.title,
      snippet: (start > 0 ? "…" : "") + text.slice(start, start + 120),
    };
  });
  return { results, total: count ?? results.length };
}
