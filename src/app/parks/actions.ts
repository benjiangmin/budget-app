"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

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
  const { error } = await db().from("parks").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/parks");
}
