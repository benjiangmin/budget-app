"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { BucketItem } from "@/lib/bucket";

export default function BucketSearch() {
  return (
    <SearchBox<Omit<BucketItem, "photo">>
      endpoint="/api/bucket/search"
      placeholder="Search the bucket list"
      label="Search the bucket list"
      hrefFor={(i) => `/bucket?focus=${i.id}`}
      renderHit={(i, q) => (
        <>
          <span className="min-w-0 flex-1 truncate font-semibold">
            <Highlight text={i.name} query={q} />
          </span>
          <span className="shrink-0 text-sm text-muted">{i.done ? "Done" : "Not yet"}</span>
        </>
      )}
    />
  );
}
