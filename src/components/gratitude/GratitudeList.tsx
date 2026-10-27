"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteGratitude } from "@/app/gratitude/actions";
import type { GratitudeEntry } from "@/lib/gratitude";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import GratitudeForm from "./GratitudeForm";

// "2026-10-22" → { day: "22", weekday: "Thursday", short: "Oct 22" }
function dateParts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    day: String(d),
    weekday: dt.toLocaleDateString("en-US", { weekday: "long" }),
    short: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

export default function GratitudeList({
  entries,
  monthName,
  focusId,
}: {
  entries: GratitudeEntry[];
  monthName: string;
  focusId?: string; // an entry to scroll to and flash (from a search result)
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line px-5 py-6 text-muted">
        Nothing yet for {monthName}. What are three good things from today?
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <EntryCard key={e.id} entry={e} focused={e.id === focusId} />
      ))}
    </ul>
  );
}

function EntryCard({ entry, focused }: { entry: GratitudeEntry; focused: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const ref = useRef<HTMLLIElement>(null);
  const { day, weekday, short } = dateParts(entry.entry_date);

  // Arrived here from a search result: bring this entry into view.
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);

  async function remove() {
    const ok = await confirm({
      title: "Delete this entry?",
      body: `Your three things from ${short} will be removed for good.`,
      confirmLabel: "Delete",
    });
    if (ok) startTransition(() => deleteGratitude(entry.id));
  }

  if (editing) {
    return (
      <li className="rounded-card bg-surface p-4 sm:p-5">
        <GratitudeForm entry={entry} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li
      ref={ref}
      className={`group flex gap-3 rounded-card bg-surface p-4 transition-opacity sm:gap-5 sm:p-5 ${pending ? "opacity-40" : ""} ${
        focused ? "flash" : ""
      }`}
    >
      {/* Date: big day number, weekday under it. */}
      <div className="w-10 shrink-0 text-center sm:w-14">
        <div className="num font-display text-2xl font-semibold leading-none sm:text-3xl">{day}</div>
        <div className="mt-1 text-xs text-muted">{weekday.slice(0, 3)}</div>
      </div>

      {/* The three things, each with its cinnamon numeral. */}
      <ol className="min-w-0 flex-1 space-y-1.5">
        {[entry.first, entry.second, entry.third].map((thing, i) => (
          <li key={i} className="flex items-baseline gap-3">
            <span aria-hidden="true" className="num w-4 shrink-0 font-display font-semibold text-accent">
              {i + 1}
            </span>
            <span className="min-w-0 break-words text-ink">{thing}</span>
          </li>
        ))}
      </ol>

      <div className="-mr-1 -mt-1 flex shrink-0 flex-col items-start sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(true)}
          aria-label={`Edit entry from ${short}`}
          className="grid size-8 place-items-center rounded-control text-muted opacity-50 transition hover:bg-paper group-hover:text-black group-hover:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
          onClick={remove}
          aria-label={`Delete entry from ${short}`}
          className="grid size-8 place-items-center rounded-control text-muted opacity-50 transition hover:bg-paper hover:text-danger! group-hover:text-black group-hover:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </li>
  );
}
