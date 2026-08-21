"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveResponse, createFindingDetail } from "@/lib/actions/inspections";
import { PhotoUpload } from "./photo-upload";
import { formatAttribution } from "@/lib/format-attribution";
import type { ResponseValue, Severity } from "@/app/generated/prisma/client";

// Debounced auto-save, not onBlur: mobile virtual keyboards and rapid
// navigation don't reliably fire blur before a route change, which would
// silently drop typed text (spec §33 — never lose completed data).
//
// Guards against re-committing the unchanged initial value by comparing to
// the last-committed value, not by a "skip the first effect run" ref flag —
// React's dev-only Strict Mode double-invokes effects, which would consume
// a one-shot flag on the throwaway pass and let the real pass fire anyway,
// silently re-saving (and for a Finding's fields, blanking) unrelated data
// on every mount.
function useDebouncedCommit(value: string, delay: number, commit: (value: string) => void) {
  const lastCommitted = useRef(value);
  useEffect(() => {
    if (value === lastCommitted.current) return;
    const handle = setTimeout(() => {
      lastCommitted.current = value;
      commit(value);
    }, delay);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);
}

type ItemResponse = {
  id: string;
  passFail: ResponseValue | null;
  numericValue: number | null;
  textValue: string | null;
  choiceValue: string | null;
  comment: string | null;
  updatedAt: Date;
  respondedBy: { name: string } | null;
  photoEvidence: Array<{ id: string; storagePath: string; caption: string | null }>;
  finding: { id: string; severity: Severity; reason: string | null; photoEvidence: Array<{ id: string; storagePath: string; caption: string | null }> } | null;
} | null;

export function ChecklistItemCard({
  inspectionId,
  editable,
  item,
  response,
}: {
  inspectionId: string;
  editable: boolean;
  item: {
    id: string;
    prompt: string;
    helpText: string | null;
    type: string;
    required: boolean;
    requiresPhotoOnFail: boolean;
    criticalFailure: boolean;
    minValue: number | null;
    maxValue: number | null;
  };
  response: ItemResponse;
}) {
  const [, startTransition] = useTransition();
  const [numeric, setNumeric] = useState(response?.numericValue?.toString() ?? "");
  const [text, setText] = useState(response?.textValue ?? "");
  const [comment, setComment] = useState(response?.comment ?? "");

  const failed = response?.passFail === "FAIL";
  const needsPhoto = failed && (item.requiresPhotoOnFail || item.criticalFailure);
  // A fail-evidence photo is linked to both the response and its finding, so
  // dedupe by id before rendering rather than concatenating both lists.
  const allPhotos = Array.from(
    new Map([...(response?.photoEvidence ?? []), ...(response?.finding?.photoEvidence ?? [])].map((p) => [p.id, p])).values()
  );

  function setPassFail(value: ResponseValue) {
    startTransition(async () => {
      await saveResponse({ inspectionId, checklistItemId: item.id, passFail: value, comment: comment || undefined });
    });
  }

  function setAcknowledgement(value: "DONE" | "NA") {
    const next = response?.choiceValue === value ? "" : value;
    startTransition(async () => {
      await saveResponse({ inspectionId, checklistItemId: item.id, choiceValue: next });
    });
  }

  function commitNumeric(value: string) {
    setNumeric(value);
    const n = parseFloat(value);
    if (!Number.isNaN(n)) {
      startTransition(async () => {
        await saveResponse({ inspectionId, checklistItemId: item.id, numericValue: n, comment: comment || undefined });
      });
    }
  }

  useDebouncedCommit(text, 600, (value) => {
    startTransition(async () => {
      await saveResponse({ inspectionId, checklistItemId: item.id, textValue: value || undefined });
    });
  });

  useDebouncedCommit(comment, 600, (value) => {
    if (!response?.passFail) return;
    startTransition(async () => {
      await saveResponse({ inspectionId, checklistItemId: item.id, passFail: response.passFail!, comment: value || undefined });
    });
  });

  return (
    <div className={cn("rounded-[var(--radius)] border p-4", failed ? "border-status-critical/40 bg-status-critical-soft/40" : "border-border bg-surface")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {item.prompt}
            {item.required && <span className="ml-1 text-status-critical">*</span>}
          </p>
          {item.helpText && <p className="mt-0.5 text-xs text-muted">{item.helpText}</p>}
        </div>
        {item.criticalFailure && (
          <span className="shrink-0 rounded-full bg-status-critical-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-critical">
            Critical
          </span>
        )}
      </div>

      <div className="mt-3">
        {(item.type === "PASS_FAIL" || item.type === "YES_NO") && (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={!editable}
              onClick={() => setPassFail("PASS")}
              className={cn(
                "h-14 rounded-xl text-sm font-semibold transition-colors",
                response?.passFail === "PASS" ? "bg-status-pass text-white" : "border border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
              )}
            >
              {item.type === "YES_NO" ? "YES" : "PASS"}
            </button>
            <button
              type="button"
              disabled={!editable}
              onClick={() => setPassFail("FAIL")}
              className={cn(
                "h-14 rounded-xl text-sm font-semibold transition-colors",
                response?.passFail === "FAIL" ? "bg-status-critical text-white" : "border border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
              )}
            >
              {item.type === "YES_NO" ? "NO" : "FAIL"}
            </button>
            <button
              type="button"
              disabled={!editable}
              onClick={() => setPassFail("NA")}
              className={cn(
                "h-14 rounded-xl text-sm font-semibold transition-colors",
                response?.passFail === "NA" ? "bg-status-neutral text-white" : "border border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
              )}
            >
              N/A
            </button>
          </div>
        )}

        {item.type === "NUMERIC" &&
          (item.minValue !== null && item.maxValue !== null && item.maxValue - item.minValue <= 10 ? (
            // A small bounded range (e.g. a 0–2 or 0–5 compliance score) is
            // quicker to tap than to type, especially on a phone — the same
            // reasoning as every other tap-to-answer item type in this app.
            <NumericScaleButtons
              editable={editable}
              min={item.minValue}
              max={item.maxValue}
              value={numeric}
              onSelect={(n) => commitNumeric(String(n))}
            />
          ) : (
            <input
              type="number"
              disabled={!editable}
              value={numeric}
              min={item.minValue ?? undefined}
              max={item.maxValue ?? undefined}
              onChange={(e) => commitNumeric(e.target.value)}
              className="h-12 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground outline-none focus:border-accent disabled:opacity-60"
              placeholder={item.maxValue !== null ? `${item.minValue ?? 0} – ${item.maxValue}` : "Enter value"}
            />
          ))}

        {item.type === "ACKNOWLEDGEMENT" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!editable}
              onClick={() => setAcknowledgement("DONE")}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
                response?.choiceValue === "DONE"
                  ? "border-status-pass/40 bg-status-pass-soft text-status-pass"
                  : "border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                  response?.choiceValue === "DONE" ? "border-status-pass bg-status-pass text-white" : "border-border-strong"
                )}
              >
                {response?.choiceValue === "DONE" && (
                  <svg viewBox="0 0 16 16" fill="none" className="size-3">
                    <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {response?.choiceValue === "DONE" ? "Done" : "Mark as done"}
            </button>
            <button
              type="button"
              disabled={!editable}
              onClick={() => setAcknowledgement("NA")}
              className={cn(
                "h-12 rounded-xl border text-sm font-semibold transition-colors",
                response?.choiceValue === "NA"
                  ? "border-status-neutral/40 bg-status-neutral-soft text-status-neutral"
                  : "border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
              )}
            >
              N/A
            </button>
          </div>
        )}

        {item.type === "TEXT" && (
          <textarea
            disabled={!editable}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-60"
            placeholder="Enter notes…"
          />
        )}
      </div>

      {response?.respondedBy && (
        <p className="mt-2 font-mono-tabular text-[11px] text-muted">
          {formatAttribution(response.respondedBy.name, response.updatedAt)}
        </p>
      )}

      {failed && (
        <FindingDetail
          findingId={response?.finding?.id}
          severity={response?.finding?.severity ?? "MINOR"}
          reason={response?.finding?.reason ?? ""}
          editable={editable}
        />
      )}

      {/* Photo evidence is always optionally attachable on a judgement item,
          not just when it failed — spec §18 "Allow photos for each 5S
          category" applies beyond just failures (before/after, general
          proof), so only NUMERIC/TEXT data-entry items skip it. */}
      {(item.type === "PASS_FAIL" || item.type === "YES_NO" || item.type === "ACKNOWLEDGEMENT" || needsPhoto || allPhotos.length > 0) && (
        <div className="mt-3">
          <PhotoUpload
            inspectionId={inspectionId}
            responseId={response?.id}
            findingId={response?.finding?.id}
            existingPhotos={allPhotos}
            required={needsPhoto}
          />
        </div>
      )}

      {editable && (item.type === "PASS_FAIL" || item.type === "YES_NO") && (
        <input
          type="text"
          placeholder="Add a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-3 w-full rounded-lg border border-border bg-surface-sunken px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
        />
      )}
    </div>
  );
}

