// Password rules (URS-01). Pure and dependency-free so the same check runs in
// the browser forms and in the server actions -- the server is the one that
// actually enforces it.
export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_POLICY_HINT =
  `At least ${PASSWORD_MIN_LENGTH} characters, mixing at least three of: upper case, lower case, numbers, symbols. ` +
  "It must not contain your name or email, or be a common password.";

// Deliberately short: the length + variety rules do the heavy lifting, this
// only catches the passwords that technically satisfy them but are everywhere.
const COMMON = ["password", "passw0rd", "welcome", "letmein", "qwerty", "admin123", "changeme", "123456", "iloveyou", "monkey", "dragon", "football"];

export function validatePassword(password: string, context: { email?: string; name?: string } = {}): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) problems.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) problems.push("Mix at least three of: upper case, lower case, numbers, symbols.");

  const lower = password.toLowerCase();
  const emailLocal = context.email?.split("@")[0]?.toLowerCase();
  if (emailLocal && emailLocal.length >= 3 && lower.includes(emailLocal)) problems.push("Don't include your email name in the password.");
  for (const part of (context.name ?? "").toLowerCase().split(/\s+/).filter((p) => p.length >= 3)) {
    if (lower.includes(part)) {
      problems.push("Don't include your name in the password.");
      break;
    }
  }
  if (COMMON.some((c) => lower.includes(c))) problems.push("That password is too common.");
  return problems;
}

/** Throws one readable Error if the password breaks the policy. */
export function assertPasswordPolicy(password: string, context: { email?: string; name?: string } = {}) {
  const problems = validatePassword(password, context);
  if (problems.length) throw new Error(`Password not accepted. ${problems.join(" ")}`);
}
