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
  bar.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// ---------- 3. Chaque onglet garde sa position ; toucher l’onglet ouvert remonte en haut ----------
(function tabScroll() {
  const pos = {};
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const k = b.dataset.tab; if (!k || k.startsWith('__')) return;
    if (k === S.ui.tab || (k === 't_home' && S.ui.tab === 't_live')) { e.stopImmediatePropagation(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    pos[S.ui.tab] = window.scrollY;
    const target = k; setTimeout(() => { if (S.ui.tab === target) window.scrollTo(0, pos[target] || 0); }, 0);
  }, true);
})();

// ---------- 4. Pas de sélection de texte ni de menu « Copier » sur un appui long (sauf dans les champs) ----------
document.addEventListener('selectstart', e => { if (!e.target.closest || !e.target.closest('input, textarea, [contenteditable]')) e.preventDefault(); });
