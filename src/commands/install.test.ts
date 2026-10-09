import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { resolveTargetDir, runInstallCommand } from "./install.js";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "dskills-cmd-"));
  const skills = join(root, "skills");
  mkdirSync(join(skills, "cat-a", "skill-one"), { recursive: true });
  writeFileSync(
    join(skills, "cat-a", "skill-one", "SKILL.md"),
    "---\nname: skill-one\ndescription: First.\n---\n",
  );
  return skills;
}

describe("resolveTargetDir", () => {
  it("resolves relative paths against cwd", () => {
    expect(resolveTargetDir(".agents/skills")).toBe(
      join(process.cwd(), ".agents/skills"),
    );
  });

  it("keeps absolute paths", () => {
    expect(resolveTargetDir("/tmp/demo")).toBe("/tmp/demo");
  });

  it("expands tilde", () => {
    expect(resolveTargetDir("~/skills")).toBe(
      join(process.env.HOME ?? "", "skills"),
    );
  });
});

describe("runInstallCommand", () => {
  it("rejects unknown categories", async () => {
    await expect(
      runInstallCommand({ skillsRoot: fixture(), category: ["nope"] }),
    ).rejects.toThrow("Unknown category: nope");
  });

  it("rejects empty skills root", async () => {
    await expect(
      runInstallCommand({ skillsRoot: join(tmpdir(), "missing") }),
    ).rejects.toThrow("No skills found");
  });
});
