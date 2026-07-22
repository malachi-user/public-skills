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
