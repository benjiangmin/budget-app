"use client";

import { useEffect, useRef, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ITEM_H = 36; // px height of one row in a wheel
const VISIBLE = 5; // rows shown at once (odd, so one sits in the middle)

const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate(); // m is 1–12

// Phone-style date picker: click the field to open it, then scroll or tap each wheel.
// Submits as a hidden "YYYY-MM-DD" input so the form/server action don't change.
export default function DateWheel({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [y0, m0, d0] = defaultValue.split("-").map(Number);
  const [year, setYear] = useState(y0);
  const [month, setMonth] = useState(m0);
  const [day, setDay] = useState(d0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => thisYear - 5 + i);
  const maxDay = daysIn(year, month);
  const safeDay = Math.min(day, maxDay);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const value = `${year}-${pad(month)}-${pad(safeDay)}`;
  const label = new Date(year, month - 1, safeDay).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-paper px-3 py-2.5 text-left text-ink focus:border-ink focus:outline-none"
      >
        {label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-muted">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-line bg-paper p-2 shadow-xl shadow-ink/10">
          <div className="relative flex">
            {/* highlight band behind the middle row */}
            <div
              className="pointer-events-none absolute inset-x-0 rounded-lg bg-surface"
              style={{ top: ITEM_H * Math.floor(VISIBLE / 2), height: ITEM_H }}
            />
            <Wheel items={MONTHS} index={month - 1} onChange={(i) => setMonth(i + 1)} label="Month" />
            <Wheel items={days.map(String)} index={safeDay - 1} onChange={(i) => setDay(i + 1)} label="Day" />
            <Wheel items={years.map(String)} index={years.indexOf(year)} onChange={(i) => setYear(years[i])} label="Year" />
          </div>
        </div>
      )}
    </div>
  );
}

function Wheel({
  items,
  index,
  onChange,
  label,
}: {
  items: string[];
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
          key={item}
          type="button"
          role="option"
          aria-selected={i === index}
          onClick={() => onChange(i)}
          className={`num block w-full snap-center text-center transition-colors ${
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
