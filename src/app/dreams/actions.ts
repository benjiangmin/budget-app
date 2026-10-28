"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { DREAM_BUCKET } from "@/lib/dreams";
import { cleanDreamHtml, htmlToText } from "@/lib/dream-html";

// NOTE: no login yet. Add Supabase Auth before deploying anywhere public.

export type SaveResult = { ok: boolean; message: string | null };

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const clampCount = (n: unknown) => Math.min(Math.max(Number(n) || 0, 0), 20);

// Uploads the pictures sent as `${prefix}0`, `${prefix}1`, … and returns their file names.
async function uploadPictures(formData: FormData, prefix: string, count: number): Promise<string[] | string> {
  const paths: string[] = [];
  for (let k = 0; k < count; k++) {
    const file = formData.get(`${prefix}${k}`);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!file.type.startsWith("image/")) return "Only pictures can be attached.";
    if (file.size > MAX_IMAGE_BYTES) return "One picture is too big (10MB max).";
    const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
    const path = `${crypto.randomUUID()}.${ext}`;
    const up = await db().storage.from(DREAM_BUCKET).upload(path, file, { contentType: file.type });
    if (up.error) return `Couldn't upload a picture: ${up.error.message}`;
    paths.push(path);
  }
  return paths;
}

async function removePictures(paths: string[]) {
  if (paths.length > 0) await db().storage.from(DREAM_BUCKET).remove(paths);
}

// How many dreams a date already has (new ones go after them).
async function countOn(date: string) {
  const { count } = await db().from("dreams").select("id", { count: "exact", head: true }).eq("dream_date", date);
  return count ?? 0;
}

// New entry: one or more dreams for a date. Empty boxes are skipped.
export async function addDreams(formData: FormData): Promise<SaveResult> {
  const date = String(formData.get("dream_date") ?? "");
  if (!isDate(date)) return { ok: false, message: "Pick a date." };

  let list: { body: string; newCount: number }[];
  try {
    const raw = JSON.parse(String(formData.get("dreams") ?? ""));
    if (!Array.isArray(raw) || raw.length > 20) throw new Error();
    list = raw.map((d) => ({ body: String(d.body ?? ""), newCount: clampCount(d.newCount) }));
  } catch {
    return { ok: false, message: "Something's off with the form. Refresh and try again." };
  }

  let position = await countOn(date);
  let saved = 0;
  for (const [i, d] of list.entries()) {
    const pictures = await uploadPictures(formData, `file_${i}_`, d.newCount);
    if (typeof pictures === "string") return { ok: false, message: pictures };
    const body = cleanDreamHtml(d.body);
    if (!htmlToText(body) && pictures.length === 0) continue; // empty box
    const res = await db().from("dreams").insert({ dream_date: date, body, images: pictures, position: position++ });
    if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
    saved++;
  }
  if (saved === 0) return { ok: false, message: "Write at least one dream." };

  revalidatePath("/dreams");
  return { ok: true, message: null };
}

// Edit one dream: its date, words and pictures.
export async function updateDream(formData: FormData): Promise<SaveResult> {
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("dream_date") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Something's off. Refresh and try again." };
  if (!isDate(date)) return { ok: false, message: "Pick a date." };

  const prev = await db().from("dreams").select("dream_date, images, position").eq("id", id).maybeSingle();
  if (prev.error) return { ok: false, message: `Couldn't save: ${prev.error.message}` };
  if (!prev.data) return { ok: false, message: "This dream was already deleted. Refresh the page." };
  const oldPictures = prev.data.images as string[];

  let keep: string[] = [];
  try {
    const raw = JSON.parse(String(formData.get("keep") ?? "[]"));
    if (Array.isArray(raw)) keep = raw.map(String).filter((p) => oldPictures.includes(p));
  } catch {}

  const added = await uploadPictures(formData, "file_", clampCount(formData.get("newCount")));
  if (typeof added === "string") return { ok: false, message: added };

  const body = cleanDreamHtml(String(formData.get("body") ?? ""));
  const images = [...keep, ...added];
  if (!htmlToText(body) && images.length === 0) {
    await removePictures(added);
    return { ok: false, message: "A dream can't be empty. Use × to delete it instead." };
  }

  // Moved to another date: put it after that date's dreams.
  const position = date === prev.data.dream_date ? prev.data.position : await countOn(date);
  const res = await db().from("dreams").update({ dream_date: date, body, images, position }).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  await removePictures(oldPictures.filter((p) => !keep.includes(p)));

  revalidatePath("/dreams");
  return { ok: true, message: null };
}

// Delete one dream and its pictures.
export async function deleteDream(id: string) {
  if (!isUuid(id)) throw new Error("Bad id.");
  const { data, error } = await db().from("dreams").select("images").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  const del = await db().from("dreams").delete().eq("id", id);
  if (del.error) throw new Error(`Couldn't delete: ${del.error.message}`);
  await removePictures((data?.images as string[] | undefined) ?? []);
  revalidatePath("/dreams");
}
