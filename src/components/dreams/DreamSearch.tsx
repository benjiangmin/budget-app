"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { DreamHit } from "@/lib/dreams";

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Search every dream, any year. Picking one jumps to its year, opens its night and flashes it.
export default function DreamSearch() {
  return (
    <SearchBox<DreamHit>
      endpoint="/api/dreams/search"
      placeholder="Search your dreams"
      label="Search dreams"
      hrefFor={(d) => `/dreams?y=${d.dream_date.slice(0, 4)}&focus=${d.id}`}
      renderHit={(d, q) => (
        <>
          <span className="num w-28 shrink-0 text-sm text-muted">{shortDate(d.dream_date)}</span>
          <span className="min-w-0 flex-1 truncate">
            <Highlight text={d.snippet} query={q} />
          </span>
        </>
      )}
    />
  );
}
