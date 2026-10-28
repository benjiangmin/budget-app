"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteGame } from "@/app/games/actions";
import type { Game, GameStatus } from "@/lib/games";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useIsStuck } from "@/components/ui/useIsStuck";
import GameForm from "./GameForm";
import { gameDates } from "./dates";

const SECTIONS: { status: GameStatus; title: string }[] = [
  { status: "playing", title: "Playing now" },
  { status: "completed", title: "Completed" },
  { status: "stopped", title: "Stopped playing" },
  { status: "backlog", title: "Backlog" },
];

// One black-bordered box with a section per status. Like the compliments box: its rounded top edge
// pins under the search/add bar and shows the section you're in; the sides run off the page.
export default function GameList({ games, focusId }: { games: Record<GameStatus, Game[]>; focusId?: string }) {
  const sections = SECTIONS.filter((s) => games[s.status].length > 0);
  const [headingRef, stuck] = useIsStuck<HTMLDivElement>();
  const listRef = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState<GameStatus | null>(sections[0]?.status ?? null);

  // Which section is under the pinned top edge right now.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const line = (headingRef.current?.getBoundingClientRect().bottom ?? 0) + 1;
      let found: GameStatus | null = null;
      for (const el of Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-section]") ?? [])) {
        if (found === null || el.getBoundingClientRect().top <= line) found = el.dataset.section as GameStatus;
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
  }, [headingRef]);

  if (sections.length === 0) {
    return (
      <p className="mt-6 rounded-card border border-dashed border-line px-5 py-6 text-muted">
        No games yet. Add the one you&apos;re playing.
      </p>
    );
  }

  const shown = SECTIONS.find((s) => s.status === current) ?? sections[0];

  return (
    <div className="mt-6 flex flex-1 flex-col">
      {/* The box's top edge: pins under the search/add bar (at the very top on phones). */}
      <div ref={headingRef} data-stick-under className="sticky top-0 z-20 bg-paper sm:top-[var(--sticky-top,0px)]">
        <div className="flex items-baseline justify-between gap-3 rounded-t-card border-[1.5px] border-b-0 border-ink px-4 pb-2 pt-4 sm:px-6">
          <h2 className="font-display text-xl font-semibold">{shown.title}</h2>
          <p className="text-sm text-muted">{games[shown.status].length}</p>
        </div>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-[1.5px] top-full h-6 bg-gradient-to-b from-paper to-transparent transition-opacity duration-200 ${
            stuck ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Side borders only, running off the bottom of the page. */}
      <section ref={listRef} aria-label="Games" className="flex-1 border-x-[1.5px] border-ink px-3 pb-24 sm:px-5">
        {sections.map((s, i) => (
          <div key={s.status} data-section={s.status}>
            {/* The first section's name is already in the box's top edge. */}
            {i > 0 && (
              <div className="flex items-baseline justify-between gap-3 px-1 pb-2 pt-6">
                <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                <p className="text-sm text-muted">{games[s.status].length}</p>
              </div>
            )}
            <ul className="space-y-2 pt-1">
              {games[s.status].map((g) => (
                <Item key={g.id} game={g} focused={g.id === focusId} />
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

function Item({ game, focused }: { game: Game; focused: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const ref = useRef<HTMLLIElement>(null);
  const dates = gameDates(game.status, game.started_on, game.finished_on);

  // Arrived here from a search result: scroll the page down to it (centered) while it flashes.
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focused]);

  async function remove() {
    const ok = await confirm({ title: `Delete "${game.title}"?`, body: "It'll be removed for good.", confirmLabel: "Delete" });
    if (ok) startTransition(() => deleteGame(game.id));
  }

  if (editing) {
    return (
      <li className="rounded-card bg-surface p-3 ring-1 ring-line sm:p-4">
        <GameForm game={game} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    // Same columns for every game so they line up: title + dates | note | edit/delete.
    // Column widths: grid-cols-[…] (the fr numbers split the space). Phones: note goes under.
    <li
      ref={ref}
      className={`group grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-card bg-surface px-4 py-3 transition-opacity sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] ${
        pending ? "opacity-40" : ""
      } ${focused ? "flash" : ""} ${game.status === "stopped" ? "text-muted" : ""}`}
    >
      <div className="min-w-0">
        <p className={`break-words font-display font-semibold ${game.status === "stopped" ? "line-through decoration-muted/60" : "text-ink"}`}>
          {game.title}
        </p>
        {dates && <p className="num mt-0.5 text-sm text-muted">{dates}</p>}
        {game.note && <p className="mt-1 break-words text-sm text-muted sm:hidden">{game.note}</p>}
      </div>
      <p
        className={`hidden min-w-0 break-words pl-4 text-sm leading-relaxed text-muted sm:block ${
          game.note ? "border-l border-line" : ""
        }`}
      >
        {game.note}
      </p>
      <div className="-mr-1 flex flex-col items-start sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(true)}
          aria-label={`Edit ${game.title}`}
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
          aria-label={`Delete ${game.title}`}
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
