"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-items";
import { useMobileNav } from "./mobile-nav-context";
import type { UserRole } from "@/app/generated/prisma/client";

function BrandBlock() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-fit shrink-0 rounded-md bg-white px-2 py-1.5 shadow-[var(--shadow-xs)]">
        <Image
          src="/eagle-labs-logo.jpg"
          alt="Eagle Labs Inc"
          width={200}
          height={94}
          className="h-9 w-auto"
          priority
        />
      </div>
      <div className="text-[10px] font-medium tracking-wide text-sidebar-fg-muted">
        Quality &amp; Operations
      </div>
    </div>
  );
}

function NavContent({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
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
                    onClick={onNavigate}
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
  );
}

export function Sidebar({ role }: { role: UserRole }) {
  const { open, setOpen } = useMobileNav();

  return (
    <>
      {/* Desktop: a permanent rail, never overlays content. */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar-bg md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <BrandBlock />
        </div>
        <NavContent role={role} />
      </aside>

      {/* Mobile: a slide-in drawer over a dimmed backdrop, toggled by the
          Topbar's hamburger button via MobileNavContext (siblings, not
          parent/child, under the server-rendered layout). */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar-bg shadow-[var(--shadow-lg)]">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <BrandBlock />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-fg-muted hover:bg-sidebar-hover-bg hover:text-sidebar-fg-active"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavContent role={role} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
