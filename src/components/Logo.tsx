export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight whitespace-nowrap text-ink ${className}`}>
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-ink bg-accent text-lg font-black text-ink shadow-[2px_2px_0_var(--color-ink)]">
        S
      </span>
      <span className="leading-tight">
        Sagoon<span className="block text-xs font-semibold text-muted">Driving School</span>
      </span>
    </span>
  );
}
