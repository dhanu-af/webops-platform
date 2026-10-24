// A Prisma "record not found" (findUniqueOrThrow and friends) is a real 404.
// Anything else -- a dropped connection, a timeout -- is a failure that must
// reach the error screen, not be disguised as "page not found".
export function isRecordNotFound(e: unknown): boolean {
  const err = e as { code?: string; name?: string } | null;
  return err?.code === "P2025" || err?.name === "NotFoundError";
}
