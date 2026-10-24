// Sign-in lockout. After MAX_FAILED_LOGINS wrong passwords in a row an account is
// locked for LOCK_MINUTES; a correct password (or an admin password reset)
// clears the count. Kept in the database, not in memory, because the app runs
// as many short-lived serverless instances.
export const MAX_FAILED_LOGINS = 8;
export const LOCK_MINUTES = 15;

// A valid bcrypt hash of a random string. Compared against when the User ID is
// unknown, inactive or locked, so those paths take as long as a real check and
// response time does not reveal which User IDs exist.
export const DUMMY_PASSWORD_HASH = "$2b$10$wQlvythJ5MfLcvFHHgDbJOS1ZVWzpAfNOVdmibbh8kc.6eYX3DFrK";

export function isLocked(lockedUntil: Date | null | undefined, now: Date = new Date()): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}

/** The new counter after one more wrong password. */
export function afterFailedLogin(failedLogins: number, now: Date = new Date()): { failedLogins: number; lockedUntil: Date | null } {
  const next = failedLogins + 1;
  if (next >= MAX_FAILED_LOGINS) return { failedLogins: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) };
  return { failedLogins: next, lockedUntil: null };
}
