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

/**
 * Result of a server action whose thrown UserFacingError messages must reach
 * the screen. See guard() and lib/actions-client/unwrap.ts.
 */
export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Runs an action body and turns a UserFacingError into `{ ok: false, error }`.
 * Anything else (a real bug, a redirect) is rethrown untouched, so Next.js can
 * still handle `redirect()` and report unexpected failures.
 */
export async function guard<T>(fn: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    throw e;
  }
}
