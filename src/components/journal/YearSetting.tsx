"use client";

import { useEffect, useRef, useState } from "react";
import { MONTH_NAMES, docLabel, docRange } from "@/lib/journal-years";

const short = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}, ${y}`;
};

// The year box next to search. Click it for a short description of what this document covers.
// (A document's year type is chosen once, when its card is created, and doesn't change.)
export default function YearSetting({ year, start }: { year: number; start: number }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const { first, last } = docRange(year, start);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="About this document's year"
        className="num grid h-[46px] place-items-center whitespace-nowrap rounded-control border border-line bg-surface px-4 font-display text-lg font-semibold transition-colors hover:border-muted"
      >
        {docLabel(year, start)}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-card border border-line bg-paper p-4 text-sm text-ink shadow-xl shadow-ink/10">
          <p className="font-display font-semibold">{start === 1 ? "Calendar year" : "School year"}</p>
          <p className="mt-1 leading-snug text-muted">
            This document covers {short(first)} – {short(last)}.
          </p>
        </div>
      )}
    </div>
  );
}
