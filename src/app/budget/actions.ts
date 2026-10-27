"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

// NOTE: no login yet. Fine while running locally; add Supabase Auth
// before deploying anywhere public, since server actions are open POST endpoints.

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

// Shared by add + edit: pull the fields out of the form and check them.
type EntryValues = { amount: number; category_id: number; spent_on: string; note: string | null };

function readEntry(formData: FormData): { error: string } | { values: EntryValues } {
  const amount = Number(formData.get("amount"));
  const categoryId = Number(formData.get("category_id"));
  const spentOn = String(formData.get("spent_on") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 120);

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount greater than 0." };
  if (!Number.isInteger(categoryId) || categoryId <= 0) return { error: "Pick a category." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) return { error: "Pick a date." };

  return {
    values: {
      amount: Math.round(amount * 100) / 100,
      category_id: categoryId,
      spent_on: spentOn,
      note: note || null,
    },
  };
}

export async function addEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = readEntry(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const { values } = parsed;

  const res = await db().from("entries").insert(values);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };

  revalidatePath("/budget");
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

  revalidatePath("/budget");
  return { ok: true, message: null, savedAt: Date.now() };
}

export type NewCategoryResult =
  | { ok: true; category: { id: number; name: string; color: string } }
  | { ok: false; message: string };

export async function createCategory(name: string, color: string): Promise<NewCategoryResult> {
  const clean = name.trim().slice(0, 40);
  if (!clean) return { ok: false, message: "Give it a name." };
  if (!/^#[0-9a-f]{6}$/i.test(color)) return { ok: false, message: "Pick a color." };

  // Put new categories at the end of the list.
  const { data: last } = await db()
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db()
    .from("categories")
    .insert({ name: clean, color, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id, name, color")
    .single();

  if (error) {
    const taken = error.code === "23505"; // unique violation
    return { ok: false, message: taken ? `"${clean}" already exists.` : `Couldn't add: ${error.message}` };
  }

  revalidatePath("/budget");
  return { ok: true, category: data };
}

export async function updateCategory(
  id: number,
  name: string,
  color: string,
): Promise<NewCategoryResult> {
  const clean = name.trim().slice(0, 40);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Couldn't find that category." };
  if (!clean) return { ok: false, message: "Give it a name." };
  if (!/^#[0-9a-f]{6}$/i.test(color)) return { ok: false, message: "Pick a color." };

  const { data, error } = await db()
    .from("categories")
    .update({ name: clean, color })
    .eq("id", id)
    .select("id, name, color")
    .single();

  if (error) {
    const taken = error.code === "23505";
    return { ok: false, message: taken ? `"${clean}" already exists.` : `Couldn't save: ${error.message}` };
  }

  revalidatePath("/budget");
  return { ok: true, category: data };
}

export async function deleteCategory(id: number): Promise<{ ok: boolean; message?: string }> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Couldn't find that category." };

  const { error } = await db().from("categories").delete().eq("id", id);
  if (error) {
    // Foreign key violation: expenses still use this category.
    const inUse = error.code === "23503";
    return {
      ok: false,
      message: inUse
        ? "Some expenses use this category. Move or delete them first."
        : `Couldn't delete: ${error.message}`,
    };
  }

  revalidatePath("/budget");
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const { error } = await db().from("entries").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/budget");
}
