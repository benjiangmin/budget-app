// The pages that exist so far. A subcategory on the home page can open one of these.
// When you build a new page (Games…), add it here and it shows up in the "Opens" dropdown.
export const PAGES = [
  { href: "/budget", label: "Budget" },
  { href: "/gratitude", label: "Gratitude" },
  { href: "/dreams", label: "Dreams" },
  { href: "/compliments", label: "Compliments" },
  { href: "/games", label: "Games" },
  { href: "/anime", label: "Anime" },
  { href: "/goals", label: "Goals" },
  { href: "/crashouts", label: "Crash outs" },
  { href: "/tears", label: "Tears" },
  { href: "/regrets", label: "Regrets" },
  { href: "/shopping", label: "Shopping list" },
  { href: "/parks", label: "National parks" },
] as const;

// Year templates: one page design shared by every year, e.g. /journal/2026.
// In the "Opens" dropdown this shows as "Unsuspicious document…", which asks for the year.
export const JOURNAL_LABEL = "Unsuspicious document";
export const journalHref = (year: number) => `/journal/${year}`;
export const journalYear = (href: string | null) => {
  const m = href?.match(/^\/journal\/(\d{4})$/);
  return m ? Number(m[1]) : null;
};

// Trip pages (Recreational records): one page design shared by every trip, e.g. /trips/<id>.
// In the "Opens" dropdown this shows as "Recreational record…", which makes a new trip.
export const TRIP_LABEL = "Recreational record";
export const tripHref = (id: string) => `/trips/${id}`;
export const tripId = (href: string | null) => href?.match(/^\/trips\/([0-9a-f-]{36})$/i)?.[1] ?? null;

export const isKnownPage = (href: string) =>
  PAGES.some((p) => p.href === href) || journalYear(href) !== null || tripId(href) !== null;
