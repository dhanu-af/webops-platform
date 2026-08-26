"use client";

import { useMemo, useState } from "react";
import { generateMorningReportText } from "@/lib/generate-morning-report";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Bay, MiscItem } from "./drying-room-client";

export default function ReportTab({ bays, misc }: { bays: Bay[]; misc: MiscItem[] }) {
  const [copied, setCopied] = useState(false);

  const reportText = useMemo(
    () =>
      generateMorningReportText(
        bays.map((b) => ({ bayNumber: b.bayNumber, purpose: b.purpose, batches: b.batches })),
        misc.map((m) => ({ product: m.product, quantityLabel: m.quantityLabel, status: m.status }))
      ),
    [bays, misc]
  );

  function copyText() {
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadPdf() {
    window.open("/api/drying-room/report/pdf", "_blank");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Morning Report</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={copyText}>
            {copied ? "Copied!" : "Copy Text"}
          </Button>
          <Button variant="secondary" size="sm" onClick={downloadPdf}>
            Download PDF
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted">
        Ready to paste into WhatsApp as-is — the same text shown here is what generates the PDF, so there&apos;s one source of truth for the report.
      </p>
      <Card>
        <CardContent>
          <pre className="whitespace-pre-wrap text-xs text-foreground">{reportText}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
