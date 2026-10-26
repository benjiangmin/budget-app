"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

// NOTE: no login yet. Fine while running locally; add Supabase Auth
// before deploying anywhere public, since server actions are open POST endpoints.

export async function addEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const amount = Number(formData.get("amount"));
  const categoryId = Number(formData.get("category_id"));
  const note = String(formData.get("note") ?? "").trim();
  const spentOn = String(formData.get("spent_on") ?? "");

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Enter an amount greater than 0." };
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { ok: false, message: "Pick a category." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
    return { ok: false, message: "Pick a date." };
  }

  const { error } = await db().from("entries").insert({
    amount: Math.round(amount * 100) / 100,
    category_id: categoryId,
    note: note || null,
    spent_on: spentOn,
  });
  if (error) return { ok: false, message: `Couldn't save: ${error.message}` };

  revalidatePath("/");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function deleteEntry(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { error } = await db().from("entries").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/");
}
