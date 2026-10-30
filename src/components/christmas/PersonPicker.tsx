"use client";

import { useEffect, useId, useRef, useState } from "react";

// "Who's it for?" — type a name; names you already have this year show in a dropdown underneath
// (matching what you've typed). Pick one (click, or ↑ ↓ + Enter) and the gift goes under that person.
export default function PersonPicker({
  names,
  defaultValue,
  className,
  inputRef,
  autoFocus,
}: {
  names: string[];
  defaultValue?: string;
  className: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const q = value.trim().toLowerCase();
  const matches = names.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 8);
  const show = open && matches.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // The form clears inputs by itself after adding; keep this in step.
  useEffect(() => {
    const input = inputRef?.current;
    const form = input?.form;
    if (!form) return;
    const onReset = () => setValue("");
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [inputRef]);

  function pick(name: string) {
    setValue(name);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative min-w-0">
      <input
        ref={inputRef}
        name="person"
        required
        maxLength={80}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Who's it for?"
        aria-label="Who's it for"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => (c + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => (c - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[cursor]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        style={{ outline: "none" }}
        className={className}
      />
      {show && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-control border border-line bg-paper py-1 shadow-xl shadow-ink/10">
          {matches.map((n, i) => (
            <li key={n}>
              <button
                type="button"
                role="option"
                aria-selected={i === cursor}
                onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                onClick={() => pick(n)}
                className={`block w-full px-3 py-2 text-left text-ink ${i === cursor ? "bg-surface" : "hover:bg-surface"}`}
              >
                {n}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
