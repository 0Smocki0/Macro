// ============================================================
//  SÉLECTION QUI GLISSE : la pastille de l’élément choisi glisse vers le nouveau choix
//  (barre d’onglets, sélecteurs segmentés, puces de filtre, jours du menu)
// ============================================================
(function slidingSelection() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const MEM = new Map(); // clé du groupe → dernière position de la pastille
  const typeOf = el => el.closest('nav.tabs') ? 'tab' : el.parentElement.classList.contains('seg') ? 'seg' : el.parentElement.classList.contains('daystrip') ? 'day' : el.classList.contains('chip') ? 'chip' : null;
  const sig = (box, t) => t + '|' + [...box.children].filter(c => !c.classList.contains('slide-pill')).slice(0, 4).map(c => (c.dataset.tab || c.dataset.v || c.dataset.m || c.textContent || '').trim().slice(0, 14)).join('/');
  function run() {
    const ons = document.querySelectorAll('nav.tabs button.on, .seg > button.on, .daystrip > button.on, .chip.on');
    const seen = new Set();
    for (const on of ons) {
      const box = on.parentElement; if (!box || seen.has(box)) continue; seen.add(box);
      const t = typeOf(on);
      // sélections multiples (batch cooking, exclusions, frigo…) : jamais de pastille qui glisse
      if (!t || /toggle/i.test(on.dataset.act || '')) { box.querySelector(':scope > .slide-pill')?.remove(); box.classList.remove('slider', 'slider-chip', 'slider-seg', 'slider-day', 'slider-tab'); continue; }
      const items = [...box.children].filter(c => c.tagName === on.tagName && !c.classList.contains('slide-pill'));
      if (items.length < 2 || items.filter(c => c.classList.contains('on')).length !== 1) { box.querySelector(':scope > .slide-pill')?.remove(); box.classList.remove('slider'); continue; } // choix multiples : pas de glissement
      if (!on.offsetWidth) continue;
      if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
      box.classList.add('slider', 'slider-' + t);
      let pill = box.querySelector(':scope > .slide-pill');
      if (!pill) { pill = document.createElement('span'); pill.className = 'slide-pill pill-' + t; pill.setAttribute('aria-hidden', 'true'); box.prepend(pill); }
      const to = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight };
      const key = sig(box, t); const from = MEM.get(key); MEM.set(key, to);
      const cur = pill._pos;
      if (cur && cur.x === to.x && cur.y === to.y && cur.w === to.w && cur.h === to.h) continue;
      const start = cur || from;
      const place = p => { pill.style.transform = `translate(${p.x}px, ${p.y}px)`; pill.style.width = p.w + 'px'; pill.style.height = p.h + 'px'; };
      if (start && !reduce.matches && (start.x !== to.x || start.y !== to.y)) {
        pill.style.transition = 'none'; place(start); void pill.offsetWidth;
        pill.style.transition = ''; place(to);
        // petit étirement pendant le trajet, comme iOS
        pill.animate([{ scale: '1 1' }, { scale: '1.06 .92' }, { scale: '1 1' }], { duration: 420, easing: 'ease-out' });
      } else { pill.style.transition = 'none'; place(to); void pill.offsetWidth; pill.style.transition = ''; }
      pill._pos = to;
    }
  }
  let q = 0; const schedule = () => { if (!q) q = requestAnimationFrame(() => { q = 0; run(); }); };
  new MutationObserver(muts => { for (const m of muts) { if (m.type === 'attributes' && m.target.classList && m.target.classList.contains('slide-pill')) continue; schedule(); return; } })
    .observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', () => { for (const p of document.querySelectorAll('.slide-pill')) p._pos = null; MEM.clear(); schedule(); });
  schedule();
})();
