import "server-only";
import { db } from "./supabase";
import { htmlToText, toDreamHtml } from "./dream-html";

export const CRASHOUT_BUCKET = "crashout-images";

export type CrashoutImage = { path: string; url: string }; // url = temporary link for showing it
// body = safe HTML (bold/italic/underline), text = the same words without formatting
export type Crashout = { id: string; body: string; text: string; images: CrashoutImage[] };
export type CrashoutDay = { date: string; crashouts: Crashout[] }; // date = "YYYY-MM-DD"

// Every crashout in a year, newest day first, grouped by day.
export async function getCrashoutsForYear(year: number): Promise<CrashoutDay[]> {
  const { data, error } = await db()
    .from("crashouts")
    .select("id, crashout_date, body, images")
    .gte("crashout_date", `${year}-01-01`)
    .lt("crashout_date", `${year + 1}-01-01`)
    .order("crashout_date", { ascending: false })
    .order("position")
    .order("created_at");
  if (error) throw new Error(`Couldn't load crashouts: ${error.message}`);

  // The picture folder is private, so make a temporary link (6 hours) for each picture.
  const paths = data.flatMap((d) => d.images as string[]);
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await db().storage.from(CRASHOUT_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
    if (signed.error) throw new Error(`Couldn't load pictures: ${signed.error.message}`);
    for (const s of signed.data) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  const days: CrashoutDay[] = [];
  for (const d of data) {
    const body = toDreamHtml(d.body);
    const crashout: Crashout = {
      id: d.id,
      body,
      text: htmlToText(body),
      images: (d.images as string[]).filter((p) => urls.has(p)).map((p) => ({ path: p, url: urls.get(p)! })),
    };
    const last = days.at(-1);
    if (last && last.date === d.crashout_date) last.crashouts.push(crashout);
    else days.push({ date: d.crashout_date, crashouts: [crashout] });
  }
  return days;
}

export type CrashoutHit = { id: string; crashout_date: string; snippet: string };

// Case-insensitive "contains" search across every crashout, newest first.
// Returns a short piece of text around the match for the results list.
export async function searchCrashouts(query: string, limit = 25): Promise<{ results: CrashoutHit[]; total: number }> {
  // Escape LIKE wildcards so typing % or _ searches for them literally.
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("crashouts")
    .select("id, crashout_date, body", { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("crashout_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);

  const results = data.map((d) => {
    const text = htmlToText(toDreamHtml(d.body));
    const at = Math.max(0, text.toLowerCase().indexOf(query.toLowerCase()));
    const start = Math.max(0, at - 30);
    const snippet = (start > 0 ? "…" : "") + text.slice(start, start + 120);
    return { id: d.id, crashout_date: d.crashout_date, snippet };
  });
  return { results, total: count ?? results.length };
}
