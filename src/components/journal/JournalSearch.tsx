"use client";

import { useState } from "react";
import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { JournalHit } from "@/lib/journal";
import { VEIL_EVENT, VEIL_FADE_MS } from "./veil";

function shortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Scope = "doc" | "all";

// Search this document, or every document (toggle on the right of the bar).
// Picking a result fades the entries box, jumps to the entry, then fades back in with it flashing.
export default function JournalSearch({ year }: { year: number }) {
  const [scope, setScope] = useState<Scope>("doc");

  return (
    <SearchBox<JournalHit>
      endpoint={`/api/journal/search?scope=${scope}&year=${year}`}
      placeholder={scope === "doc" ? "Search this document" : "Search all documents"}
      label={scope === "doc" ? "Search this document" : "Search all documents"}
      // One heading per document when searching all of them, e.g. "Unsuspicious document #3 · 2023–24".
      groupOf={scope === "all" ? (h) => h.doc : undefined}
      beforeGo={async () => {
        window.dispatchEvent(new Event(VEIL_EVENT));
        await new Promise((r) => setTimeout(r, VEIL_FADE_MS));
      }}
      hrefFor={(h) => `/journal/${h.doc_year}?m=${Number(h.entry_date.slice(5, 7))}&focus=${h.id}`}
      accessory={<ScopeToggle scope={scope} onChange={setScope} />}
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

function ScopeToggle({ scope, onChange }: { scope: Scope; onChange: (s: Scope) => void }) {
  return (
    <div role="radiogroup" aria-label="What to search" className="flex rounded-control bg-line/60 p-0.5 text-xs font-semibold">
      {(
        [
          ["doc", "This doc"],
          ["all", "All docs"],
        ] as const
      ).map(([value, text]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={scope === value}
          onMouseDown={(e) => e.preventDefault()} // keep typing focus in the search box
          onClick={() => onChange(value)}
          className={`rounded-[9px] px-2.5 py-1.5 transition-colors ${
            scope === value ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
