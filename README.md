# @davi/skills

Install agent skills into any project.

```sh
npx @davi/skills install
```

## Usage

```sh
npx @davi/skills install --dir .agents/skills --all
npx @davi/skills install --category design
npx @davi/skills list
```

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
