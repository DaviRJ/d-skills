import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export interface Skill {
  name: string;
  description: string;
  category: string;
  dir: string;
}

export interface Category {
  name: string;
  dir: string;
  skills: Skill[];
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function parseFrontmatterField(content: string, field: string): string | null {
  const block = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!block) return null;
  const line = block[1].match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, "m"));
  if (!line) return null;
  return line[1].replace(/^["']|["']$/g, "").trim();
}

export function discoverCategories(skillsRoot: string): Category[] {
  if (!isDirectory(skillsRoot)) return [];
  const categories: Category[] = [];
  for (const categoryName of readdirSync(skillsRoot).sort()) {
    const categoryDir = join(skillsRoot, categoryName);
    if (!isDirectory(categoryDir)) continue;
    const skills: Skill[] = [];
    for (const skillName of readdirSync(categoryDir).sort()) {
      const skillDir = join(categoryDir, skillName);
      if (!isDirectory(skillDir)) continue;
      let description = "";
      try {
        const skillFile = readFileSync(join(skillDir, "SKILL.md"), "utf8");
        description = parseFrontmatterField(skillFile, "description") ?? "";
      } catch {
        continue;
      }
      skills.push({
        name: skillName,
        description,
        category: categoryName,
        dir: skillDir,
      });
    }
    categories.push({ name: categoryName, dir: categoryDir, skills });
  }
  return categories;
}

function levenshtein(a: string, b: string): number {
  const grid = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) grid[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      grid[i][j] = Math.min(
        grid[i - 1][j] + 1,
        grid[i][j - 1] + 1,
        grid[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return grid[a.length][b.length];
}

export function suggestSimilar(
  input: string,
  names: string[],
): string | undefined {
  const lower = input.toLowerCase();
  const partial = names.find(
    (name) =>
      name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase()),
  );
  if (partial) return partial;
  let best: string | undefined;
  let bestDist = 3;
  for (const name of names) {
    const dist = levenshtein(lower, name.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return best;
}
