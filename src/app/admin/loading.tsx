/** Instant skeleton while an admin page loads (navigation feels immediate on a slow phone connection). */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mb-6 h-9 w-48 rounded-lg bg-surface" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
