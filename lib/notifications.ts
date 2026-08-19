import { db } from "@/lib/db";
import type { NotificationType } from "@/app/generated/prisma/client";

export async function notify(userId: string, type: NotificationType, title: string, message: string, link?: string) {
  await db.notification.create({ data: { userId, type, title, message, link } });
}
