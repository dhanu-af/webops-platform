import Link from "next/link";
import { signOut } from "@/lib/auth";
import { getFacilityTimezone } from "@/lib/timezone";
import { getRecentNotifications } from "@/lib/data/notifications";
import { LogOut } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import { MobileMenuButton } from "./mobile-menu-button";

export async function Topbar({
  userId,
  name,
  role,
}: {
  userId: string;
  name: string;
  role: string;
}) {
  const timeZone = await getFacilityTimezone();
  const { items, unreadCount } = await getRecentNotifications(userId);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/70 sm:gap-4 sm:px-6">
      <MobileMenuButton />

      <div className="hidden shrink-0 flex-col leading-tight md:flex">
        <span className="text-sm font-medium text-foreground">
          {new Date().toLocaleDateString("en-AU", {
            timeZone,
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        <span className="font-mono-tabular text-[11px] text-muted">
          {new Date().toLocaleTimeString("en-AU", {
            timeZone,
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · Facility time
        </span>
      </div>

      <div className="flex flex-1 justify-center">
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <NotificationBell items={items} unreadCount={unreadCount} />

        <div className="h-8 w-px bg-border" />

        <Link
          href="/account"
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface-sunken"
          title="My Account"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-strong">
            {initials || "U"}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium text-foreground">
              {name}
            </span>
            <span className="block text-[11px] text-muted">
              {role.replace(/_/g, " ")}
            </span>
          </span>
        </Link>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex size-9 items-center justify-center rounded-full border border-border-strong text-muted-strong transition-colors hover:bg-surface-sunken hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
