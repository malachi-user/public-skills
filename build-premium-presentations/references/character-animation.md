# Character and mascot animation

Use a character to support identity, explanation, reaction, or transitions. Do not let it become repetitive decoration.

## Choose the generator explicitly

1. Prefer built-in `image_gen` when available. Generate a base image, then make every pose as an edit of that same base.
2. Use Gemini image generation only when the user explicitly requests it or the execution environment requires it. Read credentials from environment/secret storage; never embed or print keys.
3. Never silently switch providers. Report which path produced the asset.

## Pipeline

1. Define a character sheet: silhouette, proportions, face, clothing/material, palette, allowed props, and forbidden drift.
2. Generate the neutral base on a flat removable background.
3. Remove the background to true alpha and inspect edges.
4. Choose motion:
   - Idle: reuse one cutout with sine-driven bob, sway, and breathing.
   - Articulated: create a few poses from the same base with minimal instructions such as “keep everything identical; change only the raised arm.”
5. Align pose cutouts by bottom-center using one shared scale. Add subtle whole-body bob/sway so the gesture reads at a glance.
6. Create a seamless sine loop or boomerang sequence.
7. Export and verify a frame strip visually.

## Format

- Web deck: animated WebP plus GIF fallback, or sprite sheet plus CSS.
- PowerPoint/Keynote/Google Slides: GIF or APNG. GIF has 1-bit alpha; matte it to the exact slide background for clean edges.
- Static/reduced motion: first or neutral frame.

For web embedding:

```html
<picture class="deck-character" aria-hidden="true">
  <source srcset="assets/character.webp" type="image/webp">
  <img src="assets/character.gif" alt="" width="280" height="320">
</picture>
```

If the character conveys required information, do not hide it from assistive technology; provide equivalent text. Otherwise keep it decorative with empty `alt` and `aria-hidden`.

## Quality checks

- Identity, palette, costume, and facial geometry are stable across frames.
- Feet/body do not jump because alignment changes.
- Motion is legible at projection size and loops without a visible snap.
- Alpha edges are clean on every theme/background.
- WebP/GIF size is appropriate; do not ship a multi-megabyte GIF to a webpage.
- Reduced-motion users receive a finished static composition.
