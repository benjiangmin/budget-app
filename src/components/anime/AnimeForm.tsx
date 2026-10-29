"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addAnime, updateAnime, type FormState } from "@/app/anime/actions";
import type { Anime, AnimeStatus } from "@/lib/anime";
import SelectPicker from "@/components/ui/SelectPicker";
import { ANIME_LABELS } from "./labels";

const initial: FormState = { ok: false, message: null };
const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";
const ORDER: AnimeStatus[] = ["playing", "completed", "stopped", "backlog"];

// "Add an anime" (top of the page), also used to edit one inside its card (pass `anime` + compact).
export default function AnimeForm({ anime, onDone, compact }: { anime?: Anime; onDone?: () => void; compact?: boolean }) {
  const editing = Boolean(anime);
  const [state, action, pending] = useActionState(editing ? updateAnime : addAnime, initial);
  const [status, setStatus] = useState<AnimeStatus>(anime?.status ?? "playing");
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (editing) return onDone?.();
    const form = formRef.current;
    for (const name of ["title", "note"]) {
      const el = form?.elements.namedItem(name) as HTMLInputElement | null;
      if (el) el.value = "";
    }
    const movie = form?.elements.namedItem("is_movie") as HTMLInputElement | null;
    if (movie) movie.checked = false;
    titleRef.current?.focus();
  }, [state.ok, state.savedAt, editing, onDone]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      {anime && <input type="hidden" name="id" value={anime.id} />}
      <input type="hidden" name="status" value={status} />
      {/* Title : note ≈ 30 : 70 on wider screens. */}
      <div className={`flex flex-col gap-2 ${compact ? "" : "sm:flex-row sm:items-center"}`}>
        <input
          ref={titleRef}
          name="title"
          required
          maxLength={150}
          defaultValue={anime?.title}
          placeholder="Anime"
          aria-label="Anime"
          style={{ outline: "none" }}
          className={`${field} min-w-0 ${compact ? "" : "sm:w-[30%] sm:shrink-0"}`}
        />
        <div className={compact ? "" : "sm:w-44 sm:shrink-0"}>
          <SelectPicker<AnimeStatus>
            label="Status"
            value={status}
            options={ORDER.map((s) => ({ value: s, label: ANIME_LABELS[s] }))}
            onChange={setStatus}
          />
        </div>
        <input
          name="note"
          maxLength={500}
          defaultValue={anime?.note ?? ""}
          placeholder="Note (optional)"
          aria-label="Note"
          style={{ outline: "none" }}
          className={`${field} min-w-0 flex-1`}
        />
      </div>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-sm" : ""}`}>
        <label className="flex items-center gap-2 px-1 text-sm text-muted">
          <input type="checkbox" name="is_movie" defaultChecked={anime?.is_movie} className="size-4 accent-[var(--accent)]" />
          It&apos;s a movie
        </label>
        <div className={`flex items-center gap-1.5 ${compact ? "w-full justify-end" : "ml-auto"}`}>
          {state.message && (
            <p role="status" className="text-sm text-danger">
              {state.message}
            </p>
          )}
          {editing && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-control px-3 py-2.5 text-sm text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-control bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </form>
  );
}
