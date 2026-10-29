import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getGoals } from "@/lib/goals";
import GoalBoard from "@/components/goals/GoalBoard";
import GoalForm from "@/components/goals/GoalForm";
import GoalSearch from "@/components/goals/GoalSearch";

// Goals log: a board like Games. Yet to start | In progress | Completed side by side,
// Dropped underneath. On wide screens the page is one screen tall; the board scrolls inside.
export default function GoalsPage(props: PageProps<"/goals">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-6 pt-8 sm:pt-10">
      <Link href="/" className="mb-4 inline-block self-start text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ← Home
      </Link>
      <Suspense fallback={<Skeleton />}>
        {props.searchParams.then((sp) => (
          <GoalsLog focus={typeof sp.focus === "string" ? sp.focus : undefined} />
        ))}
      </Suspense>
    </main>
  );
}

async function GoalsLog({ focus }: { focus?: string }) {
  await connection(); // always fresh
  const goals = await getGoals();
  const total = Object.values(goals).reduce((n, list) => n + list.length, 0);

  return (
    <>
      <header className="flex items-baseline justify-between gap-4 rounded-card bg-accent px-5 py-4 text-accent-ink shadow-lg shadow-ink/15">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Goals</h1>
        <p className="text-sm opacity-70">
          {goals.completed.length} completed · {total} total
        </p>
      </header>

      {/* Search + the add box. z-30 keeps their popups above the board. */}
      <div className="relative z-30 shrink-0">
        <GoalSearch />
        <div className="mt-3 rounded-card bg-line/70 p-3 shadow-md shadow-ink/10 ring-1 ring-accent/25 sm:p-4">
          <GoalForm />
        </div>
      </div>

      <GoalBoard goals={goals} focusId={focus} />
    </>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="h-16 w-full rounded-card bg-line" />
      <div className="mt-3 h-11 w-full rounded-control bg-line" />
      <div className="mt-3 h-24 w-full rounded-card bg-line" />
      <div className="mt-5 h-96 w-full rounded-card bg-line" />
    </div>
  );
}
