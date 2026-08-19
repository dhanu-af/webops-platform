import { db } from "@/lib/db";
import type { ChecklistCategory } from "@/app/generated/prisma/client";
import { startOfDay, endOfDay } from "date-fns";

export async function getSchedulesByCategory(category: ChecklistCategory) {
  const now = new Date();
  return db.checklistSchedule.findMany({
    where: { active: true, startDate: { lte: now }, checklist: { category } },
    include: {
      checklist: true,
      facility: true,
      section: true,
      area: true,
      equipment: true,
      inspections: { where: { createdAt: { gte: startOfDay(now), lte: endOfDay(now) } }, take: 1 },
    },
    orderBy: [{ dueTime: "asc" }],
  });
}
