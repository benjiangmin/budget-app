"use client";

import { useState } from "react";
import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { TripHit } from "@/lib/trips";
import { VEIL_EVENT, VEIL_FADE_MS } from "@/components/journal/veil";

type Scope = "trip" | "all";

// Search this trip, or every trip (toggle on the right of the bar).
// Picking a result fades the days box, jumps to the day, then fades back in with it flashing.
export default function TripSearch({ tripId }: { tripId: string }) {
  const [scope, setScope] = useState<Scope>("trip");

  return (
    <SearchBox<TripHit>
      endpoint={`/api/trips/search?scope=${scope}&trip=${tripId}`}
      placeholder={scope === "trip" ? "Search this trip" : "Search all trips"}
      label={scope === "trip" ? "Search this trip" : "Search all trips"}
      groupOf={scope === "all" ? (h) => h.tripName : undefined}
      beforeGo={async () => {
        window.dispatchEvent(new Event(VEIL_EVENT));
        await new Promise((r) => setTimeout(r, VEIL_FADE_MS));
      }}
      hrefFor={(h) => `/trips/${h.trip_id}?focus=${h.id}`}
      accessory={<ScopeToggle scope={scope} onChange={setScope} />}
      renderHit={(h, q) => (
        <>
          <span className="num w-14 shrink-0 text-sm text-muted">Day {h.day}</span>
          <span className="min-w-0 flex-1 truncate">
            {h.title && (
              <span className="mr-2 font-semibold">
                <Highlight text={h.title} query={q} />
              </span>
            )}
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
          ["trip", "This trip"],
          ["all", "All trips"],
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
