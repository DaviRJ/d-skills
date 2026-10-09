import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import * as p from "@clack/prompts";
import {
  discoverCategories,
  suggestSimilar,
  type Category,
} from "../lib/categories.js";
import {
  downloadTarball,
  extractSkills,
  listTarballCategories,
  resolveRef,
  resolveRepo,
} from "../lib/github.js";
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
  const expanded = input.startsWith("~/")
    ? join(homedir(), input.slice(2))
    : input;
  return isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function assertKnownCategories(requested: string[], names: string[]): void {
  const unknown = requested.filter((c) => !names.includes(c));
  if (unknown.length === 0) return;
  const hints = unknown.flatMap((u) => {
    const match = suggestSimilar(u, names);
    return match ? [`"${u}" → "${match}"`] : [];
  });
  throw new Error(
    `Unknown categor${unknown.length === 1 ? "y" : "ies"}: ${unknown.join(", ")}.` +
      `${hints.length > 0 ? ` Did you mean: ${hints.join(", ")}?` : ""}` +
      ` Available: ${names.join(", ")}`,
  );
}

export async function runInstallCommand(
  options: InstallOptions,
): Promise<void> {
  const requested = options.all ? [] : (options.category ?? []);
  let categories: Category[];
  let cleanup: (() => void) | undefined;

  if (options.offline) {
    categories = discoverCategories(options.skillsRoot);
    if (categories.length === 0) {
      throw new Error(`No skills found in ${options.skillsRoot}.`);
    }
  } else {
    const repo = resolveRepo();
    const ref = resolveRef();
    const tarball = await downloadTarball(repo, ref);
    const available = await listTarballCategories(tarball);
    if (available.length === 0) {
      throw new Error(`No skills found in ${repo}@${ref}.`);
    }
    assertKnownCategories(requested, available);
    const workDir = mkdtempSync(join(tmpdir(), "dskills-"));
    cleanup = () => rmSync(workDir, { recursive: true, force: true });
    await extractSkills(tarball, workDir, requested);
    categories = discoverCategories(join(workDir, "skills"));
  }

  try {
    assertKnownCategories(
      requested,
      categories.map((c) => c.name),
    );

    const interactive = isInteractive();
    let dir = options.dir;
    let selection = requested;
    if (interactive) {
      p.intro("d-skills");
      if (dir === undefined) dir = await askInstallDir(DEFAULT_DIR);
      if (!options.all && selection.length === 0)
        selection = await askScope(categories);
    }
    const targetDir = resolveTargetDir(dir ?? DEFAULT_DIR);
    const plan = planInstall(categories, selection, targetDir);

    if (options.dryRun) {
      console.log(`Would install ${plan.length} skills to ${targetDir}:`);
      for (const item of plan)
        console.log(`  ${item.skill} (${item.category})`);
      if (interactive) p.outro("Dry run — nothing was copied.");
      return;
    }

    const results = await runInstall(plan, { force: options.force });
    const counts = { installed: 0, overwritten: 0, skipped: 0 };
    for (const result of results) {
      counts[result.status] += 1;
      console.log(`${result.status} ${result.skill} (${result.category})`);
    }
    const summary =
      `Done: ${counts.installed} installed, ${counts.overwritten} overwritten, ` +
      `${counts.skipped} skipped → ${targetDir}`;
    if (interactive) {
      p.outro(`${summary}\nSkills land directly under the target directory.`);
    } else {
      console.log(summary);
    }
  } finally {
    cleanup?.();
  }
}
