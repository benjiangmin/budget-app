// The line shown when a goal is open:
//   "Oct 16, 2023 → Jan 26, 2024 · took 3 months"   (started + completed)
//   "Started Nov 16, 2023"  /  "Completed Mar 8, 2024"  /  "" (no dates)
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (d: string) => d.split("-").map(Number) as [number, number, number];

export const longDate = (d: string) => {
  const [y, m, day] = parts(d);
  return `${MON[m - 1]} ${day}, ${y}`;
};

// "M/D/YY" for the left side of a card.
export const shortDate = (d: string) => {
  const [y, m, day] = parts(d);
  return `${m}/${day}/${String(y).slice(2)}`;
};

// How long it took: "same day", "4 days", "3 months", "1 yr 2 mo".
export function timeTaken(start: string, end: string) {
  const [y1, m1, d1] = parts(start);
  const [y2, m2, d2] = parts(end);
  const days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
  if (days <= 0) return "same day";
  if (days < 45) return `${days} ${days === 1 ? "day" : "days"}`;
  const months = Math.round(days / 30.44);
  if (months < 12) return `${months} months`;
  const yrs = Math.floor(months / 12);
  const mo = months % 12;
  return `${yrs} yr${mo ? ` ${mo} mo` : ""}`;
}

export function goalDates(start: string | null, end: string | null) {
  if (start && end) return `${longDate(start)} → ${longDate(end)} · took ${timeTaken(start, end)}`;
  if (end) return `Completed ${longDate(end)}`;
  if (start) return `Started ${longDate(start)}`;
  return "";
}
