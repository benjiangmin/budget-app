import Link from "next/link";

// Gratitude: three good things, every day. Blank for now. We'll build it here.
export default function GratitudePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 pt-8 sm:pt-14">
      <Link href="/" className="mb-4 inline-block text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ← All documents
      </Link>

      <header className="rounded-card bg-accent px-5 py-4 text-accent-ink shadow-lg shadow-ink/15">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Gratitude</h1>
      </header>

      <p className="mt-8 rounded-card border border-dashed border-line px-5 py-6 text-muted">
        Three good things, every day. Coming together here soon.
      </p>
    </main>
  );
}
