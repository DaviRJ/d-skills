import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { runList } from "./list.js";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "dskills-list-"));
  const skills = join(root, "skills");
  mkdirSync(join(skills, "cat-a", "skill-one"), { recursive: true });
  writeFileSync(
    join(skills, "cat-a", "skill-one", "SKILL.md"),
    "---\nname: skill-one\ndescription: First skill.\n---\n",
  );
  return skills;
}

describe("runList", () => {
  it("prints categories and skills", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      runList({ skillsRoot: fixture() });
      const output = log.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("cat-a");
      expect(output).toContain("skill-one");
    } finally {
      log.mockRestore();
    }
  });
});
