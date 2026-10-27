import Link from "next/link";
import { Suspense } from "react";
import GratitudeView from "@/components/gratitude/GratitudeView";

export default function GratitudePage(props: PageProps<"/gratitude">) {
  return (
    // On laptop-size screens and up (md:), the page is exactly one screen tall so the entries
    // box can fill the leftover space and scroll inside itself. On small screens the page
    // just scrolls normally.
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-6 pt-8 sm:pt-10 md:h-dvh">
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
