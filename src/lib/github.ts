export function resolveRef(): string {
  return process.env.DSKILLS_REF ?? "main";
}

export function resolveRepo(): string {
  return process.env.DSKILLS_REPO ?? "";
}

export async function downloadTarball(): Promise<string> {
  throw new Error("not implemented");
}

export async function extractSelectedSkills(): Promise<void> {
  throw new Error("not implemented");
}
