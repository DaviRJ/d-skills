export interface InstallOptions {
  dir?: string;
  category?: string[];
  all?: boolean;
  force?: boolean;
  offline?: boolean;
  dryRun?: boolean;
  skillsRoot: string;
}

export async function runInstallCommand(
  options: InstallOptions,
): Promise<void> {
  void options;
  throw new Error("not implemented");
}
