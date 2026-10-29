"use client";

import type { ReactNode } from "react";

// The inside of the "add" box on Games / Anime / Goals:
//
//   ┌──────────┬──────────────────────────────┬───┐
//   │ + Start  │ Title               [Status] │   │
//   │ + End    │ Note                         │ + │
//   └──────────┴──────────────────────────────┴───┘
//
// side = the left column (dates, or "It's a movie"), rows = the lines in the middle.
// On phones everything stacks: rows, then the side bits, then a full-width + button.
export default function AddBox({
  side,
  rows,
  label,
  pending,
  message,
  narrowSide = false,
}: {
  side: ReactNode;
  rows: ReactNode;
  label: string; // what the + button says to screen readers, e.g. "Add game"
  pending: boolean;
  message: string | null;
  narrowSide?: boolean; // the left column only as wide as what's in it (Anime's Movie toggle)
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      {/* Left: stacked, with a thin line between it and the inputs. Width: sm:w-[13rem]. */}
      <div
        className={`order-2 flex shrink-0 flex-col justify-center gap-2 sm:order-none sm:border-r sm:border-accent/20 sm:pr-3 ${
          narrowSide ? "" : "sm:w-[13rem]"
        }`}
      >
        {side}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {rows}
        {message && (
          <p role="status" className="px-1 text-sm text-danger">
            {message}
          </p>
        )}
      </div>

      {/* The + button: the full height of the box, in coffee. Width: sm:w-14. */}
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        title={label}
        className="order-3 grid h-11 shrink-0 place-items-center rounded-control bg-accent text-accent-ink shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 sm:order-none sm:h-auto sm:w-14"
      >
        {pending ? (
          <span className="size-5 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink" aria-hidden="true" />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
