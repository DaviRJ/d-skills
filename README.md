# d-skills

Install agent skills into any project.

```sh
npx d-skills install
```

Run without flags for the interactive flow: pick an install directory, then
pick categories. Skills land directly under the target directory
(`<dir>/<skill>`), never nested by category.

## Usage

```sh
npx d-skills install --dir .agents/skills --all
npx d-skills install --category design
npx d-skills install --category design --category integrations
npx d-skills install --category design --offline
npx d-skills install --dir /tmp/demo --dry-run
npx d-skills list
npx d-skills list --categories
npx d-skills list --json
```

## Options

| Flag                 | Default           | Purpose                                          |
| -------------------- | ----------------- | ------------------------------------------------ |
| `-d, --dir <path>`   | `.agents/skills`  | Install directory (`~` and relative paths work)  |
| `-c, --category <n>` | all               | Install one category (repeatable)                |
| `-a, --all`          |                   | Install all categories                           |
| `-f, --force`        |                   | Overwrite skills that already exist              |
| `--offline`          |                   | Use bundled `skills/` instead of downloading     |
| `--dry-run`          |                   | Print the plan without copying                   |

Existing skills are skipped unless `--force` is given. Unknown categories
fail fast with a suggestion, e.g. `Did you mean: "desgin" → "design"?`.
Piped runs never prompt: they default to all categories and `--dir`.

## Install targets

The interactive directory prompt offers presets plus a custom path:

- `.agents/skills` (default)
- `.claude/skills`
- `.codex/skills`
- `.cursor/skills`
- Custom path

## Source

By default skills are downloaded from GitHub, so installs always get the
latest version without republishing the npm package. Tag and SHA refs are
cached under the OS temp directory; branch refs are re-downloaded.

| Variable           | Default                         | Purpose                  |
| ------------------ | ------------------------------- | ------------------------ |
| `DSKILLS_REPO`     | `DaviRJ/d-skills`               | Source repository        |
| `DSKILLS_REF`      | `main`                          | Branch, tag, or commit   |
| `DSKILLS_BASE_URL` | `https://codeload.github.com`   | Tarball host (advanced)  |

## Skills

Skills live in `skills/<category>/<skill>/`. See `skills/README.md` for how
to add a skill or category.

## Development

```sh
pnpm install
pnpm validate:skills
pnpm build
pnpm test
node dist/cli.js --help
```
