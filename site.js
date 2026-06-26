/* Brekkuheiði – shared behaviour for content pages
   (Home, Um svæðið, Spurt & svarað, Hafa samband). The map page uses app.js. */
(() => {
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  /* ---- Side menu (VALMYND) ---- */
  const menu = $('#menu'), scrim = $('#scrim');
  const openMenu  = () => { menu && menu.classList.add('open'); scrim && scrim.classList.add('open'); document.body.classList.add('menu-open'); };
  const closeMenu = () => { menu && menu.classList.remove('open'); scrim && scrim.classList.remove('open'); document.body.classList.remove('menu-open'); };
  $('#menuOpen') && ($('#menuOpen').onclick = openMenu);
  $('#menuClose') && ($('#menuClose').onclick = closeMenu);
  scrim && (scrim.onclick = closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---- Sticky header tint after scrolling past the hero ---- */
  const topbar = $('.topbar');
  if (topbar) {
    const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- FAQ accordion ---- */
  $$('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    q && q.addEventListener('click', () => {
      const open = item.classList.contains('open');
      $$('.faq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  /* ---- Nearby-places carousel: slow auto-scroll ---- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-carousel]').forEach(car => {
    const track = car.querySelector('.carousel-track');
    if (!track) return;
    const step = () => {
      const card = track.querySelector('.place-card');
      return card ? card.getBoundingClientRect().width + 30 : 480;
    };
    const prev = car.querySelector('.car-prev');
    const next = car.querySelector('.car-next');

    let pos = 0, dir = 1, paused = false, idle = null;
    const SPEED = 0.4;                       // px per frame — slow, calm drift
    const wake = (ms = 2800) => {            // pause auto-scroll briefly after a manual action
      paused = true;
      clearTimeout(idle);
      idle = setTimeout(() => { pos = track.scrollLeft; paused = false; }, ms);
    };

    prev && prev.addEventListener('click', () => { wake(); track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next && next.addEventListener('click', () => { wake(); track.scrollBy({ left:  step(), behavior: 'smooth' }); });
    car.addEventListener('mouseenter', () => { paused = true; });
    car.addEventListener('mouseleave', () => { pos = track.scrollLeft; paused = false; });
    track.addEventListener('pointerdown', () => wake());
    track.addEventListener('wheel', () => wake(), { passive: true });

    if (reduceMotion) return;                // honour reduced-motion: no auto-scroll
    let inView = true;
    if ('IntersectionObserver' in window) {
      inView = false;
      new IntersectionObserver(es => es.forEach(e => { inView = e.isIntersecting; }), { threshold: 0.12 }).observe(car);
    }
    const tick = () => {
      if (!paused && inView) {
        const max = track.scrollWidth - track.clientWidth;
        if (max > 4) {
          pos += dir * SPEED;
          if (pos >= max) { pos = max; dir = -1; }
          else if (pos <= 0) { pos = 0; dir = 1; }
          track.scrollLeft = pos;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* ---- Autoplay card videos only while visible ---- */
  const vids = $$('.pc-video video');
  if (vids.length && 'IntersectionObserver' in window) {
    const vio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const v = e.target;
        if (e.isIntersecting) { v.muted = true; v.play().catch(() => {}); }
        else v.pause();
      });
    }, { threshold: 0.25 });
    vids.forEach(v => vio.observe(v));
  } else {
    vids.forEach(v => { v.muted = true; v.play().catch(() => {}); });
  }

  /* ---- Scroll reveal ---- */
  const reveals = $$('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ---- Footer year ---- */
  $$('.js-year').forEach(el => el.textContent = new Date().getFullYear());

  /* ---- Smooth-scroll for in-page anchors ---- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const t = document.querySelector(id);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); closeMenu(); }
      }
    });
  });
})();
