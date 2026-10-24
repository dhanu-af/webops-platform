import { cn } from "@/lib/utils";

// On phones a table becomes a list of cards (see the table[data-stack] rules in
// globals.css; each cell is labelled with its column heading by <TableLabels />).
// Pass stack={false} for tables made of input boxes, which keep scrolling sideways.
export function Table({
  className,
  stack = true,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement> & { stack?: boolean }) {
  return <table className={cn("w-full text-sm", className)} data-stack={stack ? "" : undefined} {...props} />;
}

export function TableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-surface-sunken/60", className)} {...props} />;
}

export function TableHeaderCell({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted first:rounded-l-md last:rounded-r-md first:pl-4 last:pr-4",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border", className)} {...props} />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-surface-sunken/70", className)}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-3 py-3 align-middle first:pl-4 last:pr-4", className)}
      // <TableLabels /> adds data-label after the page loads; that is expected, not a mismatch.
      suppressHydrationWarning
      {...props}
    />
  );
}
