// { day: "Dec 5", year: "2024" } for the date column.
export function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { day: new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" }), year: String(y) };
}

// Today as "YYYY-MM-DD" (the add box's default date).
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "32" → "$32"; anything else as written ("<1 (on temu)").
export const showPrice = (p: string) => (/^\d+(\.\d+)?$/.test(p) ? `$${p}` : p);
