"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { Regret } from "@/lib/regrets";

export default function RegretSearch() {
  return (
    <SearchBox<Regret>
      endpoint="/api/regrets/search"
      placeholder="Search regrets"
      label="Search regrets"
      hrefFor={(t) => `/regrets?focus=${t.id}`}
      renderHit={(t, q) => (
        <>
          <span className="min-w-0 flex-1 truncate">
            <Highlight text={t.body} query={q} />
          </span>
        </>
      )}
    />
  );
}
