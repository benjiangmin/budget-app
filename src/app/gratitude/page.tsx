import Link from "next/link";
import { Suspense } from "react";
import GratitudeView from "@/components/gratitude/GratitudeView";

export default function GratitudePage(props: PageProps<"/gratitude">) {
  return (
    // Narrower than the budget on purpose: it reads more like a journal page.
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pt-8 sm:pt-14">
      <Link href="/" className="mb-4 inline-block text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ← All documents
      </Link>
      <Suspense fallback={<Skeleton />}>
        <GratitudeView searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="h-16 w-full rounded-card bg-line" />
      <div className="mt-6 h-56 w-full rounded-card bg-line" />
    </div>
  );
}
