"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { deletePark, setVisited } from "@/app/parks/actions";
import type { Park } from "@/lib/parks";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import ParkForm from "./ParkForm";

const VEIL_MS = 620; // same slide timing as the unsuspicious documents' writing box
type Mode = "both" | "visited" | "notYet"; // which column(s) are open

// One black-bordered box, two columns: Visited (left) and Not yet (right). Folding one into a slim
// strip widens the other; the strip's button brings both back. Each column scrolls inside itself.
export default function ParksBoard({ visited, notYet, focusId }: { visited: Park[]; notYet: Park[]; focusId?: string }) {
  const [mode, setMode] = useState<Mode>("both");

  // Picked a park from search: make sure both columns are open so it can be seen.
  const [seenFocus, setSeenFocus] = useState(focusId);
  if (focusId !== seenFocus) {
    setSeenFocus(focusId);
    if (focusId) setMode("both");
  }

  // While the columns slide, an oat veil covers them so you don't see the text reflow.
  const [veil, setVeil] = useState(0);
  const [lastMode, setLastMode] = useState(mode);
  if (lastMode !== mode) {
    setLastMode(mode);
    setVeil((v) => v + 1);
  }
  useEffect(() => {
    if (!veil) return;
    const t = setTimeout(() => setVeil(0), VEIL_MS);
    return () => clearTimeout(t);
  }, [veil]);

  // Column widths (wide screens). Strip: 4.5rem.
  const width = (side: "visited" | "notYet"): string =>
    mode === "both" ? "50%" : mode === side ? "calc(100% - 4.5rem)" : "4.5rem";

  return (
    <section
      aria-label="National parks"
      className="relative mt-5 flex flex-col overflow-hidden rounded-card border-[1.5px] border-ink lg:min-h-[26rem] lg:flex-1 lg:basis-0 lg:flex-row"
    >
      {/* The mascot goes here, pinned to the box (behind the parks, trimmed by the border), e.g.
          <img src="/name.png" alt="" aria-hidden="true"
               className="pointer-events-none absolute -bottom-4 -right-6 z-0 w-36 select-none opacity-60 sm:w-44" /> */}
      <Column
        title="Visited"
        parks={visited}
        open={mode !== "notYet"}
        width={width("visited")}
        side="left"
        empty="None yet. Mark a park as visited on the right."
        focusId={focusId}
        onFold={() => setMode("notYet")}
        onUnfold={() => setMode("both")}
      />
      <Column
        title="Not yet"
        parks={notYet}
        open={mode !== "visited"}
        width={width("notYet")}
        side="right"
        empty="You've been to all of them!"
        focusId={focusId}
        onFold={() => setMode("visited")}
        onUnfold={() => setMode("both")}
      />
      {/* The veil (wide screens): covers the box while the columns slide. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 hidden bg-surface transition-opacity ease-out motion-reduce:hidden lg:block ${
          veil > 0 ? "opacity-100 duration-150" : "opacity-0 duration-300"
        }`}
      />
    </section>
  );
}

function Column({
  title,
  parks,
  open,
  width,
  side,
  empty,
  focusId,
  onFold,
  onUnfold,
}: {
  title: string;
  parks: Park[];
  open: boolean;
  width: string;
  side: "left" | "right";
  empty: string;
  focusId?: string;
  onFold: () => void;
  onUnfold: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  // Arrows point the way the column folds (left column folds left, right column folds right).
  const foldPath = side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7";
  const unfoldPath = side === "left" ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7";

  return (
    <div
      style={{ "--w": width } as CSSProperties}
      className={`relative z-[1] flex min-h-0 flex-col transition-[width] delay-150 duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:w-[var(--w)] ${
        side === "right" ? "border-t border-line lg:border-l lg:border-t-0" : ""
      } ${open ? "h-[60dvh] min-h-[18rem] lg:h-auto lg:min-h-0" : "bg-surface"}`}
    >
      {!open ? (
        // Folded: a slim strip (wide screens) or a bar (phones).
        <div className="panel-in flex items-center justify-between gap-3 p-3 lg:h-full lg:flex-col lg:justify-start lg:gap-5 lg:px-0 lg:py-4">
          <button
            type="button"
            onClick={onUnfold}
            aria-label={`Show ${title.toLowerCase()} (${parks.length})`}
            title={`Show ${title.toLowerCase()}`}
            className="flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 lg:size-11 lg:justify-center lg:p-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={unfoldPath} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="lg:sr-only">Show {title.toLowerCase()}</span>
          </button>
          <p className="whitespace-nowrap text-sm text-muted lg:rotate-180 lg:[writing-mode:vertical-rl]">
            {title} · {parks.length}
          </p>
        </div>
      ) : (
        <div className="panel-in flex min-h-0 flex-1 flex-col">
          <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 bg-paper px-5 pb-2 pt-4 sm:px-6">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted">{parks.length}</p>
              <button
                type="button"
                onClick={onFold}
                aria-label={`Fold away ${title.toLowerCase()}`}
                title="Fold away"
                className="grid size-8 place-items-center rounded-control text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d={foldPath} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b from-paper to-transparent transition-opacity duration-200 ${
                scrolled ? "opacity-100" : "opacity-0"
              }`}
            />
            <div onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)} className="absolute inset-0 overflow-y-auto px-3 pb-4 sm:px-4">
              {parks.length === 0 ? (
                <p className="mt-1 rounded-card border border-dashed border-line px-5 py-6 text-muted">{empty}</p>
              ) : (
                <ul className="space-y-1.5">
                  {parks.map((p) => (
                    <ParkItem key={p.id} park={p} focused={p.id === focusId} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ParkItem({ park, focused }: { park: Park; focused: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focused]);

  async function remove() {
    const ok = await confirm({ title: `Delete ${park.name}?`, body: "It'll be removed from your list for good.", confirmLabel: "Delete" });
    if (ok) startTransition(() => deletePark(park.id));
  }

  if (editing) {
    return (
      <li className="rounded-card bg-surface p-3 ring-1 ring-line">
        <ParkForm park={park} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li
      ref={ref}
      className={`group flex items-center gap-3 rounded-card bg-surface/80 px-2.5 py-2 transition-opacity ${pending ? "opacity-40" : ""} ${
        focused ? "flash" : ""
      }`}
    >
      <Badge park={park} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium text-ink">
          <span className="min-w-0 truncate">{park.name}</span>
          {park.custom && (
            <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Other</span>
          )}
        </p>
        {park.note && <p className="break-words text-sm leading-snug text-muted">{park.note}</p>}
      </div>
      <div className="-my-1 flex shrink-0">
        <IconButton
          label={park.visited ? `Move ${park.name} to not yet` : `Mark ${park.name} as visited`}
          disabled={pending}
          onClick={() => startTransition(() => setVisited(park.id, !park.visited))}
        >
          {park.visited ? (
            <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </IconButton>
        <IconButton label={`Edit ${park.name}`} disabled={pending} onClick={() => setEditing(true)}>
          <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </IconButton>
        <IconButton label={`Delete ${park.name}`} disabled={pending} onClick={remove} danger>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </IconButton>
      </div>
    </li>
  );
}

// The park's photo (from the National Park Service), or its initials when there isn't one.
function Badge({ park }: { park: Park }) {
  const [broken, setBroken] = useState(false);
  const initials = park.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  if (park.photo && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a small outside picture
      <img
        src={park.photo}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className={`size-10 shrink-0 rounded-full object-cover ring-1 ring-line ${park.visited ? "" : "opacity-70 grayscale"}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-semibold ${
        park.visited ? "bg-accent text-accent-ink" : "bg-line text-muted"
      }`}
    >
      {initials || "•"}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-control text-muted opacity-50 transition hover:bg-paper group-hover:text-black group-hover:opacity-100 ${
        danger ? "hover:text-danger!" : ""
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
