/** The drifting accent band used on the running Run button and skeleton cards. */
export function Band({ delay = 0 }: { delay?: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className="absolute inset-y-0 left-0 w-2/5 animate-drift bg-[linear-gradient(90deg,transparent,var(--accent-soft),transparent)]"
        style={{ animationDelay: `${delay}s` }}
      />
    </span>
  );
}
