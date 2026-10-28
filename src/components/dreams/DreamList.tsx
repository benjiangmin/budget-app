"use client";

import { useRef, useState, useTransition } from "react";
import { deleteDreamDay } from "@/app/dreams/actions";
import type { DreamDay } from "@/lib/dreams";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import DreamForm from "./DreamForm";

const BLURB_WORDS = 15; // how many words show on a closed entry

function dateParts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    day: String(d),
    weekday: dt.toLocaleDateString("en-US", { weekday: "short" }),
    long: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function monthName(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" });
}

// The first few words of the day's dreams.
function blurb(day: DreamDay) {
  const words = day.dreams.map((d) => d.body).join(" ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Just pictures";
  return words.slice(0, BLURB_WORDS).join(" ") + (words.length > BLURB_WORDS ? "…" : "");
}

// The bordered box on the right: the year's dreams, grouped by month, scrolling inside itself.
// Each month's title sticks to the top of the box until the next month pushes it away.
export default function DreamList({ days, year }: { days: DreamDay[]; year: number }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState<string | null>(null); // which month's title is pinned (shows the fade)

  // Group days into months ("2026-10"), newest first (days already arrive newest first).
  const months: { key: string; days: DreamDay[] }[] = [];
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const last = months.at(-1);
    if (last?.key === key) last.days.push(day);
    else months.push({ key, days: [day] });
  }

  // Find the month whose title is currently pinned at the top of the box.
  function onScroll() {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollTop <= 0) return setStuck(null);
    const top = scroller.getBoundingClientRect().top + 1;
    let found: string | null = null;
    for (const section of Array.from(scroller.querySelectorAll<HTMLElement>("[data-month]"))) {
      const r = section.getBoundingClientRect();
      if (r.top <= top && r.bottom > top) found = section.dataset.month ?? null;
    }
    setStuck(found);
  }

  return (
    <section
      aria-label={`Dreams in ${year}`}
      className="relative flex h-[75dvh] min-h-[24rem] flex-col overflow-hidden rounded-card border-[1.5px] border-ink lg:h-auto lg:min-h-[32rem]"
    >
      <div ref={scrollerRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {months.length === 0 ? (
          <p className="m-4 rounded-card border border-dashed border-line px-5 py-6 text-muted">
            No dreams logged in {year} yet.
          </p>
        ) : (
          months.map((m) => (
            <section key={m.key} data-month={m.key} aria-labelledby={`month-${m.key}`}>
              {/* Month title: sticks to the top while you're inside this month. */}
              <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 bg-paper px-5 pb-2.5 pt-4 sm:px-6">
                <h2 id={`month-${m.key}`} className="font-display text-xl font-semibold">
                  {monthName(m.key)}
                </h2>
                <p className="text-sm text-muted">
                  {m.days.length} {m.days.length === 1 ? "night" : "nights"}
                </p>
                {/* Fade under the pinned title, so entries look like they slide beneath. Height: h-6. */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-paper to-transparent transition-opacity duration-200 ${
                    stuck === m.key ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
              <ul className="divide-y divide-line px-3 sm:px-4">
                {m.days.map((day) => (
                  <DayEntry key={day.date} day={day} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

// One night. Closed: date + first few words. Click to open and read everything.
function DayEntry({ day }: { day: DreamDay }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const { day: d, weekday, long } = dateParts(day.date);
  const pictureCount = day.dreams.reduce((n, x) => n + x.images.length, 0);

  async function remove() {
    const ok = await confirm({
      title: "Delete this night?",
      body: `All dreams from ${long}${pictureCount ? " and their pictures" : ""} will be removed for good.`,
      confirmLabel: "Delete",
    });
    if (ok) startTransition(() => deleteDreamDay(day.date));
  }

  if (editing) {
    return (
      <li className="my-2 rounded-card bg-surface p-4 sm:p-5">
        <DreamForm day={day} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`transition-opacity ${pending ? "opacity-40" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-start gap-4 rounded-control px-2 py-3.5 text-left transition-colors hover:bg-surface/70"
      >
        {/* Date: "Thu" over a big "15". */}
        <div className="w-10 shrink-0 text-center">
          <div className="text-xs text-muted">{weekday}</div>
          <div className="num font-display text-2xl font-semibold leading-tight">{d}</div>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className={open ? "font-semibold text-ink" : "line-clamp-2 text-ink"}>
            {open ? `${day.dreams.length} ${day.dreams.length === 1 ? "dream" : "dreams"}` : blurb(day)}
          </p>
          {!open && (day.dreams.length > 1 || pictureCount > 0) && (
            <p className="mt-1 text-xs text-muted">
              {day.dreams.length} {day.dreams.length === 1 ? "dream" : "dreams"}
              {pictureCount > 0 && ` · ${pictureCount} ${pictureCount === 1 ? "picture" : "pictures"}`}
            </p>
          )}
        </div>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={`mt-1.5 shrink-0 text-muted transition-transform group-hover:text-ink ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="pb-4 pl-16 pr-2">
          <div className="space-y-5">
            {day.dreams.map((dream, i) => (
              <article key={dream.id}>
                {day.dreams.length > 1 && (
                  <p className="mb-1 font-display text-sm font-semibold text-accent">Dream {i + 1}</p>
                )}
                {dream.body && <p className="whitespace-pre-wrap break-words leading-relaxed text-ink">{dream.body}</p>}
                {dream.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {dream.images.map((img) => (
                      // Opens the full picture in a new tab.
                      <a key={img.path} href={img.url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element -- user picture */}
                        <img
                          src={img.url}
                          alt=""
                          className="aspect-square w-full rounded-control border border-line object-cover transition-opacity hover:opacity-90"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="mt-4 flex gap-1 text-sm">
            <button
              type="button"
              disabled={pending}
              onClick={() => setEditing(true)}
              className="rounded-control px-2.5 py-1 text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="rounded-control px-2.5 py-1 text-muted transition-colors hover:bg-surface hover:text-danger"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
