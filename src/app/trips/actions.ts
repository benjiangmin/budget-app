"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { JOURNAL_BUCKET } from "@/lib/journal";
import { cleanJournalHtml, isBlank, picturePaths } from "@/lib/journal-html";
import { tripHref } from "@/lib/home-pages";

// NOTE: the whole site sits behind the password lock (src/proxy.ts).
// Pictures use the journal's upload (uploadJournalPicture) and folder.

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// A new, empty trip (from the home page's "Opens" → "Recreational record…"). Returns its id.
export async function createTrip(): Promise<string> {
  const { data, error } = await db().from("trips").insert({}).select("id").single();
  if (error) throw new Error(`Couldn't make the trip: ${error.message}`);
  return data.id;
}

// Day 1's date, or null for "don't remember".
export async function setTripStart(tripId: string, date: string | null) {
  if (!isUuid(tripId)) throw new Error("Bad trip.");
  if (date !== null && !isDate(date)) throw new Error("Bad date.");
  const { error } = await db().from("trips").update({ start_date: date }).eq("id", tripId);
  if (error) throw new Error(`Couldn't save the start date: ${error.message}`);
  revalidatePath(tripHref(tripId));
}

export type SaveResult = { ok: true; id: string } | { ok: false; message: string };

// Save a day (new when dayId is null). Changing the number moves it, if that day is free.
export async function saveTripDay(
  tripId: string,
  dayId: string | null,
  dayNumber: number,
  title: string,
  html: string,
): Promise<SaveResult> {
  if (!isUuid(tripId) || (dayId !== null && !isUuid(dayId))) return { ok: false, message: "Something's off. Refresh and try again." };
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 999) return { ok: false, message: "Pick a day number (1 or more)." };
  const body = cleanJournalHtml(html);
  const cleanTitle = title.trim().slice(0, 150) || null;
  if (isBlank(body) && !cleanTitle) return { ok: false, message: "Write something first." };

  // That day number already taken by another entry?
  const taken = await db().from("trip_days").select("id").eq("trip_id", tripId).eq("day_number", dayNumber).maybeSingle();
  if (taken.data && taken.data.id !== dayId) return { ok: false, message: `There's already a Day ${dayNumber}. Edit that one instead.` };

  let oldPictures: string[] = [];
  let id = dayId;
  if (dayId) {
    const prev = await db().from("trip_days").select("body").eq("id", dayId).maybeSingle();
    if (!prev.data) return { ok: false, message: "This day was deleted. Refresh the page." };
    oldPictures = picturePaths(cleanJournalHtml(prev.data.body));
    const res = await db()
      .from("trip_days")
      .update({ day_number: dayNumber, title: cleanTitle, body, updated_at: new Date().toISOString() })
      .eq("id", dayId);
    if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
  } else {
    const res = await db()
      .from("trip_days")
      .insert({ trip_id: tripId, day_number: dayNumber, title: cleanTitle, body })
      .select("id")
      .single();
    if (res.error) return { ok: false, message: `Couldn't save: ${res.error.message}` };
    id = res.data.id;
  }

  // Pictures that were taken out of the day.
  const kept = new Set(picturePaths(body));
  const removed = oldPictures.filter((p) => !kept.has(p));
  if (removed.length > 0) await db().storage.from(JOURNAL_BUCKET).remove(removed);

  revalidatePath(tripHref(tripId));
  return { ok: true, id: id! };
}

export async function deleteTripDay(id: string) {
  if (!isUuid(id)) throw new Error("Bad id.");
  const { data, error } = await db().from("trip_days").select("trip_id, body").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't delete: ${error.message}`);
  if (!data) return;
  const del = await db().from("trip_days").delete().eq("id", id);
  if (del.error) throw new Error(`Couldn't delete: ${del.error.message}`);
  const pictures = picturePaths(cleanJournalHtml(data.body));
  if (pictures.length > 0) await db().storage.from(JOURNAL_BUCKET).remove(pictures);
  revalidatePath(tripHref(data.trip_id));
}
