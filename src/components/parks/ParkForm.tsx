"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addPark, updatePark, type FormState } from "@/app/parks/actions";
import type { Park } from "@/lib/parks";
import AddBox from "@/components/board/AddBox";

const initial: FormState = { ok: false, message: null };
const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

// The add box under the parks (your own parks: not national parks, out of the country…):
// a "Been there" switch | name, note | +. Pass `park` to edit one inside its card.
export default function ParkForm({ park, onDone }: { park?: Park; onDone?: () => void }) {
  const editing = Boolean(park);
  const [state, action, pending] = useActionState(editing ? updatePark : addPark, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (editing) return onDone?.();
    for (const name of ["name", "note"]) {
      const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
      if (el) el.value = "";
    }
    nameRef.current?.focus();
  }, [state.ok, state.savedAt, editing, onDone]);

  const name = (
    <input
      ref={nameRef}
      name="name"
      required
      maxLength={150}
      defaultValue={park?.name}
      placeholder={editing ? "Name" : "Add your own park"}
      aria-label="Park name"
      autoFocus={editing}
      style={{ outline: "none" }}
      className={`${field} min-w-0`}
    />
  );
  const note = (
    <input
      name="note"
      maxLength={500}
      defaultValue={park?.note ?? ""}
      placeholder="Note (optional)"
      aria-label="Note"
      style={{ outline: "none" }}
      className={`${field} min-w-0`}
    />
  );

  if (!editing) {
    return (
      <form ref={formRef} action={action}>
        <AddBox
          label="Add park"
          pending={pending}
          message={state.message}
          narrowSide
          side={<BeenThere key={state.savedAt ?? 0} />}
          rows={
            <>
              {name}
              {note}
            </>
          }
        />
      </form>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={park!.id} />
      {name}
      {note}
      <div className="flex items-center justify-end gap-1.5">
        {state.message && (
          <p role="status" className="mr-auto text-sm text-danger">
            {state.message}
          </p>
        )}
        <button
          type="button"
          onClick={onDone}
          className="rounded-control px-3 py-2 text-sm text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// "Been there" switch for a new park: on = it goes in Visited, off = Not yet. Starts on.
function BeenThere() {
  const [on, setOn] = useState(true);
  return (
    <>
      {on && <input type="hidden" name="visited" value="on" />}
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setOn((v) => !v)}
        title={on ? "Been there (click for not yet)" : "Not yet (click for been there)"}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-control px-2 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors sm:h-full sm:w-20 ${
          on ? "bg-accent/15 text-accent ring-1 ring-accent/50" : "border border-dashed border-muted/50 text-muted hover:border-muted hover:text-ink"
        }`}
      >
        {/* A little flag on a mountain. */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 20l6.5-10 4 6 2.5-3.5L21 20H3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M13 9V3l4 1.5L13 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        {on ? "Been there" : "Not yet"}
      </button>
    </>
  );
}
