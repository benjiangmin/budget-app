"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { JournalHit } from "@/lib/journal";

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Searches every year's document. Picking a result opens that year + month and flashes the entry.
export default function JournalSearch() {
  return (
    <SearchBox<JournalHit>
      endpoint="/api/journal/search"
      placeholder="Search your journal"
      label="Search journal"
      groupOf={(h) => h.doc} // one heading per document, e.g. "Unsuspicious document #3 · 2023–24"
      hrefFor={(h) => `/journal/${h.doc_year}?m=${Number(h.entry_date.slice(5, 7))}&focus=${h.id}`}
      renderHit={(h, q) => (
        <>
          <span className="num w-28 shrink-0 text-sm text-muted">{shortDate(h.entry_date)}</span>
          <span className="min-w-0 flex-1 truncate">
            <Highlight text={h.snippet} query={q} />
          </span>
        </>
      )}
    />
  );
}
