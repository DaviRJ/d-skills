import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { discoverCategories } from "../lib/categories.js";
import { planInstall, runInstall } from "../lib/installer.js";
import { askInstallDir, askScope } from "../lib/prompts.js";

export const DEFAULT_DIR = ".agents/skills";

export interface InstallOptions {
  dir?: string;
  category?: string[];
  all?: boolean;
  force?: boolean;
  offline?: boolean;
  dryRun?: boolean;
  skillsRoot: string;
}

export function resolveTargetDir(input: string): string {
  if (input === "~") return homedir();
  const expanded = input.startsWith("~/") ? join(homedir(), input.slice(2)) : input;
  return isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export async function runInstallCommand(options: InstallOptions): Promise<void> {
  const categories = discoverCategories(options.skillsRoot);
  if (categories.length === 0) {
    throw new Error(`No skills found in ${options.skillsRoot}.`);
  }
  const names = categories.map((c) => c.name);
  const requested = options.all ? [] : (options.category ?? []);
  const unknown = requested.filter((c) => !names.includes(c));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown categor${unknown.length === 1 ? "y" : "ies"}: ${unknown.join(", ")}. Available: ${names.join(", ")}`
    );
  }

  let dir = options.dir;
  let selection = requested;
  if (isInteractive()) {
    if (dir === undefined) dir = await askInstallDir(DEFAULT_DIR);
    if (!options.all && selection.length === 0) selection = await askScope(categories);
  }
  const targetDir = resolveTargetDir(dir ?? DEFAULT_DIR);
  const plan = planInstall(categories, selection, targetDir);

  if (options.dryRun) {
    console.log(`Would install ${plan.length} skills to ${targetDir}:`);
    for (const item of plan) console.log(`  ${item.skill} (${item.category})`);
    return;
  }

  const results = await runInstall(plan, { force: options.force });
  const counts = { installed: 0, overwritten: 0, skipped: 0 };
  for (const result of results) {
    counts[result.status] += 1;
    console.log(`${result.status} ${result.skill} (${result.category})`);
  }
  console.log(
    `Done: ${counts.installed} installed, ${counts.overwritten} overwritten, ${counts.skipped} skipped → ${targetDir}`
  );
}
