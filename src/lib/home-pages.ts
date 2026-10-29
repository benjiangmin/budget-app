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
] as const;

// Year templates: one page design shared by every year, e.g. /journal/2026.
// In the "Opens" dropdown this shows as "Unsuspicious document…", which asks for the year.
export const JOURNAL_LABEL = "Unsuspicious document";
export const journalHref = (year: number) => `/journal/${year}`;
export const journalYear = (href: string | null) => {
  const m = href?.match(/^\/journal\/(\d{4})$/);
  return m ? Number(m[1]) : null;
};

export const isKnownPage = (href: string) => PAGES.some((p) => p.href === href) || journalYear(href) !== null;
