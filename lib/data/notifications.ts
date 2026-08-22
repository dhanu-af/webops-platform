import { db } from "@/lib/db";

// Real, existing data — Notification rows are already created by lib/notifications.ts's
// notify()/notifyUsers() across the app (verification-required, overdue, etc.). There was
// no UI surface consuming them anywhere before; this just reads what's already there.
export async function getRecentNotifications(userId: string, limit = 8) {
  const [items, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.notification.count({ where: { userId, read: false } }),
  ]);
  return { items, unreadCount };
}
