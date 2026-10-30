"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteTear } from "@/app/tears/actions";
import type { Tear } from "@/lib/tears";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TearForm from "./TearForm";
import { shortDate } from "./dates";

// The black-bordered box with every entry. It fills the rest of the screen and scrolls inside
// itself (border on all four sides). Phones: a fixed share of the screen instead.
export default function TearList({ items, focusId }: { items: Tear[]; focusId?: string }) {
  const [scrolled, setScrolled] = useState(false); // shows the fade at the top once scrolled

  return (
    <section
      aria-label="Tears"
      className="relative mb-6 mt-5 flex h-[70dvh] min-h-[20rem] flex-col overflow-hidden rounded-card border-[1.5px] border-ink md:h-auto md:flex-1 md:basis-0"
    >
      {/* Mascots: pinned to the box's bottom corners (they don't move when the list scrolls), behind
          the cards, and trimmed by the border. Cubone bottom-left, Sobble bottom-right.
          Tweak per image: w-.. = size, bottom/left/right = position (negative pushes it past the
          edge), opacity-.. = fade, rotate-.. = tilt. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img
        src="/cubone.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -left-6 z-0 w-32 select-none opacity-60 -rotate-6 sm:w-40"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img
        src="/sobble.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -right-6 z-0 w-32 select-none opacity-60 rotate-6 sm:w-40"
      />

      {/* Fade at the top once the list has scrolled. Height: h-5. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b from-paper to-transparent transition-opacity duration-200 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />
      <div onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)} className="relative z-[1] min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {items.length === 0 ? (
          <p className="py-10 text-center text-muted">No tears logged. Yet.</p>
        ) : (
          // Gap between entries: space-y-2.
          <ul className="space-y-2">
            {items.map((t) => (
              <Item key={t.id} item={t} focused={t.id === focusId} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Item({ item, focused }: { item: Tear; focused: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const ref = useRef<HTMLLIElement>(null);

  // Arrived from a search result: scroll the box to it (centered) while it flashes.
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focused]);

  async function remove() {
    const ok = await confirm({
      title: "Delete this one?",
      body: `"${item.body.slice(0, 80)}" will be removed for good.`,
      confirmLabel: "Delete",
    });
    if (ok) startTransition(() => deleteTear(item.id));
  }

  if (editing) {
    return (
      <li className="rounded-card bg-surface p-3 ring-1 ring-line">
        <TearForm tear={item} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    // date | what happened | edit/delete (show on hover). bg-surface/80 lets a mascot show faintly behind.
    <li
      ref={ref}
      className={`group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-x-4 rounded-card bg-surface/80 px-3 py-2.5 transition-opacity sm:px-4 ${
        pending ? "opacity-40" : ""
      } ${focused ? "flash" : ""}`}
    >
      {/* The date column (w 4.5rem): centered in its column and on the first line of text
          (h-[1.625rem] = one line of the entry). Room before the text: gap-x-4. */}
      <div className="flex h-[1.625rem] items-center justify-center text-sm">
        {item.cried_on ? (
          <span className="num text-muted">{shortDate(item.cried_on)}</span>
        ) : (
          <span className="font-semibold text-muted/70" title="No date">
            ?
          </span>
        )}
      </div>
      <p className="break-words leading-relaxed text-ink">{item.body}</p>
      <div className="-my-1 -mr-1 flex">
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(true)}
          aria-label="Edit"
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
          aria-label="Delete"
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
