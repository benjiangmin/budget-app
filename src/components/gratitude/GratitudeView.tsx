import Link from "next/link";
import { connection } from "next/server";
import { getGratitudeForMonth } from "@/lib/gratitude";
import { currentMonthKey, monthLabel, parseMonthKey, shiftMonth } from "@/lib/month";
import MonthPicker from "@/components/ui/MonthPicker";
import StickyTop from "@/components/ui/StickyTop";
import GratitudeForm from "./GratitudeForm";
import GratitudeList from "./GratitudeList";
import GratitudeSearch from "./GratitudeSearch";

export default async function GratitudeView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection(); // always render per request (needs today's date + fresh data)
  const params = await searchParams;
  const raw = Array.isArray(params.m) ? params.m[0] : params.m;
  const thisMonth = currentMonthKey();
  const monthKey = parseMonthKey(raw) ?? thisMonth;
  // Set when you pick a search result: that entry gets scrolled to and highlighted.
  const focusId = typeof params.focus === "string" ? params.focus : undefined;

  const entries = await getGratitudeForMonth(monthKey);

  const { month } = monthLabel(monthKey);
  const prev = shiftMonth(monthKey, -1);
  const next = shiftMonth(monthKey, 1);
  const isThisMonth = monthKey === thisMonth;
  const daysLogged = new Set(entries.map((e) => e.entry_date)).size;

  return (
    <>
      {/* Month bar + search, pinned to the top while you scroll. */}
      <StickyTop className="sticky top-0 z-30 -mx-4 -mt-3 bg-paper px-4 pb-3 pt-3">
        <header className="flex items-center justify-between gap-4 rounded-card bg-accent px-3 py-2.5 text-accent-ink shadow-lg shadow-ink/15">
          <MonthArrow href={`/gratitude?m=${prev}`} label={`Show ${monthLabel(prev).month}`} dir="prev" />
          <div className="text-center">
            <h1>
              <MonthPicker monthKey={monthKey} label={month} />
            </h1>
            {!isThisMonth && (
              <Link
                href="/gratitude"
                className="text-sm opacity-70 underline-offset-4 hover:underline hover:opacity-100"
              >
                Jump to current month
              </Link>
            )}
          </div>
          <MonthArrow href={`/gratitude?m=${next}`} label={`Show ${monthLabel(next).month}`} dir="next" />
        </header>
        <GratitudeSearch />
      </StickyTop>

      {/* Writing box. z-[25] keeps its date picker above the entries but under the month bar. */}
      <section aria-label="New entry" className="relative z-[25] mt-6 rounded-card bg-surface p-5 sm:p-6">
        <GratitudeForm defaultDate={isThisMonth ? undefined : `${monthKey}-01`} />
      </section>

      <section aria-labelledby="entries-heading" className="mt-10 pb-16">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="entries-heading" className="font-display text-xl font-semibold">
            {month}
          </h2>
          {daysLogged > 0 && (
            <p className="text-sm text-muted">
              {daysLogged} {daysLogged === 1 ? "day" : "days"} of good things
            </p>
          )}
        </div>
        <GratitudeList entries={entries} monthName={month} focusId={focusId} />
      </section>
    </>
  );
}

function MonthArrow({ href, label, dir }: { href: string; label: string; dir: "prev" | "next" }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-control border border-accent-ink/20 transition-colors hover:bg-accent-ink/10"
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
