import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getCompliments } from "@/lib/compliments";
import StickyTop from "@/components/ui/StickyTop";
import ComplimentForm from "@/components/compliments/ComplimentForm";
import ComplimentList from "@/components/compliments/ComplimentList";
import ComplimentSearch from "@/components/compliments/ComplimentSearch";

// Compliments log: one page, everything on it. The page itself scrolls (no box scrolling).
export default function ComplimentsPage(props: PageProps<"/compliments">) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:pt-10">
      <Link href="/" className="mb-4 inline-block text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ← Home
      </Link>
      <Suspense fallback={<Skeleton />}>
        {props.searchParams.then((sp) => (
          <Compliments focus={typeof sp.focus === "string" ? sp.focus : undefined} />
        ))}
      </Suspense>
    </main>
  );
}

async function Compliments({ focus }: { focus?: string }) {
  await connection(); // always fresh
  const items = await getCompliments();

  return (
    <>
      <header className="rounded-card bg-accent px-5 py-4 text-accent-ink shadow-lg shadow-ink/15">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Compliments</h1>
      </header>

      {/* Pinned while you scroll (wider screens; on phones it's too tall, so it scrolls away):
          search + the add box. z-30 keeps their popups above the list. */}
      <StickyTop className="relative z-30 -mx-4 bg-paper px-4 pb-3 pt-1 sm:sticky sm:top-0">
        <ComplimentSearch />
        <div className="mt-3 rounded-card bg-surface p-3 sm:p-4">
          <ComplimentForm />
        </div>
      </StickyTop>

      <ComplimentList items={items} focusId={focus} />
    </>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="h-16 w-full rounded-card bg-line" />
      <div className="mt-3 h-11 w-full rounded-control bg-line" />
      <div className="mt-3 h-16 w-full rounded-card bg-line" />
      <div className="mt-6 h-96 w-full rounded-card bg-line" />
    </div>
  );
}
