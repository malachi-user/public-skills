# Public skills

Reusable, production-ready skills for [Claude Code](https://claude.com/claude-code) and Codex.
Each skill is a self-contained folder — instructions (`SKILL.md`), helper `scripts/`,
deep-dive `references/`, and ready-to-use `assets/` — that an agent can discover and apply
without any additional setup.

## Available skills

| Skill | What it does |
| --- | --- |
| [`build-premium-presentations`](build-premium-presentations/) | Design and build premium, studio-grade presentations and interactive web decks — strong narrative, art direction, professional typography, cinematic motion, presenter controls, animated characters, and a rigorous visual-QA gate. RTL/Hebrew ready. Ships a **live, deployable demo**. |
| [`accessibility-il-wcag`](accessibility-il-wcag/) | Audit and implement accessible sites under Israeli Standard 5568 and WCAG AA. |
| [`lovable-project-structure`](lovable-project-structure/) | Reusable architecture guidance for Lovable projects. |
| [`sumit-payment-lovable`](sumit-payment-lovable/) | SUMIT payment-integration patterns for Lovable projects. |

## Featured: build-premium-presentations

Turns "make me a deck" into an award-tier result. The skill covers the full pipeline —
narrative and speaker notes, design directions, typography and RTL, motion and interaction,
character animation, and quality gates — plus scripts to scaffold and validate a deck.

**Live demo:** a Hebrew RTL launch deck with a live neural background, animated counters,
a reactive mascot, and a simulated WhatsApp chat →
[`examples/binart-launch-deck`](build-premium-presentations/examples/binart-launch-deck/).

## Install a skill

Clone this repository, then copy the complete skill directory into the relevant skills
folder. Keep `SKILL.md`, `scripts/`, `references/`, and `assets/` together.

### Claude Code

```bash
# For all your projects:
mkdir -p ~/.claude/skills
cp -R build-premium-presentations ~/.claude/skills/

# Or for a single project:
cp -R build-premium-presentations <project>/.claude/skills/
```

### Codex

```bash
mkdir -p ~/.codex/skills
cp -R build-premium-presentations ~/.codex/skills/
```

Restart the agent session after installation so it discovers the skill.

## License

Each skill folder carries its own `LICENSE` (MIT). No private business material is included.
