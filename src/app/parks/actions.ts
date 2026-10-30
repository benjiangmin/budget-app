"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { PARK_BUCKET } from "@/lib/parks";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const clean = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

// A park of your own (not on the national parks list, out of the country…).
export async function addPark(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = clean(formData, "name", 150);
  if (!name) return { ok: false, message: "What's it called?" };
  const res = await db()
    .from("parks")
    .insert({ name, note: clean(formData, "note", 500) || null, visited: formData.get("visited") === "on", custom: true });
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/parks");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updatePark(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that park." };
  const name = clean(formData, "name", 150);
  if (!name) return { ok: false, message: "What's it called?" };
  const res = await db().from("parks").update({ name, note: clean(formData, "note", 500) || null }).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/parks");
  return { ok: true, message: null, savedAt: Date.now() };
}

// Been there / not yet.
export async function setVisited(id: string, visited: boolean) {
  if (!isUuid(id)) throw new Error("Bad park.");
  const { error } = await db().from("parks").update({ visited }).eq("id", id);
  if (error) throw new Error(`Couldn't update: ${error.message}`);
  revalidatePath("/parks");
}

export async function deletePark(id: string) {
  if (!isUuid(id)) return;
  const prev = await db().from("parks").select("photo_path").eq("id", id).maybeSingle();
  const { error } = await db().from("parks").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  if (prev.data?.photo_path) await db().storage.from(PARK_BUCKET).remove([prev.data.photo_path]);
  revalidatePath("/parks");
}

// Your photo for a park (proof you went). Replaces the old one, if any.
export async function uploadParkPhoto(id: string, formData: FormData): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that park." };
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return { ok: false, message: "Only pictures can be added." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, message: "That picture is too big (10MB max)." };
  const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
  if (!["jpg", "png", "gif", "webp"].includes(ext)) return { ok: false, message: "Use a JPG, PNG, GIF or WebP picture." };

  const prev = await db().from("parks").select("photo_path").eq("id", id).maybeSingle();
  if (!prev.data) return { ok: false, message: "Couldn't find that park." };
  const path = `${crypto.randomUUID()}.${ext}`;
  const up = await db().storage.from(PARK_BUCKET).upload(path, file, { contentType: file.type });
  if (up.error) return { ok: false, message: `Couldn't upload: ${up.error.message}` };
  const res = await db().from("parks").update({ photo_path: path }).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  if (prev.data.photo_path) await db().storage.from(PARK_BUCKET).remove([prev.data.photo_path]);
  revalidatePath("/parks");
  return { ok: true };
}

export async function removeParkPhoto(id: string) {
  if (!isUuid(id)) return;
  const prev = await db().from("parks").select("photo_path").eq("id", id).maybeSingle();
  if (!prev.data?.photo_path) return;
  const res = await db().from("parks").update({ photo_path: null }).eq("id", id);
  if (res.error) throw new Error(`Couldn't remove it: ${res.error.message}`);
  await db().storage.from(PARK_BUCKET).remove([prev.data.photo_path]);
  revalidatePath("/parks");
}
