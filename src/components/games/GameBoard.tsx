"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { deleteGame, moveGame } from "@/app/games/actions";
import type { Game, GameStatus } from "@/lib/games";
import { sorterFor } from "@/lib/games-sort";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import GameForm, { STATUS_LABELS } from "./GameForm";
import { gameDates } from "./dates";

const COLUMNS: { status: GameStatus; title: string }[] = [
  { status: "playing", title: "In progress" },
  { status: "completed", title: "Completed" },
  { status: "stopped", title: "Stopped playing" },
];

// Mascots, one per outer column, pinned to the column's bottom corner (they don't scroll) and
// trimmed by the column, so they never spill outside the box or into the Backlog row.
// Tweak per image: w-.. = size, bottom/left/right = position (negative pushes it past the edge),
// opacity-.. = fade, rotate-.. = tilt.
const MASCOTS: Partial<Record<GameStatus, { src: string; className: string }>> = {
  playing: { src: "/porygon.png", className: "-bottom-4 -left-6 w-32 rotate-6 lg:w-40" },
  stopped: { src: "/rotom.png", className: "-bottom-4 -right-6 w-32 -rotate-6 lg:w-40" },
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The date shown on the left of a card: when you started (in progress), else when it ended.
function leftDate(g: Game) {
  const d = g.status === "playing" ? (g.started_on ?? g.finished_on) : (g.finished_on ?? g.started_on);
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  return { top: `${MON[m - 1]} ${day}`, year: String(y) };
}

// Keeps a local copy of the server's games so a drag shows instantly, and resets it whenever
// fresh data arrives from the server.
function useLocalCopy<T>(value: T) {
  const [prev, setPrev] = useState(value);
  const [local, setLocal] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setLocal(value);
  }
  return [local, setLocal] as const;
}

