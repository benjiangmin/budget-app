"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

// NOTE: no login yet. Fine while running locally; add Supabase Auth
// before deploying anywhere public, since server actions are open POST endpoints.

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

// Shared by add + edit: pull the fields out of the form and check them.
type EntryValues = { amount: number; category_id: number; spent_on: string };

function readEntry(formData: FormData): { error: string } | { values: EntryValues } {
  const amount = Number(formData.get("amount"));
  const categoryId = Number(formData.get("category_id"));
  const spentOn = String(formData.get("spent_on") ?? "");

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount greater than 0." };
  if (!Number.isInteger(categoryId) || categoryId <= 0) return { error: "Pick a category." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) return { error: "Pick a date." };

  return {
    values: {
      amount: Math.round(amount * 100) / 100,
      category_id: categoryId,
      spent_on: spentOn,
    },
  };
}

export async function addEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = readEntry(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const { values } = parsed;

  const res = await db().from("entries").insert(values);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };

  revalidatePath("/");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that expense." };

  const parsed = readEntry(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const { values } = parsed;

  const res = await db().from("entries").update(values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };

  revalidatePath("/");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function deleteEntry(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const { error } = await db().from("entries").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/");
}
