import * as p from "@clack/prompts";
import type { Category } from "./categories.js";

export async function askInstallDir(defaultDir: string): Promise<string> {
  const value = await p.text({
    message: "Install directory?",
    placeholder: defaultDir,
    defaultValue: defaultDir,
  });
  if (p.isCancel(value)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  const trimmed = String(value).trim();
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
