// The pages that exist so far. A subcategory on the home page can open one of these.
// When you build a new page (Journal, Games…), add it here and it shows up in the "Opens" dropdown.
export const PAGES = [
  { href: "/budget", label: "Budget" },
  { href: "/gratitude", label: "Gratitude" },
] as const;

export const isKnownPage = (href: string) => PAGES.some((p) => p.href === href);
