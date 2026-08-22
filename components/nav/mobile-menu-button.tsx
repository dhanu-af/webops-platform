"use client";

import { Menu } from "lucide-react";
import { useMobileNav } from "./mobile-nav-context";

export function MobileMenuButton() {
  const { setOpen } = useMobileNav();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open menu"
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-muted-strong transition-colors hover:bg-surface-sunken hover:text-foreground md:hidden"
    >
      <Menu className="size-4" />
    </button>
  );
}
