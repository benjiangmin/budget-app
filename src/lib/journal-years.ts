// A document is "one year" of journaling, but that year can start in any month.
// e.g. document 2021 starting in September = Sep 1, 2021 → Aug 31, 2022 (a school year).

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

// The 12 months in the order the document runs, e.g. [9, 10, 11, 12, 1, …, 8].
export const monthOrder = (start: number) => Array.from({ length: 12 }, (_, i) => ((start - 1 + i) % 12) + 1);

// The calendar year a month falls in, inside a document.
export const monthYear = (docYear: number, start: number, month: number) => (month >= start ? docYear : docYear + 1);

// "2026", or "2021–22" for a document that crosses New Year.
export const docLabel = (docYear: number, start: number) =>
  start === 1 ? String(docYear) : `${docYear}–${String(docYear + 1).slice(2)}`;

// First and last day of a document ("YYYY-MM-DD").
export function docRange(docYear: number, start: number) {
  const first = `${docYear}-${pad(start)}-01`;
  const endMonth = start === 1 ? 12 : start - 1;
  const endYear = start === 1 ? docYear : docYear + 1;
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  return { first, last: `${endYear}-${pad(endMonth)}-${pad(lastDay)}` };
}

export function inDoc(date: string, docYear: number, start: number) {
  const { first, last } = docRange(docYear, start);
  return date >= first && date <= last;
}

// Which document a date belongs to, given how each document is set up (default: calendar years).
export function docYearFor(date: string, starts: Map<number, number>) {
  const y = Number(date.slice(0, 4));
  for (const docYear of [y, y - 1]) {
    if (inDoc(date, docYear, starts.get(docYear) ?? 1)) return docYear;
  }
  return y;
}
