"use client";

import { useState } from "react";
import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { BibleHit } from "@/lib/bible";
import { VEIL_EVENT, VEIL_FADE_MS } from "@/components/journal/veil";

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Scope = "year" | "all";

// Search passages and notes in this year, or every year (toggle on the right of the bar).
export default function BibleSearch({ year }: { year: number }) {
  const [scope, setScope] = useState<Scope>("year");
  return (
    <SearchBox<BibleHit>
      endpoint={`/api/bible/search?scope=${scope}&year=${year}`}
      placeholder={scope === "year" ? "Search this year" : "Search all years"}
      label={scope === "year" ? "Search this year" : "Search all years"}
      groupOf={scope === "all" ? (h) => String(h.year) : undefined}
      beforeGo={async () => {
        window.dispatchEvent(new Event(VEIL_EVENT));
        await new Promise((r) => setTimeout(r, VEIL_FADE_MS));
      }}
      hrefFor={(h) => `/bible/${h.year}?m=${Number(h.entry_date.slice(5, 7))}&focus=${h.id}`}
      accessory={<ScopeToggle scope={scope} onChange={setScope} />}
      renderHit={(h, q) => (
        <>
          <span className="num w-28 shrink-0 text-sm text-muted">{shortDate(h.entry_date)}</span>
          <span className="min-w-0 flex-1 truncate">
            <span className="font-semibold">
              <Highlight text={h.passages} query={q} />
            </span>
            {h.snippet && (
              <span className="ml-2 text-muted">
                <Highlight text={h.snippet} query={q} />
              </span>
            )}
          </span>
        </>
      )}
    />
  );
}

function ScopeToggle({ scope, onChange }: { scope: Scope; onChange: (s: Scope) => void }) {
  return (
    <div role="radiogroup" aria-label="What to search" className="flex rounded-control bg-line/60 p-0.5 text-xs font-semibold">
      {(
        [
          ["year", "This year"],
          ["all", "All years"],
        ] as const
      ).map(([value, text]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={scope === value}
          onMouseDown={(e) => e.preventDefault()} // keep typing focus in the search box
          onClick={() => onChange(value)}
          className={`rounded-[9px] px-2.5 py-1.5 transition-colors ${
            scope === value ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
