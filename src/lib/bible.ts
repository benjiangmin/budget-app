import "server-only";
import { db } from "./supabase";
import { bibleHref } from "./home-pages";
import { cleanDreamHtml, htmlToText } from "./dream-html";

// One day of Bible in a year: an Old Testament passage + notes, then a New Testament passage + notes.
// Notes are safe HTML (bold / italic / underline / lists only).
export type BibleEntry = {
  id: string;
  date: string; // "YYYY-MM-DD"
  ot: string;
  otNotes: string;
  nt: string;
  ntNotes: string;
};

const COLUMNS = "id, entry_date, ot_passage, ot_notes, nt_passage, nt_notes";
type Row = {
  id: string;
  entry_date: string;
  ot_passage: string | null;
  ot_notes: string | null;
  nt_passage: string | null;
  nt_notes: string | null;
};

const toEntry = (r: Row): BibleEntry => ({
  id: r.id,
  date: r.entry_date,
  ot: r.ot_passage ?? "",
  otNotes: cleanDreamHtml(r.ot_notes ?? ""),
  nt: r.nt_passage ?? "",
  ntNotes: cleanDreamHtml(r.nt_notes ?? ""),
});

const pad = (n: number) => String(n).padStart(2, "0");

// Every day in one month, oldest first (the list opens at the newest, at the bottom).
export async function getBibleMonth(year: number, month: number): Promise<BibleEntry[]> {
  const start = `${year}-${pad(month)}-01`;
  const end = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  const { data, error } = await db()
    .from("bible_entries")
    .select(COLUMNS)
    .gte("entry_date", start)
    .lt("entry_date", end)
    .order("entry_date");
  if (error) throw new Error(`Couldn't load entries: ${error.message}`);
  return (data as Row[]).map(toEntry);
}

// One day, or null if that day is empty.
export async function getBibleEntry(date: string): Promise<BibleEntry | null> {
  const { data, error } = await db().from("bible_entries").select(COLUMNS).eq("entry_date", date).maybeSingle();
  if (error) throw new Error(`Couldn't load the entry: ${error.message}`);
  return data ? toEntry(data as Row) : null;
}

// The month of the year's newest entry (where a past year opens), or null if the year is empty.
export async function getLastBibleMonth(year: number): Promise<number | null> {
  const { data } = await db()
    .from("bible_entries")
    .select("entry_date")
    .gte("entry_date", `${year}-01-01`)
    .lte("entry_date", `${year}-12-31`)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.entry_date.slice(5, 7)) : null;
}

// What the year's card on the home page is called.
export async function getBibleName(year: number): Promise<string | null> {
  const { data } = await db().from("home_items").select("name").eq("href", bibleHref(year)).limit(1).maybeSingle();
  return data?.name ?? null;
}

// year = which page the entry lives on; passages = "Isaiah 39:1-40:31 · Colossians 4".
export type BibleHit = { id: string; entry_date: string; year: number; passages: string; snippet: string };

// Case-insensitive "contains" search across passages and notes, newest first. year: only that year.
export async function searchBible(query: string, year?: number, limit = 50): Promise<{ results: BibleHit[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  let search = db().from("bible_entries").select(COLUMNS, { count: "exact" }).ilike("search_text", `%${safe}%`);
  if (year !== undefined) search = search.gte("entry_date", `${year}-01-01`).lte("entry_date", `${year}-12-31`);
  const { data, error, count } = await search.order("entry_date", { ascending: false }).limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  const q = query.toLowerCase();
  const results = (data as Row[]).map((r) => {
    const e = toEntry(r);
    const passages = [e.ot, e.nt].filter(Boolean).join(" · ");
    // Show the notes around the match (or the start of the notes if it matched a passage).
    const text = htmlToText(`${e.otNotes} ${e.ntNotes}`);
    const at = Math.max(0, text.toLowerCase().indexOf(q));
    const from = Math.max(0, at - 30);
    return {
      id: e.id,
      entry_date: e.date,
      year: Number(e.date.slice(0, 4)),
      passages,
      snippet: (from > 0 ? "…" : "") + text.slice(from, from + 120),
    };
  });
  return { results, total: count ?? results.length };
}
