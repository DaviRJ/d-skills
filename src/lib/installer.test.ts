import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { discoverCategories } from "./categories.js";
import { planInstall, runInstall } from "./installer.js";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "dskills-install-"));
  const skills = join(root, "skills");
  const layout: Record<string, string[]> = {
    "cat-a": ["skill-one", "skill-two"],
    "cat-b": ["skill-three"],
  };
  for (const [category, names] of Object.entries(layout)) {
    for (const name of names) {
      const dir = join(skills, category, name);
      mkdirSync(join(dir, "references"), { recursive: true });
      writeFileSync(
        join(dir, "SKILL.md"),
        `---\nname: ${name}\ndescription: ${name}.\n---\n`,
      );
      writeFileSync(join(dir, "references", "notes.md"), `${name} notes`);
    }
  }
  return skills;
}

describe("planInstall", () => {
  it("plans all skills with flat target layout", () => {
    const categories = discoverCategories(fixture());
    const plan = planInstall(categories, [], join(tmpdir(), "target"));
    expect(plan).toHaveLength(3);
    expect(plan.map((i) => i.targetDir)).toEqual(
      plan.map((i) => join(tmpdir(), "target", i.skill)),
    );
  });

  it("plans a single category", () => {
    const categories = discoverCategories(fixture());
    const plan = planInstall(categories, ["cat-b"], join(tmpdir(), "target"));
    expect(plan.map((i) => i.skill)).toEqual(["skill-three"]);
  });
});

describe("runInstall", () => {
  it("installs, skips existing, overwrites with force", async () => {
    const skillsRoot = fixture();
    const target = mkdtempSync(join(tmpdir(), "dskills-target-"));
    const categories = discoverCategories(skillsRoot);
    const plan = planInstall(categories, [], target);

    const first = await runInstall(plan);
    expect(first.every((r) => r.status === "installed")).toBe(true);
    expect(existsSync(join(target, "skill-one", "SKILL.md"))).toBe(true);
    expect(
      existsSync(join(target, "skill-one", "references", "notes.md")),
    ).toBe(true);
    expect(
      readFileSync(join(target, "skill-two", "SKILL.md"), "utf8"),
    ).toContain("skill-two");

    const second = await runInstall(plan);
    expect(second.every((r) => r.status === "skipped")).toBe(true);

    writeFileSync(join(target, "skill-one", "SKILL.md"), "tampered");
    const third = await runInstall(plan, { force: true });
    expect(third.every((r) => r.status === "overwritten")).toBe(true);
    expect(
      readFileSync(join(target, "skill-one", "SKILL.md"), "utf8"),
    ).toContain("skill-one");
  });

  it("dry-run writes nothing", async () => {
    const skillsRoot = fixture();
    const target = join(tmpdir(), `dskills-dry-${Date.now()}`);
    const categories = discoverCategories(skillsRoot);
    const results = await runInstall(planInstall(categories, [], target), {
      dryRun: true,
    });
    expect(results.every((r) => r.status === "installed")).toBe(true);
    expect(existsSync(target)).toBe(false);
  });
});
