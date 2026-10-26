"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MonthPicker({ monthKey, label }: { monthKey: string; label: string }) {
  const router = useRouter();
  const [selYear, selMonth] = monthKey.split("-").map(Number);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(selYear);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape.
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

  function go(month: number) {
    setOpen(false);
    router.push(`/?m=${year}-${String(month).padStart(2, "0")}`);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setYear(selYear);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="rounded-xl px-3 py-1 font-display text-3xl font-semibold tracking-tight transition-colors hover:bg-surface sm:text-4xl"
      >
        {label} <span className="text-muted">{selYear}</span>
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-line bg-paper p-4 shadow-xl shadow-ink/10">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Previous year"
              className="grid size-9 place-items-center rounded-full hover:bg-surface"
            >
              ‹
            </button>
            <span className="num font-display text-lg font-semibold">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Next year"
              className="grid size-9 place-items-center rounded-full hover:bg-surface"
            >
              ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const selected = year === selYear && i + 1 === selMonth;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => go(i + 1)}
                  className={`rounded-lg py-2 text-sm transition-colors ${
                    selected ? "bg-accent text-accent-ink" : "hover:bg-surface"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
