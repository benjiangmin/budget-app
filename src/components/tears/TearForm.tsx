"use client";

import { useActionState, useEffect, useRef } from "react";
import { addTear, updateTear, type FormState } from "@/app/tears/actions";
import type { Tear } from "@/lib/tears";
import AddBox from "@/components/board/AddBox";
import OptionalDate from "@/components/games/OptionalDate";

const initial: FormState = { ok: false, message: null };
const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

// The add box at the top of the page (optional date | what happened | +).
// Pass `tear` to edit one instead (a small stacked form inside its card).
export default function TearForm({ tear, onDone }: { tear?: Tear; onDone?: () => void }) {
  const editing = Boolean(tear);
  const [state, action, pending] = useActionState(editing ? updateTear : addTear, initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (editing) return onDone?.();
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  }, [state.ok, state.savedAt, editing, onDone]);

  const input = (
    <input
      ref={inputRef}
      name="body"
      required
      maxLength={500}
      defaultValue={tear?.body}
      placeholder="Why u cry bud"
      aria-label="What happened"
      autoFocus={editing}
      style={{ outline: "none" }}
      className={`${field} min-w-0`}
    />
  );

  if (!editing) {
    return (
      <form action={action}>
        <AddBox
          label="Add"
          pending={pending}
          message={state.message}
          // Keyed on the last save, so the date resets after adding.
          side={<OptionalDate key={state.savedAt ?? 0} name="cried_on" label="Date" defaultValue={null} block />}
          rows={input}
        />
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={tear!.id} />
      {input}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <OptionalDate name="cried_on" label="Date" defaultValue={tear!.cried_on} />
        <div className="ml-auto flex items-center gap-1.5">
          {state.message && (
            <p role="status" className="text-sm text-danger">
              {state.message}
            </p>
          )}
          <button
            type="button"
            onClick={onDone}
            className="rounded-control px-3 py-2.5 text-sm text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-control bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
