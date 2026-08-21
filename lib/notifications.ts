import { db } from "@/lib/db";
import type { NotificationType } from "@/app/generated/prisma/client";

export async function notify(userId: string, type: NotificationType, title: string, message: string, link?: string) {
  return notifyUsers([userId], type, title, message, link);
}

// Sends one notification per recipient: whoever the caller already targeted
// (a role broadcast or a specific person) plus anyone configured as an
// additional recipient for this type via NotificationRecipient — deduped,
// so a broadcast to N role-holders doesn't cost N copies to each extra.
export async function notifyUsers(userIds: string[], type: NotificationType, title: string, message: string, link?: string) {
  // A missing NotificationSetting row means "enabled" (the default,
  // hardcoded-always-on behaviour) — only an explicit disabled row
  // suppresses this type, for everyone including extra recipients.
  const setting = await db.notificationSetting.findUnique({ where: { type } });
  if (setting?.enabled === false) return;

  const extras = await db.notificationRecipient.findMany({ where: { type }, include: { user: true } });
  const recipientIds = new Set(userIds);
  for (const extra of extras) if (extra.user.active) recipientIds.add(extra.userId);
  if (recipientIds.size === 0) return;

  await db.notification.createMany({ data: [...recipientIds].map((recipientId) => ({ userId: recipientId, type, title, message, link })) });
}
