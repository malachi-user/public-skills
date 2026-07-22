# עסק חכם — דמו מצגת השקה (Hebrew RTL launch deck)

A deployable, studio-grade example built with the `build-premium-presentations` skill.
It is a single-page, right-to-left (Hebrew) launch deck that demonstrates the skill's
signature techniques: cinematic dark art direction, a narrative arc across eight slides,
and *live* motion — not a static mockup.

## What it demonstrates

- **Ambient neural background** — an animated canvas of connected "neurons" that drifts
  and re-tints per slide.
- **Animated counters** — statistics that count up when their slide enters the viewport.
- **Character companion (mascot)** — a persistent mascot that reacts per slide via a
  `data-mascot` state machine (waves, checks, points).
- **WhatsApp chat simulation** — a typed conversation with typing indicators and staged
  bubbles.
- **Connected AI-agent hub**, magnetic buttons, aurora/grain atmosphere, a light/dark
  toggle, and scroll/step reveals.

## Run locally

Open `index.html` directly, or serve the folder statically:

```bash
python3 -m http.server 4173
```

## Navigation

- Arrows / Space: forward / back
- Left-click on a non-interactive area: forward · Right-click: back
- `F`: fullscreen · `B`: black screen · `T`: toggle color theme

## Structure

| File | Purpose |
| --- | --- |
| `index.html` | Slide markup, RTL document, mascot and canvas hooks |
| `styles.css` | Art direction — color/type system, layout, atmosphere |
| `scripts.js` | All motion: neurons, counters, mascot controller, chat demo, reveals |
| `assets/mascot.png` | Character companion artwork |
| `vercel.json` | Security headers (CSP, nosniff, referrer/permissions policy) for deploy |

## Dependencies

Fonts (Heebo, Assistant), Reveal.js and GSAP are loaded from public CDNs; the CSP in
`vercel.json` is scoped to exactly those origins. No analytics or tracking is included.

## Deploy

```bash
vercel deploy --prod
```
