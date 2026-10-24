import { describe, expect, it } from "vitest";
import { generateTemporaryPassword } from "@/lib/temp-password";
import { validatePassword } from "@/lib/password-policy";

describe("temporary passwords", () => {
  it("always satisfy the password policy", () => {
    for (let i = 0; i < 300; i++) {
      const pw = generateTemporaryPassword();
      expect(pw).toHaveLength(12);
      expect(validatePassword(pw)).toEqual([]);
    }
  });
  it("avoid look-alike characters and are not repeated", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const pw = generateTemporaryPassword();
      expect(pw).not.toMatch(/[IOl01o]/);
      seen.add(pw);
    }
    expect(seen.size).toBe(200);
  });
});
