import Link from "next/link";

// Dream log. Blank for now: just the page shell, matching the other pages.
export default function DreamsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:pt-10">
      <Link href="/" className="mb-4 inline-block text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ← Home
      </Link>

      <header className="rounded-card bg-accent px-5 py-4 text-accent-ink shadow-lg shadow-ink/15">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Dreams</h1>
      </header>

      <p className="mt-8 rounded-card border border-dashed border-line px-5 py-6 text-muted">
        Nothing here yet. The dream log is coming soon.
      </p>
    </main>
  );
}
