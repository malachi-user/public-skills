# Public skills

Reusable skills for Claude Code and Codex.

## Install a skill

Clone this repository, then copy the complete skill directory into the relevant skills folder. Keep `SKILL.md`, `scripts/`, `references/`, and `assets/` together.

### Claude Code

Install globally for your user:

```bash
mkdir -p ~/.claude/skills
cp -R build-premium-presentations ~/.claude/skills/
```

Or install for one project by copying it to `.claude/skills/build-premium-presentations` inside that project.

### Codex

Install globally for your user:

```bash
mkdir -p ~/.codex/skills
cp -R build-premium-presentations ~/.codex/skills/
```

Restart the relevant agent session after installation so it discovers the skill.

## Available skills

- `build-premium-presentations` — premium presentations and interactive web decks; compatible with Claude Code and Codex.
- `accessibility-il-wcag` — accessibility auditing and implementation for Israeli Standard 5568 and WCAG AA.
- `lovable-project-structure` — reusable architecture guidance for Lovable projects.
- `sumit-payment-lovable` — SUMIT payment integration patterns for Lovable projects.
