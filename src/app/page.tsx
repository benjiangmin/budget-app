import Link from "next/link";

// The home screen: documents grouped by category.
// To add a document, add it to a group below. Set href to null until it's built.
const GROUPS: { name: string; docs: { title: string; blurb: string; href: string | null }[] }[] = [
  {
    name: "Money",
    docs: [{ title: "Budget", blurb: "Spending by category, month by month.", href: "/budget" }],
  },
  {
    name: "Reflection",
    docs: [
      { title: "Gratitude", blurb: "Three good things, every day.", href: null },
      { title: "Journal", blurb: "Whatever's on my mind.", href: null },
    ],
  },
  {
    name: "Hobbies",
    docs: [{ title: "Games", blurb: "Every game I've finished.", href: null }],
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:pt-14">
      <header className="rounded-card bg-accent px-5 py-4 text-accent-ink shadow-lg shadow-ink/15">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">My log</h1>
      </header>

      <div className="mt-8 space-y-8">
        {GROUPS.map((group) => (
          <section key={group.name} aria-labelledby={`group-${group.name}`}>
            <h2 id={`group-${group.name}`} className="font-display text-xl font-semibold">
              {group.name}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {group.docs.map((doc) =>
                doc.href ? (
                  <Link
                    key={doc.title}
                    href={doc.href}
                    className="group rounded-card bg-surface p-5 transition-colors hover:bg-line/70"
                  >
                    <p className="font-display text-lg font-semibold">{doc.title}</p>
                    <p className="mt-1 text-sm text-muted">{doc.blurb}</p>
                  </Link>
                ) : (
                  <div
                    key={doc.title}
                    className="rounded-card border border-dashed border-line p-5"
                    aria-disabled="true"
                  >
                    <p className="font-display text-lg font-semibold text-muted">{doc.title}</p>
                    <p className="mt-1 text-sm text-muted">Coming soon</p>
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
