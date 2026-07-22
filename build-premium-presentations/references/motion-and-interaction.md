# Motion and interaction

Motion must communicate hierarchy, causality, sequence, or mood. Static layout must already look premium.

## Motion vocabulary

- Entrances: mask/line reveal, fade-up, fade-side, scale-pop, 3D card settle.
- Sequence: small 60–100ms stagger for related items.
- Data: counters, progress, bars, clock, waveform, or node connections tied to meaning.
- Atmosphere: slow aurora drift, grain, vignette, or low-density canvas field.
- Pointer: halo, magnetic CTA, modest card tilt, network proximity lines.
- Character: pop-in plus idle float, or context-specific gesture.

Use one easing family, typically `cubic-bezier(0.16, 1, 0.3, 1)`, and transition only `transform`, `opacity`, or an intentionally animated token. Avoid `transition: all`.

## Reveal integration

- Initialize a 16:9 canvas, hash navigation, progress, slide number, fragments, and an appropriate transition.
- Dispatch custom animation by stable slide `id` or `data-effect`, not by numeric position.
- Reset/replay only animations that should repeat on re-entry.
- Keep links and controls clickable by excluding them from slide-wide navigation.

## Pointer and mouse navigation

- Render a trailing halo only under `@media (pointer:fine)`.
- Smooth pointer motion with `requestAnimationFrame`; do not write layout properties on every event.
- Advance on primary click only when no selection exists and the target is not interactive.
- Go back on `contextmenu` only in presentation mode. Preserve the browser menu in edit mode.
- Disable pointer effects on touch and under reduced motion.

## Background performance

- Resize canvas for DPR with a sensible cap.
- Reduce node/particle counts on small screens.
- Pause animation on `visibilitychange` when hidden.
- Keep backgrounds `pointer-events:none` and below readable content.
- Test contrast on the brightest background frame, not only the initial frame.

## Reduced motion

Provide a real static path:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
  .pointer-halo { display: none !important; }
}
```

Check the media query in JavaScript before starting GSAP loops, canvas animation, animated counters, or character motion. Ensure fragments remain navigable and content becomes visible.
