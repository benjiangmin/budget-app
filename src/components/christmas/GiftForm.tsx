"use client";

import { useActionState, useEffect, useRef } from "react";
import { addGift, updateGift, type FormState } from "@/app/christmas/actions";
import type { Gift } from "@/lib/christmas";
import AddBox from "@/components/board/AddBox";
import PersonPicker from "./PersonPicker";

const initial: FormState = { ok: false, message: null };
const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

// The add box (who | what, price | link | +), one gift at a time. Only "who" is needed.
// Pass `gift` to edit one inside its person's card.
export default function GiftForm({ year, names, gift, onDone }: { year: number; names: string[]; gift?: Gift; onDone?: () => void }) {
  const editing = Boolean(gift);
  const [state, action, pending] = useActionState(editing ? updateGift : addGift, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const personRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (editing) return onDone?.();
    // Added: clear everything for the next gift.
    formRef.current?.reset();
    personRef.current?.focus();
  }, [state.ok, state.savedAt, editing, onDone]);

  const person = <PersonPicker names={names} defaultValue={gift?.person} inputRef={personRef} autoFocus={editing} className={`${field} min-w-0`} />;
  const item = (
    <input
      ref={itemRef}
      name="item"
      maxLength={300}
      defaultValue={gift?.item ?? ""}
      placeholder="What you're getting them (optional)"
      aria-label="Gift"
      style={{ outline: "none" }}
      className={`${field} min-w-0 flex-1`}
    />
  );
  const price = (
    <label className="flex w-28 shrink-0 items-center rounded-control border border-line bg-paper pl-3 focus-within:border-ink">
      <span className="text-muted">$</span>
      <input
        name="price"
        inputMode="decimal"
        maxLength={20}
        defaultValue={gift?.price ?? ""}
        placeholder="Price"
        aria-label="Price (optional)"
        style={{ outline: "none" }}
        className="w-full min-w-0 bg-transparent py-2.5 pl-1 pr-2 text-ink placeholder:text-muted/70"
      />
    </label>
  );
  const link = (
    <input
      name="link"
      maxLength={2000}
      defaultValue={gift?.link ?? ""}
      placeholder="Link (optional)"
      aria-label="Link (optional)"
      inputMode="url"
      style={{ outline: "none" }}
      className={`${field} min-w-0 flex-1`}
    />
  );

  if (!editing) {
    return (
      <form ref={formRef} action={action}>
        <input type="hidden" name="year" value={year} />
        <AddBox
          label="Add gift"
          pending={pending}
          message={state.message}
          rows={
            <>
              {/* Row 1: who (≈ 35%) + what. Row 2: price + link. */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="sm:w-[35%] sm:shrink-0">{person}</div>
                {item}
              </div>
              <div className="flex gap-2">
                {price}
                {link}
              </div>
            </>
          }
        />
      </form>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={gift!.id} />
      <input type="hidden" name="year" value={gift!.year} />
      {person}
      {item}
      <div className="flex gap-2">
        {price}
        {link}
      </div>
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
