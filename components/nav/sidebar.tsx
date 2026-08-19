"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-items";
import type { UserRole } from "@/app/generated/prisma/client";

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex size-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
          W
        </div>
        <span className="text-sm font-semibold tracking-[0.15em] text-foreground">WEB OPS</span>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.roles || item.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-accent-soft text-accent-strong"
                          : "text-muted-strong hover:bg-surface-sunken hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={2} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
