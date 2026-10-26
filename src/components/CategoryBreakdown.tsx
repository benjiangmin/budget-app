"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/month";

type Row = { id: number; name: string; color: string; spent: number };

// The color strip plus the per-category list under it.
// Hovering a strip segment (or a row) lights up the matching row and segment.
export default function CategoryBreakdown({
  rows,
  total,
  monthKey,
}: {
  rows: Row[];
  total: number;
  monthKey: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const someActive = active !== null;

  return (
    <div onMouseLeave={() => setActive(null)}>
      {/* fixed-height wrapper so the hovered segment can grow without shifting the page */}
      <div className="mt-6 flex h-7 items-center">
        {/* Every segment is its own pill with the same rounding, so hovering never reshapes the ends. */}
        <div key={monthKey} className="strip-grow flex h-5 w-full items-center gap-1">
          {rows.map((r) => {
            const on = active === r.id;
            return (
              <div
                key={r.id}
                onMouseEnter={() => setActive(r.id)}
                title={`${r.name}: ${formatMoney(r.spent)}`}
                style={{ flexGrow: r.spent, backgroundColor: r.color }}
                className={`min-w-2 cursor-default rounded-full transition-all duration-200
                  ${on ? "h-7 shadow-md" : "h-full"}
                  ${someActive && !on ? "opacity-20" : ""}`}
              />
            );
          })}
        </div>
      </div>

      <ul className="mt-5 space-y-0.5">
        {rows.map((r) => {
          const pct = Math.round((r.spent / total) * 100);
          const on = active === r.id;
          return (
            <li
              key={r.id}
              onMouseEnter={() => setActive(r.id)}
              className={`-mx-3 flex items-center gap-3 rounded-control px-3 py-2.5 transition-all duration-200 ${
                on
                  ? "bg-surface font-semibold text-ink"
                  : someActive
                    ? "text-muted/50"
                    : "text-muted"
              }`}
              style={on ? { boxShadow: `inset 3px 0 0 ${r.color}` } : undefined}
            >
              <span
                className={`size-3 shrink-0 rounded-full transition-transform duration-200 ${on ? "scale-150" : ""}`}
                style={{ backgroundColor: r.color }}
                aria-hidden="true"
              />
              <span className="flex-1">{r.name}</span>
              <span className="num w-10 text-right text-sm">{pct}%</span>
              <span className="num w-24 text-right font-medium">{formatMoney(r.spent)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
