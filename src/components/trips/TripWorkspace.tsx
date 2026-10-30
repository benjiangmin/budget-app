"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { deleteTripDay, saveTripDay } from "@/app/trips/actions";
import type { TripDay } from "@/lib/trips";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import JournalEditor from "@/components/journal/JournalEditor";
import { VEIL_EVENT } from "@/components/journal/veil";

// Slide timing (same as the journal): veil fades in → box slides → veil lifts at VEIL_MS.
const VEIL_MS = 620;

// Day n's real date ("Jul 14"), when the trip has a start date.
function dayDate(start: string | null, n: number) {
  if (!start) return null;
  const [y, m, d] = start.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n - 1);
  return {
    short: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    long: dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
  };
}

// The day loaded into the writing box. `version` bumps on every load, which resets the editor.
type Draft = { id: string | null; number: number; title: string; body: string; version: number };

// Left: the writing box (collapses to a slim strip). Right: the trip's days, Day 1 first.
// Same feel as an unsuspicious document: "Add a day" opens the box with the next day number;
// the pencil on a day opens that day. Save or Cancel when done.
export default function TripWorkspace({ tripId, start, days, focusId }: { tripId: string; start: string | null; days: TripDay[]; focusId?: string }) {
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft | null>(null); // null = closed
  const [html, setHtml] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const version = useRef(0);

  const nextNumber = days.reduce((n, d) => Math.max(n, d.day), 0) + 1;

  const save = useCallback(async () => {
    if (!draft) return false;
    setSaving(true);
    const res = await saveTripDay(tripId, draft.id, draft.number, draft.title, html);
    setSaving(false);
    if (!res.ok) {
      setStatus({ text: res.message, error: true });
      return false;
    }
    setDirty(false);
    return true;
  }, [draft, html, tripId]);

  // Before switching days or closing: unsaved changes ask first. Returns false to keep editing.
  const settle = useCallback(async () => {
    if (!draft || !dirty) return true;
    const ok = await confirm({
      title: `Save your changes to Day ${draft.number} first?`,
      body: "To throw them away instead, press Cancel in the writing box.",
      confirmLabel: "Save",
    });
    return ok && (await save());
  }, [draft, dirty, confirm, save]);

  const open = useCallback(
    async (day: TripDay | null) => {
      if (!(await settle())) return;
      version.current += 1;
      setDraft({
        id: day?.id ?? null,
        number: day?.day ?? nextNumber,
        title: day?.title ?? "",
        body: day?.body ?? "",
        version: version.current,
      });
      setHtml(day?.body ?? "");
      setDirty(false);
      setStatus(null);
    },
    [settle, nextNumber],
  );

  const close = useCallback(
    async (opts: { discard?: boolean } = {}) => {
      if (!opts.discard && !(await settle())) return;
      setDraft(null);
      setDirty(false);
      setStatus(null);
    },
    [settle],
  );

  // Warn before closing the tab with unsaved writing.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const expanded = draft !== null;
  const date = draft ? dayDate(start, draft.number) : null;

  // While the writing box slides open/closed, an oat-colored veil covers the days (no reflow flicker).
  const [veil, setVeil] = useState(0);
  const [wasExpanded, setWasExpanded] = useState(expanded);
  if (wasExpanded !== expanded) {
    setWasExpanded(expanded);
    setVeil((v) => v + 1);
  }
  useEffect(() => {
    if (!veil) return;
    const t = setTimeout(() => setVeil(0), VEIL_MS);
    return () => clearTimeout(t);
  }, [veil]);

  const field =
    "rounded-control border border-line bg-paper px-3 py-2 text-ink placeholder:text-muted/70 focus:border-ink";

  return (
    <div className="mt-6 flex flex-col gap-6 lg:min-h-[32rem] lg:flex-1 lg:basis-0 lg:flex-row">
      {/* ---------- Left: the writing box (slides between a slim strip and half the page) ---------- */}
      <section
        aria-label="Write"
        style={{ "--panel-w": expanded ? "calc(50% - 0.75rem)" : "4.5rem" } as CSSProperties}
        className={`relative z-[25] flex shrink-0 flex-col rounded-card bg-surface transition-[width,padding] delay-150 duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:h-auto lg:w-[var(--panel-w)] ${
          expanded ? "h-[70dvh] min-h-[24rem] p-4 sm:p-5" : "p-3 lg:overflow-hidden lg:px-0 lg:py-4"
        }`}
      >
        {!expanded ? (
          <ClosedStrip key="closed" label="Add a day" onWrite={() => open(null)} />
        ) : (
          <div key={`open-${draft.version}`} className="panel-in flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">{draft.id ? "Edit day" : "Add a day"}</h2>
                <p className="text-sm text-muted">{date ? date.long : "\u00a0"}</p>
              </div>
              <button
                type="button"
                onClick={() => close()}
                aria-label="Close the writing box"
                title="Close"
                className="grid size-10 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-paper hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Day number + optional title. Day number width: w-24. */}
            <div className="mb-3 flex gap-2">
              <label className="flex w-24 shrink-0 items-center gap-1.5 rounded-control border border-line bg-paper pl-3 focus-within:border-ink">
                <span className="text-sm font-semibold text-muted">Day</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  value={draft.number}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(999, Math.floor(Number(e.target.value) || 1)));
                    setDraft((d) => d && { ...d, number: n });
                    setDirty(true);
                  }}
                  aria-label="Day number"
                  style={{ outline: "none" }}
                  className="no-spin num w-full min-w-0 bg-transparent py-2 pr-2 font-semibold text-ink"
                />
              </label>
              <input
                value={draft.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setDraft((d) => d && { ...d, title });
                  setDirty(true);
                }}
                maxLength={150}
                placeholder="Title (optional)"
                aria-label="Title"
                style={{ outline: "none" }}
                className={`${field} min-w-0 flex-1`}
              />
            </div>

            <JournalEditor
              key={draft.version}
              initial={draft.body}
              onChange={(next) => {
                setHtml(next);
                setDirty(true);
              }}
              onStatus={(text) => setStatus(text ? { text } : null)}
              placeholder="What happened today?"
            />

            <div className="mt-3 flex min-h-10 flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={saving || !dirty}
                onClick={async () => {
                  if (await save()) close({ discard: true });
                }}
                className="rounded-control bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : draft.id ? "Save changes" : "Add day"}
              </button>
              <button
                type="button"
                onClick={() => close({ discard: true })}
                className="rounded-control px-4 py-2.5 text-muted transition-colors hover:bg-paper hover:text-ink"
              >
                Cancel
              </button>
              <p role="status" className={`text-sm ${status?.error ? "text-danger" : "text-muted"}`}>
                {status?.text ?? ""}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Right: the days ---------- */}
      <DayList
        days={days}
        start={start}
        veiled={veil > 0}
        editingId={draft?.id ?? null}
        focusId={focusId}
        onEdit={(d) => open(d)}
        onDeleted={(d) => {
          if (draft?.id === d.id) close({ discard: true });
        }}
      />
    </div>
  );
}

