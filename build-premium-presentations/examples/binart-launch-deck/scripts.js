const rtl = document.documentElement.dir === 'rtl';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

Reveal.initialize({
  width: 1280,
  height: 720,
  margin: 0,
  hash: true,
  rtl,
  controls: true,
  progress: true,
  slideNumber: 'c/t',
  transition: 'fade',
  backgroundTransition: 'fade'
});

/* ---------------------------------------------------------------------------
   Presenter chrome already shipped: time hint, click/keyboard nav, theme,
   pointer halo, magnetic buttons. Kept as-is.
   ------------------------------------------------------------------------- */

const timeHint = document.querySelector('.time-hint');
const updateHint = event => {
  const slide = event?.currentSlide || Reveal.getCurrentSlide();
  timeHint.value = slide?.dataset.timeHint || '';
};
Reveal.on('ready', updateHint);
Reveal.on('slidechanged', updateHint);

const interactive = target => target.closest('a,button,input,textarea,select,[contenteditable],[data-no-advance]');
document.addEventListener('click', event => {
  if (event.button || interactive(event.target) || getSelection()?.toString()) return;
  Reveal.next();
});
document.addEventListener('contextmenu', event => {
  if (interactive(event.target) || document.documentElement.dataset.edit === 'true') return;
  event.preventDefault();
  Reveal.prev();
});
document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'f' && !interactive(event.target)) document.documentElement.requestFullscreen?.();
  if (event.key.toLowerCase() === 't' && !interactive(event.target)) toggleTheme();
});

function toggleTheme() {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('deck-theme', html.dataset.theme);
  refreshAmbientColors();
}
document.documentElement.dataset.theme = localStorage.getItem('deck-theme') || 'dark';
document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);

if (!reduced && matchMedia('(pointer:fine)').matches) {
  const halo = document.querySelector('.pointer-halo');
  let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my;
  addEventListener('pointermove', event => { mx = event.clientX; my = event.clientY; });
  (function follow() {
    x += (mx - x) * .12; y += (my - y) * .12;
    halo.style.transform = `translate(${x}px,${y}px)`;
    requestAnimationFrame(follow);
  })();
  document.querySelectorAll('[data-magnetic]').forEach(element => {
    element.addEventListener('pointermove', event => {
      const box = element.getBoundingClientRect();
      element.style.transform = `translate(${(event.clientX-box.left-box.width/2)*.18}px,${(event.clientY-box.top-box.height/2)*.18}px)`;
    });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });
}

const hasGSAP = typeof window.gsap !== 'undefined';

/* ---------------------------------------------------------------------------
   1 · Ambient neuron canvas — a slow, quiet field of connected points.
   Theme-aware (reads --line / --accent custom properties), paused when the
   tab is hidden, density scaled to viewport, DPR-capped.
   ------------------------------------------------------------------------- */

(function ambientNeurons() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas || reduced) return; // CSS also hides this under reduced-motion.
  const ctx = canvas.getContext('2d');
  let dpr = Math.min(devicePixelRatio || 1, 2);
  let w = 0, h = 0, nodes = [];
  let lineColor = '#96b4dc29';
  let dotColor = '#19c9a8';
  let running = true;

  window.refreshAmbientColors = function refreshAmbientColors() {
    const cs = getComputedStyle(document.documentElement);
    lineColor = cs.getPropertyValue('--line').trim() || lineColor;
    dotColor = cs.getPropertyValue('--accent').trim() || dotColor;
  };
  refreshAmbientColors();

  function makeNodes() {
    const area = w * h;
    const base = Math.round(area / 16000);
    const count = Math.max(18, Math.min(base, w < 720 ? 34 : 70));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22
    }));
  }

  function resize() {
    w = innerWidth; h = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeNodes();
  }

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 180); });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) tick(); });

  const maxDist = 130;

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);

    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      n.x = Math.max(0, Math.min(w, n.x));
      n.y = Math.max(0, Math.min(h, n.y));
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxDist) continue;
        ctx.globalAlpha = (1 - dist / maxDist) * 0.7;
        ctx.strokeStyle = lineColor;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = dotColor;
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(tick);
  }

  resize();
  tick();
})();

