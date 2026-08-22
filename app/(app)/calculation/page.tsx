import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getFacilityTimezone, formatDateTimeInTimeZone } from "@/lib/timezone";
import { listCalculations } from "@/lib/actions/capsule-calculations";
import { CalculationClient } from "./calculation-client";

export default async function CalculationPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.view")) notFound();

  const [calculations, timeZone] = await Promise.all([listCalculations(), getFacilityTimezone()]);

  return (
    <CalculationClient
      calculations={calculations.map((c) => ({
        id: c.id,
        direction: c.direction,
        label: c.label,
        capsulesPerBottle: c.capsulesPerBottle,
        avgWeightMg: c.avgWeightMg,
        inputValue: c.inputValue,
        resultKg: c.resultKg,
        resultCapsules: c.resultCapsules,
        resultBottles: c.resultBottles,
        createdByName: c.createdBy.name,
        createdAtLabel: formatDateTimeInTimeZone(c.createdAt, timeZone),
      }))}
    />
  );
}
