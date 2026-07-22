# Slide patterns by communication job

Select patterns because they explain something; change composition between neighboring slides.

- Opening hero: one promise, presenter/brand marker, one art-directed visual or character.
- Agenda as journey: three acts or destinations, not a dense bullet list.
- Statement: one sentence or question with extreme typographic hierarchy.
- Timeline: staged milestones with fragments and a clear reading direction.
- Contrast: before/after, myth/reality, old/new, cost/value.
- Flow: three to five steps with one active stage revealed at a time.
- Metric: one dominant number, label, source, and short interpretation.
- Evidence: quote, testimonial, case result, or research claim with attribution.
- Tool/system hub: central node and connected satellites, animated in narrative order.
- Demo window: realistic browser/app/terminal/chat surface that illustrates outcome, not generic chrome.
- Conversation: phone/chat mockup with messages arriving sequentially.
- Audio/voice: waveform plus transcript or intent, not decorative bars alone.
- Grid: use only when items genuinely need comparison; vary size or emphasis to avoid a generic feature grid.
- Full-bleed image: one emotional beat with minimal copy.
- Character beat: point, react, celebrate, warn, or transition; do not park a mascot identically on every slide.
- CTA: specific action, destination/QR/link, and a reason to act now.
- Closing loop: return to the opening image/question and leave one memorable line.

## Markup conventions for web decks

- Give each `<section>` a stable semantic `id`.
- Put timing in `data-time-hint` and optional behavior in data attributes such as `data-effect`, `data-stagger`, and `data-accent`.
- Use Reveal `.fragment` for narrative sequence; avoid large bespoke selectors tied to slide numbers.
- Keep the default DOM state visible. Let `.present` or JavaScript enhance it instead of revealing invisible content after a fragile script dependency.
- Mark interactive controls with `data-no-advance`.
