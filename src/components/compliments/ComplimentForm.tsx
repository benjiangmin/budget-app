"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addCompliment, updateCompliment, type FormState } from "@/app/compliments/actions";
import type { Compliment } from "@/lib/compliments";
import DateWheel from "@/components/ui/DateWheel";

const initial: FormState = { ok: false, message: null };

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

// One-line "add a compliment" form (pinned at the top), also used to edit one (pass `item`).
// Note + "date forgotten" sit behind "+ Note" to keep the pinned bar short.
export default function ComplimentForm({ item, onDone }: { item?: Compliment; onDone?: () => void }) {
  const editing = Boolean(item);
  const [state, action, pending] = useActionState(editing ? updateCompliment : addCompliment, initial);
  const [more, setMore] = useState(Boolean(item?.note || item?.date_known === false));
  const formRef = useRef<HTMLFormElement>(null);
  const personRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (editing) return onDone?.();
    // Added: clear the words, keep the date, ready for the next one.
    const form = formRef.current;
    if (!form) return;
    for (const name of ["person", "compliment", "note"]) {
      const el = form.elements.namedItem(name) as HTMLInputElement | null;
      if (el) el.value = "";
    }
    setMore(false);
    personRef.current?.focus();
  }, [state.ok, state.savedAt, editing, onDone]);

  const date = item?.said_on ?? todayKey();

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:w-40 sm:shrink-0">
          <DateWheel key={date} name="said_on" defaultValue={date} />
        </div>
        <input
          ref={personRef}
          name="person"
          required
          maxLength={120}
          defaultValue={item?.person}
          placeholder="Who"
          aria-label="Who said it"
          style={{ outline: "none" }}
          className={`${field} sm:w-44 sm:shrink-0`}
        />
        <input
          name="compliment"
          required
          maxLength={1000}
          defaultValue={item?.compliment}
          placeholder="What they said"
          aria-label="The compliment"
          style={{ outline: "none" }}
          className={`${field} min-w-0 flex-1`}
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            className="rounded-control px-2.5 py-2.5 text-sm text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            {more ? "− Note" : "+ Note"}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-control bg-accent px-4 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save" : "Add"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-control px-3 py-2.5 text-sm text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Kept in the form even when hidden, so editing doesn't lose the note. */}
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center ${more ? "" : "hidden"}`}>
        <input
          name="note"
          maxLength={1000}
          defaultValue={item?.note ?? ""}
          placeholder="A note about it (optional)"
          aria-label="Note"
          style={{ outline: "none" }}
          className={`${field} min-w-0 flex-1`}
        />
        <label className="flex shrink-0 items-center gap-2 px-1 text-sm text-muted">
          <input type="checkbox" name="date_forgotten" defaultChecked={item?.date_known === false} className="size-4 accent-[var(--accent)]" />
          I forgot the exact date
        </label>
      </div>

      {state.message && (
        <p role="status" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
