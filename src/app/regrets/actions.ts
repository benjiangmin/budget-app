"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

function read(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim().slice(0, 500);
  if (!body) return { error: "What's the regret?" } as const;
  return { values: { body } } as const;
}

export async function addRegret(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const top = await db().from("regrets").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const res = await db().from("regrets").insert({ ...parsed.values, position: (top.data?.position ?? -1) + 1 });
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/regrets");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateRegret(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that one." };
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("regrets").update(parsed.values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/regrets");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function deleteRegret(id: string) {
  if (!isUuid(id)) return;
  const { error } = await db().from("regrets").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/regrets");
}
