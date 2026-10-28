"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteDream } from "@/app/dreams/actions";
import type { Dream, DreamDay } from "@/lib/dreams";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import DreamEdit from "./DreamEdit";

const BLURB_WORDS = 15; // how many words show on a closed entry

function dateParts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    day: String(d),
    weekday: dt.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function monthName(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" });
}

// The first few words of the day's dreams.
function blurb(day: DreamDay) {
  const words = day.dreams.map((d) => d.text).join(" ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Just pictures";
  return words.slice(0, BLURB_WORDS).join(" ") + (words.length > BLURB_WORDS ? "…" : "");
}

// The bordered box on the right: the year's dreams, grouped by month, scrolling inside itself.
// Each month's title sticks to the top of the box until the next month pushes it away.
export default function DreamList({ days, year, focusId }: { days: DreamDay[]; year: number; focusId?: string }) {
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
      {/* On wide screens the scroller is pinned to the box's edges (absolute inset-0), so a long list
          scrolls inside the box instead of making the box taller. */}
      <div
        ref={scrollerRef}
        data-scroller
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto pb-4 lg:absolute lg:inset-0"
      >
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
              {/* Each night is its own card. Gap between cards: space-y-2.5. */}
              <ul className="space-y-2.5 px-3 pt-1 sm:px-4">
                {m.days.map((day) => (
                  <DayEntry key={day.date} day={day} focusId={focusId} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

// One night, as a card. Closed: date + first few words. Click to open and read everything.
function DayEntry({ day, focusId }: { day: DreamDay; focusId?: string }) {
  const hasFocus = Boolean(focusId && day.dreams.some((d) => d.id === focusId));
  const [open, setOpen] = useState(hasFocus);
  // Picked from search while already on this page: open this night.
  const [openedFor, setOpenedFor] = useState(hasFocus ? focusId : undefined);
  if (hasFocus && openedFor !== focusId) {
    setOpenedFor(focusId);
    setOpen(true);
  }
  const { day: d, weekday } = dateParts(day.date);
  const pictureCount = day.dreams.reduce((n, x) => n + x.images.length, 0);
  const count = `${day.dreams.length} ${day.dreams.length === 1 ? "dream" : "dreams"}`;

  return (
    <li className="rounded-card bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        // When open: square bottom corners + a darker line under the bar, separating it from the dreams.
        className={`group flex w-full items-start gap-4 rounded-card px-3 py-3.5 text-left transition-[background-color] hover:bg-line/50 ${
          open ? "rounded-b-none border-b-[3px] border-ink/25" : ""
        }`}
      >
        {/* Date: "Thu" over a big "15". */}
        <div className="w-10 shrink-0 text-center">
          <div className="text-xs text-muted">{weekday}</div>
          <div className="num font-display text-2xl font-semibold leading-tight">{d}</div>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className={open ? "font-semibold text-ink" : "line-clamp-2 text-ink"}>{open ? count : blurb(day)}</p>
          {!open && (day.dreams.length > 1 || pictureCount > 0) && (
            <p className="mt-1 text-xs text-muted">
              {count}
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
        <div className="divide-y divide-line px-3 pb-3 pl-16 pt-1">
          {day.dreams.map((dream, i) => (
            <DreamItem
              key={dream.id}
              dream={dream}
              date={day.date}
              label={day.dreams.length > 1 ? `Dream ${i + 1}` : null}
              focused={dream.id === focusId}
            />
          ))}
        </div>
      )}
    </li>
  );
}

// One dream inside an open night, with its own edit (pencil) and delete (×) on the right.
function DreamItem({
  dream,
  date,
  label,
  focused,
}: {
  dream: Dream;
  date: string;
  label: string | null;
  focused: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const ref = useRef<HTMLElement>(null);

  // Arrived here from a search result: scroll the box (not the page) so this dream is centered.
  useEffect(() => {
    const el = ref.current;
    const scroller = el?.closest<HTMLElement>("[data-scroller]");
    if (!focused || !el || !scroller) return;
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: top - scroller.clientHeight / 2 + el.offsetHeight / 2, behavior: "smooth" });
  }, [focused]);

  async function remove() {
    const ok = await confirm({
      title: "Delete this dream?",
      body: `Just this one${dream.images.length ? ", and its pictures" : ""}. Other dreams from that night stay.`,
      confirmLabel: "Delete",
    });
    if (ok) startTransition(() => deleteDream(dream.id));
  }

  if (editing) {
    return (
      <div className="py-3">
        <DreamEdit dream={dream} date={date} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <article
      ref={ref}
      // -mx-2 px-2: a little room on the sides so the search highlight (flash) isn't tight to the text.
      className={`group/dream -mx-2 flex gap-3 rounded-control px-2 py-3 transition-opacity ${pending ? "opacity-40" : ""} ${
        focused ? "flash" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        {label && <p className="mb-1 font-display text-sm font-semibold text-accent">{label}</p>}
        {/* Saved text is cleaned to just <p>, <br>, bold, italic and underline before it gets here. */}
        {dream.text && (
          <div className="dream-text break-words leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: dream.body }} />
        )}
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
      </div>

      <div className="-mr-1 flex shrink-0 flex-col items-start sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(true)}
          aria-label="Edit this dream"
          className="grid size-8 place-items-center rounded-control text-muted opacity-50 transition hover:bg-paper group-hover/dream:text-black group-hover/dream:opacity-100"
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
          aria-label="Delete this dream"
          className="grid size-8 place-items-center rounded-control text-muted opacity-50 transition hover:bg-paper hover:text-danger! group-hover/dream:text-black group-hover/dream:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </article>
  );
}
