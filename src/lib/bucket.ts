import "server-only";
import { db } from "./supabase";

export const BUCKET_PHOTOS = "bucket-photos";

export type BucketItem = {
  id: string;
  name: string;
  note: string | null;
  link: string | null;
  done: boolean;
  photo_path: string | null;
  photo: string | null; // a temporary link to show the photo
  position: number;
};

const COLUMNS = "id, name, note, link, done, photo_path, position";

// In the order you added them (oldest first), split into not yet / done.
export async function getBucket(): Promise<{ todo: BucketItem[]; done: BucketItem[] }> {
  const { data, error } = await db().from("bucket_items").select(COLUMNS).order("position");
  if (error) throw new Error(`Couldn't load the bucket list: ${error.message}`);
  const paths = data.map((d) => d.photo_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await db().storage.from(BUCKET_PHOTOS).createSignedUrls(paths, 60 * 60 * 6);
    if (signed.error) throw new Error(`Couldn't load photos: ${signed.error.message}`);
    for (const s of signed.data) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  const items = (data as Omit<BucketItem, "photo">[]).map((i) => ({ ...i, photo: i.photo_path ? (urls.get(i.photo_path) ?? null) : null }));
  return { todo: items.filter((i) => !i.done), done: items.filter((i) => i.done) };
}

export async function searchBucket(query: string, limit = 25): Promise<{ results: Omit<BucketItem, "photo">[]; total: number }> {
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error, count } = await db()
    .from("bucket_items")
    .select(COLUMNS, { count: "exact" })
    .ilike("search_text", `%${safe}%`)
    .order("position")
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return { results: data, total: count ?? data.length };
}
