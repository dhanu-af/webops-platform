import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-border-strong bg-surface px-6 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
        <Icon className="size-5" />
      </div>
      <h2 className="mt-4 text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
