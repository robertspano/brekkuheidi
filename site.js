/* Brekkuskógur – shared behaviour for content pages
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
  const vids = $$('.pc-video video, .feature-media video, .hero-video, .plan-video video');
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

  /* ---- Contact form → compose email (no backend needed) ---- */
  $$('.contact-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form);
      const to = form.dataset.to || '';
      const subject = 'Fyrirspurn um lóð í Brekkuskógi';
      const body = [
        `Nafn: ${d.get('nafn') || ''}`,
        `Netfang: ${d.get('netfang') || ''}`,
        `Sími: ${d.get('simi') || ''}`,
        `Lóð / áhugasvið: ${d.get('lod') || ''}`,
        '',
        d.get('skilabod') || ''
      ].join('\n');
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const note = form.querySelector('.cf-note');
      if (note) note.textContent = 'Takk! Tölvupóstforritið þitt opnast með fyrirspurninni — smelltu á „Senda“ til að ljúka.';
    });
  });

  /* ---- Prefill "Lóð / áhugasvið" from the plot the visitor clicked on the map ---- */
  (() => {
    let lod;
    try { lod = sessionStorage.getItem('bh_lod'); } catch (e) {}
    if (!lod) return;
    try { sessionStorage.removeItem('bh_lod'); } catch (e) {}
    const field = document.querySelector('#contactForm [name="lod"]');
    if (!field) return;
    field.value = lod;
    field.classList.add('cf-prefilled');          // brief glow so it's clear it filled itself
    setTimeout(() => field.classList.remove('cf-prefilled'), 2400);
  })();

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

  /* ---- Stats band: count-up on scroll (smooth, staggered, once) ---- */
  (() => {
    const band = document.querySelector('#stats');
    if (!band) return;                                    // safe if section absent
    const nums = Array.from(band.querySelectorAll('.stat2-num[data-stat-to]'));
    if (!nums.length) return;

    // group separator for 5000 -> "5.000"
    const group = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const makeRender = el => {
      const type = el.dataset.statType;
      const to = parseInt(el.dataset.statTo, 10);
      const pre = el.dataset.statPrefix || '';
      const suf = el.dataset.statSuffix || '';
      return p => {
        const cur = Math.round(p * to);
        const body = type === 'area' ? group(cur) : String(cur);
        el.textContent = pre + body + suf;                // unit lives in a sibling .stat2-unit
      };
    };
    const renders = nums.map(makeRender);
    const settle = () => renders.forEach(r => r(1));      // exact finals: 23 / ~5.000 / 28

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce ||
        !('IntersectionObserver' in window) ||
        !('requestAnimationFrame' in window)) {
      settle();
      return;
    }

    const easeOut = p => 1 - Math.pow(1 - p, 3);
    const DUR = 1500;
    const STAGGER = 140;

    const runFrom = start => {
      nums.forEach((el, i) => {
        const render = renders[i];
        const begin = start + i * STAGGER;
        const frame = now => {
          const p = Math.min(1, Math.max(0, (now - begin) / DUR));
          render(easeOut(p));
          if (p < 1) requestAnimationFrame(frame);
          else render(1);
        };
        requestAnimationFrame(frame);
      });
    };

    let done = false;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting || done) return;
        done = true;
        io.disconnect();
        requestAnimationFrame(t => runFrom(t));
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.25 });
    io.observe(band);
  })();
})();
