"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

function read(formData: FormData) {
  const fact = String(formData.get("fact") ?? "").trim().slice(0, 2000);
  const source = String(formData.get("source") ?? "").trim().slice(0, 200);
  const entry_date = String(formData.get("entry_date") ?? "");
  if (!fact) return { error: "What did you learn?" } as const;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) return { error: "Pick a date." } as const;
  return { values: { entry_date, fact, source: source || null } } as const;
}

export async function addLearned(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("learned_entries").insert(parsed.values);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/learned");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateLearned(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that entry." };
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("learned_entries").update(parsed.values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/learned");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function deleteLearned(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const { error } = await db().from("learned_entries").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/learned");
}
