"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { Compliment } from "@/lib/compliments";

function shortDate(c: Compliment) {
  if (!c.date_known) return "?";
  const [y, m, d] = c.said_on.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ComplimentSearch() {
  return (
    <SearchBox<Compliment>
      endpoint="/api/compliments/search"
      placeholder="Search compliments"
      label="Search compliments"
      hrefFor={(c) => `/compliments?focus=${c.id}`}
      renderHit={(c, q) => (
        <>
          <span className="w-28 shrink-0 text-sm text-muted">{shortDate(c)}</span>
          <span className="w-32 shrink-0 truncate font-semibold">
            <Highlight text={c.person} query={q} />
          </span>
          <span className="min-w-0 flex-1 truncate">
            <Highlight text={c.compliment} query={q} />
          </span>
        </>
      )}
    />
  );
}