// The writing box when closed. Wide screens: a slim vertical strip. Phones: a short bar.
function ClosedStrip({ label, onWrite }: { label: string; onWrite: () => void }) {
  return (
    <div className="panel-in flex items-center justify-between gap-3 lg:h-full lg:flex-col lg:justify-start lg:gap-5">
      <button
        type="button"
        onClick={onWrite}
        aria-label={label}
        title={label}
        className="flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60 lg:size-11 lg:justify-center lg:p-0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="lg:sr-only">{label}</span>
      </button>
      {/* Reads bottom-to-top on wide screens. */}
      <p className="text-sm text-muted lg:[writing-mode:vertical-rl] lg:rotate-180">
        {"Click a day to edit"}
      </p>
    </div>
  );
}

function DayList({
  days,
  start,
  veiled,
  editingId,
  focusId,
  onEdit,
  onDeleted,
}: {
  days: TripDay[];
  start: string | null;
  veiled: boolean;
  editingId: string | null;
  focusId?: string;
  onEdit: (d: TripDay) => void;
  onDeleted: (d: TripDay) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Search jump: fade to oat, jump to the day behind the veil, then fade back in with it flashing.
  const [searchVeil, setSearchVeil] = useState<"none" | "pending" | "landed">(focusId ? "landed" : "none");
  const [seenFocus, setSeenFocus] = useState(focusId);
  if (focusId !== seenFocus) {
    setSeenFocus(focusId);
    if (focusId) setSearchVeil("landed");
  }
  useEffect(() => {
    const onVeil = () => setSearchVeil("pending");
    window.addEventListener(VEIL_EVENT, onVeil);
    return () => window.removeEventListener(VEIL_EVENT, onVeil);
  }, []);
  useEffect(() => {
    if (searchVeil === "none") return;
    const t = setTimeout(() => setSearchVeil("none"), searchVeil === "landed" ? 350 : 2500);
    return () => clearTimeout(t);
  }, [searchVeil]);
  const jump = (to: "top" | "bottom") => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: to === "top" ? 0 : el.scrollHeight, behavior: "smooth" });
  };

  return (
    <section
      aria-labelledby="days-heading"
      className="relative flex h-[75dvh] min-h-[24rem] min-w-0 flex-col overflow-hidden rounded-card border-[1.5px] border-ink lg:h-auto lg:min-h-0 lg:flex-1"
    >
      {/* The trip mascot (the same on every trip): pinned to the box's bottom-right, behind the days,
          trimmed by the border. Tweak: w-.. = size, bottom/right = position, opacity-.. = fade. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img
        src="/alolan-exeggutor.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -right-6 z-0 w-36 select-none opacity-60 rotate-3 sm:w-44"
      />

      <div className="relative z-10 flex shrink-0 items-baseline justify-between gap-3 bg-paper px-5 pb-3 pt-4 sm:px-6">
        <h2 id="days-heading" className="font-display text-xl font-semibold">
          Days
        </h2>
        {days.length > 0 && (
          <div className="flex items-center gap-1">
            <p className="mr-1 text-sm text-muted">
              {days.length} {days.length === 1 ? "day" : "days"}
            </p>
            <JumpButton label="Jump to the first day" onClick={() => jump("top")} dir="up" />
            <JumpButton label="Jump to the last day" onClick={() => jump("bottom")} dir="down" />
          </div>
        )}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-paper to-transparent transition-opacity duration-200 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <div className="relative z-[1] min-h-0 flex-1">
        <div
          ref={scrollerRef}
          data-scroller
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
          className="absolute inset-0 overflow-y-auto px-3 pb-4 sm:px-4"
        >
          {days.length === 0 ? (
            <p className="mt-1 rounded-card border border-dashed border-line px-5 py-6 text-muted">No days yet. Add Day 1 on the left.</p>
          ) : (
            <ul className="space-y-2.5">
              {days.map((d) => (
                <DayItem
                  key={d.id}
                  day={d}
                  start={start}
                  editing={d.id === editingId}
                  focused={d.id === focusId}
                  onEdit={() => onEdit(d)}
                  onDeleted={() => onDeleted(d)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* The veil: covers the days while the writing box slides (wide screens) or a search jumps. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 bg-surface ${searchVeil !== "none" ? "block" : "hidden lg:block"} ${
          veiled || searchVeil !== "none" ? "opacity-100 duration-150" : "opacity-0 duration-300"
        } transition-opacity ease-out motion-reduce:hidden`}
      />
    </section>
  );
}

function DayItem({
  day,
  start,
  editing,
  focused,
  onEdit,
  onDeleted,
}: {
  day: TripDay;
  start: string | null;
  editing: boolean;
  focused: boolean;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const ref = useRef<HTMLLIElement>(null);
  const date = dayDate(start, day.day);

  // Arrived from a search result: jump the box (not the page) straight to this day, behind the veil.
  useLayoutEffect(() => {
    const el = ref.current;
    const scroller = el?.closest<HTMLElement>("[data-scroller]");
    if (!focused || !el || !scroller) return;
    scroller.scrollTo({ top: el.offsetTop - 12, behavior: "instant" });
  }, [focused]);

  async function remove() {
    const ok = await confirm({
      title: `Delete Day ${day.day}?`,
      body: "Its writing and pictures will be removed for good.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    onDeleted();
    startTransition(() => deleteTripDay(day.id));
  }

  return (
    // bg-surface/90 = the mascot shows very faintly behind. Use bg-surface for solid.
    <li
      ref={ref}
      className={`group relative flex gap-4 rounded-card bg-surface/90 px-3 py-4 transition-opacity ${pending ? "opacity-40" : ""} ${
        focused ? "flash" : ""
      }`}
    >
      {/* Faded while it's open in the writing box. */}
      <div className={`flex min-w-0 flex-1 gap-4 transition-opacity duration-300 ${editing ? "opacity-20" : ""}`}>
        {/* "Day" + the number, and the real date under it when the trip has a start date. */}
        <div className="w-12 shrink-0 text-center">
          <div className="text-xs text-muted">Day</div>
          <div className="num font-display text-2xl font-semibold leading-tight">{day.day}</div>
          {date && <div className="mt-0.5 whitespace-nowrap text-[11px] text-muted">{date.short}</div>}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          {day.title && <h3 className="mb-1.5 font-display text-lg font-semibold leading-snug">{day.title}</h3>}
          {/* Saved text is cleaned (paragraphs, formatting, lists, pictures) before it gets here. */}
          <div className="journal-text break-words leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: day.body }} />
        </div>
      </div>

      {editing ? (
        <p className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-paper px-4 py-1.5 font-display text-sm font-semibold text-muted shadow-sm">Editing</span>
        </p>
      ) : (
        <div className="-mr-1 -mt-1 flex shrink-0 flex-col items-start sm:flex-row">
          <button
            type="button"
            disabled={pending}
            onClick={onEdit}
            aria-label={`Edit Day ${day.day}`}
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
            aria-label={`Delete Day ${day.day}`}
            className="grid size-8 place-items-center rounded-control text-muted opacity-50 transition hover:bg-paper hover:text-danger! group-hover:text-black group-hover:opacity-100"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}

function JumpButton({ label, onClick, dir }: { label: string; onClick: () => void; dir: "up" | "down" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-control text-muted transition-colors hover:bg-surface hover:text-ink"
    >
      {/* Arrow to a line: ⤒ / ⤓ */}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {dir === "up" ? (
          <path d="M5 4h14M12 20V9m0 0l-5 5m5-5l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M5 20h14M12 4v11m0 0l-5-5m5 5l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}
