# @davi/skills

Install agent skills into any project.

```sh
npx @davi/skills install
```

## Usage

```sh
npx @davi/skills install --dir .agents/skills --all
npx @davi/skills install --category design
npx @davi/skills install --category design --offline
npx @davi/skills list
```

By default skills are downloaded from GitHub. Use `--offline` to install
from the bundled `skills/` directory instead.

| Variable           | Default                       | Purpose                    |
| ------------------ | ----------------------------- | -------------------------- |
| `DSKILLS_REPO`     | `DaviRJ/d-skills`             | Source repository          |
| `DSKILLS_REF`      | `main`                        | Branch, tag, or commit SHA |
| `DSKILLS_BASE_URL` | `https://codeload.github.com` | Tarball host (advanced)    |

## Skills

Skills live in `skills/<category>/<skill>/`. See `skills/README.md` for how to add a skill or category.

## Development

```sh
pnpm install
pnpm validate:skills
pnpm build
pnpm test
node dist/cli.js --help
```
