// How goals are ordered in every column (shared by the server and the board, so a dragged card lands
// where a refresh would put it): newest first, by the date shown on the card; undated ones last.
type Sortable = { status: string; started_on: string | null; finished_on: string | null; position: number };

export const goalDate = (g: Sortable) => (g.status === "completed" ? (g.finished_on ?? g.started_on) : g.started_on);

export function goalSort(a: Sortable, b: Sortable) {
  const ka = goalDate(a) ?? "";
  const kb = goalDate(b) ?? "";
  if (ka !== kb) return kb.localeCompare(ka);
  return b.position - a.position;
}
