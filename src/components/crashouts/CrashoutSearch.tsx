"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { CrashoutHit } from "@/lib/crashouts";

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Search every crashout, any year. Picking one jumps to its year, opens its night and flashes it.
export default function CrashoutSearch() {
  return (
    <SearchBox<CrashoutHit>
      endpoint="/api/crashouts/search"
      placeholder="Search your crash outs"
      label="Search crash outs"
      hrefFor={(d) => `/crashouts?y=${d.crashout_date.slice(0, 4)}&focus=${d.id}`}
      renderHit={(d, q) => (
        <>
          <span className="num w-28 shrink-0 text-sm text-muted">{shortDate(d.crashout_date)}</span>
          <span className="min-w-0 flex-1 truncate">
            <Highlight text={d.snippet} query={q} />
          </span>
        </>
      )}
    />
  );
}
