"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Shared pieces for the phone-style pickers (date + category).

export const ITEM_H = 36; // px height of one row in a wheel
export const VISIBLE = 5; // rows shown at once (odd, so one sits in the middle)

// Open/close state for a dropdown that closes on outside click or Escape.
export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest?.("dialog")) return; // clicks in a confirm dialog shouldn't close the dropdown
      if (!ref.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}

// The field you click to open a picker.
export function PickerButton({
  open,
  onClick,
  children,
}: {
  open: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-2 rounded-control border border-line bg-paper px-3 py-2.5 text-left text-ink focus:border-ink focus:outline-none"
    >
      <span className="flex min-w-0 items-center gap-2 truncate">{children}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-muted">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// The floating dropdown box under a picker button.
export function PopoverPanel({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-0 right-0 top-full z-20 mt-2 min-w-60 rounded-card border border-line bg-paper p-2 shadow-xl shadow-ink/10">
      {children}
    </div>
  );
}

// Dropdown for scroll wheels, with the highlight band behind the middle row.
export function WheelPanel({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <PopoverPanel>
      <div className="relative flex">
        <div
          className="pointer-events-none absolute inset-x-0 rounded-control bg-surface"
          style={{ top: ITEM_H * Math.floor(VISIBLE / 2), height: ITEM_H }}
        />
        {children}
      </div>
      {footer}
    </PopoverPanel>
  );
}

// One scrollable column. Scroll or tap; the middle row is the value.
export function Wheel({
  items,
  index,
  onChange,
  label,
}: {
  items: ReactNode[];
  index: number;
  onChange: (i: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mounted = useRef(false);

  // Keep the scroll position in sync with the value: jump on open, glide after a tap.
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ITEM_H) !== index) {
      el.scrollTo({ top: index * ITEM_H, behavior: mounted.current ? "smooth" : "instant" });
    }
    mounted.current = true;
  }, [index]);

  // When scrolling settles, whichever row is in the middle becomes the value.
  function onScroll() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
      if (i !== index) onChange(i);
    }, 90);
  }

  const padding = ITEM_H * Math.floor(VISIBLE / 2);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role="listbox"
      aria-label={label}
      className="relative flex-1 snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        height: ITEM_H * VISIBLE,
        paddingTop: padding,
        paddingBottom: padding,
        maskImage: "linear-gradient(transparent, black 30%, black 70%, transparent)",
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          role="option"
          aria-selected={i === index}
          onClick={() => onChange(i)}
          className={`num flex w-full snap-center items-center justify-center gap-2 transition-colors ${
            i === index ? "font-semibold text-ink" : "text-muted"
          }`}
          style={{ height: ITEM_H }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
