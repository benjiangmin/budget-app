"use client";

import { useState, useTransition } from "react";
import { updateCrashout } from "@/app/crashouts/actions";
import type { Crashout } from "@/lib/crashouts";
import DateWheel from "@/components/ui/DateWheel";
import RichText from "@/components/dreams/RichText";
import Pictures, { prepare, type NewPicture } from "@/components/dreams/Pictures";

// Editing one crashout, right where it sits in the list.
export default function CrashoutEdit({ crashout, date, onDone }: { crashout: Crashout; date: string; onDone: () => void }) {
  const [body, setBody] = useState(crashout.body);
  const [kept, setKept] = useState(crashout.images);
  const [added, setAdded] = useState<NewPicture[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function addFiles(files: File[]) {
    const ready = await prepare(files);
    setAdded((a) => [...a, ...ready]);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget); // includes the date
    formData.set("id", crashout.id);
    formData.set("body", body);
    formData.set("keep", JSON.stringify(kept.map((k) => k.path)));
    formData.set("newCount", String(added.length));
    added.forEach((a, k) => formData.append(`file_${k}`, a.file));

    startTransition(async () => {
      const res = await updateCrashout(formData);
      if (!res.ok) return setMessage(res.message);
      added.forEach((a) => URL.revokeObjectURL(a.preview));
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-control bg-paper/60 p-3 sm:p-4">
      {/* Date on the left, so its popup has room to open inside the list box. */}
      <div className="mb-3 w-44">
        <DateWheel name="crashout_date" defaultValue={date} />
      </div>
      <RichText initial={crashout.body} onChange={setBody} onFiles={addFiles} placeholder="What's going on?" label="Crash out" autoFocus />
      <Pictures
        kept={kept}
        added={added}
        onRemoveKept={(path) => setKept((k) => k.filter((x) => x.path !== path))}
        onRemoveAdded={(p) => setAdded((a) => a.filter((x) => x !== p))}
        onAdd={addFiles}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-control px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          Cancel
        </button>
        {message && <p role="status" className="text-sm text-danger">{message}</p>}
      </div>
    </form>
  );
}
