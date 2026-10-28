"use client";

import type { DreamImage } from "@/lib/dreams";
import { shrinkImage } from "@/lib/shrink-image";

export type NewPicture = { file: File; preview: string };

// Shrinks picked/pasted pictures and makes a preview link for each.
export async function prepare(files: File[]): Promise<NewPicture[]> {
  const small = await Promise.all(files.filter((f) => f.type.startsWith("image/")).map((f) => shrinkImage(f)));
  return small.map((file) => ({ file, preview: URL.createObjectURL(file) }));
}

// The thumbnails under a text box (saved ones, then new ones) and the "Add picture" button.
export default function Pictures({
  kept = [],
  added,
  onRemoveKept,
  onRemoveAdded,
  onAdd,
}: {
  kept?: DreamImage[];
  added: NewPicture[];
  onRemoveKept?: (path: string) => void;
  onRemoveAdded: (p: NewPicture) => void;
  onAdd: (files: File[]) => void;
}) {
  return (
    <>
      {(kept.length > 0 || added.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {kept.map((img) => (
            <Thumb key={img.path} src={img.url} onRemove={() => onRemoveKept?.(img.path)} />
          ))}
          {added.map((a) => (
            <Thumb
              key={a.preview}
              src={a.preview}
              onRemove={() => {
                URL.revokeObjectURL(a.preview);
                onRemoveAdded(a);
              }}
            />
          ))}
        </div>
      )}

      <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-control px-1 py-0.5 text-sm text-muted transition-colors hover:text-ink">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="9" cy="10" r="1.8" fill="currentColor" />
          <path d="M4 18l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        Add picture
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            e.target.value = ""; // so picking the same file again still works
          }}
        />
      </label>
    </>
  );
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative size-20 overflow-hidden rounded-control border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element -- user picture */}
      <img src={src} alt="" className="size-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove picture"
        className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/70 text-paper opacity-80 transition-opacity hover:opacity-100"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
