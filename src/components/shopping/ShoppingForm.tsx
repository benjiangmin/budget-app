"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addShoppingItem, updateShoppingItem, type FormState } from "@/app/shopping/actions";
import type { ShoppingItem } from "@/lib/shopping";
import DateWheel from "@/components/ui/DateWheel";
import { todayKey } from "./dates";

const initial: FormState = { ok: false, message: null };
const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

// The add box at the top (date | item [+ Link] | price | +, link underneath when opened).
// Pass `item` to edit one inside its card.
export default function ShoppingForm({ item, onDone }: { item?: ShoppingItem; onDone?: () => void }) {
  const editing = Boolean(item);
  const [state, action, pending] = useActionState(editing ? updateShoppingItem : addShoppingItem, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [showLink, setShowLink] = useState(false); // the add box's link row
  // After adding an item, fold the link row away again.
  const [seenSave, setSeenSave] = useState(state.savedAt);
  if (state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    if (state.ok) setShowLink(false);
  }

  useEffect(() => {
    if (!state.ok) return;
    if (editing) return onDone?.();
    // Added: clear the words, keep the date, ready for the next one.
    for (const name of ["name", "price", "link"]) {
      const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
      if (el) el.value = "";
    }
    nameRef.current?.focus();
  }, [state.ok, state.savedAt, editing, onDone]);

  const date = item?.added_on ?? todayKey();
  const name = (
    <input
      ref={nameRef}
      name="name"
      required
      maxLength={200}
      defaultValue={item?.name}
      placeholder="What to buy"
      aria-label="Item"
      autoFocus={editing}
      style={{ outline: "none" }}
      className={`${field} min-w-0 flex-1 ${editing ? "" : "pr-24"}`}
    />
  );
  // Price is optional and free text ("32", "~20", "<1 on temu").
  const price = (
    <label className="flex w-28 shrink-0 items-center rounded-control border border-line bg-paper pl-3 focus-within:border-ink">
      <span className="text-muted">$</span>
      <input
        name="price"
        maxLength={40}
        defaultValue={item?.price ?? ""}
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
      defaultValue={item?.link ?? ""}
      placeholder="Link (optional)"
      aria-label="Link (optional)"
      inputMode="url"
      style={{ outline: "none" }}
      className={`${field} min-w-0`}
    />
  );

  // The add box, all on one line (the link opens underneath, behind "+ Link"):
  //   ┌──────────┬───────────────────────────[+ Link]┬────────┬───┐
  //   │ Date     │ What to buy                       │ $Price │ + │
  //   ├──────────┴───────────────────────────────────┴────────┴───┤
  //   │ Link (only after "+ Link")                                │
  //   └───────────────────────────────────────────────────────────┘
  if (!editing) {
    return (
      <form ref={formRef} action={action} className="flex flex-col">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Date: sm:w-44. What: the rest. Price: w-28. +: sm:w-14. */}
          <div className="sm:w-44 sm:shrink-0">
            <DateWheel key={date} name="added_on" defaultValue={date} />
          </div>
          {/* "What to buy" with the "+ Link" button tucked inside its right end. */}
          <div className="relative flex min-w-0 flex-1">
            {name}
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
              aria-label="Add item"
              title="Add item"
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
      <input type="hidden" name="id" value={item!.id} />
      <div className="flex gap-2">
        {name}
        {price}
      </div>
      {link}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="w-44">
          <DateWheel key={date} name="added_on" defaultValue={date} />
        </div>
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
