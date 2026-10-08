/** Product mark: a simple path between two points (a journey), drawn in the brand colour. Decorative only. */
export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <path d="M8 21c4 0 4-10 8-10s4 10 8 10" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="8" cy="21" r="2.2" fill="white" />
      <circle cx="24" cy="21" r="2.2" fill="white" />
    </svg>
  );
}
