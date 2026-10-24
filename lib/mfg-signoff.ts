import { can } from "@/lib/permissions";
import { UserFacingError } from "@/lib/user-error";

type Actor = { id: string; name: string; role: Parameters<typeof can>[0] };

// A completed batch record is locked: its stages can no longer be edited.
export function assertBatchOpen(batch: { status: string; batchNumber: string }) {
  if (batch.status === "COMPLETED") throw new UserFacingError(`Batch ${batch.batchNumber} is completed and locked, so this stage can no longer be changed.`);
}

// The name and time beside a sign-off ("completed by", "blended by", ...) are always the signed-in user
// and the server clock, never text typed into the form. The first sign-off stands: later saves keep it,
// and it cannot be erased or handed to someone else from the form.
export function signOff(actor: Actor, existing: { name: string | null; at: Date | null } | null, typedName: string | null | undefined) {
  if (!typedName?.trim()) return { name: existing?.name ?? null, at: existing?.at ?? null };
  if (existing?.name) return { name: existing.name, at: existing.at };
  return { name: actor.name, at: new Date() };
}

// "Checked by" is a second person: a Supervisor/QA-level role, and not the person who did the work.
export function checkOff(actor: Actor, existing: { name: string | null; at: Date | null } | null, typedName: string | null | undefined, doneByName: string | null) {
  if (!typedName?.trim() || existing?.name) return signOff(actor, existing, typedName);
  if (!can(actor.role, "mfg.manage")) throw new UserFacingError("Only a Supervisor or QA can check this stage.");
  if (doneByName && doneByName === actor.name) throw new UserFacingError("The person who completed this stage cannot also check it.");
  return signOff(actor, existing, typedName);
}
