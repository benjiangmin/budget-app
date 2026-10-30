"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addGift, updateGift, type FormState } from "@/app/christmas/actions";
import type { Gift } from "@/lib/christmas";
import PersonPicker from "./PersonPicker";

const initial: FormState = { ok: false, message: null };
const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

// The add box (who | what | price | +, with the link behind "+ Link"), one gift at a time.
// Only "who" is needed.
// Pass `gift` to edit one inside its person's card.
export default function GiftForm({ year, names, gift, onDone }: { year: number; names: string[]; gift?: Gift; onDone?: () => void }) {
  const editing = Boolean(gift);
  const [state, action, pending] = useActionState(editing ? updateGift : addGift, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const personRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLInputElement>(null);
  const [showLink, setShowLink] = useState(false); // the add box's link row
  // After adding a gift, fold the link row away again.
  const [seenSave, setSeenSave] = useState(state.savedAt);
  if (state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    if (state.ok) setShowLink(false);
  }

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

  // The add box, all on one line (the link opens underneath, behind "+ Link"):
  //   ┌──────────┬──────────────────────────────[+ Link]┬────────┬───┐
  //   │ Who      │ What                                 │ $Price │ + │
  //   ├──────────┴──────────────────────────────────────┴────────┴───┤
  //   │ Link (only after "+ Link")                                   │
  //   └──────────────────────────────────────────────────────────────┘
  if (!editing) {
    return (
      <form ref={formRef} action={action} className="flex flex-col">
        <input type="hidden" name="year" value={year} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Who: sm:w-[26%]. What: the rest. Price: w-28. +: sm:w-14. */}
          <div className="sm:w-[26%] sm:shrink-0">{person}</div>
          {/* "What" with the "+ Link" button tucked inside its right end. */}
          <div className="relative min-w-0 flex-1">
            <input
              ref={itemRef}
              name="item"
              maxLength={300}
              placeholder="What you're getting them (optional)"
              aria-label="Gift"
              style={{ outline: "none" }}
              className={`${field} pr-24`}
            />
            <button
              type="button"
              onClick={() => setShowLink((v) => !v)}
              aria-expanded={showLink}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[9px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                showLink ? "bg-accent/15 text-accent" : "bg-surface text-muted hover:text-ink"
              }`}
            >
              {showLink ? "− Link" : "+ Link"}
            </button>
          </div>
          <div className="flex gap-2">
            {price}
            <button
              type="submit"
              disabled={pending}
              aria-label="Add gift"
              title="Add gift"
              className="grid h-11 flex-1 place-items-center rounded-control bg-accent text-accent-ink shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-14 sm:flex-none"
            >
              {pending ? (
                <span className="size-5 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink" aria-hidden="true" />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* The link: under a thin line, on its own row. Kept in the form when hidden. */}
        <div className={`mt-3 border-t border-accent/20 pt-3 ${showLink ? "" : "hidden"}`}>{link}</div>
        {state.message && (
          <p role="status" className="mt-2 text-sm text-danger">
            {state.message}
          </p>
        )}
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
