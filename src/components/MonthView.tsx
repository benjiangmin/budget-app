import Link from "next/link";
import { connection } from "next/server";
import { getCategories, getEntriesForMonth } from "@/lib/data";
import {
  currentMonthKey,
  formatMoney,
  monthLabel,
  parseMonthKey,
  shiftMonth,
} from "@/lib/month";
import AddEntryForm from "./AddEntryForm";
import EntryList from "./EntryList";

export default async function MonthView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection(); // always render per request (needs today's date + fresh data)
  const params = await searchParams;
  const raw = Array.isArray(params.m) ? params.m[0] : params.m;
  const thisMonth = currentMonthKey();
  const monthKey = parseMonthKey(raw) ?? thisMonth;

  const [categories, entries] = await Promise.all([
    getCategories(),
    getEntriesForMonth(monthKey),
  ]);

  const totals = new Map<number, number>();
  for (const e of entries) {
    totals.set(e.category_id, (totals.get(e.category_id) ?? 0) + e.amount);
  }
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const rows = categories
    .map((c) => ({ ...c, spent: totals.get(c.id) ?? 0 }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const { month, year } = monthLabel(monthKey);
  const prev = shiftMonth(monthKey, -1);
  const next = shiftMonth(monthKey, 1);
  const isThisMonth = monthKey === thisMonth;

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <MonthArrow href={`/?m=${prev}`} label={`Show ${monthLabel(prev).month}`} dir="prev" />
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {month} <span className="text-muted">{year}</span>
          </h1>
          {!isThisMonth && (
            <Link href="/" className="text-sm text-muted underline-offset-4 hover:underline">
              Back to this month
            </Link>
          )}
        </div>
        <MonthArrow href={`/?m=${next}`} label={`Show ${monthLabel(next).month}`} dir="next" />
      </header>

      <section aria-label="Spending this month" className="mt-10">
        <p className="text-sm text-muted">Spent</p>
        <p className="num font-display text-6xl font-semibold leading-none tracking-tight sm:text-7xl">
          {formatMoney(total)}
        </p>

        {rows.length > 0 ? (
          <>
            <div
              key={monthKey}
              className="strip-grow mt-6 flex h-5 w-full gap-0.5 overflow-hidden rounded-full"
              aria-hidden="true"
            >
              {rows.map((r) => (
                <div
                  key={r.id}
                  style={{ flexGrow: r.spent, backgroundColor: r.color }}
                  className="min-w-1.5"
                />
              ))}
            </div>

            <ul className="mt-6 divide-y divide-line">
              {rows.map((r) => {
                const pct = Math.round((r.spent / total) * 100);
                return (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: r.color }}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{r.name}</span>
                    <span className="num w-10 text-right text-sm text-muted">{pct}%</span>
                    <span className="num w-24 text-right font-medium">{formatMoney(r.spent)}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-line px-5 py-6 text-muted">
            Nothing logged for {month} yet. Add your first expense below.
          </p>
        )}
      </section>

      <AddEntryForm categories={categories} monthKey={monthKey} isThisMonth={isThisMonth} />

      <EntryList entries={entries} categories={categories} />
    </>
  );
}

function MonthArrow({ href, label, dir }: { href: string; label: string; dir: "prev" | "next" }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-surface"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
