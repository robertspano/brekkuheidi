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
