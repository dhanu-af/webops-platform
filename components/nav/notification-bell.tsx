"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check } from "lucide-react";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/status";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import type { NotificationType } from "@/app/generated/prisma/client";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

export function NotificationBell({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleItemClick(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-full border border-border-strong bg-surface text-muted-strong transition-colors hover:bg-surface-sunken hover:text-foreground"
        title="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-status-critical text-[9px] font-semibold leading-none text-white ring-2 ring-surface">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await markAllNotificationsRead();
                    router.refresh();
                  })
                }
                className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong disabled:opacity-50"
              >
                <Check className="size-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                You&apos;re all caught up.
              </p>
            ) : (
              items.map((n) => {
                const itemClassName = `block border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-sunken ${
                  n.read ? "" : "bg-accent-soft/40"
                }`;
                const body = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
                        {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                      </span>
                      {!n.read && (
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </>
                );
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => !n.read && handleItemClick(n.id)}
                    className={itemClassName}
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.read && handleItemClick(n.id)}
                    className={`w-full ${itemClassName}`}
                  >
                    {body}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
