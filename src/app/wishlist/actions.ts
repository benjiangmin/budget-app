"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const STATUSES = ["want", "got", "dropped"];

// "x.com/y" → "https://x.com/y". Only web links are kept.
function cleanLink(raw: string): string | null | "bad" {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "bad";
  } catch {
    return "bad";
  }
}

function read(formData: FormData) {
  const clean = (key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);
  const name = clean("name", 200);
  const added_on = clean("added_on", 10);
  const link = cleanLink(clean("link", 2000));
  if (!name) return { error: "What do you want?" } as const;
  if (link === "bad") return { error: "That link doesn't look right." } as const;
  return {
    values: {
      name,
      added_on: isDate(added_on) ? added_on : null,
      link,
      price: clean("price", 60).replace(/^\$\s*/, "") || null, // the box already shows the $
      note: clean("note", 2000) || null,
    },
  } as const;
}

export async function addWish(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const top = await db().from("wishlist_items").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const res = await db().from("wishlist_items").insert({ ...parsed.values, position: (top.data?.position ?? -1) + 1 });
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/wishlist");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateWish(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that one." };
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("wishlist_items").update(parsed.values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/wishlist");
  return { ok: true, message: null, savedAt: Date.now() };
}

// Got it / changed my mind / still want it.
export async function setWishStatus(id: string, status: string) {
  if (!isUuid(id) || !STATUSES.includes(status)) throw new Error("Bad update.");
  const { error } = await db().from("wishlist_items").update({ status }).eq("id", id);
  if (error) throw new Error(`Couldn't update: ${error.message}`);
  revalidatePath("/wishlist");
}

export async function deleteWish(id: string) {
  if (!isUuid(id)) return;
  const { error } = await db().from("wishlist_items").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/wishlist");
}
