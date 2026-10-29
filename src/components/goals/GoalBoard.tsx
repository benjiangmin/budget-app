"use client";

import { deleteGoal, moveGoal } from "@/app/goals/actions";
import type { Goal, GoalStatus } from "@/lib/goals";
import { goalDate, goalSort } from "@/lib/goals-sort";
import Board, { type BoardConfig } from "@/components/board/Board";
import GoalForm from "./GoalForm";
import { GOAL_LABELS } from "./labels";
import { goalDates, shortDate } from "./dates";

const isLink = (s: string) => /^https?:\/\/\S+$/i.test(s);

// The goals board: three columns (Yet to start | In progress | Completed), Dropped underneath.
const config: BoardConfig<Goal> = {
  id: "goals-board",
  labels: GOAL_LABELS,
  columns: ["backlog", "playing", "completed"],
  emptyBottomRow: "Nothing dropped. Drag a goal here if you give up on it.",
  sort: () => goalSort,
  // Left date: when you completed it (Completed), otherwise when you started.
  leftDate: (g) => {
    const d = goalDate(g);
    return d ? shortDate(d) : null;
  },
  detail: (g) => goalDates(g.started_on, g.finished_on),
  // Open card: the why, then the proof (a link shows as "Proof ↗").
  body: (g) =>
    g.why || g.proof ? (
      <>
        {g.why && <p>{g.why}</p>}
        {g.proof &&
          (isLink(g.proof) ? (
            <a
              href={g.proof}
              target="_blank"
              rel="noreferrer"
              // Don't let the click also close the card or start a drag.
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={`inline-block font-semibold text-accent underline underline-offset-2 hover:opacity-80 ${g.why ? "mt-1" : ""}`}
            >
              Proof ↗
            </a>
          ) : (
            <p className={g.why ? "mt-1" : ""}>
              <span className="font-semibold">Proof:</span> {g.proof}
            </p>
          ))}
      </>
    ) : null,
  // Dropping into In progress / Completed fills in today's date if there isn't one (same rule as the server).
  moved: (g, to, today) => ({
    ...g,
    status: to,
    started_on: to === "playing" && !g.started_on ? today : g.started_on,
    finished_on: to === "completed" && !g.finished_on ? today : g.finished_on,
  }),
  onMove: (g, to, today) => moveGoal(g.id, to, today),
  onDelete: (g) => deleteGoal(g.id),
  editor: (g, done) => <GoalForm goal={g} compact onDone={done} />,
  // Bagon in Yet to start's bottom-left, Salamence in Completed's bottom-left (each trimmed by its column).
  // Tweak: w-.. = size, bottom/left = position (negative = past the edge), rotate-.. = tilt.
  mascots: {
    backlog: { src: "/bagon.png", className: "-bottom-3 -left-4 w-28 rotate-3 lg:w-36" },
    completed: { src: "/salamence.png", className: "-bottom-4 -left-6 w-40 -rotate-3 lg:w-52" },
  },
};

export default function GoalBoard({ goals, focusId }: { goals: Record<GoalStatus, Goal[]>; focusId?: string }) {
  return <Board items={goals} focusId={focusId} config={config} />;
}
