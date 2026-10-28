"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { JOURNAL_BUCKET, getEntry, type JournalEntry } from "@/lib/journal";
import { cleanJournalHtml, isBlank, picturePaths } from "@/lib/journal-html";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

// Load one day into the writing box.
export async function loadJournalDay(date: string): Promise<JournalEntry | null> {
  if (!isDate(date)) throw new Error("Bad date.");
  return getEntry(date);
}

export type SaveResult = { ok: true; exists: boolean } | { ok: false; message: string };

// Save a day's entry (creates it, updates it, or removes it if it's now empty).
// `quiet`: used for today's autosave. Today isn't in the list yet, so the page doesn't need refreshing.
export async function saveJournalDay(date: string, html: string, quiet = false): Promise<SaveResult> {
  if (!isDate(date)) return { ok: false, message: "Pick a date." };
  const body = cleanJournalHtml(html);

  const prev = await db().from("journal_entries").select("body").eq("entry_date", date).maybeSingle();
  if (prev.error) return { ok: false, message: `Couldn't save: ${prev.error.message}` };
  const oldPictures = prev.data ? picturePaths(cleanJournalHtml(prev.data.body)) : [];

  let exists = true;
  if (isBlank(body)) {
    exists = false;
    if (prev.data) {
      const del = await db().from("journal_entries").delete().eq("entry_date", date);
      if (del.error) return { ok: false, message: `Couldn't save: ${del.error.message}` };
    }
  } else {
    const res = await db()
      .from("journal_entries")
      .upsert({ entry_date: date, body, updated_at: new Date().toISOString() }, { onConflict: "entry_date" });
    if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  }

  // Pictures that were taken out of the entry.
  const kept = new Set(picturePaths(body));
  const removed = oldPictures.filter((p) => !kept.has(p));
  if (removed.length > 0) await db().storage.from(JOURNAL_BUCKET).remove(removed);

  if (!quiet) revalidatePath(`/journal/${date.slice(0, 4)}`);
  return { ok: true, exists };
}

export async function deleteJournalEntry(id: string) {
  if (!isUuid(id)) throw new Error("Bad id.");
  const { data, error } = await db().from("journal_entries").select("entry_date, body").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  if (!data) return;
  const del = await db().from("journal_entries").delete().eq("id", id);
  if (del.error) throw new Error(`Couldn't delete: ${del.error.message}`);
  const pictures = picturePaths(cleanJournalHtml(data.body));
  if (pictures.length > 0) await db().storage.from(JOURNAL_BUCKET).remove(pictures);
  revalidatePath(`/journal/${data.entry_date.slice(0, 4)}`);
}

// Pictures are uploaded the moment you add them, so they can show right away in the text.
// Returns the file name (saved in the entry) and a temporary link to show it now.
export async function uploadJournalPicture(formData: FormData): Promise<{ path: string; url: string } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return { error: "Only pictures can be added." };
  if (file.size > 10 * 1024 * 1024) return { error: "That picture is too big (10MB max)." };
  const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
  if (!["jpg", "png", "gif", "webp"].includes(ext)) return { error: "Use a JPG, PNG, GIF or WebP picture." };
  const path = `${crypto.randomUUID()}.${ext}`;
  const up = await db().storage.from(JOURNAL_BUCKET).upload(path, file, { contentType: file.type });
  if (up.error) return { error: `Couldn't upload: ${up.error.message}` };
  const signed = await db().storage.from(JOURNAL_BUCKET).createSignedUrl(path, 60 * 60 * 6);
  if (signed.error) return { error: `Couldn't upload: ${signed.error.message}` };
  return { path, url: signed.data.signedUrl };
}

// Set up a new document's year type, once, when its card is first pointed at it.
// If that year already exists, its setting is kept (a document's year type never changes).
export async function createJournalDoc(year: number, startMonth: 1 | 9) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new Error("Bad year.");
  if (startMonth !== 1 && startMonth !== 9) throw new Error("Bad year type.");
  const res = await db()
    .from("journal_docs")
    .upsert({ year, start_month: startMonth }, { onConflict: "year", ignoreDuplicates: true });
  if (res.error) throw new Error(`Couldn't set up the document: ${res.error.message}`);
  revalidatePath(`/journal/${year}`);
}
