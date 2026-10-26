"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createCategory, deleteCategory, updateCategory } from "@/app/actions";
import type { Category } from "@/lib/data";
import { useConfirm } from "./ConfirmDialog";
import { PickerButton, PopoverPanel, usePopover } from "./Wheel";

// Colors offered for categories.
const SWATCHES = ["#6F8F5E", "#C48A4A", "#5E7C8C", "#7A4E36", "#B5655A", "#D9B26C", "#8A6F9E", "#A39282"];
const ROW_H = 36; // px; the list shows up to 5 rows, then scrolls

// Scrollable category list. Tap to pick, pencil to edit, "+ Add category" at the bottom.
// Submits the chosen id as a hidden input, just like a <select> would.
export default function CategoryPicker({
  name,
  categories,
  defaultValue,
}: {
  name: string;
  categories: Category[];
  defaultValue?: number;
}) {
  const { open, setOpen, ref } = usePopover();
  const [selectedId, setSelectedId] = useState<number | undefined>(defaultValue);
  // Local copies so changes show instantly, before the page refreshes with fresh data.
  const [local, setLocal] = useState<Record<number, Category | null>>({});
  // null = list view, "new" = adding, a Category = editing that one
  const [form, setForm] = useState<null | "new" | Category>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const all = [
    ...categories.map((c) => (c.id in local ? local[c.id] : c)),
    ...Object.values(local).filter((c) => c && !categories.some((x) => x.id === c.id)),
  ].filter((c): c is Category => Boolean(c));
  const selected = all.find((c) => c.id === selectedId);

  // When the list opens, scroll the chosen category into view.
  useEffect(() => {
    if (!open || form) return;
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, form]);

  function remember(c: Category | null, id: number) {
    setLocal((l) => ({ ...l, [id]: c }));
  }

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={selectedId ?? ""} />
      <PickerButton
        open={open}
        onClick={() => {
          setForm(null);
          setOpen((o) => !o);
        }}
      >
        {selected ? (
          <>
            <Dot color={selected.color} />
            {selected.name}
          </>
        ) : (
          <span className="text-muted">Choose…</span>
        )}
      </PickerButton>

      {open && (
        <PopoverPanel>
          {form ? (
            <CategoryForm
              initial={form === "new" ? undefined : form}
              usedColors={all.map((c) => c.color.toUpperCase())}
              onCancel={() => setForm(null)}
              onSaved={(c) => {
                remember(c, c.id);
                setSelectedId(c.id);
                setForm(null);
                if (form === "new") setOpen(false);
              }}
              onDeleted={(id) => {
                remember(null, id);
                if (selectedId === id) setSelectedId(undefined);
                setForm(null);
              }}
            />
          ) : (
            <>
              <div
                ref={listRef}
                role="listbox"
                aria-label="Category"
                className="overflow-y-auto"
                style={{ maxHeight: ROW_H * 5 }}
              >
                {all.map((c) => {
                  const isSel = c.id === selectedId;
                  return (
                    <div
                      key={c.id}
                      role="option"
                      aria-selected={isSel}
                      className={`group flex items-center rounded-control transition-colors ${
                        isSel ? "bg-surface" : "hover:bg-surface/60"
                      }`}
                      style={{ height: ROW_H }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(c.id);
                          setOpen(false);
                        }}
                        className={`flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left ${
                          isSel ? "font-semibold text-ink" : "text-ink/80"
                        }`}
                      >
                        <Dot color={c.color} />
                        <span className="truncate">{c.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(c)}
                        aria-label={`Edit ${c.name}`}
                        className="mr-1 grid size-7 shrink-0 place-items-center rounded-control text-muted opacity-0 transition hover:bg-paper hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setForm("new")}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-line py-2 text-sm text-muted transition-colors hover:border-ink hover:text-ink"
              >
                <span aria-hidden="true">+</span> Add category
              </button>
            </>
          )}
        </PopoverPanel>
      )}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />;
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Used for both adding and editing. Pass `initial` to edit.
function CategoryForm({
  initial,
  usedColors,
  onCancel,
  onSaved,
  onDeleted,
}: {
  initial?: Category;
  usedColors: string[];
  onCancel: () => void;
  onSaved: (c: Category) => void;
  onDeleted: (id: number) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(
    initial?.color.toUpperCase() ?? SWATCHES.find((s) => !usedColors.includes(s)) ?? SWATCHES[0],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  function run(task: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await task();
      } catch {
        setError("Couldn't reach the database. Try again.");
      }
    });
  }

  const save = () =>
    run(async () => {
      const res = initial
        ? await updateCategory(initial.id, name, color)
        : await createCategory(name, color);
      if (res.ok) onSaved(res.category);
      else setError(res.message);
    });

  const remove = async () => {
    if (!initial) return;
    const ok = await confirm({
      title: `Delete "${initial.name}"?`,
      body: "Only works if no expenses use this category.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    run(async () => {
      const res = await deleteCategory(initial.id);
      if (res.ok) onDeleted(initial.id);
      else setError(res.message ?? "Couldn't delete.");
    });
  };

  // This sits inside the expense form, so it can't be its own <form>.
  // Enter saves the category instead of submitting the expense.
  return (
    <div className="p-1">
      <p className="mb-2 text-sm text-muted">{initial ? "Edit category" : "New category"}</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
        maxLength={40}
        placeholder="Category name"
        aria-label="Category name"
        className="w-full rounded-control border border-line bg-paper px-3 py-2 text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
        {SWATCHES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={color === s}
            aria-label={s}
            onClick={() => setColor(s)}
            className={`size-6 rounded-full transition-transform ${
              color === s ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-paper" : "hover:scale-110"
            }`}
            style={{ backgroundColor: s }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !name.trim()}
          className="rounded-control bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : initial ? "Save" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-control px-3 py-1.5 text-sm text-muted hover:text-ink"
        >
          Cancel
        </button>
        {initial && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="ml-auto rounded-control px-3 py-1.5 text-sm text-muted hover:text-danger"
          >
            Delete
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
