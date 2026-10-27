import Link from "next/link";
import { Suspense } from "react";
import MonthView from "@/components/budget/MonthView";

export default function Page(props: PageProps<"/budget">) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:pt-14">
      <Link href="/" className="mb-4 inline-block text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ← All documents
      </Link>
      <Suspense fallback={<MonthSkeleton />}>
        <MonthView searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

function MonthSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading month" className="animate-pulse">
      <div className="h-10 w-48 rounded-control bg-line" />
      <div className="mt-6 h-16 w-64 rounded-control bg-line" />
      <div className="mt-6 h-5 w-full rounded-full bg-line" />
    </div>
  );
}
