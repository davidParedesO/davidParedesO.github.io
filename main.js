/* ==========================================================================
   David Paredes — Portfolio · interacciones
   Sin dependencias. Todo respeta prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* modo privado */ } }
  };

  /* ---------- Año del footer ---------- */
  $('#y').textContent = new Date().getFullYear();

  /* ---------- Título con entrada palabra a palabra ---------- */
  function splitTitle() {
    $$('.split').forEach(el => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');
    });
  }

  /* ---------- Idioma (ES por defecto, EN desde i18n.js) ---------- */
  const original = new Map();
  const originalAttr = new Map();
  const meta = {
    es: { title: document.title, description: $('meta[name="description"]').content }
  };
  $$('[data-i18n]').forEach(el => original.set(el, el.innerHTML));
  // data-i18n-attr="alt:clave;src:otra" → varios atributos por elemento
  const attrPairs = el => el.dataset.i18nAttr.split(';').map(p => p.split(':'));
  $$('[data-i18n-attr]').forEach(el => {
    originalAttr.set(el, Object.fromEntries(attrPairs(el).map(([attr]) => [attr, el.getAttribute(attr)])));
  });

  let lang = 'es';

  function applyLang(next, animate = true) {
    lang = next === 'en' ? 'en' : 'es';
    const dict = (window.I18N && window.I18N[lang]) || null;

    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const html = lang === 'es' || !dict || !(key in dict) ? original.get(el) : dict[key];
      if (el.innerHTML !== html) {
        el.innerHTML = html;
        if (animate && !reduce) { el.classList.remove('lang-fade'); void el.offsetWidth; el.classList.add('lang-fade'); }
      }
    });
    $$('[data-i18n-attr]').forEach(el => {
      attrPairs(el).forEach(([attr, key]) => {
        el.setAttribute(attr, lang === 'es' || !dict || !(key in dict) ? originalAttr.get(el)[attr] : dict[key]);
      });
    });

    const m = lang === 'es' ? meta.es : dict.meta;
    document.title = m.title;
    $('meta[name="description"]').content = m.description;
    document.documentElement.lang = lang;

    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    splitTitle();
    rotator.reset();
    store.set('lang', lang);
  }

  /* ---------- Palabra rotativa con efecto máquina de escribir ---------- */
  const rotator = (() => {
    const el = $('.rotator');
    let words = [], i = 0, char = 0, deleting = false, timer;

    function tick() {
      const word = words[i];
      char += deleting ? -1 : 1;
      el.textContent = word.slice(0, char);
      let delay = deleting ? 38 : 75;
      if (!deleting && char === word.length) { delay = 2200; deleting = true; }
      else if (deleting && char === 0) { deleting = false; i = (i + 1) % words.length; delay = 300; }
      timer = setTimeout(tick, delay);
    }
    return {
      reset() {
        clearTimeout(timer);
        words = (el.dataset[lang === 'en' ? 'wordsEn' : 'wordsEs'] || '').split('|');
        i = 0; char = words[0].length; deleting = false;
        el.textContent = words[0];
        if (!reduce && words.length > 1) timer = setTimeout(() => { deleting = true; tick(); }, 2600);
      }
    };
  })();

  $$('.lang button').forEach(b => b.addEventListener('click', () => {
    applyLang(b.dataset.lang);
    const url = new URL(location.href);
    if (lang === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
    history.replaceState(null, '', url);
  }));

  const fromUrl = new URLSearchParams(location.search).get('lang');
  const initial = fromUrl || store.get('lang') || ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en');
  applyLang(initial, false);

  /* ---------- Aparición al hacer scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Barra de progreso, enlace activo y línea de tiempo ---------- */
  const bar = $('.progress');
  const timeline = $('.tl');
  const sections = $$('main section[id]');
  const navLinks = $$('.links a[href^="#"]:not(.btn)');
  let ticking = false;

  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;

    let current = '';
    sections.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s.id; });
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${current}`));

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height));
      timeline.style.setProperty('--fill', p.toFixed(3));
    }
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Efectos de puntero (solo ratón) ---------- */
  if (finePointer && !reduce) {
    // Foco de luz que sigue al cursor en las tarjetas
    $$('.spot').forEach(card => card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));

    // Inclinación 3D suave en los proyectos
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    // Botones "magnéticos"
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Maqueta del configurador: medidas y superficie animadas ---------- */
  const sizeEl = $('#mock-size');
  const areaEl = $('#mock-area');
  if (sizeEl && areaEl && !reduce) {
    const sizes = [[300, 150], [200, 100], [500, 200], [120, 80]];
    let k = 0;
    const fmt = n => n.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function animateArea(from, to) {
      const t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / 600);
        const v = from + (to - from) * (1 - Math.pow(1 - p, 3));
        areaEl.textContent = `${fmt(v)} m²`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    setInterval(() => {
      const [w0, h0] = sizes[k];
      k = (k + 1) % sizes.length;
      const [w, h] = sizes[k];
      sizeEl.textContent = `${w} × ${h} cm`;
      animateArea((w0 * h0) / 1e4, (w * h) / 1e4);
    }, 2600);
  }
})();
