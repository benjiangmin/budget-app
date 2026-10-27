"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addItem, deleteItem, moveItem, reorderItems, updateItem } from "@/app/home-actions";
import type { HomeItem } from "@/lib/home";
import { PAGES } from "@/lib/home-pages";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import SortableGrid from "./SortableGrid";
import { AddCard, DeleteButton, Empty, InlineInput, PageHeader, useLocalCopy } from "./bits";

type Cat = { id: string; name: string };

// A category's page: one card per subcategory. Built pages are solid cards you can click;
// ones that don't open anything yet are dashed. "Edit" turns on dragging, editing and moving.
export default function ItemGrid({ category, items, all }: { category: Cat; items: HomeItem[]; all: Cat[] }) {
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useLocalCopy(items);
  const [, startTransition] = useTransition();
  const confirm = useConfirm();

  const patch = (id: string, changes: Partial<HomeItem>) =>
    setOrder((o) => o.map((x) => (x.id === id ? { ...x, ...changes } : x)));

  async function remove(item: HomeItem) {
    const ok = await confirm({
      title: `Delete "${item.name}"?`,
      body: item.href ? "This only removes the card. The page and its data stay." : undefined,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setOrder((o) => o.filter((x) => x.id !== item.id));
    startTransition(() => deleteItem(item.id));
  }

  return (
    <>
      <PageHeader
        title={category.name}
        back={{ href: "/", label: "Home" }}
        editing={editing}
        onToggle={() => setEditing((e) => !e)}
      />

      <div className="mt-8">
        {order.length === 0 && !editing ? (
          <Empty>Nothing in {category.name} yet. Press Edit to add something.</Empty>
        ) : (
          <SortableGrid
            id={`items-${category.id}`}
            items={order}
            editing={editing}
            onReorder={(next) => {
              setOrder(next);
              startTransition(() => reorderItems(next.map((i) => i.id)));
            }}
            className="grid gap-3 sm:grid-cols-2"
            after={editing && <AddCard label="Add page" onAdd={(name) => startTransition(() => addItem(category.id, name))} />}
            render={(item, handle) =>
              editing ? (
                <div className="rounded-card bg-surface py-3 pl-2 pr-2">
                  <div className="flex items-center gap-1">
                    {handle}
                    <InlineInput
                      value={item.name}
                      label="Name"
                      onSave={(name) => {
                        patch(item.id, { name });
                        startTransition(() => updateItem(item.id, { name }));
                      }}
                      className="flex-1 font-display text-lg font-semibold"
                    />
                    <DeleteButton label={`Delete ${item.name}`} onClick={() => remove(item)} />
                  </div>
                  <div className="pl-9 pr-2">
                    <InlineInput
                      value={item.blurb ?? ""}
                      label="Description"
                      placeholder="Add a short description"
                      allowEmpty
                      onSave={(blurb) => {
                        patch(item.id, { blurb: blurb || null });
                        startTransition(() => updateItem(item.id, { blurb }));
                      }}
                      className="w-full text-sm text-muted placeholder:text-muted/60"
                    />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                      <label className="flex flex-col gap-1">
                        Opens
                        <select
                          value={item.href ?? ""}
                          onChange={(e) => {
                            const href = e.target.value || null;
                            patch(item.id, { href });
                            startTransition(() => updateItem(item.id, { href }));
                          }}
                          className={selectClass}
                        >
                          <option value="">Not built yet</option>
                          {PAGES.map((p) => (
                            <option key={p.href} value={p.href}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        In category
                        <select
                          value={category.id}
                          onChange={(e) => {
                            const to = e.target.value;
                            setOrder((o) => o.filter((x) => x.id !== item.id)); // it leaves this page
                            startTransition(() => moveItem(item.id, to));
                          }}
                          className={selectClass}
                        >
                          {all.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="block min-h-20 rounded-card bg-surface p-5 transition-colors hover:bg-line/70"
                >
                  <p className="font-display text-lg font-semibold">{item.name}</p>
                  {item.blurb && <p className="mt-1 text-sm text-muted">{item.blurb}</p>}
                </Link>
              ) : (
                <div aria-disabled="true" className="min-h-20 rounded-card border border-dashed border-line p-5">
                  <p className="font-display text-lg font-semibold text-muted">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">Coming soon</p>
                </div>
              )
            }
          />
        )}
      </div>
    </>
  );
}

const selectClass =
  "w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-ink hover:border-muted";
