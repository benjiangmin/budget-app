"use client";

import { useActionState, useEffect, useRef } from "react";
import { addEntry, type FormState } from "@/app/actions";
import type { Category } from "@/lib/data";
import DateWheel from "./DateWheel";

const initial: FormState = { ok: false, message: null };

function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function AddEntryForm({
  categories,
  monthKey,
  isThisMonth,
}: {
  categories: Category[];
  monthKey: string;
  isThisMonth: boolean;
}) {
  const [state, action, pending] = useActionState(addEntry, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Clear the amount after a save, keep category and date for quick repeat entries.
  useEffect(() => {
    if (state.ok && formRef.current) {
      const form = formRef.current;
      (form.elements.namedItem("amount") as HTMLInputElement).value = "";
      amountRef.current?.focus();
    }
  }, [state.savedAt, state.ok]);

  const defaultDate = isThisMonth ? todayKey() : `${monthKey}-01`;

  const field =
    "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none";

  return (
    <section aria-labelledby="add-heading" className="rounded-3xl bg-surface p-5 sm:p-6">
      <h2 id="add-heading" className="font-display text-xl font-semibold">
        Add an expense
      </h2>

      <form ref={formRef} action={action} className="mt-4 grid grid-cols-2 gap-3">
        <label className="col-span-2 sm:col-span-1">
          <span className="mb-1 block text-sm text-muted">Amount</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
            <input
              ref={amountRef}
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className={`${field} num pl-7`}
            />
          </div>
        </label>

        <label className="col-span-2 sm:col-span-1">
          <span className="mb-1 block text-sm text-muted">Category</span>
          <select name="category_id" required defaultValue="" className={field}>
            <option value="" disabled>
              Choose…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="col-span-2">
          <span className="mb-1 block text-sm text-muted">Date</span>
          <DateWheel key={defaultDate} name="spent_on" defaultValue={defaultDate} />
        </div>

        <div className="col-span-2 mt-1 flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-6 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save expense"}
          </button>
          <p role="status" className={`text-sm ${state.ok ? "text-muted" : "text-danger"}`}>
            {state.ok ? "Saved." : state.message}
          </p>
        </div>
      </form>
    </section>
  );
}
