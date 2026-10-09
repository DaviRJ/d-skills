export interface InstallPlanItem {
  skill: string;
  category: string;
  sourceDir: string;
  targetDir: string;
}

export interface InstallResult extends InstallPlanItem {
  status: "installed" | "skipped" | "overwritten";
}

export function planInstall(): InstallPlanItem[] {
  throw new Error("not implemented");
}

export async function runInstall(): Promise<InstallResult[]> {
  throw new Error("not implemented");
}
