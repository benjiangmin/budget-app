"use client";

import { useActionState, useEffect, useRef } from "react";
import { addShoppingItem, updateShoppingItem, type FormState } from "@/app/shopping/actions";
import type { ShoppingItem } from "@/lib/shopping";
import AddBox from "@/components/board/AddBox";
import DateWheel from "@/components/ui/DateWheel";
import { todayKey } from "./dates";

const initial: FormState = { ok: false, message: null };
const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

// The add box at the top (date | item + price, link | +). Pass `item` to edit one inside its card.
export default function ShoppingForm({ item, onDone }: { item?: ShoppingItem; onDone?: () => void }) {
  const editing = Boolean(item);
  const [state, action, pending] = useActionState(editing ? updateShoppingItem : addShoppingItem, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

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
      className={`${field} min-w-0 flex-1`}
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

  if (!editing) {
    return (
      <form ref={formRef} action={action}>
        <AddBox
          label="Add item"
          pending={pending}
          message={state.message}
          side={<DateWheel key={date} name="added_on" defaultValue={date} />}
          rows={
            <>
              <div className="flex gap-2">
                {name}
                {price}
              </div>
              {link}
            </>
          }
        />
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
