"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// A grid of cards you can drag around by their handle (⠿).
// `render` draws each card; it gets the handle to place wherever you like (null when not editing).
export default function SortableGrid<T extends { id: string }>({
  id,
  items,
  editing,
  onReorder,
  render,
  after,
  className,
}: {
  id: string; // any fixed name, keeps server and browser in sync
  items: T[];
  editing: boolean;
  onReorder: (next: T[]) => void;
  render: (item: T, handle: ReactNode) => ReactNode;
  after?: ReactNode; // extra card at the end, like "+ Add"
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }), // Space to pick up, arrows to move
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, from, to));
  }

  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy} disabled={!editing}>
        <div className={className}>
          {items.map((item) => (
            <Cell key={item.id} id={item.id} editing={editing}>
              {(handle) => render(item, handle)}
            </Cell>
          ))}
          {after}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Cell({
  id,
  editing,
  children,
}: {
  id: string;
  editing: boolean;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !editing });

  const handle = editing ? (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Drag to move"
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-control text-muted transition-colors hover:bg-paper hover:text-ink active:cursor-grabbing"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {[6, 12, 18].map((y) => (
          <g key={y}>
            <circle cx="9" cy={y} r="1.7" />
            <circle cx="15" cy={y} r="1.7" />
          </g>
        ))}
      </svg>
    </button>
  ) : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // The card being dragged floats above the rest with a shadow.
      className={isDragging ? "relative z-10 rounded-card shadow-xl shadow-ink/20" : undefined}
    >
      {children(handle)}
    </div>
  );
}
