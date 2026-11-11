// remonter en haut en douceur (animation maison : le « smooth » natif saute d’un coup sur iPhone)
function smoothTop() {
  const y0 = window.scrollY; if (y0 < 2) return; const t0 = performance.now(); const d = Math.min(650, 280 + y0 / 6);
  const step = now => { const k = Math.min(1, (now - t0) / d); const e = 1 - Math.pow(1 - k, 3); window.scrollTo(0, y0 * (1 - e)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// ============================================================
//  SENSATION D’APPLI MOBILE + FLUIDITÉ
// ============================================================
// ---------- 1. Pendant le défilement, le fond animé se met en pause (moins de calculs, défilement fluide) ----------
(function pauseWhileScrolling() {
  let t = 0; const root = document.documentElement;
  const on = () => { if (!root.classList.contains('scrolling')) root.classList.add('scrolling'); clearTimeout(t); t = setTimeout(() => root.classList.remove('scrolling'), 180); };
  addEventListener('scroll', on, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => root.classList.toggle('bg-hidden', document.hidden));
})();

// ---------- 2. Barre de titre compacte (comme iOS) quand le grand titre sort de l’écran ----------
(function compactTitle() {
  const bar = document.createElement('div'); bar.id = 'minibar'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<span></span>';
  document.body.appendChild(bar);
  let raf = 0;
  const titleEl = () => $('#view h1') || $('#view .jtitle');
  const check = () => {
    raf = 0;
    const h = titleEl(); const hide = !h || $('#launch') || S.ui.tab === 't_live' || document.body.style.position === 'fixed';
    if (hide) { bar.classList.remove('on'); return; }
    const r = h.getBoundingClientRect();
    const show = r.bottom < (bar.offsetHeight || 50) - 8; // le grand titre est passé sous la barre
    if (show) { const txt = h.textContent.trim(); const sp = bar.firstChild; if (sp.textContent !== txt) sp.textContent = txt; }
    bar.classList.toggle('on', show);
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(check); };
  addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask);
  render = (orig => function () { const r = orig.apply(this, arguments); ask(); return r; })(render);
  // toucher la barre du haut remonte en haut de la page (comme toucher l’heure sur iPhone)
  bar.addEventListener('click', () => smoothTop());
})();

// ---------- 3. Chaque onglet garde sa position ; toucher l’onglet ouvert remonte en haut ----------
(function tabScroll() {
  const pos = {};
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const k = b.dataset.tab; if (!k || k.startsWith('__')) return;
    if (k === S.ui.tab || (k === 't_home' && S.ui.tab === 't_live')) { e.stopImmediatePropagation(); smoothTop(); return; }
    pos[S.ui.tab] = window.scrollY;
    const target = k; setTimeout(() => { if (S.ui.tab === target) window.scrollTo(0, pos[target] || 0); }, 0);
  }, true);
})();

// ---------- 4. Pas de sélection de texte ni de menu « Copier » sur un appui long (sauf dans les champs) ----------
document.addEventListener('selectstart', e => { if (!e.target.closest || !e.target.closest('input, textarea, [contenteditable]')) e.preventDefault(); });

// ---------- 5. Glisser après le dernier onglet ouvre l’accueil ----------
swipeTab = (orig => function (dir) {
  const mode = S.ui.tab.startsWith('t_') ? 'train' : 'nutri';
  const list = TABS[mode].map(x => x[0]).filter(k => !k.startsWith('__'));
  const cur = S.ui.tab === 't_live' ? 't_home' : S.ui.tab;
  if (dir > 0 && list.indexOf(cur) === list.length - 1) { const v = $('#view'); v.style.transform = ''; v.style.opacity = ''; showLauncher(); return; }
  return orig.apply(this, arguments);
})(swipeTab);

// ---------- 6. Changement d’onglet au doigt : les deux pages glissent ensemble (comme un carrousel iOS) ----------
swipeTab = (orig => function (dir) {
  const mode = S.ui.tab.startsWith('t_') ? 'train' : 'nutri';
  const list = TABS[mode].map(x => x[0]).filter(k => !k.startsWith('__'));
  const i = list.indexOf(S.ui.tab === 't_live' ? 't_home' : S.ui.tab); const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return orig.apply(this, arguments);
  const v = $('#view'); const r = v.getBoundingClientRect(); const W = innerWidth;
  const off = new DOMMatrix(getComputedStyle(v).transform).m41 || 0;
  document.querySelectorAll('.swghost').forEach(g => g.remove());
  const g = v.cloneNode(true); g.removeAttribute('id'); g.className = 'swghost'; g.setAttribute('aria-hidden', 'true');
  g.style.cssText = `position:fixed;left:${r.left - off}px;top:${r.top}px;width:${r.width}px;margin:0;pointer-events:none;z-index:4;transform:translate3d(${off}px,0,0)`;
  document.body.appendChild(g);
  window.SW_OUT = true;
  const res = orig.apply(this, arguments);
  v.classList.remove('swl', 'swr', 'enter');
  v.style.transition = 'none'; v.style.opacity = ''; v.style.transform = `translate3d(${dir > 0 ? W : -W}px,0,0)`;
  void v.offsetWidth;
  const ease = 'transform .32s cubic-bezier(.25, .9, .3, 1)';
  v.style.transition = ease; v.style.transform = '';
  g.style.transition = ease; g.style.transform = `translate3d(${dir > 0 ? -W * 0.35 : W * 0.35}px,0,0)`; g.style.opacity = '0'; g.style.transition = ease + ', opacity .32s ease';
  setTimeout(() => { g.remove(); v.style.transition = ''; window.SW_OUT = false; }, 340);
  return res;
})(swipeTab);
