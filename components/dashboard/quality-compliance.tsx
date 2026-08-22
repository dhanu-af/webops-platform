import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { StatusTone } from "@/lib/status";

const TONE_VAR: Record<StatusTone, string> = {
  pass: "var(--status-pass)",
  warn: "var(--status-warn)",
  attention: "var(--status-attention)",
  critical: "var(--status-critical)",
  neutral: "var(--muted)",
  accent: "var(--accent)",
};

function ProgressRing({ value, label, tone }: { value: number | null; label: string; tone: StatusTone }) {
  const size = 104;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = value ?? 0;
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-sunken)" strokeWidth={stroke} fill="none" />
          {value !== null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={TONE_VAR[tone]}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono-tabular text-xl font-semibold text-foreground">
          {value !== null ? `${value}%` : "—"}
        </div>
      </div>
      <p className="text-center text-xs font-medium text-muted-strong">{label}</p>
    </div>
  );
}

export function QualityCompliance({
  inspectionCompletion,
  correctiveActionClosure,
  auditReadiness,
  fiveSScore,
}: {
  inspectionCompletion: number | null;
  correctiveActionClosure: number | null;
  auditReadiness: number | null;
  fiveSScore: number | null;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Quality &amp; Compliance</CardTitle>
          <CardDescription>Rolling health indicators across the facility</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <ProgressRing value={inspectionCompletion} label="Inspection Completion" tone="accent" />
          <ProgressRing value={correctiveActionClosure} label="Corrective Action Closure" tone="pass" />
          <ProgressRing value={auditReadiness} label="Audit Readiness" tone="warn" />
          <ProgressRing value={fiveSScore} label="5S Score" tone="attention" />
        </div>
      </CardContent>
    </Card>
  );
}
