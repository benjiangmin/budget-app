import "server-only";
import { db } from "./supabase";
import { journalHref } from "./home-pages";
import { cleanJournalHtml, journalText, picturePaths } from "./journal-html";
import { docLabel, docRange, docYearFor } from "./journal-years";

export const JOURNAL_BUCKET = "journal-images";

export type JournalEntry = { id: string; date: string; body: string }; // body = safe HTML, pictures linked

// Clean the saved HTML and give each picture a temporary link (6 hours).
export async function withPictureLinks(bodies: string[]): Promise<string[]> {
  const cleaned = bodies.map(cleanJournalHtml);
  const paths = [...new Set(cleaned.flatMap(picturePaths))];
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await db().storage.from(JOURNAL_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
    if (signed.error) throw new Error(`Couldn't load pictures: ${signed.error.message}`);
    for (const s of signed.data) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return cleaned.map((html) =>
    html.replace(/<img data-path="([^"]+)">/g, (_, p: string) =>
      urls.has(p) ? `<img data-path="${p}" src="${urls.get(p)}" alt="">` : "",
    ),
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

// Every entry in one month, oldest first (the list opens at the newest, at the bottom).
export async function getMonthEntries(year: number, month: number): Promise<JournalEntry[]> {
  const start = `${year}-${pad(month)}-01`;
  const end = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  const { data, error } = await db()
    .from("journal_entries")
    .select("id, entry_date, body")
    .gte("entry_date", start)
    .lt("entry_date", end)
    .order("entry_date");
  if (error) throw new Error(`Couldn't load entries: ${error.message}`);
  const bodies = await withPictureLinks(data.map((d) => d.body));
  return data.map((d, i) => ({ id: d.id, date: d.entry_date, body: bodies[i] }));
}

// One day's entry, or null if that day is empty.
export async function getEntry(date: string): Promise<JournalEntry | null> {
  const { data, error } = await db().from("journal_entries").select("id, entry_date, body").eq("entry_date", date).maybeSingle();
  if (error) throw new Error(`Couldn't load the entry: ${error.message}`);
  if (!data) return null;
  const [body] = await withPictureLinks([data.body]);
  return { id: data.id, date: data.entry_date, body };
}

// What the year's card on the home page is called ("Unsuspicious document #1").
export async function getDocumentName(year: number): Promise<string | null> {
  const { data } = await db().from("home_items").select("name").eq("href", journalHref(year)).limit(1).maybeSingle();
  return data?.name ?? null;
}

// The month a document's year starts in (1 = January, 9 = September for school years).
export async function getStartMonth(year: number): Promise<number> {
  const { data } = await db().from("journal_docs").select("start_month").eq("year", year).maybeSingle();
  return data?.start_month ?? 1;
}

// doc_year = which document (year page) the entry lives in, so search can link to it;
// doc = how to label it in the results ("Unsuspicious document #3 · 2023–24").
export type JournalHit = { id: string; entry_date: string; doc_year: number; doc: string; snippet: string };

// Case-insensitive "contains" search across every year, newest first.
// docYear: only search inside that one document's dates.
export async function searchJournal(
  query: string,
  docYear?: number,
  limit = 50,
): Promise<{ results: JournalHit[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  let search = db()
    .from("journal_entries")
    .select("id, entry_date, body", { count: "exact" })
    .ilike("search_text", `%${safe}%`);
  if (docYear !== undefined) {
    const { first, last } = docRange(docYear, await getStartMonth(docYear));
    search = search.gte("entry_date", first).lte("entry_date", last);
  }
  const { data, error, count } = await search.order("entry_date", { ascending: false }).limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  const [docs, cards] = await Promise.all([
    db().from("journal_docs").select("year, start_month"),
    db().from("home_items").select("name, href").like("href", "/journal/%"),
  ]);
  const starts = new Map((docs.data ?? []).map((d) => [d.year as number, d.start_month as number]));
  const names = new Map((cards.data ?? []).map((c) => [c.href as string, c.name as string]));
  const results = data.map((d) => {
    const year = docYearFor(d.entry_date, starts);
    const doc = `${names.get(`/journal/${year}`) ?? "Unsuspicious document"} · ${docLabel(year, starts.get(year) ?? 1)}`;
    const text = journalText(cleanJournalHtml(d.body));
    const at = Math.max(0, text.toLowerCase().indexOf(query.toLowerCase()));
    const start = Math.max(0, at - 30);
    return { id: d.id, entry_date: d.entry_date, doc_year: year, doc, snippet: (start > 0 ? "…" : "") + text.slice(start, start + 120) };
  });
  return { results, total: count ?? results.length };
}
