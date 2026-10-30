"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { getBibleEntry, type BibleEntry } from "@/lib/bible";
import { cleanDreamHtml, htmlToText } from "@/lib/dream-html";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export type BibleDraft = { ot: string; otNotes: string; nt: string; ntNotes: string };

// Load one day into the writing box.
export async function loadBibleDay(date: string): Promise<BibleEntry | null> {
  if (!isDate(date)) throw new Error("Bad date.");
  return getBibleEntry(date);
}

export type SaveResult = { ok: true; exists: boolean } | { ok: false; message: string };

// Save a day (creates it, updates it, or removes it if everything is now empty).
export async function saveBibleDay(date: string, draft: BibleDraft): Promise<SaveResult> {
  if (!isDate(date)) return { ok: false, message: "Pick a date." };
  const passage = (s: string) => String(s ?? "").trim().slice(0, 200) || null;
  const notes = (s: string) => {
    const html = cleanDreamHtml(String(s ?? ""));
    return htmlToText(html) ? html : null;
  };
  const row = {
    ot_passage: passage(draft.ot),
    ot_notes: notes(draft.otNotes),
    nt_passage: passage(draft.nt),
    nt_notes: notes(draft.ntNotes),
  };
  const empty = Object.values(row).every((v) => v === null);

  if (empty) {
    const del = await db().from("bible_entries").delete().eq("entry_date", date);
    if (del.error) return { ok: false, message: `Couldn't save: ${del.error.message}` };
  } else {
    const res = await db()
      .from("bible_entries")
      .upsert({ entry_date: date, ...row, updated_at: new Date().toISOString() }, { onConflict: "entry_date" });
    if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  }
  revalidatePath(`/bible/${date.slice(0, 4)}`);
  return { ok: true, exists: !empty };
}

export async function deleteBibleEntry(id: string) {
  if (!isUuid(id)) throw new Error("Bad id.");
  const { data, error } = await db().from("bible_entries").delete().eq("id", id).select("entry_date").maybeSingle();
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  if (data) revalidatePath(`/bible/${data.entry_date.slice(0, 4)}`);
}
