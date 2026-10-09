import { createServer, type Server } from "node:http";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import * as tar from "tar";
import {
  cachePath,
  downloadTarball,
  extractSkills,
  isCacheableRef,
  listTarballCategories,
} from "./github.js";

const savedEnv = { ...process.env };

afterEach(() => {
  process.env = { ...savedEnv };
});

async function fixtureTarball(): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), "dskills-tar-"));
  const top = join(root, "repo-main");
  for (const [category, skill] of [
    ["cat-a", "skill-one"],
    ["cat-b", "skill-two"],
  ] as const) {
    const dir = join(top, "skills", category, skill);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "SKILL.md"),
      `---\nname: ${skill}\ndescription: ${skill}.\n---\n`,
    );
  }
  const tarball = join(root, "repo.tar.gz");
  await tar.c({ gzip: true, file: tarball, cwd: root }, ["repo-main"]);
  return tarball;
}

describe("isCacheableRef", () => {
  it("caches tags and SHAs, not branches", () => {
    expect(isCacheableRef("main")).toBe(false);
    expect(isCacheableRef("feature/x")).toBe(false);
    expect(isCacheableRef("v1.2.3")).toBe(true);
    expect(isCacheableRef("1.0.0")).toBe(true);
    expect(isCacheableRef("abc123def456")).toBe(true);
  });
});

describe("listTarballCategories", () => {
  it("lists categories under skills/", async () => {
    expect(await listTarballCategories(await fixtureTarball())).toEqual([
      "cat-a",
      "cat-b",
    ]);
  });

  it("rejects corrupt archives with a clear error", async () => {
    const bad = join(mkdtempSync(join(tmpdir(), "dskills-bad-")), "bad.tar.gz");
    writeFileSync(bad, "not a tarball");
    await expect(listTarballCategories(bad)).rejects.toThrow(
      "Cannot read downloaded archive",
    );
  });
});

describe("extractSkills", () => {
  it("strips the root prefix and extracts everything when unfiltered", async () => {
    const dest = mkdtempSync(join(tmpdir(), "dskills-x-"));
    await extractSkills(await fixtureTarball(), dest, []);
    expect(
      existsSync(join(dest, "skills", "cat-a", "skill-one", "SKILL.md")),
    ).toBe(true);
    expect(
      existsSync(join(dest, "skills", "cat-b", "skill-two", "SKILL.md")),
    ).toBe(true);
    expect(existsSync(join(dest, "repo-main"))).toBe(false);
  });

  it("extracts only the selected category", async () => {
    const dest = mkdtempSync(join(tmpdir(), "dskills-x-"));
    await extractSkills(await fixtureTarball(), dest, ["cat-a"]);
    expect(
      existsSync(join(dest, "skills", "cat-a", "skill-one", "SKILL.md")),
    ).toBe(true);
    expect(existsSync(join(dest, "skills", "cat-b"))).toBe(false);
  });

  it("rejects corrupt archives with a clear error", async () => {
    const bad = join(mkdtempSync(join(tmpdir(), "dskills-bad-")), "bad.tar.gz");
    writeFileSync(bad, "not a tarball");
    await expect(
      extractSkills(bad, mkdtempSync(join(tmpdir(), "dskills-x-")), []),
    ).rejects.toThrow("Cannot extract downloaded archive");
  });
});

describe("downloadTarball", () => {
  it("downloads, caches, and reports HTTP errors", async () => {
    const tarball = await fixtureTarball();
    const payload = readFileSync(tarball);
    let server: Server | undefined;
    try {
      server = createServer((req, res) => {
        if (req.url === "/o/r/tar.gz/v0.0.0") {
          res.writeHead(200, { "content-type": "application/gzip" });
          res.end(payload);
        } else {
          res.writeHead(404);
          res.end("nope");
        }
      });
      await new Promise<void>((resolve) =>
        server!.listen(0, "127.0.0.1", resolve),
      );
      const port = (server.address() as { port: number }).port;
      process.env.DSKILLS_BASE_URL = `http://127.0.0.1:${port}`;

      const first = await downloadTarball("o/r", "v0.0.0");
      expect(first).toBe(cachePath("o/r", "v0.0.0"));
      expect(existsSync(first)).toBe(true);

      await new Promise<void>((resolve, reject) =>
        server!.close((err) => (err ? reject(err) : resolve())),
      );
      server = undefined;
      expect(await downloadTarball("o/r", "v0.0.0")).toBe(first);

      await expect(downloadTarball("o/r", "v9.9.9")).rejects.toThrow(
        "--offline",
      );
    } finally {
      if (server) server.close();
      rmSync(cachePath("o/r", "v0.0.0"), { force: true });
    }
  });
});
