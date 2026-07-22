(() => {
  'use strict';

  initCompliance();
  if (!window.Reveal) return;
  document.documentElement.classList.remove('no-js');

  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interactive = target => target.closest('a,button,input,textarea,select,[contenteditable],[data-no-advance]');

  try { html.dataset.theme = localStorage.getItem('workshop-deck-theme') || 'dark'; } catch (_) { html.dataset.theme = 'dark'; }

  const mobileLayout = innerWidth < 600;
  Reveal.initialize({
    width: mobileLayout ? 390 : 1280,
    height: mobileLayout ? 844 : 720,
    margin: 0,
    hash: true,
    rtl: true,
    controls: true,
    progress: true,
    slideNumber: 'c/t',
    fragments: true,
    transition: 'fade',
    transitionSpeed: 'fast',
    backgroundTransition: 'fade',
    keyboard: true
  });

  const timeHint = document.querySelector('.time-hint');
  const updateHint = event => {
    const slide = event?.currentSlide || Reveal.getCurrentSlide();
    timeHint.value = slide?.dataset.timeHint || '';
  };
  Reveal.on('ready', event => {
    updateHint(event);
    const labels = {
      '.navigate-left': 'השקופית הבאה', '.navigate-right': 'השקופית הקודמת',
      '.navigate-up': 'השקופית שמעל', '.navigate-down': 'השקופית שמתחת'
    };
    Object.entries(labels).forEach(([selector, label]) => document.querySelector(selector)?.setAttribute('aria-label', label));
    document.querySelector('.slide-number-a')?.setAttribute('aria-label', 'מספר השקופית הנוכחית');
  });
  Reveal.on('slidechanged', updateHint);

  document.addEventListener('click', event => {
    if (event.button || interactive(event.target) || getSelection()?.toString()) return;
    Reveal.next();
  });
  document.addEventListener('contextmenu', event => {
    if (interactive(event.target) || html.dataset.edit === 'true') return;
    event.preventDefault();
    Reveal.prev();
  });

  function toggleTheme() {
    html.dataset.theme = html.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('workshop-deck-theme', html.dataset.theme); } catch (_) { /* private mode */ }
  }
  document.querySelector('.theme-toggle').addEventListener('click', event => { event.stopPropagation(); toggleTheme(); });
  document.addEventListener('keydown', event => {
    if (interactive(event.target)) return;
    const key = event.key.toLowerCase();
    if (key === 'f') {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.();
    }
    if (key === 't') toggleTheme();
    if (key === 'b') Reveal.togglePause();
  });

  const promptText = `אני בעל עסק ל[תחום]. הסגנון שלי: מקצועי, אנושי וקצר.\n\nנתח את פניית הלקוח שאדביק:\n1. סכם את הצורך במשפט אחד.\n2. ציין איזה מידע חסר.\n3. נסח תשובת WhatsApp עד 70 מילים.\n4. הצע שאלת המשך אחת ומועד למעקב.\n\nאל תמציא מחיר או הבטחה.\nסמן [דורש אישור] ליד כל פרט שאינך בטוח בו.`;
  document.querySelector('[data-copy-prompt]').addEventListener('click', async event => {
    event.stopPropagation();
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(promptText);
      button.textContent = 'הועתק ✓';
    } catch (_) {
      button.textContent = 'סמן והעתק ידנית';
    }
    setTimeout(() => { button.textContent = 'העתק פרומפט'; }, 1800);
  });

  const timerButton = document.querySelector('[data-start-timer]');
  const timerValue = document.querySelector('[data-countdown]');
  let timerId = 0;
  timerButton.addEventListener('click', event => {
    event.stopPropagation();
    clearInterval(timerId);
    let remaining = 60;
    timerValue.textContent = String(remaining);
    timerButton.textContent = 'רץ…';
    timerButton.disabled = true;
    timerValue.closest('.practice-timer').classList.add('running');
    timerId = setInterval(() => {
      remaining -= 1;
      timerValue.textContent = String(remaining);
      if (remaining <= 0) {
        clearInterval(timerId);
        timerButton.textContent = 'שוב';
        timerButton.disabled = false;
        timerValue.closest('.practice-timer').classList.remove('running');
      }
    }, 1000);
  });

  if (!reduced && matchMedia('(pointer:fine)').matches) {
    const halo = document.querySelector('.pointer-halo');
    let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my, active = true;
    addEventListener('pointermove', event => { mx = event.clientX; my = event.clientY; });
    document.addEventListener('visibilitychange', () => { active = !document.hidden; });
    (function follow() {
      if (active) {
        x += (mx - x) * .13;
        y += (my - y) * .13;
        halo.style.transform = `translate(${x}px, ${y}px)`;
      }
      requestAnimationFrame(follow);
    })();
  }

  if (!reduced) initAmbient();
  function initAmbient() {
    const canvas = document.getElementById('ambient-canvas');
    const context = canvas.getContext('2d');
    const packets = Array.from({ length: innerWidth < 900 ? 9 : 18 }, () => ({
      x: Math.random(), y: Math.random(), speed: .00008 + Math.random() * .00012, size: 1 + Math.random() * 2
    }));
    let width = 0, height = 0, previous = performance.now(), active = true;
    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      width = innerWidth; height = innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { active = !document.hidden; previous = performance.now(); });
    function draw(now) {
      if (active) {
        const delta = Math.min(34, now - previous); previous = now;
        context.clearRect(0, 0, width, height);
        context.strokeStyle = getComputedStyle(html).getPropertyValue('--line');
        context.fillStyle = getComputedStyle(html).getPropertyValue('--accent');
        packets.forEach(packet => {
          packet.x += packet.speed * delta;
          if (packet.x > 1.05) packet.x = -.05;
          const px = packet.x * width, py = packet.y * height;
          context.beginPath(); context.moveTo(px - 46, py); context.lineTo(px, py); context.stroke();
          context.beginPath(); context.arc(px, py, packet.size, 0, Math.PI * 2); context.fill();
        });
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  function initCompliance() {
    const root = document.documentElement;
    const fab = document.querySelector('[data-a11y-open]');
    const dialog = document.querySelector('[data-a11y-dialog]');
    const preferenceClasses = {
      contrast: 'a11y-high-contrast', links: 'a11y-emphasize-links', font: 'a11y-readable-font',
      motion: 'a11y-no-motion', grayscale: 'a11y-grayscale', spacing: 'a11y-spacing'
    };
    let baseTheme = 'dark';
    try { baseTheme = localStorage.getItem('workshop-deck-theme') || 'dark'; } catch (_) { /* keep default */ }
    let prefs = { text: 100, contrast: false, links: false, font: false, motion: false, grayscale: false, spacing: false, light: false, hidden: false };
    try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem('a11y-prefs') || '{}') }; } catch (_) { /* keep defaults */ }

    function applyPrefs() {
      root.classList.remove('a11y-text-125', 'a11y-text-150', ...Object.values(preferenceClasses));
      if (prefs.text === 125 || prefs.text === 150) root.classList.add(`a11y-text-${prefs.text}`);
      Object.entries(preferenceClasses).forEach(([key, className]) => root.classList.toggle(className, Boolean(prefs[key])));
      root.dataset.theme = prefs.light ? 'light' : baseTheme;
      fab.hidden = prefs.hidden && location.hash !== '#a11y';
      document.querySelectorAll('[data-a11y-action]').forEach(button => {
        const action = button.dataset.a11yAction;
        if (action === 'text') button.textContent = `גודל טקסט: ${prefs.text}%`;
        else if (action === 'light') button.setAttribute('aria-pressed', String(Boolean(prefs.light)));
        else button.setAttribute('aria-pressed', String(Boolean(prefs[action])));
      });
      if (prefs.motion) document.querySelectorAll('video,audio').forEach(media => media.pause());
      try { localStorage.setItem('a11y-prefs', JSON.stringify(prefs)); } catch (_) { /* private mode */ }
    }

    fab.addEventListener('click', event => { event.stopPropagation(); dialog.showModal(); });
    dialog.querySelector('[data-a11y-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => fab.focus());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && dialog.open) {
        event.preventDefault();
        event.stopImmediatePropagation();
        dialog.close();
      }
    }, true);
    dialog.querySelectorAll('[data-a11y-action]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.a11yAction;
      if (action === 'text') prefs.text = prefs.text === 100 ? 125 : prefs.text === 125 ? 150 : 100;
      else if (action === 'light') prefs.light = !prefs.light;
      else prefs[action] = !prefs[action];
      applyPrefs();
    }));
    dialog.querySelector('[data-a11y-reset]').addEventListener('click', () => {
      prefs = { text: 100, contrast: false, links: false, font: false, motion: false, grayscale: false, spacing: false, light: false, hidden: false };
      try { localStorage.removeItem('a11y-prefs'); } catch (_) { /* private mode */ }
      applyPrefs();
    });
    dialog.querySelector('[data-a11y-hide]').addEventListener('click', () => { prefs.hidden = true; applyPrefs(); dialog.close(); });
    addEventListener('hashchange', applyPrefs);
    applyPrefs();

    const banner = document.querySelector('[data-cookie-banner]');
    const panel = document.querySelector('[data-cookie-panel]');
    const analytics = document.querySelector('[data-cookie-analytics]');
    const marketing = document.querySelector('[data-cookie-marketing]');
    const trackerRegistry = { analytics: [], marketing: [] };
    function applyConsent(consent) {
      Object.entries(trackerRegistry).forEach(([category, trackers]) => {
        if (!consent[category]) return;
        trackers.forEach(({ src, integrity }) => {
          if (document.querySelector(`script[data-tracker-src="${src}"]`)) return;
          const script = document.createElement('script');
          script.src = src;
          script.dataset.trackerSrc = src;
          if (integrity) { script.integrity = integrity; script.crossOrigin = 'anonymous'; }
          document.head.appendChild(script);
        });
      });
    }
    function saveConsent(next) {
      try { localStorage.setItem('cookieConsent', JSON.stringify({ ...next, ts: new Date().toISOString() })); } catch (_) { /* private mode */ }
      banner.classList.remove('is-open');
      applyConsent(next);
    }
    function openConsent() { banner.classList.add('is-open'); }
    document.querySelector('[data-cookie-accept]').addEventListener('click', () => saveConsent({ analytics: true, marketing: true }));
    document.querySelector('[data-cookie-reject]').addEventListener('click', () => saveConsent({ analytics: false, marketing: false }));
    document.querySelector('[data-cookie-custom]').addEventListener('click', event => {
      panel.hidden = !panel.hidden;
      event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
    });
    document.querySelector('[data-cookie-save]').addEventListener('click', () => saveConsent({ analytics: analytics.checked, marketing: marketing.checked }));
    document.querySelector('[data-cookie-settings]').addEventListener('click', openConsent);
    try {
      const saved = localStorage.getItem('cookieConsent');
      if (saved) applyConsent(JSON.parse(saved));
      else openConsent();
    } catch (_) { openConsent(); }
  }
})();
