"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { BUCKET_PHOTOS } from "@/lib/bucket";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const clean = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

// A web link, or a page on this site ("/parks"). "x.com/y" → "https://x.com/y".
function cleanLink(raw: string): string | null | "bad" {
  const s = raw.trim();
  if (!s) return null;
  if (/^\/[a-z0-9\-/?=&]*$/i.test(s)) return s;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "bad";
  } catch {
    return "bad";
  }
}

function read(formData: FormData) {
  const name = clean(formData, "name", 200);
  const link = cleanLink(clean(formData, "link", 2000));
  if (!name) return { error: "What's on the list?" } as const;
  if (link === "bad") return { error: "That link doesn't look right." } as const;
  return { values: { name, note: clean(formData, "note", 2000) || null, link } } as const;
}

export async function addBucketItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const top = await db().from("bucket_items").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const res = await db()
    .from("bucket_items")
    .insert({ ...parsed.values, done: formData.get("done") === "on", position: (top.data?.position ?? -1) + 1 });
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/bucket");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateBucketItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that one." };
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("bucket_items").update(parsed.values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/bucket");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function setBucketDone(id: string, done: boolean) {
  if (!isUuid(id)) throw new Error("Bad item.");
  const { error } = await db().from("bucket_items").update({ done }).eq("id", id);
  if (error) throw new Error(`Couldn't update: ${error.message}`);
  revalidatePath("/bucket");
}

export async function deleteBucketItem(id: string) {
  if (!isUuid(id)) return;
  const prev = await db().from("bucket_items").select("photo_path").eq("id", id).maybeSingle();
  const { error } = await db().from("bucket_items").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  if (prev.data?.photo_path) await db().storage.from(BUCKET_PHOTOS).remove([prev.data.photo_path]);
  revalidatePath("/bucket");
}

// A photo for a done item (proof!). Replaces the old one, if any.
export async function uploadBucketPhoto(id: string, formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that one." };
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return { ok: false, message: "Only pictures can be added." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, message: "That picture is too big (10MB max)." };
  const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
  if (!["jpg", "png", "gif", "webp"].includes(ext)) return { ok: false, message: "Use a JPG, PNG, GIF or WebP picture." };
  const prev = await db().from("bucket_items").select("photo_path").eq("id", id).maybeSingle();
  if (!prev.data) return { ok: false, message: "Couldn't find that one." };
  const path = `${crypto.randomUUID()}.${ext}`;
  const up = await db().storage.from(BUCKET_PHOTOS).upload(path, file, { contentType: file.type });
  if (up.error) return { ok: false, message: `Couldn't upload: ${up.error.message}` };
  const res = await db().from("bucket_items").update({ photo_path: path }).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  if (prev.data.photo_path) await db().storage.from(BUCKET_PHOTOS).remove([prev.data.photo_path]);
  revalidatePath("/bucket");
  return { ok: true };
}

export async function removeBucketPhoto(id: string) {
  if (!isUuid(id)) return;
  const prev = await db().from("bucket_items").select("photo_path").eq("id", id).maybeSingle();
  if (!prev.data?.photo_path) return;
  const res = await db().from("bucket_items").update({ photo_path: null }).eq("id", id);
  if (res.error) throw new Error(`Couldn't remove it: ${res.error.message}`);
  await db().storage.from(BUCKET_PHOTOS).remove([prev.data.photo_path]);
  revalidatePath("/bucket");
}
