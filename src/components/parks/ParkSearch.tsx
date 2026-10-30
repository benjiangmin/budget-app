"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { Park } from "@/lib/parks";

export default function ParkSearch() {
  return (
    <SearchBox<Omit<Park, "photo">>
      endpoint="/api/parks/search"
      placeholder="Search parks"
      label="Search parks"
      hrefFor={(p) => `/parks?focus=${p.id}`}
      renderHit={(p, q) => (
        <>
          <span className="min-w-0 flex-1 truncate font-semibold">
            <Highlight text={p.name} query={q} />
          </span>
          <span className="shrink-0 text-sm text-muted">{p.visited ? "Visited" : "Not yet"}</span>
        </>
      )}
    />
  );
}