// Colors the low end of the scale critical and the high end pass, so a 0–2
// score reads the same as PASS/FAIL/N/A at a glance without needing labels
// for every intermediate value on a wider scale (e.g. 0–5).
function scaleButtonTone(n: number, min: number, max: number) {
  if (n === min) return "critical";
  if (n === max) return "pass";
  return "warn";
}

function NumericScaleButtons({
  editable,
  min,
  max,
  value,
  onSelect,
}: {
  editable: boolean;
  min: number;
  max: number;
  value: string;
  onSelect: (n: number) => void;
}) {
  const selected = value === "" ? null : Number(value);
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((n) => {
        const isSelected = selected === n;
        const tone = scaleButtonTone(n, min, max);
        return (
          <button
            key={n}
            type="button"
            disabled={!editable}
            onClick={() => onSelect(n)}
            className={cn(
              "h-14 rounded-xl text-lg font-semibold transition-colors",
              isSelected
                ? tone === "critical"
                  ? "bg-status-critical text-white"
                  : tone === "pass"
                    ? "bg-status-pass text-white"
                    : "bg-status-warn text-white"
                : "border border-border-strong bg-surface text-muted-strong hover:bg-surface-sunken"
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

function FindingDetail({
  findingId,
  severity,
  reason,
  editable,
}: {
  findingId?: string;
  severity: Severity;
  reason: string;
  editable: boolean;
}) {
  const [, startTransition] = useTransition();
  const [localSeverity, setLocalSeverity] = useState(severity);
  const [localReason, setLocalReason] = useState(reason);

  useDebouncedCommit(localReason, 600, (value) => {
    if (!findingId) return;
    startTransition(async () => {
      await createFindingDetail({ findingId, severity: localSeverity, reason: value });
    });
  });

  if (!findingId) return null;

  function setSeverity(s: Severity) {
    setLocalSeverity(s);
    startTransition(async () => {
      await createFindingDetail({ findingId: findingId!, severity: s, reason: localReason });
    });
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-status-critical/30 bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-strong">Severity</span>
        <div className="flex gap-1">
          {(["MINOR", "MAJOR", "CRITICAL"] as Severity[]).map((s) => (
            <button
              key={s}
              type="button"
              disabled={!editable}
              onClick={() => setSeverity(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                localSeverity === s ? "bg-status-critical text-white" : "bg-surface-sunken text-muted-strong"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <textarea
        disabled={!editable}
        value={localReason}
        onChange={(e) => setLocalReason(e.target.value)}
        rows={2}
        placeholder="Reason / immediate correction taken…"
        className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
      />
    </div>
  );
}
