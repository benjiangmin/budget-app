"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { DREAM_BUCKET } from "@/lib/dreams";

// NOTE: no login yet. Add Supabase Auth before deploying anywhere public.

export type SaveResult = { ok: boolean; message: string | null };

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// What the form sends for each dream (the pictures themselves come as separate files).
type DreamMeta = { id: string | null; body: string; keep: string[]; newCount: number };

function readMeta(raw: string): DreamMeta[] | null {
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length > 20) return null;
    return list.map((d) => ({
      id: typeof d.id === "string" && isUuid(d.id) ? d.id : null,
      body: String(d.body ?? "").slice(0, 20000),
      keep: Array.isArray(d.keep) ? d.keep.map(String) : [],
      newCount: Math.min(Math.max(Number(d.newCount) || 0, 0), 20),
    }));
  } catch {
    return null;
  }
}

// Saves a day's dreams. Used for both a new entry and editing a day:
//  - new entry (no original_date): the dreams are added to that date, after any already there
//  - editing (original_date set): the form holds the whole day, so dreams left out are deleted
export async function saveDreamDay(formData: FormData): Promise<SaveResult> {
  const date = String(formData.get("dream_date") ?? "");
  const original = String(formData.get("original_date") ?? "");
  const meta = readMeta(String(formData.get("dreams") ?? ""));
  if (!isDate(date)) return { ok: false, message: "Pick a date." };
  if ((original && !isDate(original)) || !meta) return { ok: false, message: "Something's off with the form. Refresh and try again." };

  const supa = db();

  // The dreams already saved for the day being edited.
  let existing: { id: string; images: string[] }[] = [];
  if (original) {
    const res = await supa.from("dreams").select("id, images").eq("dream_date", original);
    if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
    existing = res.data;
  }
  const byId = new Map(existing.map((e) => [e.id, e]));

  // New entries go after the dreams already logged that day.
  let position = 0;
  if (!original) {
    const { count } = await supa.from("dreams").select("id", { count: "exact", head: true }).eq("dream_date", date);
    position = count ?? 0;
  }
  const startPosition = position;

  const kept = new Set<string>(); // ids still in the day
  const unusedPictures = new Set<string>();

  for (const [i, d] of meta.entries()) {
    const prev = d.id ? byId.get(d.id) : undefined;
    if (d.id && !prev) return { ok: false, message: "One of these dreams was already deleted. Refresh and try again." };

    // Pictures it already had and still has, then any new ones.
    const keep = prev ? d.keep.filter((p) => prev.images.includes(p)) : [];
    prev?.images.filter((p) => !keep.includes(p)).forEach((p) => unusedPictures.add(p));

    const uploaded: string[] = [];
    for (let k = 0; k < d.newCount; k++) {
      const file = formData.get(`file_${i}_${k}`);
      if (!(file instanceof File) || file.size === 0) continue;
      if (!file.type.startsWith("image/")) return { ok: false, message: "Only pictures can be attached." };
      if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "One picture is too big (10MB max)." };
      const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await supa.storage.from(DREAM_BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) return { ok: false, message: `Couldn't upload a picture: ${up.error.message}` };
      uploaded.push(path);
    }

    const body = d.body.trim();
    const images = [...keep, ...uploaded];
    if (!body && images.length === 0) continue; // empty box: skip it (or delete it, if it was saved before)

    const row = { dream_date: date, body, images, position: position++ };
    const res = prev ? await supa.from("dreams").update(row).eq("id", prev.id) : await supa.from("dreams").insert(row);
    if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
    if (prev) kept.add(prev.id);
  }

  if (!original && position === startPosition) return { ok: false, message: "Write at least one dream." };

  // Dreams removed while editing.
  const removed = existing.filter((e) => !kept.has(e.id));
  if (removed.length > 0) {
    const res = await supa.from("dreams").delete().in("id", removed.map((e) => e.id));
    if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
    removed.forEach((e) => e.images.forEach((p) => unusedPictures.add(p)));
  }
  if (unusedPictures.size > 0) await supa.storage.from(DREAM_BUCKET).remove([...unusedPictures]);

  revalidatePath("/dreams");
  return { ok: true, message: null };
}

// Deletes every dream on a date, and their pictures.
export async function deleteDreamDay(date: string) {
  if (!isDate(date)) throw new Error("Bad date.");
  const supa = db();
  const { data, error } = await supa.from("dreams").select("images").eq("dream_date", date);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  const del = await supa.from("dreams").delete().eq("dream_date", date);
  if (del.error) throw new Error(`Couldn't delete: ${del.error.message}`);
  const pictures = data.flatMap((d) => d.images as string[]);
  if (pictures.length > 0) await supa.storage.from(DREAM_BUCKET).remove(pictures);
  revalidatePath("/dreams");
}
