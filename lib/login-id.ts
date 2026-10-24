// Sign-in names. Staff log in with a User ID instead of an email address.
// Stored lower case so "Dhanu" and "dhanu" are the same account.
export const LOGIN_ID_MIN = 3;
export const LOGIN_ID_MAX = 32;

export const LOGIN_ID_HINT = `${LOGIN_ID_MIN}-${LOGIN_ID_MAX} characters: letters, numbers, dot, dash or underscore. No spaces.`;

export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Null when acceptable, otherwise why not. Expects an already-normalised ID. */
export function validateLoginId(id: string): string | null {
  if (id.length < LOGIN_ID_MIN || id.length > LOGIN_ID_MAX) return `User ID must be ${LOGIN_ID_MIN}-${LOGIN_ID_MAX} characters.`;
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) return "User ID can only use letters, numbers, dot, dash and underscore, and must start with a letter or number.";
  return null;
}
