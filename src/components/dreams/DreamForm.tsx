"use client";

import { useRef, useState, useTransition, type ClipboardEvent } from "react";
import { saveDreamDay } from "@/app/dreams/actions";
import type { DreamDay, DreamImage } from "@/lib/dreams";
import { shrinkImage } from "@/lib/shrink-image";
import DateWheel from "@/components/ui/DateWheel";

// One dream being written: its text, the pictures it already had, and new pictures to upload.
type Draft = {
  key: number;
  id?: string;
  body: string;
  kept: DreamImage[];
  added: { file: File; preview: string }[];
};

let nextKey = 0;
const emptyDraft = (): Draft => ({ key: nextKey++, body: "", kept: [], added: [] });

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The "new entry" box, also used to edit a day (pass `day`).
export default function DreamForm({
  day,
  defaultDate,
  onDone,
}: {
  day?: DreamDay;
  defaultDate?: string;
  onDone?: () => void;
}) {
  const editing = Boolean(day);
  const formRef = useRef<HTMLFormElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    day
      ? day.dreams.map((d) => ({ key: nextKey++, id: d.id, body: d.body, kept: d.images, added: [] }))
      : [emptyDraft()],
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const date = day?.date ?? defaultDate ?? todayKey();

  const update = (key: number, change: (d: Draft) => Draft) =>
    setDrafts((list) => list.map((d) => (d.key === key ? change(d) : d)));

  async function addFiles(key: number, files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    const small = await Promise.all(images.map((f) => shrinkImage(f)));
    update(key, (d) => ({
      ...d,
      added: [...d.added, ...small.map((file) => ({ file, preview: URL.createObjectURL(file) }))],
    }));
  }

  // Pasting a picture into the text box attaches it.
  function onPaste(key: number, e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return; // plain text: paste as normal
    e.preventDefault();
    addFiles(key, files);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget); // includes the date
    formData.set("original_date", day?.date ?? "");
    formData.set(
      "dreams",
      JSON.stringify(
        drafts.map((d) => ({ id: d.id ?? null, body: d.body, keep: d.kept.map((k) => k.path), newCount: d.added.length })),
      ),
    );
    drafts.forEach((d, i) => d.added.forEach((a, k) => formData.append(`file_${i}_${k}`, a.file)));

    startTransition(async () => {
      const res = await saveDreamDay(formData);
      if (!res.ok) return setMessage({ ok: false, text: res.message ?? "Couldn't save." });
      if (editing) return onDone?.();
      drafts.forEach((d) => d.added.forEach((a) => URL.revokeObjectURL(a.preview)));
      setDrafts([emptyDraft()]); // start fresh, keep the date
      setMessage({ ok: true, text: "Saved." });
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{editing ? "Edit entry" : "Last night"}</h2>
        <div className="w-44">
          <DateWheel key={date} name="dream_date" defaultValue={date} />
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {drafts.map((d, i) => (
          <div key={d.key}>
            {drafts.length > 1 && (
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-accent">Dream {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
                  className="text-xs text-muted transition-colors hover:text-danger"
                >
                  Remove
                </button>
              </div>
            )}
            <textarea
              value={d.body}
              onChange={(e) => update(d.key, (x) => ({ ...x, body: e.target.value }))}
              onPaste={(e) => onPaste(d.key, e)}
              autoFocus={editing && i === 0}
              rows={editing ? 4 : 5}
              maxLength={20000}
              placeholder={i === 0 ? "What happened? (You can paste pictures in here too.)" : "Another dream…"}
              aria-label={`Dream ${i + 1}`}
              // No focus box: the border darkens instead.
              style={{ outline: "none" }}
              className="block w-full resize-y rounded-control border-[1.5px] border-line bg-paper px-3.5 py-3 leading-relaxed text-ink transition-colors placeholder:text-muted/70 focus:border-ink"
            />

            {/* Pictures: ones already saved, then new ones. × removes. */}
            {(d.kept.length > 0 || d.added.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {d.kept.map((img) => (
                  <Thumb
                    key={img.path}
                    src={img.url}
                    onRemove={() => update(d.key, (x) => ({ ...x, kept: x.kept.filter((k) => k.path !== img.path) }))}
                  />
                ))}
                {d.added.map((a) => (
                  <Thumb
                    key={a.preview}
                    src={a.preview}
                    onRemove={() => {
                      URL.revokeObjectURL(a.preview);
                      update(d.key, (x) => ({ ...x, added: x.added.filter((y) => y !== a) }));
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
                  addFiles(d.key, Array.from(e.target.files ?? []));
                  e.target.value = ""; // so picking the same file again still works
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setDrafts((list) => [...list, emptyDraft()])}
        className="mt-3 self-start text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        + Add another dream?
      </button>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : editing ? "Save changes" : "Save entry"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-control px-4 py-2.5 text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            Cancel
          </button>
        )}
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-muted" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="group relative size-20 overflow-hidden rounded-control border border-line">
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