// The board: one black-bordered box with three columns side by side (each scrolls inside itself)
// and the Backlog row underneath (scrolls sideways). Drag a card to another column to change it.
export default function GameBoard({ games, focusId }: { games: Record<GameStatus, Game[]>; focusId?: string }) {
  const [board, setBoard] = useLocalCopy(games);
  const [dragging, setDragging] = useState<Game | null>(null);
  const [, startTransition] = useTransition();

  // Mouse: drag after moving 6px (so a click still opens the card). Touch: press and hold briefly
  // (so swiping still scrolls the column). Keyboard: Space to pick up, arrows, Space to drop.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );

  function onDragStart(e: DragStartEvent) {
    setDragging((e.active.data.current?.game as Game) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const game = e.active.data.current?.game as Game | undefined;
    const to = e.over?.id as GameStatus | undefined;
    if (!game || !to || to === game.status) return;
    const today = todayKey();
    // Show it in the new column right away, with the same date rule the server uses.
    const moved: Game = {
      ...game,
      status: to,
      started_on: to === "playing" && !game.started_on ? today : game.started_on,
      finished_on: to === "completed" && !game.finished_on ? today : game.finished_on,
      position: to === "backlog" ? Number.MAX_SAFE_INTEGER : game.position,
    };
    setBoard((b) => ({
      ...b,
      [game.status]: b[game.status].filter((g) => g.id !== game.id),
      [to]: [...b[to], moved].sort(sorterFor(to)),
    }));
    startTransition(() => moveGame(game.id, to, today));
  }

  return (
    <DndContext id="games-board" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      {/* The black box. On wide screens it fills the rest of the screen and never grows with the
          number of games (min-h keeps it usable on short screens; the page scrolls a little then). */}
      <section
        aria-label="Games board"
        className="mt-5 flex flex-col overflow-hidden rounded-card border-[1.5px] border-ink md:min-h-[30rem] md:flex-1 md:basis-0"
      >
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {COLUMNS.map((c) => (
            <Column key={c.status} status={c.status} title={c.title} count={board[c.status].length} mascot={MASCOTS[c.status]}>
              {board[c.status].length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted">Drag a game here</p>
              ) : (
                board[c.status].map((g) => <Card key={g.id} game={g} focused={g.id === focusId} />)
              )}
            </Column>
          ))}
        </div>
        <Backlog count={board.backlog.length}>
          {board.backlog.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted">Nothing in the backlog. Drag a game here to save it for later.</p>
          ) : (
            board.backlog.map((g) => (
              <div key={g.id} className="w-60 shrink-0">
                <Card game={g} focused={g.id === focusId} />
              </div>
            ))
          )}
        </Backlog>
      </section>

      {/* The card that follows your cursor while dragging (drawn on top of everything). */}
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {dragging ? <CardFace game={dragging} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  title,
  count,
  mascot,
  children,
}: {
  status: GameStatus;
  title: string;
  count: number;
  mascot?: { src: string; className: string };
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [scrolled, setScrolled] = useState(false); // shows the fade under the title

  return (
    // overflow-hidden: trims the mascot at the column's edges.
    <div
      ref={setNodeRef}
      className={`relative flex min-h-0 flex-col overflow-hidden transition-colors ${isOver ? "bg-surface/60" : ""}`}
    >
      {mascot && (
        // eslint-disable-next-line @next/next/no-img-element -- decorative
        <img
          src={mascot.src}
          alt=""
          aria-hidden="true"
          className={`pointer-events-none absolute z-0 select-none opacity-60 ${mascot.className}`}
        />
      )}
      <div className="relative z-10 flex shrink-0 items-baseline justify-between gap-3 px-4 pb-2 pt-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted">{count}</p>
        {/* Fade under the title once the column has scrolled. Height: h-5. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-full h-5 bg-gradient-to-b from-paper to-transparent transition-opacity duration-200 ${
            scrolled ? "opacity-100" : "opacity-0"
          } ${isOver ? "hidden" : ""}`}
        />
      </div>
      {/* Phones: each column is capped and scrolls. Wider screens: fills the box's height. */}
      <div
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
        className="relative z-[1] max-h-[55dvh] min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3 md:max-h-none"
      >
        {children}
      </div>
    </div>
  );
}

function Backlog({ count, children }: { count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "backlog" });
  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 border-t-[1.5px] border-ink transition-colors ${isOver ? "bg-surface/60" : ""}`}
    >
      <div className="flex items-baseline gap-3 px-4 pb-1 pt-3">
        <h2 className="font-display text-lg font-semibold">Backlog</h2>
        <p className="text-sm text-muted">{count}</p>
      </div>
      {/* One row that scrolls sideways. items-start: an opened card doesn't stretch the others. */}
      <div className="flex items-start gap-2 overflow-x-auto px-3 pb-3 pt-1">{children}</div>
    </div>
  );
}

// One game. Collapsed: date on the left + title (+ a note icon if it has a note).
// Click to open: full dates, the note, and edit/delete. Drag it to another column to move it.
function Card({ game, focused }: { game: Game; focused: boolean }) {
  const [open, setOpen] = useState(focused);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const ref = useRef<HTMLDivElement | null>(null);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: game.id, data: { game }, disabled: editing });

  // Picked from search while already on this page: open it.
  const [openedFor, setOpenedFor] = useState(focused);
  if (focused && !openedFor) {
    setOpenedFor(true);
    setOpen(true);
  }
  if (!focused && openedFor) setOpenedFor(false);

  // Arrived from a search result: scroll its column (and the page, if needed) to it while it flashes.
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }, [focused]);

  async function remove() {
    const ok = await confirm({ title: `Delete "${game.title}"?`, body: "It'll be removed for good.", confirmLabel: "Delete" });
    if (ok) startTransition(() => deleteGame(game.id));
  }

  if (editing) {
    return (
      <div className="rounded-card bg-surface p-3 ring-1 ring-line">
        <GameForm game={game} compact onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div
      ref={(el) => {
        ref.current = el;
        setNodeRef(el);
      }}
      {...attributes}
      {...listeners}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => {
        if (e.key === "Enter") setOpen((o) => !o);
        else listeners?.onKeyDown?.(e);
      }}
      aria-expanded={open}
      aria-label={`${game.title}, ${STATUS_LABELS[game.status]}. Press Enter to open, Space to drag.`}
      // While dragging, the floating copy (DragOverlay) moves; this one stays as a faint placeholder.
      className={`cursor-grab touch-manipulation select-none rounded-card outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      } ${pending ? "opacity-40" : ""}`}
      style={{ outline: "none" }}
    >
      <CardFace game={game} open={open} focused={focused} onEdit={() => setEditing(true)} onDelete={remove} />
    </div>
  );
}

function CardFace({
  game,
  open = false,
  focused = false,
  lifted = false,
  onEdit,
  onDelete,
}: {
  game: Game;
  open?: boolean;
  focused?: boolean;
  lifted?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const date = leftDate(game);
  const stopped = game.status === "stopped";
  const full = gameDates(game.status, game.started_on, game.finished_on);

  return (
    // bg-surface/80 = slightly see-through, so the mascots show faintly behind. Use bg-surface for solid.
    <div
      className={`rounded-card bg-surface/80 px-3 py-2.5 ${focused ? "flash" : ""} ${
        lifted ? "rotate-2 cursor-grabbing bg-surface shadow-xl shadow-ink/25 ring-1 ring-line" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Left: the date; when open, edit/delete sit under it, and a thin line separates this
            column from the title and notes. */}
          <div className={`shrink-0 self-stretch whitespace-nowrap text-center leading-tight ${open ? "-mr-0.5 w-14 border-r border-line pr-2.5" : "w-11"}`}>          <div className="flex min-h-9 flex-col justify-center">
            {date ? (
              <>
                <div className="num text-xs font-semibold text-ink/80">{date.top}</div>
                <div className="num text-[11px] text-muted">{date.year}</div>
              </>
            ) : (
              <div className="text-xs text-muted/60">—</div>
            )}
          </div>
          {open && (
            <div className="mt-1.5 flex justify-center gap-0.5">
              <IconButton label={`Edit ${game.title}`} onClick={onEdit}>
                <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </IconButton>
              <IconButton label={`Delete ${game.title}`} onClick={onDelete} danger>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </IconButton>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-h-9 items-center gap-3">
            <p
              className={`min-w-0 flex-1 font-display font-semibold ${
                stopped ? "text-muted line-through decoration-muted/60" : "text-ink"
              } ${open ? "break-words" : "truncate"}`}
            >
              {game.title}
            </p>
            {/* Has a note: a small speech bubble (only while closed). */}
            {game.note && !open && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-label="Has a note" className="shrink-0 text-muted">
                <title>Has a note</title>
                <path d="M5 5h14v10H9l-4 4V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          {open && (
            <div className="pb-0.5">
              {full && <p className="num text-xs text-muted">{full}</p>}
              {game.note && <p className="mt-1 break-words text-sm leading-relaxed text-ink/80">{game.note}</p>}
              {!full && !game.note && <p className="text-xs text-muted">No dates or notes yet.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick?: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Don't let a click here also open/close the card or start a drag.
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`grid size-6 place-items-center rounded-md text-muted transition-colors hover:bg-paper ${
        danger ? "hover:text-danger" : "hover:text-ink"
      }`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
