"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// Real, working search — not a decorative box. Inspections already supports
// a `q` (checklist-name) filter param (app/(app)/inspections/page.tsx); this
// just gives it a prominent entry point instead of only being reachable from
// deep inside the Inspections filter bar.
export function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/inspections?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="hidden w-full max-w-sm sm:block">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="search"
          placeholder="Search inspections, checklists…"
          className="w-full rounded-lg border border-border bg-surface-sunken py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:bg-surface"
        />
      </div>
    </form>
  );
}
