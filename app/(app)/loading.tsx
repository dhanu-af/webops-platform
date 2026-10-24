// Shown instantly while the next page's data loads, so a tap always gets an
// immediate response (every page here is rendered on demand from the database).
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-sunken ${className}`} />;
}

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <Bar className="h-6 w-56" />
        <Bar className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Bar className="h-24" />
        <Bar className="h-24" />
        <Bar className="h-24" />
        <Bar className="h-24" />
      </div>
      <Bar className="h-64" />
    </div>
  );
}
