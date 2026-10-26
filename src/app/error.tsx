"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-14">
      <h1 className="font-display text-2xl font-semibold">Couldn&apos;t load your budget</h1>
      <p className="mt-3 text-muted">{error.message}</p>
      <p className="mt-2 text-sm text-muted">
        Check that .env.local has your Supabase URL and secret key, and that you ran
        supabase/schema.sql.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-control bg-accent px-6 py-2.5 font-semibold text-accent-ink"
      >
        Try again
      </button>
    </main>
  );
}
