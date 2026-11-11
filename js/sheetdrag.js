// ============================================================
//  FENÊTRES DU BAS : poignée qu’on touche pour fermer, et fenêtre qui suit le doigt vers le bas
// ============================================================
(function sheets() {
  const sheetEl = () => document.querySelector('#modal .sheet');
  const bgEl = () => document.querySelector('#modal .sheet-bg');
  // vraie poignée en haut de chaque fenêtre (zone de toucher large)
  const _open = openSheet;
  openSheet = function () {
    const r = _open.apply(this, arguments);
    const sh = sheetEl(); if (sh && !sh.querySelector('.sheet-grab')) sh.insertAdjacentHTML('afterbegin', '<button class="sheet-grab" data-act="sheetGrab" aria-label="Fermer la fenêtre"><i></i></button>');
    return r;
  };
  // fermeture animée : la fenêtre descend, le fond s’éclaircit, puis on ferme vraiment
  let closing = false;
  function slideClose(fromPx) {
    const sh = sheetEl(), bg = bgEl(); if (!sh || closing) { if (!sh) closeSheet(); return; }
    closing = true; const h = sh.offsetHeight || 600; const left = h - (fromPx || 0);
    const t = Math.max(140, Math.min(300, left / 2.4));
    sh.style.transition = `transform ${t}ms cubic-bezier(.3, .0, .8, .4)`; sh.style.transform = `translateY(${h + 20}px)`;
    if (bg) { bg.style.transition = `background-color ${t}ms linear`; bg.style.backgroundColor = 'rgba(0,0,0,0)'; }
    setTimeout(() => { closing = false; closeSheet(); if (typeof render === 'function' && !$('#launch')) render(); }, t);
  }
  window.slideClose = slideClose;
  ACTIONS.sheetGrab = () => slideClose(0);
  ACTIONS.closeSheet = () => slideClose(0);
  ACTIONS.bgClose = (el, e) => { if (e.target === el) slideClose(0); };

  // glisser vers le bas : la fenêtre suit le doigt
  let st = null;
  const skip = t => t.closest('input, textarea, select, .wheel, input[type=range], .pgchart, .chipsrow, .hgal .hprev, .daystrip');
  document.addEventListener('touchstart', e => {
    st = null; const sh = e.target.closest && e.target.closest('#modal .sheet'); if (!sh || e.touches.length !== 1 || skip(e.target)) return;
    const body = sh.querySelector('.sheet-b'); const onTop = e.target.closest('.sheet-h, .sheet-grab');
    const t = e.touches[0]; st = { sh, body, onTop: !!onTop, x: t.clientX, y: t.clientY, t: Date.now(), dy: 0, on: false, last: [] };
    e.stopImmediatePropagation(); // remplace l’ancien geste de fermeture
  }, { capture: true, passive: true });
  document.addEventListener('touchmove', e => {
    if (!st) return; const t = e.touches[0]; const dx = t.clientX - st.x, dy = t.clientY - st.y;
    if (!st.on) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) { st = null; return; }
      if (dy < -4) { st = null; return; } // on remonte : défilement normal
      if (dy > 6 && (st.onTop || !st.body || st.body.scrollTop <= 0)) { st.on = true; st.y = t.clientY; st.sh.style.transition = 'none'; const bg = bgEl(); if (bg) bg.style.transition = 'none'; }
      else return;
    }
    e.preventDefault();
    const d = t.clientY - st.y; st.dy = d > 0 ? d : d / 4; // un peu de résistance vers le haut
    st.sh.style.transform = `translateY(${st.dy}px)`;
    const bg = bgEl(); if (bg) bg.style.backgroundColor = `rgba(0,0,0,${(0.5 * Math.max(0, 1 - st.dy / (st.sh.offsetHeight || 600))).toFixed(3)})`;
    st.last.push([Date.now(), t.clientY]); if (st.last.length > 5) st.last.shift();
  }, { capture: true, passive: false });
  const end = () => {
    if (!st) return; const s = st; st = null; if (!s.on) return;
    // vitesse du doigt juste avant de lâcher (les 120 dernières ms seulement)
    const now = Date.now(); const L = s.last.filter(p => now - p[0] < 120);
    const v = L.length > 1 ? (L[L.length - 1][1] - L[0][1]) / Math.max(1, L[L.length - 1][0] - L[0][0]) : 0; // px / ms
    if (s.dy > 110 || v > 0.45) { slideClose(s.dy); return; }
    s.sh.style.transition = 'transform .32s cubic-bezier(.2, .9, .3, 1.15)'; s.sh.style.transform = '';
    const bg = bgEl(); if (bg) { bg.style.transition = 'background-color .3s'; bg.style.backgroundColor = ''; }
  };
  document.addEventListener('touchend', end, { capture: true, passive: true });
  document.addEventListener('touchcancel', end, { capture: true, passive: true });
})();
