import * as p from "@clack/prompts";
import type { Category } from "./categories.js";

export const CUSTOM_DIR = "__custom__";

export const INSTALL_PRESETS = [
  ".agents/skills",
  ".claude/skills",
  ".codex/skills",
  ".cursor/skills",
];

export async function askInstallDir(defaultDir: string): Promise<string> {
  const presets = [...new Set([defaultDir, ...INSTALL_PRESETS])];
  const choice = await p.select({
    message: "Install directory?",
    options: [
      ...presets.map((dir) => ({ value: dir, label: dir })),
      { value: CUSTOM_DIR, label: "Custom path..." },
    ],
  });
  if (p.isCancel(choice)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  if (choice !== CUSTOM_DIR) return choice as string;
  const custom = await p.text({
    message: "Custom directory?",
    placeholder: defaultDir,
  });
  if (p.isCancel(custom)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  const trimmed = String(custom).trim();
  return trimmed === "" ? defaultDir : trimmed;
}

export async function askScope(categories: Category[]): Promise<string[]> {
  const value = await p.multiselect({
    message: "Which categories to install?",
    options: categories.map((c) => ({
      value: c.name,
      label: c.name,
      hint: `${c.skills.length} skills`,
    })),
    initialValues: categories.map((c) => c.name),
    required: true,
  });
  if (p.isCancel(value)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  const selected = value as string[];
  if (selected.length === categories.length) return [];
  return selected;
}
