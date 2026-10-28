"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { Game } from "@/lib/games";
import { STATUS_LABELS } from "./GameForm";

export default function GameSearch() {
  return (
    <SearchBox<Game>
      endpoint="/api/games/search"
      placeholder="Search games"
      label="Search games"
      hrefFor={(g) => `/games?focus=${g.id}`}
      renderHit={(g, q) => (
        <>
          <span className="min-w-0 flex-1 truncate font-semibold">
            <Highlight text={g.title} query={q} />
          </span>
          <span className="shrink-0 text-sm text-muted">{STATUS_LABELS[g.status]}</span>
        </>
      )}
    />
  );
}
