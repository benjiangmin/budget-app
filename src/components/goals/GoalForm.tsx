"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addGoal, updateGoal, type FormState } from "@/app/goals/actions";
import type { Goal, GoalStatus } from "@/lib/goals";
import SelectPicker from "@/components/ui/SelectPicker";
import OptionalDate from "@/components/games/OptionalDate";
import { GOAL_LABELS, GOAL_ORDER } from "./labels";

const initial: FormState = { ok: false, message: null };
const field =
  "w-full rounded-control border border-line bg-paper px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-ink";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "Add a goal" (top of the page), also used to edit one inside its card (pass `goal` + compact).
export default function GoalForm({ goal, onDone, compact }: { goal?: Goal; onDone?: () => void; compact?: boolean }) {
  const editing = Boolean(goal);
  const [state, action, pending] = useActionState(editing ? updateGoal : addGoal, initial);
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "backlog");
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (editing) return onDone?.();
    const form = formRef.current;
    for (const name of ["title", "why", "proof"]) {
      const el = form?.elements.namedItem(name) as HTMLInputElement | null;
      if (el) el.value = "";
    }
    titleRef.current?.focus();
  }, [state.ok, state.savedAt, editing, onDone]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <input type="hidden" name="status" value={status} />
      {/* Row 1: goal (≈35%), status, why (the rest). */}
      <div className={`flex flex-col gap-2 ${compact ? "" : "sm:flex-row sm:items-center"}`}>
        <input
          ref={titleRef}
          name="title"
          required
          maxLength={200}
          defaultValue={goal?.title}
          placeholder="Goal"
          aria-label="Goal"
          style={{ outline: "none" }}
          className={`${field} min-w-0 ${compact ? "" : "sm:w-[35%] sm:shrink-0"}`}
        />
        <div className={compact ? "" : "sm:w-44 sm:shrink-0"}>
          <SelectPicker<GoalStatus>
            label="Status"
            value={status}
            options={GOAL_ORDER.map((s) => ({ value: s, label: GOAL_LABELS[s] }))}
            onChange={setStatus}
          />
        </div>
        <input
          name="why"
          maxLength={500}
          defaultValue={goal?.why ?? ""}
          placeholder="Why (optional)"
          aria-label="Why"
          style={{ outline: "none" }}
          className={`${field} min-w-0 flex-1`}
        />
      </div>
      {/* Row 2: proof, dates, buttons. Keyed on the last save, so the dates reset after adding. */}
      <div key={editing ? "edit" : (state.savedAt ?? 0)} className={`flex flex-wrap items-center gap-2 ${compact ? "text-sm" : ""}`}>
        <input
          name="proof"
          maxLength={500}
          defaultValue={goal?.proof ?? ""}
          placeholder="Proof link (optional)"
          aria-label="Proof"
          style={{ outline: "none" }}
          className={`${field} min-w-0 ${compact ? "" : "sm:w-[35%]"}`}
        />
        {/* A new goal starts today; change or remove it if you like. */}
        <OptionalDate name="started_on" label="Start" defaultValue={editing ? (goal?.started_on ?? null) : todayKey()} />
        <span className="text-muted/60" aria-hidden="true">→</span>
        <OptionalDate name="finished_on" label="Completed" defaultValue={goal?.finished_on ?? null} />
        <div className={`flex items-center gap-1.5 ${compact ? "w-full justify-end" : "ml-auto"}`}>
          {state.message && (
            <p role="status" className="text-sm text-danger">
              {state.message}
            </p>
          )}
          {editing && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-control px-3 py-2.5 text-sm text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-control bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save" : "Add goal"}
          </button>
        </div>
      </div>
    </form>
  );
}
