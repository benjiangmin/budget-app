import type { GoalStatus } from "@/lib/goals";

export const GOAL_LABELS: Record<GoalStatus, string> = {
  backlog: "Yet to start",
  playing: "In progress",
  completed: "Completed",
  stopped: "Dropped",
};

// Left to right on the board, and the order in the status dropdown.
export const GOAL_ORDER: GoalStatus[] = ["backlog", "playing", "completed", "stopped"];
