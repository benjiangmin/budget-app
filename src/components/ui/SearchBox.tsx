"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MIN_SEARCH_LENGTH } from "@/lib/search-config";

// Reusable search-as-you-type box. Each document passes in:
//  - endpoint:   its search API, e.g. "/api/gratitude/search" (called with ?q=...)
//  - hrefFor:    where picking a result should go
//  - renderHit:  how one result row looks
// Same look and keyboard behavior as the budget search bar.
export default function SearchBox<T extends { id: string }>({
  endpoint,
  hrefFor,
  renderHit,
  placeholder = "Search entries",
  label = "Search entries",
}: {
  endpoint: string;
  hrefFor: (hit: T) => string;
  renderHit: (hit: T, query: string) => ReactNode;
  placeholder?: string;
  label?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0); // which result the arrow keys are on
  const boxRef = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const tooShort = q.length < MIN_SEARCH_LENGTH;

  // Fetch results a moment after you stop typing. Older requests are cancelled.
  useEffect(() => {
    if (tooShort) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const json = await res.json();
        setResults(json.results ?? []);
        setCursor(0);
        setStatus(res.ok ? "done" : "error");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, tooShort, endpoint]);

  // Close the results when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function go(hit: T) {
    setOpen(false);
    setQuery("");
    router.push(hrefFor(hit));
  }

  const showPanel = open && !tooShort;

  return (
    <div ref={boxRef} className="relative mt-2">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter" && results[cursor]) {
            go(results[cursor]);
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-control border border-line bg-surface py-2.5 pl-10 pr-10 text-ink placeholder:text-muted focus:border-ink focus:bg-paper focus:outline-none"
      />

      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setResults([]);
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-control text-muted hover:bg-line/60 hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-card border border-line bg-paper shadow-xl shadow-ink/10">
          {status === "loading" && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Searching…</p>
          ) : status === "error" ? (
            <p className="px-4 py-3 text-sm text-danger">Search isn&apos;t working right now. Try again.</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Nothing matches &ldquo;{q}&rdquo;.</p>
          ) : (
            <ul role="listbox" aria-label="Search results" className="max-h-80 overflow-y-auto p-1.5">
              {results.map((hit, i) => (
                <li key={hit.id} role="option" aria-selected={i === cursor}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(hit)}
                    className={`flex w-full items-center gap-3 rounded-control px-3 py-2 text-left ${
                      i === cursor ? "bg-surface" : ""
                    }`}
                  >
                    {renderHit(hit, q)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Bold the part of some text that matches the search.
export function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-accent/12 font-semibold text-ink">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}
