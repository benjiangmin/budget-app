import "server-only";
import { db } from "./supabase";
import { htmlToText, toDreamHtml } from "./dream-html";

export const DREAM_BUCKET = "dream-images";

export type DreamImage = { path: string; url: string }; // url = temporary link for showing it
// body = safe HTML (bold/italic/underline), text = the same words without formatting
export type Dream = { id: string; body: string; text: string; images: DreamImage[] };
export type DreamDay = { date: string; dreams: Dream[] }; // date = "YYYY-MM-DD"

// Every dream in a year, newest day first, grouped by day.
export async function getDreamsForYear(year: number): Promise<DreamDay[]> {
  const { data, error } = await db()
    .from("dreams")
    .select("id, dream_date, body, images")
    .gte("dream_date", `${year}-01-01`)
    .lt("dream_date", `${year + 1}-01-01`)
    .order("dream_date", { ascending: false })
    .order("position")
    .order("created_at");
  if (error) throw new Error(`Couldn't load dreams: ${error.message}`);

  // The picture folder is private, so make a temporary link (6 hours) for each picture.
  const paths = data.flatMap((d) => d.images as string[]);
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await db().storage.from(DREAM_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
    if (signed.error) throw new Error(`Couldn't load pictures: ${signed.error.message}`);
    for (const s of signed.data) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  const days: DreamDay[] = [];
  for (const d of data) {
    const body = toDreamHtml(d.body);
    const dream: Dream = {
      id: d.id,
      body,
      text: htmlToText(body),
      images: (d.images as string[]).filter((p) => urls.has(p)).map((p) => ({ path: p, url: urls.get(p)! })),
    };
    const last = days.at(-1);
    if (last && last.date === d.dream_date) last.dreams.push(dream);
    else days.push({ date: d.dream_date, dreams: [dream] });
  }
  return days;
}
