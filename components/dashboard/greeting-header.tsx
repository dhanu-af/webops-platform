export function GreetingHeader({
  greeting,
  name,
  dateLabel,
}: {
  greeting: string;
  name: string;
  dateLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {greeting}, {name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Here&apos;s your facility operations overview for today.
        </p>
      </div>
      <p className="shrink-0 pb-0.5 text-sm text-muted-strong">{dateLabel}</p>
    </div>
  );
}
