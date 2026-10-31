import Link from "next/link";
import { connection } from "next/server";
import { getLearnedForMonth } from "@/lib/learned";
import { currentMonthKey, monthLabel, parseMonthKey, shiftMonth } from "@/lib/month";
import MonthPicker from "@/components/ui/MonthPicker";
import StickyTop from "@/components/ui/StickyTop";
import LearnedForm from "./LearnedForm";
import LearnedList from "./LearnedList";
import LearnedSearch from "./LearnedSearch";

export default async function LearnedView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection(); // always fresh (needs today's date)
  const params = await searchParams;
  const raw = Array.isArray(params.m) ? params.m[0] : params.m;
  const thisMonth = currentMonthKey();
  const monthKey = parseMonthKey(raw) ?? thisMonth;
  const focusId = typeof params.focus === "string" ? params.focus : undefined; // from a search result

  const entries = await getLearnedForMonth(monthKey);
  const { month, year } = monthLabel(monthKey);
  const prev = shiftMonth(monthKey, -1);
  const next = shiftMonth(monthKey, 1);
  const isThisMonth = monthKey === thisMonth;

  return (
    <>
      {/* Month bar (‹ October 2026 › — click the month for the month/year picker) + search, pinned. */}
      <StickyTop className="sticky top-0 z-30 -mx-4 -mt-3 shrink-0 bg-paper px-4 pb-2 pt-3">
        <header className="flex items-center justify-between gap-4 rounded-card bg-accent px-3 py-2.5 text-accent-ink shadow-lg shadow-ink/15">
          <MonthArrow href={`/learned?m=${prev}`} label={`Show ${monthLabel(prev).month}`} dir="prev" />
          <div className="text-center">
            <h1>
              <MonthPicker monthKey={monthKey} label={month} />
            </h1>
            {!isThisMonth && (
              <Link href="/learned" className="text-sm opacity-70 underline-offset-4 hover:underline hover:opacity-100">
                Jump to current month
              </Link>
            )}
          </div>
          <MonthArrow href={`/learned?m=${next}`} label={`Show ${monthLabel(next).month}`} dir="next" />
        </header>
        <LearnedSearch />
      </StickyTop>

      {/* Left: add one. Right: the month's list (scrolls inside its own box on wide screens). */}
      <div className="mt-4 flex flex-col gap-6 lg:min-h-[32rem] lg:flex-1 lg:basis-0 lg:flex-row lg:items-stretch">
        {/* z-[25] keeps the date picker above the list. */}
        <section aria-label="Add something you learned" className="relative z-[25] shrink-0 self-start rounded-card bg-surface p-4 sm:p-5 lg:w-[24rem]">
          <LearnedForm defaultDate={isThisMonth ? undefined : `${monthKey}-01`} />
        </section>
        <LearnedList entries={entries} monthName={month} year={year} focusId={focusId} />
      </div>
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
        <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
