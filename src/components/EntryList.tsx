"use client";

import { useTransition } from "react";
import { deleteEntry } from "@/app/actions";
import type { Category, Entry } from "@/lib/data";
import { formatMoney } from "@/lib/month";

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
                <EntryRow key={e.id} entry={e} category={byId.get(e.category_id)} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function EntryRow({ entry, category }: { entry: Entry; category?: Category }) {
  const [pending, startTransition] = useTransition();

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
