"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { Goal } from "@/lib/goals";
import { GOAL_LABELS } from "./labels";

export default function GoalSearch() {
  return (
    <SearchBox<Goal>
      endpoint="/api/goals/search"
      placeholder="Search goals"
      label="Search goals"
      hrefFor={(g) => `/goals?focus=${g.id}`}
      renderHit={(g, q) => (
        <>
          <span className="min-w-0 flex-1 truncate font-semibold">
            <Highlight text={g.title} query={q} />
          </span>
          <span className="shrink-0 text-sm text-muted">{GOAL_LABELS[g.status]}</span>
        </>
      )}
    />
  );
}
