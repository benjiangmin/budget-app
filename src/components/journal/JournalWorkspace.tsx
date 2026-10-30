"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { deleteJournalEntry, loadJournalDay, saveJournalDay } from "@/app/journal/actions";
import type { JournalEntry } from "@/lib/journal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import DateWheel from "@/components/ui/DateWheel";
import JournalEditor from "./JournalEditor";
import { useToday } from "./useToday";
import { inDoc } from "@/lib/journal-years";
import { VEIL_EVENT } from "./veil";

const pad = (n: number) => String(n).padStart(2, "0");
const AUTOSAVE_MS = 1200; // today's entry saves this long after you stop typing
// Slide timing (keep in step with the classes on the writing box and .panel-in in globals.css):
// veil fades in (150ms) → box slides (starts at 150ms, takes 450ms) → veil lifts at VEIL_MS.
const VEIL_MS = 620;

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    day: String(d),
    weekday: dt.toLocaleDateString("en-US", { weekday: "short" }),
    long: dt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
  };
}

// The day loaded into the writing box. `version` bumps on every load, which resets the editor.
type Day = { date: string; exists: boolean; body: string; version: number };

// Left: the writing box. Right: the month's entries.
//
// The writing box has three states:
//  - Closed (nothing being edited): a slim strip, "Click an entry to edit", so the list gets the room.
//  - Today: what you write saves automatically ("Latest updates saved"). Today's entry stays out
//    of the list on the right until the day is over.
//  - Another day (the pencil on an entry, or the date picker): Save or Cancel when done.
//    The entry being edited fades out on the right.
// Opening and closing slides the box wider/narrower (see .panel-in in globals.css for the fade).
export default function JournalWorkspace({
  year,
  start,
  month,
  calendarYear,
  monthName,
  entries,
  focusId,
}: {
  year: number; // the document
  start: number; // month the document's year starts in
  month: number; // month being viewed (1–12)
  calendarYear: number; // the real year of that month
  monthName: string;
  entries: JournalEntry[];
  focusId?: string;
}) {
  const today = useToday();
  const confirm = useConfirm();
  const [day, setDay] = useState<Day | null>(null); // null = closed
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const edits = useRef(0); // counts keystrokes, so a save doesn't mark newer typing as saved
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const version = useRef(0);

  // "Write" opens today if today is inside this document, otherwise the 1st of the month you're viewing.
  const todayInDoc = today !== null && inDoc(today, year, start);
  const writeDate = todayInDoc ? today! : `${calendarYear}-${pad(month)}-01`;
  const isToday = day !== null && day.date === today;

  const save = useCallback(async (target: Day, content: string, quiet: boolean) => {
    const at = edits.current;
    setSaving(true);
    if (quiet) setStatus({ text: "Saving…" });
    const res = await saveJournalDay(target.date, content, quiet);
    setSaving(false);
    if (!res.ok) {
      setStatus({ text: res.message, error: true });
      return false;
    }
    if (edits.current === at) setDirty(false);
    setDay((d) => (d && d.date === target.date ? { ...d, exists: res.exists } : d));
    const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setStatus({ text: `Latest updates saved · ${time}` });
    return true;
  }, []);

  // Before leaving the current day: today's changes get saved, another day's ask first.
  // Returns false if you chose to keep editing.
  const settle = useCallback(async () => {
    clearTimeout(timer.current);
    if (!day || !dirty) return true;
    if (day.date === today) return save(day, html, true);
    const ok = await confirm({
      title: `Save your changes to ${parts(day.date).long} first?`,
      body: "To throw them away instead, press Cancel in the writing box.",
      confirmLabel: "Save",
    });
    return ok && (await save(day, html, false));
  }, [day, dirty, html, today, confirm, save]);

  // Load a day into the writing box.
  const open = useCallback(
    async (date: string, opts: { preset?: JournalEntry; discard?: boolean } = {}) => {
      if (!opts.discard && !(await settle())) return;
      clearTimeout(timer.current);
      setLoading(true);
      const entry = opts.preset ?? (await loadJournalDay(date).catch(() => null));
      setLoading(false);
      version.current += 1;
      setDay({ date, exists: Boolean(entry), body: entry?.body ?? "", version: version.current });
      setHtml(entry?.body ?? "");
      setDirty(false);
      setStatus(null);
    },
    [settle],
  );

  // Close the writing box (back to the slim strip).
  const close = useCallback(
    async (opts: { discard?: boolean } = {}) => {
      if (!opts.discard && !(await settle())) return;
      clearTimeout(timer.current);
      setDay(null);
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

  function onEditorChange(next: string) {
    setHtml(next);
    setDirty(true);
    edits.current += 1;
    if (day && isToday) {
      clearTimeout(timer.current);
      const target = day;
      timer.current = setTimeout(() => save(target, next, true), AUTOSAVE_MS);
    }
  }

  // The list skips today's entry (it joins the list once the day is over).
  const shown = entries.filter((e) => e.date !== today);
  const editingDate = day && !isToday ? day.date : null;
  const expanded = day !== null;

  // While the writing box slides open/closed, an oat-colored veil covers the entries so you don't
  // see the text reflowing. It fades in, the box slides (after a short delay), then it fades away.
  const [veil, setVeil] = useState(0); // >0 = showing (a counter, so back-to-back slides restart it)
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

  return (
    <div className="mt-6 flex flex-col gap-6 lg:min-h-[32rem] lg:flex-1 lg:basis-0 lg:flex-row">
      {/* ---------- Left: the writing box ----------
          On wide screens its width slides between a slim strip (4.5rem) and half the page.
          delay-150 = wait for the veil to cover the entries first. Speed: duration-[450ms].
          Feel: the cubic-bezier curve (fast start, soft landing). */}
      <section
        aria-label="Write"
        style={{ "--panel-w": expanded ? "calc(50% - 0.75rem)" : "4.5rem" } as CSSProperties}
        className={`relative z-[25] flex shrink-0 flex-col rounded-card bg-surface transition-[width,padding] delay-150 duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:h-auto lg:w-[var(--panel-w)] ${
          expanded ? "h-[70dvh] min-h-[22rem] p-4 sm:p-5" : "p-3 lg:overflow-hidden lg:px-0 lg:py-4"
        }`}
      >
        {!expanded ? (
          <ClosedStrip
            key="closed"
            label={todayInDoc ? "Write today" : `Write in ${monthName}`}
            loading={loading}
            onWrite={() => open(writeDate)}
          />
        ) : (
          <div key={`open-${day.version}`} className="panel-in flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">{day.exists ? "Edit entry" : "Add entry"}</h2>
                <p className="text-sm text-muted">{isToday ? "Today" : parts(day.date).long}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {todayInDoc && !isToday && (
                  <button
                    type="button"
                    onClick={() => open(today!)}
                    className="rounded-control px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-paper"
                  >
                    ← Today
                  </button>
                )}
                <div className="w-44">
                  <DateWheel
                    key={`${day.date}-${day.version}`}
                    name="journal_date"
                    defaultValue={day.date}
                    onChange={(date) => open(date)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => close()}
                  aria-label="Close the writing box"
                  title="Close"
                  className="grid size-10 place-items-center rounded-control text-muted transition-colors hover:bg-paper hover:text-ink"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <JournalEditor
              key={day.version}
              initial={day.body}
              onChange={onEditorChange}
              onStatus={(text) => setStatus(text ? { text } : null)}
            />

            <div className="mt-3 flex min-h-10 flex-wrap items-center gap-3">
              {!isToday && (
                <>
                  <button
                    type="button"
                    disabled={saving || !dirty}
                    onClick={async () => {
                      if (await save(day, html, false)) close({ discard: true });
                    }}
                    className="rounded-control bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : day.exists ? "Save changes" : "Add entry"}
                  </button>
                  <button
                    type="button"
                    onClick={() => close({ discard: true })}
                    className="rounded-control px-4 py-2.5 text-muted transition-colors hover:bg-paper hover:text-ink"
                  >
                    Cancel
                  </button>
                </>
              )}
              <p role="status" className={`text-sm ${status?.error ? "text-danger" : "text-muted"}`}>
                {status?.text ?? (isToday ? "Saves automatically as you type." : "")}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Right: the month's entries ---------- */}
      <EntryList
        entries={shown}
        monthName={monthName}
        calendarYear={calendarYear}
        veiled={veil > 0}
        editingDate={editingDate}
        focusId={focusId}
        onEdit={(e) => open(e.date, { preset: e })}
        onDeleted={(e) => {
          if (day?.date === e.date) close({ discard: true });
        }}
      />
    </div>
  );
}

// The writing box when closed. Wide screens: a slim vertical strip. Phones: a short bar.
function ClosedStrip({ label, loading, onWrite }: { label: string; loading: boolean; onWrite: () => void }) {
  return (
    <div className="panel-in flex items-center justify-between gap-3 lg:h-full lg:flex-col lg:justify-start lg:gap-5">
      <button
        type="button"
        onClick={onWrite}
        disabled={loading}
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
        {loading ? "Opening…" : "Click an entry to edit"}
      </p>
    </div>
  );
}

function EntryList({
  entries,
  monthName,
  calendarYear,
  veiled,
  editingDate,
  focusId,
  onEdit,
  onDeleted,
}: {
  entries: JournalEntry[];
  monthName: string;
  calendarYear: number;
  veiled: boolean;
  editingDate: string | null;
  focusId?: string;
  onEdit: (e: JournalEntry) => void;
  onDeleted: (e: JournalEntry) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Search jump: the search fades this box to oat ("pending"), the page jumps to the entry behind
  // the veil ("landed"), then the veil lifts and the entry is already in place, flashing.
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
    // Lift shortly after landing; if the jump never comes (same entry picked again), lift anyway.
    const t = setTimeout(() => setSearchVeil("none"), searchVeil === "landed" ? 350 : 2500);
    return () => clearTimeout(t);
  }, [searchVeil]);
  // Oldest is at the top, newest at the bottom: "start of month" = top, "end of month" = bottom.
  const jump = (to: "top" | "bottom") => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: to === "top" ? 0 : el.scrollHeight, behavior: "smooth" });
  };

  // Opening a month: start at the beginning of the newest entry (the last one), so you read down.
  // If it's short, that just means the bottom of the list. Done before the screen is drawn, so
  // there's no visible jump. Pictures that load late can push things down, so it re-lines up as
  // the list changes size until you scroll or click yourself. Skipped when a search picked an entry.
  const monthKey = `${calendarYear}-${monthName}`;
  const listRef = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const list = listRef.current;
    if (!scroller || !list || focusId) return;
    let touched = false;
    const anchor = () => {
      const last = list.lastElementChild as HTMLElement | null;
      if (!touched && last) scroller.scrollTop = last.offsetTop - 12; // clamps to the bottom by itself
    };
    anchor();
    const stop = () => (touched = true);
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    events.forEach((ev) => scroller.addEventListener(ev, stop, { passive: true }));
    const watch = new ResizeObserver(anchor);
    watch.observe(list);
    const done = setTimeout(() => watch.disconnect(), 4000); // pictures have loaded by then
    return () => {
      clearTimeout(done);
      watch.disconnect();
      events.forEach((ev) => scroller.removeEventListener(ev, stop));
    };
    // Only when the month changes (not after saving or deleting an entry).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  return (
    <section
      aria-labelledby="entries-heading"
      // flex-1: takes all the width the writing box isn't using (and grows as it slides closed).
      className="relative flex h-[75dvh] min-h-[24rem] min-w-0 flex-col overflow-hidden rounded-card border-[1.5px] border-ink lg:h-auto lg:min-h-0 lg:flex-1"
    >
      <div className="relative z-10 flex shrink-0 items-baseline justify-between gap-3 bg-paper px-5 pb-3 pt-4 sm:px-6">
        <h2 id="entries-heading" className="font-display text-xl font-semibold">
          {monthName} <span className="num font-normal text-muted">{calendarYear}</span>
        </h2>
        {entries.length > 0 && (
          <div className="flex items-center gap-1">
            <p className="mr-1 text-sm text-muted">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
            <JumpButton label="Jump to the start of the month (oldest)" onClick={() => jump("top")} dir="up" />
            <JumpButton label="Jump to the end of the month (newest)" onClick={() => jump("bottom")} dir="down" />
          </div>
        )}
        {/* Fade under the title once the list has scrolled. Height: h-6. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-paper to-transparent transition-opacity duration-200 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* The scroller is pinned inside this area (absolute inset-0), so a long month scrolls inside
          the box instead of making it taller. */}
      <div className="relative min-h-0 flex-1">
      <div
        ref={scrollerRef}
        data-scroller
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
        className="absolute inset-0 overflow-y-auto px-3 pb-4 sm:px-4"
      >
        {entries.length === 0 ? (
          <p className="mt-1 rounded-card border border-dashed border-line px-5 py-6 text-muted">
            No entries in {monthName} yet.
          </p>
        ) : (
          <ul ref={listRef} className="space-y-2.5">
            {entries.map((e) => (
              <Entry
                key={e.id}
                entry={e}
                editing={e.date === editingDate}
                focused={e.id === focusId}
                onEdit={() => onEdit(e)}
                onDeleted={() => onDeleted(e)}
              />
            ))}
          </ul>
        )}
      </div>
      </div>

      {/* The veil (wide screens only): covers the entries while the writing box slides. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 bg-surface ${searchVeil !== "none" ? "block" : "hidden lg:block"} ${
          veiled || searchVeil !== "none" ? "opacity-100 duration-150" : "opacity-0 duration-300"
        } transition-opacity ease-out motion-reduce:hidden`}
      />
    </section>
  );
}

function Entry({
  entry,
  editing,
  focused,
  onEdit,
  onDeleted,
}: {
  entry: JournalEntry;
  editing: boolean;
  focused: boolean;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const ref = useRef<HTMLLIElement>(null);
  const { day, weekday, long } = parts(entry.date);

  // Arrived here from a search result: jump the box (not the page) straight to this entry.
  // No sliding: it happens behind the veil, before the screen is drawn (useLayoutEffect).
  useLayoutEffect(() => {
    const el = ref.current;
    const scroller = el?.closest<HTMLElement>("[data-scroller]");
    if (!focused || !el || !scroller) return;
    scroller.scrollTo({ top: el.offsetTop - 12, behavior: "instant" });
  }, [focused]);

  async function remove() {
    const ok = await confirm({
      title: "Delete this entry?",
      body: `Your entry for ${long} will be removed for good.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    onDeleted();
    startTransition(() => deleteJournalEntry(entry.id));
  }

  return (
    <li
      ref={ref}
      className={`group relative flex gap-4 rounded-card bg-surface px-3 py-4 transition-opacity ${
        pending ? "opacity-40" : ""
      } ${focused ? "flash" : ""}`}
    >
      {/* Faded while it's open in the writing box. */}
      <div className={`flex min-w-0 flex-1 gap-4 transition-opacity duration-300 ${editing ? "opacity-20" : ""}`}>
        <div className="w-10 shrink-0 text-center">
          <div className="text-xs text-muted">{weekday}</div>
          <div className="num font-display text-2xl font-semibold leading-tight">{day}</div>
        </div>
        {/* Saved text is cleaned to paragraphs, bold/italic/underline and pictures before it gets here. */}
        <div
          className="journal-text min-w-0 flex-1 break-words pt-0.5 leading-relaxed text-ink"
          dangerouslySetInnerHTML={{ __html: entry.body }}
        />
      </div>

      {editing ? (
        <p className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-paper px-4 py-1.5 font-display text-sm font-semibold text-muted shadow-sm">
            Editing
          </span>
        </p>
      ) : (
        <div className="-mr-1 -mt-1 flex shrink-0 flex-col items-start sm:flex-row">
          <button
            type="button"
            disabled={pending}
            onClick={onEdit}
            aria-label={`Edit entry from ${long}`}
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
            aria-label={`Delete entry from ${long}`}
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
