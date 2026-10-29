// Toolbar icons for the bulleted / numbered list buttons in the rich text boxes.
export function BulletListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="6" r="1.6" fill="currentColor" />
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="5" cy="18" r="1.6" fill="currentColor" />
      <path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function NumberedListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <text x="2.5" y="8.5" fontSize="7" fontWeight="700" fill="currentColor" fontFamily="sans-serif">1</text>
      <text x="2.5" y="15" fontSize="7" fontWeight="700" fill="currentColor" fontFamily="sans-serif">2</text>
      <text x="2.5" y="21.5" fontSize="7" fontWeight="700" fill="currentColor" fontFamily="sans-serif">3</text>
      <path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
