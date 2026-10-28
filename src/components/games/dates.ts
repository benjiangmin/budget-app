// "Apr 16 – 19, 2025 · 4 days", "Finished Jun 5, 2023", "Since Jan 9, 2026", or "" (no dates).
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (d: string) => d.split("-").map(Number);
const short = (d: string, withYear: boolean) => {
  const [y, m, day] = parts(d);
  return `${MON[m - 1]} ${day}${withYear ? `, ${y}` : ""}`;
};

export function gameDates(status: string, start: string | null, end: string | null) {
  if (start && end) {
    const sameYear = start.slice(0, 4) === end.slice(0, 4);
    const days = Math.round((Date.UTC(...(parts(end) as [number, number, number])) - Date.UTC(...(parts(start) as [number, number, number]))) / 864e5) + 1;
    return `${short(start, !sameYear)} – ${short(end, true)} · ${days} ${days === 1 ? "day" : "days"}`;
  }
  if (end) return `${status === "stopped" ? "Stopped" : "Finished"} ${short(end, true)}`;
  if (start) return `${status === "playing" ? "Since" : "Started"} ${short(start, true)}`;
  return "";
}
