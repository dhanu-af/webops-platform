import { KioskTargetView } from "@/components/kiosk/kiosk-target";

export const dynamic = "force-dynamic";

export default async function KioskAreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KioskTargetView kind="a" id={id} />;
}
