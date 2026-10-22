// Errors the user is meant to read ("A corrective action is required...",
// "Password incorrect..."). In production Next.js replaces the message of any
// error thrown out of a server action with a generic one, so for the actions
// that return an ActionResult these are caught and sent back as data instead
// -- the message then reaches the screen intact.
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function runAction(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    throw e;
  }
}
