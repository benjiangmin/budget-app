"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

export type FormState = { ok: boolean; message: string | null; savedAt?: number };

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const STATUSES = ["backlog", "playing", "completed", "stopped"];

function read(formData: FormData) {
  const clean = (key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);
  const date = (key: string) => {
    const v = clean(key, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  };
  const title = clean("title", 200);
  const status = clean("status", 20);
  const started_on = date("started_on");
  const finished_on = date("finished_on");
  if (!title) return { error: "What's the goal?" } as const;
  if (!STATUSES.includes(status)) return { error: "Pick a status." } as const;
  if (started_on && finished_on && finished_on < started_on) return { error: "The completed date is before the start." } as const;
  return {
    values: { title, status, started_on, finished_on, why: clean("why", 500) || null, proof: clean("proof", 500) || null },
  } as const;
}

async function nextPosition() {
  const top = await db().from("goals").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  return (top.data?.position ?? -1) + 1;
}

export async function addGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("goals").insert({ ...parsed.values, position: await nextPosition() });
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/goals");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function updateGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { ok: false, message: "Couldn't find that goal." };
  const parsed = read(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error ?? null };
  const res = await db().from("goals").update(parsed.values).eq("id", id);
  if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  revalidatePath("/goals");
  return { ok: true, message: null, savedAt: Date.now() };
}

export async function deleteGoal(id: string) {
  if (!isUuid(id)) return;
  const { error } = await db().from("goals").delete().eq("id", id);
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  revalidatePath("/goals");
}

// Dragged to another column. If it has no date yet: moving to In progress sets the start to `today`,
// moving to Completed sets the completed date to `today` (your computer's date, sent by the board).
export async function moveGoal(id: string, status: string, today: string) {
  if (!isUuid(id) || !STATUSES.includes(status)) throw new Error("Bad move.");
  const { data, error } = await db().from("goals").select("started_on, finished_on").eq("id", id).maybeSingle();
  if (error || !data) throw new Error(`Couldn't move it: ${error?.message ?? "not found"}`);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : null;
  const changes: { status: string; started_on?: string; finished_on?: string } = { status };
  if (day && status === "playing" && !data.started_on) changes.started_on = day;
  if (day && status === "completed" && !data.finished_on) changes.finished_on = day;
  const res = await db().from("goals").update(changes).eq("id", id);
  if (res.error) throw new Error(`Couldn't move it: ${res.error.message}`);
  revalidatePath("/goals");
}
