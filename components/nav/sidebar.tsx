"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-items";
import type { UserRole } from "@/app/generated/prisma/client";

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar-bg md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
        <div className="flex size-8 items-center justify-center rounded-[10px] bg-[linear-gradient(150deg,var(--sidebar-accent),var(--accent-strong))] text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(109,125,255,0.35)]">
          E
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-[0.1em] text-sidebar-fg-active">
            EAGLE LABS
          </div>
          <div className="text-[10px] font-medium tracking-wide text-sidebar-fg-muted">
            Australia · Quality &amp; Operations
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(
            (item) => !item.roles || item.roles.includes(role),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-fg-muted">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-150",
                        active
                          ? "bg-sidebar-active-bg text-sidebar-fg-active"
                          : "text-sidebar-fg hover:bg-sidebar-hover-bg hover:text-sidebar-fg-active",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-[18px] w-[2.5px] -translate-y-1/2 rounded-full bg-sidebar-accent transition-opacity duration-150",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active
                            ? "text-sidebar-accent"
                            : "text-sidebar-fg-muted group-hover:text-sidebar-fg-active",
                        )}
                        strokeWidth={2}
                      />
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
