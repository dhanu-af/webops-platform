// `note` flags a value that was carried over from a prior stage's output
// rather than entered directly here -- shown next to the label so it's
// clear the field is pre-filled but still editable, never disabled.
export function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex flex-wrap items-baseline gap-x-1.5 text-xs font-medium text-muted-strong">
        {label}
        {note && <span className="text-[10px] font-normal normal-case text-accent">{note}</span>}
      </span>
      {children}
    </label>
  );
}

export function StageSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-border pt-4 first:border-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{title}</p>
      {children}
    </div>
  );
}

export const MFG_INPUT_CLASS = "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-60";

// A derived/computed figure, shown read-only in the same visual slot an
// input would occupy -- never an editable field, since these values are
// always recomputed from the raw quantities, never persisted.
export function ComputedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted-strong">{label}</span>
      <p className={`${MFG_INPUT_CLASS} bg-surface-sunken font-mono-tabular text-muted-strong`}>{value}</p>
    </div>
  );
}
