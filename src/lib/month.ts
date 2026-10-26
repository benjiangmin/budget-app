// Months are passed around as "YYYY-MM" strings, e.g. "2026-10".

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(value: string | undefined): string | null {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  return value;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentMonthKey(d);
}

// First day of the month and first day of the next month, as YYYY-MM-DD.
export function monthRange(key: string): { start: string; end: string } {
  return { start: `${key}-01`, end: `${shiftMonth(key, 1)}-01` };
}

export function monthLabel(key: string): { month: string; year: string } {
  const [y, m] = key.split("-").map(Number);
  const month = new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long" });
  return { month, year: String(y) };
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
