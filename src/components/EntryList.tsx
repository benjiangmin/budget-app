"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteEntry, updateEntry, type FormState } from "@/app/actions";
import type { Category, Entry } from "@/lib/data";
import { formatMoney } from "@/lib/month";
import DateWheel from "./DateWheel";

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function EntryList({
  entries,
  categories,
}: {
  entries: Entry[];
  categories: Category[];
}) {
  if (entries.length === 0) return null;

  const byId = new Map(categories.map((c) => [c.id, c]));
  const days: { date: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const last = days[days.length - 1];
    if (last && last.date === e.spent_on) last.items.push(e);
    else days.push({ date: e.spent_on, items: [e] });
  }

  return (
    <section aria-labelledby="entries-heading" className="mt-12">
      <h2 id="entries-heading" className="font-display text-xl font-semibold">
        Expenses
      </h2>
      <div className="mt-2">
        {days.map((day) => (
          <div key={day.date} className="mt-4">
            <h3 className="text-sm text-muted">{dayLabel(day.date)}</h3>
            <ul className="mt-1 divide-y divide-line border-y border-line">
              {day.items.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  category={byId.get(e.category_id)}
                  categories={categories}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function EntryRow({
  entry,
  category,
  categories,
}: {
  entry: Entry;
  category?: Category;
  categories: Category[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <EditRow entry={entry} categories={categories} onDone={() => setEditing(false)} />;
  }

  return (
    <li className={`group flex items-center gap-3 py-3 ${pending ? "opacity-40" : ""}`}>
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: category?.color ?? "var(--muted)" }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate">{entry.note || category?.name || "Expense"}</p>
        {entry.note && <p className="text-sm text-muted">{category?.name}</p>}
      </div>
      <span className="num font-medium">{formatMoney(entry.amount)}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => setEditing(true)}
        aria-label={`Edit ${formatMoney(entry.amount)} ${category?.name ?? ""} expense`}
        className="grid size-8 place-items-center rounded-full text-muted opacity-60 transition hover:bg-surface hover:text-ink group-hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this expense?")) startTransition(() => deleteEntry(entry.id));
        }}
        aria-label={`Delete ${formatMoney(entry.amount)} ${category?.name ?? ""} expense`}
        className="grid size-8 place-items-center rounded-full text-muted opacity-60 transition hover:bg-surface hover:text-danger group-hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}

// Inline edit form that replaces a row while you're editing it.
function EditRow({
  entry,
  categories,
  onDone,
}: {
  entry: Entry;
  categories: Category[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateEntry, {
    ok: false,
    message: null,
  });

  // Close the editor once the save goes through.
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, state.savedAt, onDone]);

  const field =
    "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-ink focus:border-ink focus:outline-none";

  return (
    <li className="py-3">
      <form action={action} className="grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4 sm:grid-cols-3">
        <input type="hidden" name="id" value={entry.id} />

        <label>
          <span className="mb-1 block text-sm text-muted">Amount</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              autoFocus
              defaultValue={entry.amount.toFixed(2)}
              className={`${field} num pl-7`}
            />
          </div>
        </label>

        <label>
          <span className="mb-1 block text-sm text-muted">Category</span>
          <select name="category_id" required defaultValue={entry.category_id} className={field}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="col-span-2 sm:col-span-1">
          <span className="mb-1 block text-sm text-muted">Date</span>
          <DateWheel name="spent_on" defaultValue={entry.spent_on} />
        </div>

        <div className="col-span-2 flex items-center gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-full px-4 py-2 text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            Cancel
          </button>
          {state.message && (
            <p role="status" className="text-sm text-danger">
              {state.message}
            </p>
          )}
        </div>
      </form>
    </li>
  );
}
