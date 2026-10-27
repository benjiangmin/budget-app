"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

// NOTE: no login yet. Add Supabase Auth before deploying anywhere public.

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

type Values = { entry_date: string; first: string; second: string; third: string };

// Shared by add + edit: pull the three items and the date out of the form and check them.
function readEntry(formData: FormData): { error: string } | { values: Values } {
  const clean = (key: string) => String(formData.get(key) ?? "").trim().slice(0, 200);
  const first = clean("first");
  const second = clean("second");
  const third = clean("third");
  const entryDate = String(formData.get("entry_date") ?? "");

  if (!first || !second || !third) return { error: "Fill in all three." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return { error: "Pick a date." };

  return { values: { entry_date: entryDate, first, second, third } };
}

export async function addGratitude(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = readEntry(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const res = await db().from("gratitude_entries").insert(parsed.values);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };

  revalidatePath("/gratitude");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateGratitude(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that entry." };

  const parsed = readEntry(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const res = await db().from("gratitude_entries").update(parsed.values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };

  revalidatePath("/gratitude");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function deleteGratitude(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const { error } = await db().from("gratitude_entries").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/gratitude");
}
