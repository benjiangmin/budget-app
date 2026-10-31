"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { LearnedEntry } from "@/lib/learned";

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LearnedSearch() {
  return (
    <SearchBox<LearnedEntry>
      endpoint="/api/learned/search"
      placeholder="Search what you've learned"
      label="Search what you've learned"
      hrefFor={(e) => `/learned?m=${e.entry_date.slice(0, 7)}&focus=${e.id}`}
      renderHit={(e, q) => (
        <>
          <span className="num w-24 shrink-0 text-sm text-muted">{shortDate(e.entry_date)}</span>
          <span className="min-w-0 flex-1 truncate">
            <Highlight text={e.fact} query={q} />
          </span>
          {e.source && (
            <span className="hidden max-w-40 shrink-0 truncate text-sm text-muted sm:block">
              <Highlight text={e.source} query={q} />
            </span>
          )}
        </>
      )}
    />
  );
}
