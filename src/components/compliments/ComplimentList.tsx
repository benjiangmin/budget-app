"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteCompliment } from "@/app/compliments/actions";
import type { Compliment } from "@/lib/compliments";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useIsStuck } from "@/components/ui/useIsStuck";
import ComplimentForm from "./ComplimentForm";

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// The black-bordered list. It grows with the page (no scrolling inside), newest first, by year.
// Built in two stacked parts that share the same side borders (like the budget's Expenses box):
//  1. the box's top edge: a heading with the rounded top border, pinned under the search/add bar,
//     showing whichever year you're scrolled to
//  2. the list, with side borders only, running off the bottom of the page (no bottom edge)
// Border thickness: change every border-[1.5px] below.
export default function ComplimentList({ items, focusId }: { items: Compliment[]; focusId?: string }) {
  const years = useMemo(() => {
    const out: { year: string; items: Compliment[] }[] = [];
    for (const c of items) {
      const year = c.said_on.slice(0, 4);
      const last = out.at(-1);
      if (last?.year === year) last.items.push(c);
      else out.push({ year, items: [c] });
    }
    return out;
  }, [items]);

  const [headingRef, stuck] = useIsStuck<HTMLDivElement>();
  const listRef = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(years[0]?.year ?? "");

  // Which year is under the pinned heading right now (the last year section that has reached it).
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const line = (headingRef.current?.getBoundingClientRect().bottom ?? 0) + 1;
      let found = years[0]?.year ?? "";
      for (const el of Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-year]") ?? [])) {
        if (el.getBoundingClientRect().top <= line) found = el.dataset.year ?? found;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headingRef, years]);

  if (items.length === 0) {
    return (
      <p className="mt-6 rounded-card border border-dashed border-line px-5 py-6 text-muted">
        No compliments yet. The first one is always the best.
      </p>
    );
  }

  const count = years.find((y) => y.year === current)?.items.length ?? 0;

  return (
    <div className="mt-6 flex flex-1 flex-col">
      {/* The box's top edge. Pins just under the title/search bar (--sticky-top is that bar's height).
          The paper background hides
          entries passing under it. data-stick-under hides the bar's own fade once this is pinned. */}
      <div
        ref={headingRef}
        data-stick-under
        className="sticky top-[var(--sticky-top,0px)] z-20 bg-paper"
      >
        <div className="flex items-baseline justify-between gap-3 rounded-t-card border-[1.5px] border-b-0 border-ink px-4 pb-2 pt-4 sm:px-6">
          <h2 className="num font-display text-xl font-semibold">{current}</h2>
          <p className="text-sm text-muted">{count}</p>
        </div>
        {/* Fade under it while entries scroll beneath. Inset 1.5px so it stays inside the border. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-[1.5px] top-full h-6 bg-gradient-to-b from-paper to-transparent transition-opacity duration-200 ${
            stuck ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* overflow-clip trims the mascots at the border. flex-1 = reaches the bottom of the page. */}
      <section
        ref={listRef}
        aria-label="Compliments"
        className="relative flex-1 overflow-clip border-x-[1.5px] border-ink px-3 pb-24 sm:px-5"
      >
        {/* Mascot layer: one screen tall and sticky, so the mascots stay put on screen while the list
            scrolls past (and it takes no room: the negative bottom margin cancels its height).
            It pins just under the pinned year bar (3.5rem tall), below the title/search bar. Behind the cards (z-0 vs z-[1]).
            Tweak per image: w-.. = size, top/right/bottom/left = position (negative pushes it past
            the border), opacity-.. = fade, rotate-.. = tilt. */}
        <div
          aria-hidden="true"
          className="pointer-events-none sticky top-[calc(var(--sticky-top,0px)+3.5rem)] z-0 -mb-[calc(100dvh-var(--sticky-top,0px)-3.5rem)] h-[calc(100dvh-var(--sticky-top,0px)-3.5rem)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
          <img src="/togetic.png" alt="" className="absolute -right-8 top-4 w-36 select-none opacity-60 rotate-6 sm:w-44" />
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
          <img src="/blissey.png" alt="" className="absolute -bottom-6 -left-10 w-44 select-none opacity-60 -rotate-3 sm:w-56" />
        </div>

        <div className="relative z-[1]">
        {years.map((y, i) => (
          <div key={y.year} data-year={y.year}>
            {/* The first year's name is already in the box's top edge. */}
            {i > 0 && (
              <div className="flex items-baseline justify-between gap-3 px-1 pb-2 pt-6 sm:px-1">
                <h3 className="num font-display text-xl font-semibold">{y.year}</h3>
                <p className="text-sm text-muted">{y.items.length}</p>
              </div>
            )}
            {/* Each compliment is its own card. Gap between cards: space-y-2. */}
            <ul className="space-y-2 pt-1">
              {y.items.map((c) => (
                <Item key={c.id} item={c} focused={c.id === focusId} />
              ))}
            </ul>
          </div>
        ))}
        </div>
      </section>
    </div>
  );
}

function Item({ item, focused }: { item: Compliment; focused: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const ref = useRef<HTMLLIElement>(null);

  // Arrived here from a search result: scroll the page down to it (centered) while it flashes.
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focused]);

  async function remove() {
    const ok = await confirm({
      title: "Delete this compliment?",
      body: `"${item.compliment.slice(0, 80)}" from ${item.person} will be removed for good.`,
      confirmLabel: "Delete",
    });
    if (ok) startTransition(() => deleteCompliment(item.id));
  }

  if (editing) {
    return (
      <li className="rounded-card bg-surface p-3 ring-1 ring-line sm:p-4">
        <ComplimentForm item={item} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    // bg-surface/80 = slightly see-through, so the mascots show faintly behind. Use bg-surface for solid.
    // Same columns for every entry, so they line up down the list:
    //   date | who + compliment | note | edit/delete
    // Column widths: the grid-cols-[…] below (the two fr numbers split the space between
    // compliment and note). On phones the note drops under the compliment instead.
    <li
      ref={ref}
      className={`group grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-x-4 rounded-card bg-surface/80 px-3 py-3.5 transition-opacity sm:grid-cols-[3rem_minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:px-4 ${
        pending ? "opacity-40" : ""
      } ${focused ? "flash" : ""}`}
    >
      <div className="pt-0.5 text-sm">
        {item.date_known ? (
          <span className="num text-muted">{shortDate(item.said_on)}</span>
        ) : (
          <span className="font-semibold text-muted" title="Date forgotten (placed near when it happened)">
            ?
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-display font-semibold text-ink">{item.person}</p>
        <p className="mt-0.5 break-words leading-relaxed text-ink">{item.compliment}</p>
        {/* Phones: the note goes here, under the compliment. */}
        {item.note && <p className="mt-1 break-words text-sm text-muted sm:hidden">{item.note}</p>}
      </div>
      {/* Wider screens: the note gets its own column (empty when there's no note, so columns stay aligned). */}
      <p
        className={`hidden min-w-0 break-words pl-4 pt-0.5 text-sm leading-relaxed text-muted sm:block ${
          item.note ? "border-l border-line" : ""
        }`}
      >
        {item.note}
      </p>
      <div className="-mr-1 flex flex-col items-start sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(true)}
          aria-label={`Edit compliment from ${item.person}`}
          className="grid size-8 place-items-center rounded-control text-muted opacity-50 transition hover:bg-paper group-hover:text-black group-hover:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          aria-label={`Delete compliment from ${item.person}`}
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
