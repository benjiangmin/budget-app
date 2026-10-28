// How games are ordered inside each column (shared by the server and the board, so a card you
// drag lands in the same place the page would put it after a refresh).
export type Sortable = { status: string; started_on: string | null; finished_on: string | null; position: number };

// Newest first; games without dates go after dated ones, most recently added first.
export function byRecent(a: Sortable, b: Sortable) {
  const ka = a.finished_on ?? a.started_on ?? "";
  const kb = b.finished_on ?? b.started_on ?? "";
  if (ka !== kb) return kb.localeCompare(ka);
  return b.position - a.position;
}

// The backlog keeps its queue order (oldest added first).
export const byQueue = (a: Sortable, b: Sortable) => a.position - b.position;

export const sorterFor = (status: string) => (status === "backlog" ? byQueue : byRecent);
