import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Category } from "./categories.js";

export interface InstallPlanItem {
  skill: string;
  category: string;
  sourceDir: string;
  targetDir: string;
}

export interface InstallResult extends InstallPlanItem {
  status: "installed" | "skipped" | "overwritten";
}

export interface RunInstallOptions {
  force?: boolean;
  dryRun?: boolean;
}

export function planInstall(
  categories: Category[],
  selection: string[],
  targetDir: string,
): InstallPlanItem[] {
  const wanted =
    selection.length === 0
      ? categories
      : categories.filter((c) => selection.includes(c.name));
  const plan: InstallPlanItem[] = [];
  for (const category of wanted) {
    for (const skill of category.skills) {
      plan.push({
        skill: skill.name,
        category: category.name,
        sourceDir: skill.dir,
        targetDir: join(targetDir, skill.name),
      });
    }
  }
  return plan;
}

export async function runInstall(
  plan: InstallPlanItem[],
  options: RunInstallOptions = {},
): Promise<InstallResult[]> {
  const { force = false, dryRun = false } = options;
  const results: InstallResult[] = [];
  for (const item of plan) {
    const exists = existsSync(item.targetDir);
    if (exists && !force) {
      results.push({ ...item, status: "skipped" });
      continue;
    }
    if (!dryRun) {
      mkdirSync(dirname(item.targetDir), { recursive: true });
      if (exists) rmSync(item.targetDir, { recursive: true, force: true });
      cpSync(item.sourceDir, item.targetDir, { recursive: true });
    }
    results.push({ ...item, status: exists ? "overwritten" : "installed" });
  }
  return results;
}
