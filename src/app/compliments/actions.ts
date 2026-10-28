"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

function read(formData: FormData) {
  const clean = (key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);
  const said_on = String(formData.get("said_on") ?? "");
  const person = clean("person", 120);
  const compliment = clean("compliment", 1000);
  const note = clean("note", 1000) || null;
  const date_known = formData.get("date_forgotten") !== "on";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(said_on)) return { error: "Pick a date." } as const;
  if (!person) return { error: "Who said it?" } as const;
  if (!compliment) return { error: "What did they say?" } as const;
  return { values: { said_on, date_known, person, compliment, note } } as const;
}

export async function addCompliment(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  // New ones go on top of the same day.
  const { count } = await db()
    .from("compliments")
    .select("id", { count: "exact", head: true })
    .eq("said_on", parsed.values.said_on);
  const res = await db().from("compliments").insert({ ...parsed.values, position: count ?? 0 });
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/compliments");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateCompliment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that compliment." };
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("compliments").update(parsed.values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/compliments");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function deleteCompliment(id: string) {
  if (!isUuid(id)) return;
  const { error } = await db().from("compliments").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/compliments");
}
