"use client";

import { useEffect, useState } from "react";
import { findIngredientLibraryMatch } from "@/lib/actions/ingredient-actions";
import { Badge } from "@/components/ui/badge";
import type { Ingredient as IngredientDetail } from "@/app/generated/prisma/client";

const AUTHORITY_ROWS: { key: keyof IngredientDetail; label: string }[] = [
  { key: "tgaStatus", label: "TGA" },
  { key: "apvmaStatus", label: "APVMA" },
  { key: "fdaStatus", label: "FDA" },
  { key: "emaStatus", label: "EMA" },
  { key: "aicisStatus", label: "AICIS" },
];

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <p className="text-sm text-foreground">
      <span className="font-medium">{label}: </span>
      <span className="text-muted">{value}</span>
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 border-t border-border pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted/70">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function hasAny(...values: (string | null | undefined)[]) {
  return values.some((v) => !!v);
}

export default function IngredientModal({ ingredientName, onClose }: { ingredientName: string; onClose: () => void }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "unauthorized" }
    | { status: "not-found" }
    | { status: "found"; ingredient: NonNullable<IngredientDetail> }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    findIngredientLibraryMatch(ingredientName).then((result) => {
      if (cancelled) return;
      if (!result.authorized) setState({ status: "unauthorized" });
      else if (!result.ingredient) setState({ status: "not-found" });
      else setState({ status: "found", ingredient: result.ingredient });
    });
    return () => {
      cancelled = true;
    };
  }, [ingredientName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-md)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{ingredientName}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        {state.status === "loading" && <p className="text-sm text-muted">Looking up Ingredient Library entry…</p>}

        {state.status === "unauthorized" && <p className="text-sm text-muted">Sign in to view Ingredient Library details.</p>}

        {state.status === "not-found" && <p className="text-sm text-muted">No matching entry found in the Ingredient Library for &quot;{ingredientName}&quot;.</p>}

        {state.status === "found" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {state.ingredient.category && <Badge tone="neutral">{state.ingredient.category}</Badge>}
              {state.ingredient.verified ? <Badge tone="pass">✓ Verified</Badge> : <Badge tone="warn">Not Yet Verified</Badge>}
            </div>

            {state.ingredient.mainBenefit && (
              <p className="text-sm text-foreground">
                <span className="font-medium">Main benefit: </span>
                {state.ingredient.mainBenefit}
              </p>
            )}
            {state.ingredient.usedFor && (
              <p className="text-sm text-foreground">
                <span className="font-medium">Used for: </span>
                <span className="text-muted">{state.ingredient.usedFor}</span>
              </p>
            )}

            <Section title="General Information">
              <DetailRow label="Chemical name" value={state.ingredient.chemicalName} />
              <DetailRow label="CAS number" value={state.ingredient.casNumber} />
              <DetailRow label="Formula" value={state.ingredient.molecularFormula} />
              <DetailRow label="Molecular weight" value={state.ingredient.molecularWeight} />
              <DetailRow label="Synonyms" value={state.ingredient.synonyms} />
            </Section>

            {hasAny(
              state.ingredient.tgaStatus,
              state.ingredient.apvmaStatus,
              state.ingredient.fdaStatus,
              state.ingredient.emaStatus,
              state.ingredient.aicisStatus,
              state.ingredient.regulatoryStatus
            ) && (
              <Section title="Regulatory Status">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted">
                        <th className="py-1 pr-3 font-medium">Authority</th>
                        <th className="py-1 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {AUTHORITY_ROWS.map((row) => (
                        <tr key={row.key} className="border-t border-border/60">
                          <td className="py-1 pr-3 text-foreground">{row.label}</td>
                          <td className="py-1 text-muted">{(state.ingredient[row.key] as string | null) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <DetailRow label="Summary" value={state.ingredient.regulatoryStatus} />
              </Section>
            )}

            <DetailRow label="Typical dosage / use level" value={state.ingredient.typicalDosage} />
            <DetailRow label="Storage conditions" value={state.ingredient.storageConditions} />
            <DetailRow label="Shelf life" value={state.ingredient.shelfLife} />

            {hasAny(
              state.ingredient.safetyNotes,
              state.ingredient.ghsClassification,
              state.ingredient.signalWord,
              state.ingredient.ppe,
              state.ingredient.handlingPrecautions
            ) && (
              <Section title="Safety">
                <DetailRow label="Safety & handling" value={state.ingredient.safetyNotes} />
                <DetailRow label="GHS classification" value={state.ingredient.ghsClassification} />
                <DetailRow label="Signal word" value={state.ingredient.signalWord} />
                <DetailRow label="PPE" value={state.ingredient.ppe} />
                <DetailRow label="Handling precautions" value={state.ingredient.handlingPrecautions} />
              </Section>
            )}

            {hasAny(
              state.ingredient.qcIdentity,
              state.ingredient.qcAssay,
              state.ingredient.qcMoisture,
              state.ingredient.qcHeavyMetals,
              state.ingredient.qcMicrobialLimits
            ) && (
              <Section title="Quality Specifications">
                <DetailRow label="Identity" value={state.ingredient.qcIdentity} />
                <DetailRow label="Assay" value={state.ingredient.qcAssay} />
                <DetailRow label="Moisture" value={state.ingredient.qcMoisture} />
                <DetailRow label="Heavy metals" value={state.ingredient.qcHeavyMetals} />
                <DetailRow label="Microbial limits" value={state.ingredient.qcMicrobialLimits} />
              </Section>
            )}

            {hasAny(
              state.ingredient.appearance,
              state.ingredient.colour,
              state.ingredient.odour,
              state.ingredient.solubility,
              state.ingredient.density,
              state.ingredient.meltingPoint,
              state.ingredient.phValue
            ) && (
              <Section title="Physical Properties">
                <DetailRow label="Appearance" value={state.ingredient.appearance} />
                <DetailRow label="Colour" value={state.ingredient.colour} />
                <DetailRow label="Odour" value={state.ingredient.odour} />
                <DetailRow label="Solubility" value={state.ingredient.solubility} />
                <DetailRow label="Density" value={state.ingredient.density} />
                <DetailRow label="Melting point" value={state.ingredient.meltingPoint} />
                <DetailRow label="pH" value={state.ingredient.phValue} />
              </Section>
            )}

            {state.ingredient.faq && (
              <Section title="FAQ">
                <p className="text-sm text-muted">{state.ingredient.faq}</p>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
