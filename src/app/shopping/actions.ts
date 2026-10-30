"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// "uline.com/x" → "https://uline.com/x". Only web links are kept.
function cleanLink(raw: string): string | null | "bad" {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
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
  if (!name) return { error: "What do you need?" } as const;
  if (!isDate(added_on)) return { error: "Pick a date." } as const;
  if (link === "bad") return { error: "That link doesn't look right." } as const;
  return { values: { name, added_on, link, price: clean("price", 40) || null } } as const;
}

export async function addShoppingItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const top = await db().from("shopping_items").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const res = await db().from("shopping_items").insert({ ...parsed.values, position: (top.data?.position ?? -1) + 1 });
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/shopping");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateShoppingItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that item." };
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("shopping_items").update(parsed.values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/shopping");
  return { ok: true, message: null, savedAt: Date.now() };
}

// Check it off (moves to Bought, dated `today`), or put it back on the list.
export async function setBought(id: string, bought: boolean, today: string) {
  if (!isUuid(id)) throw new Error("Bad item.");
  const { error } = await db()
    .from("shopping_items")
    .update({ bought, bought_on: bought && isDate(today) ? today : null })
    .eq("id", id);
  if (error) throw new Error(`Couldn't update: ${error.message}`);
  revalidatePath("/shopping");
}

export async function deleteShoppingItem(id: string) {
  if (!isUuid(id)) return;
  const { error } = await db().from("shopping_items").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/shopping");
}
