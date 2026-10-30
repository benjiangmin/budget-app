"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { Tear } from "@/lib/tears";
import { shortDate } from "./dates";

export default function TearSearch() {
  return (
    <SearchBox<Tear>
      endpoint="/api/tears/search"
      placeholder="Search tears"
      label="Search tears"
      hrefFor={(t) => `/tears?focus=${t.id}`}
      renderHit={(t, q) => (
        <>
          <span className="num w-16 shrink-0 text-sm text-muted">{t.cried_on ? shortDate(t.cried_on) : "?"}</span>
          <span className="min-w-0 flex-1 truncate">
            <Highlight text={t.body} query={q} />
          </span>
        </>
      )}
    />
  );
}
