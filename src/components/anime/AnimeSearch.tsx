"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { Anime } from "@/lib/anime";
import { ANIME_LABELS } from "./labels";

export default function AnimeSearch() {
  return (
    <SearchBox<Anime>
      endpoint="/api/anime/search"
      placeholder="Search anime"
      label="Search anime"
      hrefFor={(a) => `/anime?focus=${a.id}`}
      renderHit={(a, q) => (
        <>
          <span className="min-w-0 flex-1 truncate font-semibold">
            <Highlight text={a.title} query={q} />
            {a.is_movie && <span className="ml-2 text-xs font-normal uppercase tracking-wide text-muted">Movie</span>}
          </span>
          <span className="shrink-0 text-sm text-muted">{ANIME_LABELS[a.status]}</span>
        </>
      )}
    />
  );
}
