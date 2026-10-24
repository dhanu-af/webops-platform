import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// A whole-user include (`operator: true`) loads passwordHash, and anything handed to a
// client component is serialized into the page. Use `{ select: SAFE_USER }` instead.
const USER_RELATIONS = /\b(user|actor|operator|supervisor|qa|respondedBy|uploadedBy|assignedUser|responsibleUser|closedBy|verifiedBy|createdBy|collectedBy|testedBy)\s*:\s*true\b/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "generated" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

describe("user relations never expose the password hash", () => {
  it("no query includes a whole User row", () => {
    const offenders: string[] = [];
    for (const dir of ["lib", "app", "components"]) {
      for (const file of sourceFiles(join(process.cwd(), dir))) {
        readFileSync(file, "utf8").split("\n").forEach((line, i) => {
          if (USER_RELATIONS.test(line) && !line.includes("select:")) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
