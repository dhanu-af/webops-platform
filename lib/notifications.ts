import { db } from "@/lib/db";
import type { NotificationType } from "@/app/generated/prisma/client";

export async function notify(userId: string, type: NotificationType, title: string, message: string, link?: string) {
  // A missing row means "enabled" (the default, hardcoded-always-on
  // behaviour) — only an explicit disabled row suppresses this type.
  const setting = await db.notificationSetting.findUnique({ where: { type } });
  if (setting?.enabled === false) return;

  await db.notification.create({ data: { userId, type, title, message, link } });
}
