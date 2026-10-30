"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const STATUSES = ["todo", "bought", "arrived"];

// "uline.com/x" → "https://uline.com/x". Only web links are kept.
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
  const clean = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
  const year = Number(formData.get("year"));
  const person = clean("person", 80);
  const priceText = clean("price", 20).replace(/[$,\s]/g, "");
  const price = priceText === "" ? null : Number(priceText);
  const link = cleanLink(clean("link", 2000));
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return { error: "Bad year." } as const;
  if (!person) return { error: "Who's it for?" } as const;
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1_000_000)) return { error: "The price should be a number." } as const;
  if (link === "bad") return { error: "That link doesn't look right." } as const;
  return { values: { year, person, item: clean("item", 300) || null, price, link } } as const;
}

export async function addGift(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const top = await db().from("christmas_gifts").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const res = await db().from("christmas_gifts").insert({ ...parsed.values, position: (top.data?.position ?? -1) + 1 });
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/christmas");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateGift(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that gift." };
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("christmas_gifts").update(parsed.values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/christmas");
  return { ok: true, message: null, savedAt: Date.now() };
}

// To buy → Bought → Arrived.
export async function setGiftStatus(id: string, status: string) {
  if (!isUuid(id) || !STATUSES.includes(status)) throw new Error("Bad update.");
  const { error } = await db().from("christmas_gifts").update({ status }).eq("id", id);
  if (error) throw new Error(`Couldn't update: ${error.message}`);
  revalidatePath("/christmas");
}

export async function deleteGift(id: string) {
  if (!isUuid(id)) return;
  const { error } = await db().from("christmas_gifts").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/christmas");
}
