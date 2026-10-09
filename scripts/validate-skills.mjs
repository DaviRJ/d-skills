import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");
const errors = [];

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function readFrontmatterName(skillFile) {
  const content = readFileSync(skillFile, "utf8");
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const nameMatch = match[1].match(/^name:\s*(.+?)\s*$/m);
  if (!nameMatch) return null;
  return nameMatch[1].replace(/^["']|["']$/g, "").trim();
}

if (!isDir(root)) {
  console.error(`skills directory not found: ${root}`);
  process.exit(1);
}

const categoryPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const categories = readdirSync(root).filter((entry) => {
  if (entry === "README.md") return false;
  return isDir(join(root, entry));
});

if (categories.length === 0) {
  errors.push("no categories found under skills/");
}

const seen = new Map();

for (const category of categories) {
  if (!categoryPattern.test(category)) {
    errors.push(
      `invalid category name "${category}" (use lowercase letters, numbers, dashes)`,
    );
  }
  const categoryDir = join(root, category);
  const skills = readdirSync(categoryDir).filter((entry) =>
    isDir(join(categoryDir, entry)),
  );
  if (skills.length === 0) {
    errors.push(`category "${category}" has no skills`);
  }
  for (const skill of skills) {
    const skillFile = join(categoryDir, skill, "SKILL.md");
    if (!existsSync(skillFile)) {
      errors.push(`missing SKILL.md in ${category}/${skill}`);
      continue;
    }
    const frontmatterName = readFrontmatterName(skillFile);
    if (!frontmatterName) {
      errors.push(`missing frontmatter name in ${category}/${skill}/SKILL.md`);
      continue;
    }
    if (frontmatterName !== skill) {
      errors.push(
        `name mismatch in ${category}/${skill}: frontmatter "${frontmatterName}" != folder "${skill}"`,
      );
    }
    if (seen.has(skill)) {
      errors.push(
        `duplicate skill "${skill}" in ${seen.get(skill)} and ${category}`,
      );
    } else {
      seen.set(skill, category);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(1);
}

console.log(
  `validated ${seen.size} skills in ${categories.length} categories.`,
);
