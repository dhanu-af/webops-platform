// Temporary passwords an admin hands to a new or locked-out user. The user must
// replace it at first sign-in (User.mustChangePassword). Uses the Web Crypto
// API, which exists in both the browser and Node, so the admin forms can
// generate one without a server round trip -- the password is only ever sent
// to the server when the admin saves it.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O: easy to misread when read aloud or written down
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // no l/o
const DIGITS = "23456789"; // no 0/1
const SYMBOLS = "!@#$%&*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function randomIndex(max: number): number {
  // Rejection sampling so the result is uniform (no modulo bias).
  const limit = 256 - (256 % max);
  const buf = new Uint8Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

const pick = (set: string) => set[randomIndex(set.length)];

export function generateTemporaryPassword(length = 12): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
