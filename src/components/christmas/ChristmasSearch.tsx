"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { Gift } from "@/lib/christmas";

export default function ChristmasSearch() {
  return (
    <SearchBox<Gift>
      endpoint="/api/christmas/search"
      placeholder="Search every Christmas"
      label="Search the Christmas lists"
      hrefFor={(g) => `/christmas?y=${g.year}&focus=${g.id}`}
      renderHit={(g, q) => (
        <>
          <span className="num w-12 shrink-0 text-sm text-muted">{g.year}</span>
          <span className="min-w-0 flex-1 truncate">
            <span className="font-semibold">
              <Highlight text={g.person} query={q} />
            </span>
            {g.item && (
              <span className="text-muted">
                {" · "}
                <Highlight text={g.item} query={q} />
              </span>
            )}
          </span>
        </>
      )}
    />
  );
}
