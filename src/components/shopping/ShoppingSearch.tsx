"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { ShoppingItem } from "@/lib/shopping";
import { showPrice } from "./dates";

export default function ShoppingSearch() {
  return (
    <SearchBox<ShoppingItem>
      endpoint="/api/shopping/search"
      placeholder="Search the shopping list"
      label="Search the shopping list"
      hrefFor={(i) => `/shopping?focus=${i.id}`}
      renderHit={(i, q) => (
        <>
          <span className="min-w-0 flex-1 truncate font-semibold">
            <Highlight text={i.name} query={q} />
            {i.price && <span className="ml-2 font-normal text-muted">{showPrice(i.price)}</span>}
          </span>
          <span className="shrink-0 text-sm text-muted">{i.bought ? "Bought" : "To buy"}</span>
        </>
      )}
    />
  );
}
