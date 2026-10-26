import { KioskTargetView } from "@/components/kiosk/kiosk-target";

export const dynamic = "force-dynamic";

export default async function KioskMachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KioskTargetView kind="e" id={id} />;
}
