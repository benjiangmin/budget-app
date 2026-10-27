"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

// Small pieces shared by the home page and the category pages.

// Keeps a local copy of server data that we can change right away (e.g. after a drag),
// and resets it whenever fresh data arrives from the server.
export function useLocalCopy<T>(value: T) {
  const [prev, setPrev] = useState(value);
  const [local, setLocal] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setLocal(value);
  }
  return [local, setLocal] as const;
}

// The dark bar at the top of the page, with the Edit/Done button on the right.
export function PageHeader({
  title,
  back,
  editing,
  onToggle,
}: {
  title: string;
  back?: { href: string; label: string };
  editing: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {back && (
        <Link
          href={back.href}
          className="mb-4 inline-block text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← {back.label}
        </Link>
      )}
      <header className="flex items-center justify-between gap-4 rounded-card bg-accent px-5 py-4 text-accent-ink shadow-lg shadow-ink/15">
        <h1 className="min-w-0 truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <button
          type="button"
          onClick={onToggle}
          className={`shrink-0 rounded-control border px-4 py-1.5 text-sm font-semibold transition-colors ${
            editing
              ? "border-accent-ink bg-accent-ink text-accent hover:opacity-90"
              : "border-accent-ink/25 hover:bg-accent-ink/10"
          }`}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </header>
    </>
  );
}

// A text box that saves when you click away or press Enter (Escape undoes).
export function InlineInput({
  value,
  onSave,
  className,
  placeholder,
  label,
  allowEmpty,
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  placeholder?: string;
  label: string;
  allowEmpty?: boolean;
}) {
  return (
    <input
      key={value}
      defaultValue={value}
      placeholder={placeholder}
      aria-label={label}
      maxLength={120}
      onBlur={(e) => {
        const next = e.currentTarget.value.trim();
        if (next === value) return;
        if (!next && !allowEmpty) {
          e.currentTarget.value = value;
          return;
        }
        onSave(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = value;
          e.currentTarget.blur();
        }
      }}
      // No focus box: the underline darkens instead.
      style={{ outline: "none" }}
      className={`min-w-0 border-b-2 border-transparent bg-transparent py-1 transition-colors hover:border-line focus:border-ink ${className ?? ""}`}
    />
  );
}

export function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-8 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-paper hover:text-danger"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// Dashed "+ Add …" card that turns into a text box when clicked.
export function AddCard({ label, onAdd }: { label: string; onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-20 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line p-5 text-muted transition-colors hover:border-muted hover:text-ink"
      >
        <span className="text-xl leading-none">+</span> {label}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
        if (name) onAdd(name);
        setOpen(false);
      }}
      className="flex min-h-20 items-center gap-2 rounded-card border-[1.5px] border-dashed border-muted p-3 pl-5"
    >
      <input
        name="name"
        autoFocus
        maxLength={60}
        placeholder="Name"
        aria-label={label}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        style={{ outline: "none" }}
        className="min-w-0 flex-1 border-b-2 border-line bg-transparent py-1 font-display text-lg font-semibold focus:border-ink"
      />
      <button type="submit" className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90">
        Add
      </button>
    </form>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-card border border-dashed border-line px-5 py-6 text-muted">{children}</p>;
}
