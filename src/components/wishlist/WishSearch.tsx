"use client";

import SearchBox, { Highlight } from "@/components/ui/SearchBox";
import type { Wish } from "@/lib/wishlist";
import { showPrice } from "./dates";

export default function WishSearch() {
  return (
    <SearchBox<Wish>
      endpoint="/api/wishlist/search"
      placeholder="Search the wishlist"
      label="Search the wishlist"
      hrefFor={(i) => `/wishlist?focus=${i.id}`}
      renderHit={(i, q) => (
        <>
          <span className="min-w-0 flex-1 truncate font-semibold">
            <Highlight text={i.name} query={q} />
            {i.price && <span className="ml-2 font-normal text-muted">{showPrice(i.price)}</span>}
          </span>
          <span className="shrink-0 text-sm text-muted">{i.status === "got" ? "Got it" : i.status === "dropped" ? "Changed my mind" : "Want"}</span>
        </>
      )}
    />
  );
}
