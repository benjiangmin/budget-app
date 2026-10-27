"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { GratitudeEntry } from "@/lib/gratitude";

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Shows the item that matched (whichever of the three it was).
function matchedItem(e: GratitudeEntry, q: string) {
  const lower = q.toLowerCase();
  return [e.first, e.second, e.third].find((t) => t.toLowerCase().includes(lower)) ?? e.first;
}

export default function GratitudeSearch() {
  return (
    <SearchBox<GratitudeEntry>
      endpoint="/api/gratitude/search"
      placeholder="Search what you were grateful for"
      label="Search gratitude entries"
      hrefFor={(e) => `/gratitude?m=${e.entry_date.slice(0, 7)}&focus=${e.id}`}
      renderHit={(e, q) => (
        <>
          <span className="num w-24 shrink-0 text-sm text-muted">{shortDate(e.entry_date)}</span>
          <span className="min-w-0 flex-1 truncate">
            <Highlight text={matchedItem(e, q)} query={q} />
          </span>
        </>
      )}
    />
  );
}
