import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { discoverCategories, suggestSimilar } from "./categories.js";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "dskills-"));
  const skills = join(root, "skills");
  mkdirSync(join(skills, "cat-a", "skill-one"), { recursive: true });
  mkdirSync(join(skills, "cat-b", "skill-two"), { recursive: true });
  writeFileSync(
    join(skills, "cat-a", "skill-one", "SKILL.md"),
    "---\nname: skill-one\ndescription: First skill.\n---\n",
  );
  writeFileSync(
    join(skills, "cat-b", "skill-two", "SKILL.md"),
    "---\nname: skill-two\ndescription: Second skill.\n---\n",
  );
  return skills;
}

describe("discoverCategories", () => {
  it("discovers categories and skills from directories", () => {
    const categories = discoverCategories(fixture());
    expect(categories.map((c) => c.name)).toEqual(["cat-a", "cat-b"]);
    expect(categories[0].skills.map((s) => s.name)).toEqual(["skill-one"]);
    expect(categories[1].skills[0].description).toBe("Second skill.");
  });

  it("returns empty array for missing root", () => {
    expect(discoverCategories(join(tmpdir(), "does-not-exist"))).toEqual([]);
  });
});

describe("suggestSimilar", () => {
  const names = ["design", "integrations"];

  it("suggests on typos and partial input", () => {
    expect(suggestSimilar("desgin", names)).toBe("design");
    expect(suggestSimilar("desig", names)).toBe("design");
    expect(suggestSimilar("integration", names)).toBe("integrations");
  });

  it("returns undefined when nothing is close", () => {
    expect(suggestSimilar("zzz", names)).toBeUndefined();
  });
});
