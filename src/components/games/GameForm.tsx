"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addGame, updateGame, type FormState } from "@/app/games/actions";
import type { Game, GameStatus } from "@/lib/games";
import SelectPicker from "@/components/ui/SelectPicker";
import OptionalDate from "./OptionalDate";

const initial: FormState = { ok: false, message: null };

export const STATUS_LABELS: Record<GameStatus, string> = {
  playing: "Playing",
  completed: "Completed",
  stopped: "Stopped playing",
  backlog: "Backlog",
};

const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

// "Add a game" (pinned at the top), also used to edit one (pass `game`).
// compact: stacked layout, for editing inside a narrow board column.
export default function GameForm({ game, onDone, compact }: { game?: Game; onDone?: () => void; compact?: boolean }) {
  const editing = Boolean(game);
  const [state, action, pending] = useActionState(editing ? updateGame : addGame, initial);
  const [status, setStatus] = useState<GameStatus>(game?.status ?? "playing");
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
    titleRef.current?.focus();
  }, [state.ok, state.savedAt, editing, onDone]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      {game && <input type="hidden" name="id" value={game.id} />}
      <input type="hidden" name="status" value={status} />
      {/* Title : note ≈ 30 : 70 on wider screens (sm:w-[30%] on the title, the note takes the rest). */}
      <div className={`flex flex-col gap-2 ${compact ? "" : "sm:flex-row sm:items-center"}`}>
        <input
          ref={titleRef}
          name="title"
          required
          maxLength={120}
          defaultValue={game?.title}
          placeholder="Game"
          aria-label="Game"
          style={{ outline: "none" }}
          className={`${field} min-w-0 ${compact ? "" : "sm:w-[30%] sm:shrink-0"}`}
        />
        <div className={compact ? "" : "sm:w-44 sm:shrink-0"}>
          <SelectPicker<GameStatus>
            label="Status"
            value={status}
            options={(Object.keys(STATUS_LABELS) as GameStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            onChange={setStatus}
          />
        </div>
        <input
          name="note"
          maxLength={500}
          defaultValue={game?.note ?? ""}
          placeholder="Note (optional)"
          aria-label="Note"
          style={{ outline: "none" }}
          className={`${field} min-w-0 flex-1`}
        />
      </div>
      {/* Keyed on the last save time, so the dates reset after adding a game. */}
      <div key={editing ? "edit" : (state.savedAt ?? 0)} className={`flex flex-wrap items-center gap-2 ${compact ? "text-sm" : ""}`}>
        <OptionalDate name="started_on" label="Start" defaultValue={game?.started_on ?? null} />
        <span className="text-muted/60" aria-hidden="true">→</span>
        <OptionalDate name="finished_on" label="End" defaultValue={game?.finished_on ?? null} />
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
            {pending ? "Saving…" : editing ? "Save" : "Add game"}
          </button>
        </div>
      </div>
    </form>
  );
}
