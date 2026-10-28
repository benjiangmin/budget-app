"use client";

import { useEffect, useRef } from "react";
import { PickerButton, PopoverPanel, usePopover } from "./Wheel";

const ROW_H = 36; // px; shows up to 6 rows, then scrolls

export type PickerOption<T extends string | number> = { value: T; label: string; hint?: string };

// A dropdown that looks like the budget's category picker, instead of the browser's plain one.
export default function SelectPicker<T extends string | number>({
  value,
  options,
  onChange,
  label,
  placeholder = "Choose…",
}: {
  value: T | null;
  options: PickerOption<T>[];
  onChange: (value: T) => void;
  label: string; // read out by screen readers
  placeholder?: string;
}) {
  const { open, setOpen, ref } = usePopover();
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  // When the list opens, scroll the chosen option into view.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open]);

  return (
    <div ref={ref} className="relative text-sm">
      <PickerButton open={open} onClick={() => setOpen((o) => !o)}>
        {selected ? <span className="truncate">{selected.label}</span> : <span className="text-muted">{placeholder}</span>}
      </PickerButton>

      {open && (
        <PopoverPanel>
          <div ref={listRef} role="listbox" aria-label={label} className="overflow-y-auto" style={{ maxHeight: ROW_H * 6 }}>
            {options.map((o) => {
              const isSel = o.value === value;
              return (
                <button
                  key={String(o.value)}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onClick={() => {
                    setOpen(false);
                    if (!isSel) onChange(o.value);
                  }}
                  style={{ height: ROW_H }}
                  className={`flex w-full items-center justify-between gap-3 rounded-control px-3 text-left transition-colors ${
                    isSel ? "bg-surface font-semibold text-ink" : "text-ink/80 hover:bg-surface/60"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-xs font-normal text-muted">{o.hint}</span>}
                </button>
              );
            })}
          </div>
        </PopoverPanel>
      )}
    </div>
  );
}