/* ---------------------------------------------------------------------------
   2 · Mascot companion — shows/hides and reacts per slide via data-mascot.
   ------------------------------------------------------------------------- */

(function mascotController() {
  const mascot = document.getElementById('mascot');
  const bubble = document.getElementById('mascot-bubble');
  if (!mascot || !bubble) return;

  function applyState(slide) {
    const gesture = slide?.dataset.mascot || 'hide';
    if (gesture === 'hide' || !gesture) {
      mascot.dataset.state = 'hidden';
      return;
    }
    mascot.dataset.gesture = gesture;
    bubble.textContent = slide.dataset.mascotText || '';
    // Force a reflow-restart so re-entering the same gesture replays the pop-in.
    mascot.dataset.state = 'hidden';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { mascot.dataset.state = 'in'; });
    });
  }

  Reveal.on('ready', event => applyState(event.currentSlide));
  Reveal.on('slidechanged', event => applyState(event.currentSlide));
})();

/* ---------------------------------------------------------------------------
   3 · Proof counters — count 0 → target when the slide gains focus.
   ------------------------------------------------------------------------- */

(function counters() {
  const proof = document.getElementById('proof');
  if (!proof) return;
  const els = [...proof.querySelectorAll('.count[data-count]')];
  if (!els.length) return;

  function setFinal() {
    els.forEach(el => { el.textContent = el.dataset.count; });
  }

  function reset() {
    els.forEach(el => { el.textContent = '0'; });
  }

  function animate() {
    if (reduced) { setFinal(); return; }
    reset();
    const duration = 1300;
    const start = performance.now();
    const targets = els.map(el => parseInt(el.dataset.count, 10) || 0);

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      els.forEach((el, i) => {
        el.textContent = String(Math.round(targets[i] * eased));
      });
      if (t < 1) requestAnimationFrame(frame);
      else setFinal();
    }
    requestAnimationFrame(frame);
  }

  Reveal.on('slidechanged', event => {
    if (event.currentSlide.id === 'proof') animate();
    else if (event.previousSlide?.id === 'proof') reset();
  });
  Reveal.on('ready', event => { if (event.currentSlide.id === 'proof') animate(); });
})();

/* ---------------------------------------------------------------------------
   4 · Hub links — draw connective lines from the core to each visible node,
   recomputed from live DOM geometry (percent coordinates on a 0–100 viewBox
   that stretches to fill the .hub container, so 1 unit = 1% width/height).
   ------------------------------------------------------------------------- */

(function hubLinks() {
  const hub = document.querySelector('.hub');
  const svg = document.querySelector('.hub__links');
  const core = document.querySelector('.hub__core');
  if (!hub || !svg || !core) return;

  function draw() {
    if (getComputedStyle(svg).display === 'none') { svg.innerHTML = ''; return; }
    const hubBox = hub.getBoundingClientRect();
    if (!hubBox.width || !hubBox.height) return;
    const coreBox = core.getBoundingClientRect();
    const cx = ((coreBox.left + coreBox.width / 2) - hubBox.left) / hubBox.width * 100;
    const cy = ((coreBox.top + coreBox.height / 2) - hubBox.top) / hubBox.height * 100;

    const nodes = [...hub.querySelectorAll('.hub__node')].filter(n => getComputedStyle(n).visibility !== 'hidden');
    svg.innerHTML = '';
    const lines = nodes.map(node => {
      const box = node.getBoundingClientRect();
      const nx = ((box.left + box.width / 2) - hubBox.left) / hubBox.width * 100;
      const ny = ((box.top + box.height / 2) - hubBox.top) / hubBox.height * 100;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', nx); line.setAttribute('y2', ny);
      svg.appendChild(line);
      return line;
    });

    if (!reduced && hasGSAP) {
      gsap.fromTo(lines, { opacity: 0 }, { opacity: 0.28, duration: 0.9, ease: 'power2.out', stagger: 0.12, overwrite: true });
    } else {
      lines.forEach(line => { line.style.opacity = '0.28'; });
    }
  }

  Reveal.on('slidechanged', event => { if (event.currentSlide.id === 'solution') requestAnimationFrame(draw); });
  Reveal.on('ready', event => { if (event.currentSlide.id === 'solution') requestAnimationFrame(draw); });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (Reveal.getCurrentSlide()?.id === 'solution') draw(); }, 150);
  });
})();

