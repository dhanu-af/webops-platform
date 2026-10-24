import type { Outcome } from "@/lib/user-error";

// Client side of the server-action error contract. In production Next.js
// replaces the text of anything thrown out of a server action with a generic
// message, so the actions in lib/actions return `{ ok: false, error }` instead
// (see guard() in lib/user-error.ts). This turns that back into a normal
// rejected promise, so the existing `try { await action() } catch (e) { e.message }`
// code in the forms shows the real reason, such as "A facility with code X already exists".
export function unwrapAction<A extends unknown[], T>(fn: (...args: A) => Promise<Outcome<T>>) {
  return async (...args: A): Promise<T> => {
    const result = await fn(...args);
    if (!result.ok) throw new Error(result.error);
    return result.data;
  };
}
