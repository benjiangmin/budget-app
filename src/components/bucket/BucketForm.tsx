"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addBucketItem, updateBucketItem, type FormState } from "@/app/bucket/actions";
import type { BucketItem } from "@/lib/bucket";

const initial: FormState = { ok: false, message: null };
const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

// The add box at the top, on one line:   [ What's on your list?   [+ Details] ] [ + ]
// "+ Details" opens a note and a link underneath (behind a thin line).
// Pass `item` to edit one inside its card instead.
export default function BucketForm({ item, onDone }: { item?: BucketItem; onDone?: () => void }) {
  const editing = Boolean(item);
  const [state, action, pending] = useActionState(editing ? updateBucketItem : addBucketItem, initial);
  const [showMore, setShowMore] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // After adding, fold the details away again.
  const [seenSave, setSeenSave] = useState(state.savedAt);
  if (state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    if (state.ok) setShowMore(false);
  }
  useEffect(() => {
    if (!state.ok) return;
    if (editing) return onDone?.();
    formRef.current?.reset();
    nameRef.current?.focus();
  }, [state.ok, state.savedAt, editing, onDone]);

  const note = (
    <textarea
      name="note"
      rows={editing ? 4 : 2}
      maxLength={2000}
      defaultValue={item?.note ?? ""}
      placeholder="Note (optional): the story, why, how it went…"
      aria-label="Note"
      style={{ outline: "none" }}
      className={`${field} resize-y leading-relaxed`}
    />
  );
  const link = (
    <input
      name="link"
      maxLength={2000}
      defaultValue={item?.link ?? ""}
      placeholder="Link (optional), or a page here like /parks"
      aria-label="Link (optional)"
      style={{ outline: "none" }}
      className={field}
    />
  );

  if (!editing) {
    return (
      <form ref={formRef} action={action} className="flex flex-col">
        <div className="flex gap-2">
          <div className="relative flex min-w-0 flex-1">
            <input
              ref={nameRef}
              name="name"
              required
              maxLength={200}
              placeholder="What's on your list?"
              aria-label="Bucket list item"
              style={{ outline: "none" }}
              className={`${field} pr-28`}
            />
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[9px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                showMore ? "bg-accent/15 text-accent" : "bg-surface text-muted hover:text-ink"
              }`}
            >
              {showMore ? "− Details" : "+ Details"}
            </button>
          </div>
          <button
            type="submit"
            disabled={pending}
            aria-label="Add to the bucket list"
            title="Add"
            className="grid h-11 w-14 shrink-0 place-items-center rounded-control bg-accent text-accent-ink shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
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
        {/* Details: under a thin line. Kept in the form when hidden. */}
        <div className={`mt-3 flex flex-col gap-2 border-t border-accent/20 pt-3 ${showMore ? "" : "hidden"}`}>
          {note}
          {link}
        </div>
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
      <input
        name="name"
        required
        maxLength={200}
        defaultValue={item!.name}
        aria-label="Bucket list item"
        autoFocus
        style={{ outline: "none" }}
        className={field}
      />
      {note}
      {link}
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