/* ---------------------------------------------------------------------------
   5 · WhatsApp demo chat — an autoplaying, self-resetting conversation.
   ------------------------------------------------------------------------- */

(function chatDemo() {
  const log = document.getElementById('chatLog');
  if (!log) return;

  const script = [
    { who: 'them', text: 'היי, ראיתי שאתם עוזרים לעסקים עם אוטומציה. אפשר לשמוע פרטים?' },
    { who: 'us', typing: true, text: 'היי! בשמחה 🙂 באיזה תחום העסק שלך, ומה הכי גוזל לך זמן היום?' },
    { who: 'them', text: 'יש לי מספרה, ורוב הזמן הולך על תיאום תורים בוואטסאפ' },
    { who: 'us', typing: true, text: 'מעולה — בדיוק בשביל זה יש לנו סוכן שקובע תורים לבד, אוסף את הפרטים ופותח לך ליד תוך שניות 👍' },
    { who: 'sys', text: '✓ ליד נפתח במערכת · הודעת תיאום נשלחה ללקוח' }
  ];

  let timers = [];
  const clearAll = () => { timers.forEach(clearTimeout); timers = []; };
  const wait = ms => new Promise(resolve => { timers.push(setTimeout(resolve, ms)); });

  function addBubble(who, text) {
    const div = document.createElement('div');
    div.className = `bubble bubble--${who}`;
    div.textContent = text;
    log.appendChild(div);
    requestAnimationFrame(() => div.classList.add('in'));
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function addTyping(who) {
    const div = document.createElement('div');
    div.className = `bubble bubble--${who} bubble--typing`;
    div.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(div);
    requestAnimationFrame(() => div.classList.add('in'));
    log.scrollTop = log.scrollHeight;
    return div;
  }

  async function play() {
    log.innerHTML = '';
    const msgDelay = reduced ? 90 : 650;
    const typeDelay = reduced ? 120 : 1100;
    for (const step of script) {
      if (step.typing) {
        const typing = addTyping(step.who);
        await wait(typeDelay);
        typing.remove();
      } else {
        await wait(step.who === 'them' ? msgDelay : 200);
      }
      addBubble(step.who, step.text);
      await wait(reduced ? 60 : 300);
    }
  }

  Reveal.on('slidechanged', event => {
    clearAll();
    if (event.currentSlide.id === 'demo') play();
    else log.innerHTML = '';
  });
  Reveal.on('ready', event => { if (event.currentSlide.id === 'demo') play(); });
})();

/* ---------------------------------------------------------------------------
   6 · .rise reveal — GSAP-driven staggered entrance per active slide, with an
   explicit reduced-motion bypass. Content stays visible if this never runs.
   ------------------------------------------------------------------------- */

(function riseReveal() {
  if (reduced || !hasGSAP) return;

  function reveal(slide) {
    const items = slide.querySelectorAll('.rise');
    if (!items.length) return;
    gsap.fromTo(items,
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, overwrite: true }
    );
  }

  Reveal.on('ready', event => reveal(event.currentSlide));
  Reveal.on('slidechanged', event => reveal(event.currentSlide));
})();
