import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import * as tar from "tar";

export const DEFAULT_REPO = "DaviRJ/d-skills";
export const DEFAULT_REF = "main";

export function resolveRepo(): string {
  return process.env.DSKILLS_REPO ?? DEFAULT_REPO;
}

export function resolveRef(): string {
  return process.env.DSKILLS_REF ?? DEFAULT_REF;
}

export function tarballUrl(repo: string, ref: string): string {
  const base = process.env.DSKILLS_BASE_URL ?? "https://codeload.github.com";
  return `${base}/${repo}/tar.gz/${ref}`;
}

export function isCacheableRef(ref: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(ref) || /^v?\d+\.\d+\.\d+/.test(ref);
}

export function cachePath(repo: string, ref: string): string {
  return join(
    tmpdir(),
    "dskills-cache",
    repo.replace("/", "-"),
    `${ref}.tar.gz`,
  );
}

export async function downloadTarball(
  repo: string,
  ref: string,
): Promise<string> {
  const dest = cachePath(repo, ref);
  if (isCacheableRef(ref) && existsSync(dest)) return dest;
  let response: Response;
  try {
    response = await fetch(tarballUrl(repo, ref));
  } catch (cause) {
    throw new Error(
      `Cannot download skills from GitHub (${repo}@${ref}): ${(cause as Error).message}. Check your network or retry with --offline.`,
    );
  }
  if (!response.ok || !response.body) {
    throw new Error(
      `Cannot download skills from GitHub (${repo}@${ref}): HTTP ${response.status}. Check the repo and ref, or retry with --offline.`,
    );
  }
  mkdirSync(join(dest, ".."), { recursive: true });
  await writeFile(dest, Buffer.from(await response.arrayBuffer()));
  return dest;
}

export async function listTarballCategories(
  tarballPath: string,
): Promise<string[]> {
  const categories = new Set<string>();
  try {
    const head = readFileSync(tarballPath).subarray(0, 2);
    if (head.length < 2 || head[0] !== 0x1f || head[1] !== 0x8b) {
      throw new Error("not a gzip archive");
    }
    await tar.t({
      file: tarballPath,
      onentry: (entry) => {
        const parts = entry.path.split("/").filter((p) => p !== "");
        if (parts.length >= 3 && parts[1] === "skills")
          categories.add(parts[2]);
      },
    });
  } catch (cause) {
    throw new Error(
      `Cannot read downloaded archive: ${(cause as Error).message}`,
    );
  }
  return [...categories].sort();
}

export async function extractSkills(
  tarballPath: string,
  destRoot: string,
  selection: string[],
): Promise<void> {
  try {
    await tar.x({
      file: tarballPath,
      cwd: destRoot,
      strip: 1,
      filter: (path) => {
        const parts = path.split("/").filter((p) => p !== "");
        if (parts.length < 2 || parts[1] !== "skills") return false;
        if (parts.length === 2) return true;
        return selection.length === 0 || selection.includes(parts[2]);
      },
    });
  } catch (cause) {
    throw new Error(
      `Cannot extract downloaded archive: ${(cause as Error).message}`,
    );
  }
}
