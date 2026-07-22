---
name: build-premium-presentations
description: Design, build, redesign, or polish premium presentations and interactive web decks with strong narrative, art direction, professional typography, cinematic or restrained motion, presenter controls, animated characters, and rigorous visual QA. Use for slide decks, talks, pitches, workshops, Reveal.js/HTML presentations, RTL/Hebrew decks, speaker notes, presentation templates, or when a deck feels generic, static, crowded, or visually weak.
---

# Build Premium Presentations

Create a presentation as one coherent system: message, visual direction, typography, composition, motion, interaction, speaker experience, and verification. Prefer a Reveal.js web deck when rich interaction, animation, responsive projection, or editable source is valuable. Preserve the requested format when editing PowerPoint, Keynote, Google Slides, Canva, or an existing deck.

## Workflow

1. Inspect all source material before designing. Preserve the original when adapting an existing deck.
2. Establish the audience, venue, duration, objective, one remembered message, presenter, delivery format, language/direction, brand assets, and technical constraints. Ask only for missing decisions that materially change the result.
3. Write a slide plan and timing budget before styling. Use opening/body/close as a default, not a rigid formula. Read [references/narrative-and-speaker.md](references/narrative-and-speaker.md).
4. Commit to one art direction. Define type roles, palette, spacing, materials, imagery, motion energy, and one or two signature moments. Read [references/design-directions.md](references/design-directions.md) and [references/typography-and-rtl.md](references/typography-and-rtl.md).
5. Select slide patterns by communication job, not decoration. Read [references/slide-patterns.md](references/slide-patterns.md).
6. Scaffold a web deck when appropriate:

   ```bash
   python3 scripts/scaffold_deck.py ./my-deck --title "Presentation title" --lang en --force
   ```

   Omit `--force` unless overwriting an intentionally disposable target. The starter is in `assets/deck-starter/`.
7. Build the static composition first. Then add fragments, transitions, mouse response, counters, demos, or custom backgrounds only where they clarify sequence or create a deliberate peak. Read [references/motion-and-interaction.md](references/motion-and-interaction.md).
8. Add a character only when it strengthens identity, explanation, or pacing. Use built-in `image_gen` by default when available; use Gemini only when explicitly requested or when the environment requires it. Read [references/character-animation.md](references/character-animation.md).
9. Add presenter notes, timing hints, keyboard/mouse controls, demo fallbacks, and a shortened route. Read [references/narrative-and-speaker.md](references/narrative-and-speaker.md).
10. Run structural checks and browser QA:

   ```bash
   python3 scripts/check_deck.py ./my-deck
   ```

   Then read and execute [references/quality-gates.md](references/quality-gates.md). Fix failures before delivery.

## Non-negotiable craft rules

- Give every slide one focal point and one job.
- Design direction-first. Do not rescue generic composition with extra effects.
- Use one display face, one text face, and optionally one label/mono role. Never package unlicensed fonts.
- Keep text readable from the back of the room. Split dense material across slides.
- Use a restrained palette and a consistent token system. Let contrast, scale, and space carry the drama.
- Make adjacent slides compositionally different while preserving the same visual language.
- Tie motion to hierarchy or sequence. Prefer transform/opacity, expressive easing, short stagger, and an explicit reduced-motion path.
- Keep content visible if optional animation JavaScript fails.
- Use real `lang` and `dir`; isolate mixed-direction URLs, numbers, code, and phone strings.
- Do not copy client logos, private notes, proprietary characters, secrets, or commercial font files into reusable/public output.
- Verify by rendering and looking at every slide, not by trusting syntax or the first slide.

## Format decisions

- Choose Reveal.js/HTML for interactive, cinematic, responsive, linkable, or code-driven decks.
- Keep PowerPoint/Keynote/Google Slides when offline editing by nontechnical collaborators is the primary need. Export animated characters as GIF/APNG for those tools.
- Use animated WebP plus GIF fallback or a sprite sheet for web characters.
- Vendor pinned Reveal/GSAP/font files for offline or filtered-network venues; otherwise pin exact CDN versions and test the actual venue network.
- Treat Canva and connected design tools as optional integrations, never assumed dependencies.

## Delivery contract

Deliver the editable source, a presentation-ready build, speaker notes/timing, attribution or licensing notes for external assets, and a short verification report. For live events, also provide an offline fallback and static/PDF backup when practical.
