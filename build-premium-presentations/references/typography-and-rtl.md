# Typography, language, and RTL

Typography is the strongest design lever in a projected deck. Choose roles, not random families.

## Roles

- Display: characterful face for headlines and large statements.
- Body: highly legible face for explanations.
- Label/accent: optional compact role for eyebrows, tags, or slide numbers.
- Mono/data: optional for code, terminals, or numeric systems.

Use no more than three visible roles. Create a dramatic scale ratio between display and body while keeping body text large enough for the back row.

## Free Hebrew starting points

- Dark cinematic: Heebo Black/ExtraBold + Assistant.
- Editorial: Frank Ruhl Libre + Assistant.
- Warm: Rubik + Assistant.
- Bold: Secular One or Suez One + Heebo/Assistant.
- Corporate: IBM Plex Sans Hebrew, Heebo, or Rubik + Assistant.

Commercial Hebrew faces such as Ploni, Almoni, Atlas, Anomalia, or Narkis may be used only when the user holds the correct license. Never publish or bundle them without redistribution rights. Prefer self-hosted WOFF2/variable files with explicit license documentation; include only weights actually used.

## Scale and projection

- Use fluid `clamp()` sizing for web decks.
- Keep spaces around CSS math operators: `calc(1rem + 1vw)`, never `1rem+1vw`.
- Tight negative tracking may improve very large Hebrew display text; keep body tracking normal.
- Hebrew has no uppercase and does not benefit from fake italics. Use weight, color, size, or underline for emphasis.
- Test the actual projector aspect ratio and a lower-resolution 1366×768 viewport.

## Direction

Set `<html lang="he" dir="rtl">` for Hebrew, and use logical CSS properties: `padding-inline`, `margin-inline`, `inset-inline-start`, `text-align:start`.

Isolate URLs, email, phones, prices, version numbers, code, and Latin names with `<bdi>` or `dir="ltr"` plus `unicode-bidi:isolate`. Mirror directional arrows in RTL; never mirror logos, clocks, media controls, or artwork.

Use `Reveal.initialize({ rtl: true })` for Hebrew decks and verify arrow navigation semantics. For bilingual decks, make direction a per-block decision and test punctuation around mixed scripts.

## Font verification

- Confirm font files return 200 and computed styles use the intended family.
- Test under a network filter or offline if the venue may block Google Fonts/CDNs.
- Provide a robust fallback stack and ensure layout remains usable during `font-display: swap`.
