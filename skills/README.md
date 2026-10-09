# Skills

Skills are grouped by category using plain folders:

```text
skills/<category>/<skill>/SKILL.md
```

Current categories:

- `design` — visual and content design skills
- `integrations` — third-party service integrations

## Add a new skill

1. Create `skills/<category>/<skill>/`.
2. Add `SKILL.md` with frontmatter where `name` matches the folder name:

```md
---
name: my-skill
description: What this skill does.
---
```

3. Add optional `references/`, `scripts/`, `templates/`, `data/` next to `SKILL.md`.
4. Run `pnpm validate:skills`.

## Add a new category

1. Create `skills/<new-category>/` using lowercase letters, numbers, and dashes.
2. Add one or more skills inside it.
3. Run `pnpm validate:skills`.

No registry file or code change is required. The CLI discovers categories by scanning directories.
