import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInstallCommand } from "./commands/install.js";
import { runList } from "./commands/list.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = join(rootDir, "skills");

function packageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const program = new Command();

program
  .name("d-skills")
  .description("Install agent skills into any project")
  .version(packageVersion());

program
  .command("install")
  .description("Install skills into a local directory")
  .option("-d, --dir <path>", "install directory")
  .option(
    "-c, --category <name>",
    "install single category (repeatable)",
    (value, acc: string[]) => [...acc, value],
    [] as string[],
  )
  .option("-a, --all", "install all categories")
  .option("-f, --force", "overwrite existing skills")
  .option("--offline", "use bundled skills instead of GitHub")
  .option("--dry-run", "print plan without copying")
  .action(async (opts) => {
    try {
      await runInstallCommand({ ...opts, skillsRoot });
    } catch (error) {
      console.error(`error: ${(error as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("list")
  .description("List available categories and skills")
  .option("--json", "machine-readable output")
  .option("--categories", "category names only")
  .action((opts) => {
    runList({ ...opts, skillsRoot });
  });

program.parse();
