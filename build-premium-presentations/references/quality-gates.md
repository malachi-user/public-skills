# Quality gates

## Structural

- Unique slide IDs; valid HTML; all assets resolve.
- No secrets, `.env`, private URLs, internal notes, customer data, or unlicensed font/media files.
- Exact pinned library versions or vendored dependencies.
- Each slide has one job and a timing hint/notes entry when used live.
- Speaker timing total and shortened route match the brief.

## Browser/render

Render every slide at 1920×1080, 1440×900, and 1366×768. Also test the actual projector or display when available.

- Capture every slide after transitions settle.
- Capture meaningful fragment stages, not only final slide state.
- Check horizontal and vertical overflow, clipping, overlaps, and off-canvas controls.
- Verify computed font family, asset loading, zero console errors, and zero failed requests.
- Test dark/light themes if provided.
- Test without reduced motion and with reduced motion. Reduced motion can hide animation-related opacity bugs, so never use it as the only visual test.
- Test keyboard, left/right mouse navigation, fullscreen, links, focus rings, and touch behavior.
- Test the deck with animation/CDN JavaScript blocked: essential content must remain visible.

## Visual

- One obvious focal point per slide.
- Back-row readability; no paragraph walls.
- Consistent type, spacing, radius, shadow, and easing tokens.
- Adjacent slides differ in composition; effects do not repeat mechanically.
- Contrast remains sufficient over animated backgrounds and projector washout.
- Images are sharp, consistently treated, correctly cropped, and licensed.
- RTL reading order, arrows, punctuation, and mixed-direction strings are correct.

## Live-event resilience

- Offline/vendored build or tested venue network.
- Static PDF/image fallback and local demo screenshots/video.
- Presenter notes, timing, and emergency cut plan.
- Links/QRs verified from the audience device/network.
- Audio/video tested with venue hardware.

## Automated preflight

Run `python3 scripts/check_deck.py <deck-dir>`. Treat it as a baseline, not a replacement for visual review. Add project-specific browser automation when the deck contains custom widgets, demos, or asynchronous effects.
