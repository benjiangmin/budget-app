"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MONTH_NAMES, monthOrder } from "@/lib/journal-years";

// ‹ October › in the title bar. Runs through the document's 12 months in order
// (Jan → Dec, or Sep → Aug for a school year) and stops at the ends.
// base: which kind of year page it's on ("/journal" or "/bible").
export default function JournalMonthPicker({
  year,
  start,
  month,
  base = "/journal",
}: {
  year: number;
  start: number;
  month: number;
  base?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const order = monthOrder(start);
  const at = order.indexOf(month);
  const href = (m: number) => `${base}/${year}?m=${m}`;

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
    <div ref={boxRef} className="relative flex items-center gap-1.5">
      <Arrow href={at > 0 ? href(order[at - 1]) : null} dir="prev" />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="min-w-36 rounded-control px-3 py-1 text-center font-display text-xl font-semibold tracking-tight transition-colors hover:bg-accent-ink/10 sm:text-2xl"
      >
        {MONTH_NAMES[month - 1]}
      </button>
      <Arrow href={at < 11 ? href(order[at + 1]) : null} dir="next" />

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-card border border-line bg-paper p-3 text-ink shadow-xl shadow-ink/10">
          <div className="grid grid-cols-3 gap-1.5">
            {order.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(href(m));
                }}
                className={`rounded-control py-2 text-sm transition-colors ${
                  m === month ? "bg-accent text-accent-ink" : "hover:bg-surface"
                }`}
              >
                {MONTH_NAMES[m - 1].slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Arrow({ href, dir }: { href: string | null; dir: "prev" | "next" }) {
  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  const cls = "grid size-10 shrink-0 place-items-center rounded-control border border-accent-ink/20";
  if (!href) return <span className={`${cls} opacity-30`} aria-hidden="true">{icon}</span>;
  return (
    <Link href={href} aria-label={dir === "prev" ? "Previous month" : "Next month"} className={`${cls} transition-colors hover:bg-accent-ink/10`}>
      {icon}
    </Link>
  );
}
