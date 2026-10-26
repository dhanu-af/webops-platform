import { KioskChecklistView } from "@/components/kiosk/kiosk-checklist";

export const dynamic = "force-dynamic";

export default async function KioskChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KioskChecklistView id={id} />;
}
