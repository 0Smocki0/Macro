// ============================================================
//  DÉTAIL AU TOUCHER SUR TOUS LES GRAPHIQUES : une bulle affiche la valeur et son unité
//  (attribut data-tip, ou <title> d’une forme SVG, ou title d’une barre)
// ============================================================
let TIP_T = null;
function tipHide() { const b = $('#tipbub'); if (b) { b.id = ''; b.classList.add('out'); setTimeout(() => b.remove(), 160); } clearTimeout(TIP_T); }
function tipShow(text, x, y, act) {
  tipHide(); const b = document.createElement('div'); b.id = 'tipbub'; b.className = 'tipbub';
  b.innerHTML = `<span>${esc(text).replace(/\n/g, '<br>')}</span>${act ? `<button data-act="${esc(act.a)}" data-id="${esc(act.id)}">${esc(act.l || 'Voir ›')}</button>` : ''}`;
  document.body.appendChild(b);
  const r = b.getBoundingClientRect(); const vw = innerWidth;
  let left = Math.max(8, Math.min(vw - r.width - 8, x - r.width / 2)); let top = y - r.height - 14; if (top < 8) top = y + 18;
  b.style.left = left + 'px'; b.style.top = top + 'px';
  TIP_T = setTimeout(tipHide, act ? 4500 : 2600);
}
function tipFrom(t) {
  if (!t || !t.closest) return null;
  const el = t.closest('[data-tip]');
  if (el) return { el, text: el.dataset.tip, act: el.dataset.tipAct ? { a: el.dataset.tipAct, id: el.dataset.tipId, l: el.dataset.tipL } : null };
  // forme SVG avec <title>
  const shape = t.closest('rect, circle, path, ellipse, g');
  if (shape && shape.closest('svg')) { let n = shape; while (n && n.tagName !== 'svg') { const ti = [...n.children].find(c => c.tagName === 'title'); if (ti) return { el: n, text: ti.textContent }; n = n.parentElement; } }
  const bar = t.closest('.wchart > div[title], .wbars > div[title], .intchart > div[title]');
  if (bar) return { el: bar, text: bar.getAttribute('title') };
  return null;
}
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('#tipbub')) { setTimeout(tipHide, e.target.closest('button') ? 50 : 0); return; }
  const T = tipFrom(e.target);
  if (!T) { tipHide(); return; }
  // un élément actionnable autour (bouton, ligne cliquable) garde la priorité
  let act = e.target.closest('[data-act]'); if (act && (act.dataset.act === 'bgClose' || act.classList.contains('sheet-bg'))) act = null;
  if (act && !T.el.contains(act) && act !== T.el) return;
  if (T.el.dataset && T.el.dataset.tip && act === T.el && !T.el.dataset.tipForce) return;
  tipShow(T.text, e.clientX, e.clientY, T.act);
  document.querySelectorAll('.tipsel').forEach(x => x.classList.remove('tipsel')); if (T.el.classList) T.el.classList.add('tipsel');
}, true);
addEventListener('scroll', () => tipHide(), { passive: true, capture: true });

// ---------- poids : chaque pesée ----------
weightChart = (orig => function (ws) {
  const h = orig(ws); const pts = ws.slice(-90); let i = 0;
  return h.replace(/<circle ([^>]*)r="2\.2"([^>]*)\/>/g, (m, a, b) => { const w = pts[i++]; if (!w) return m;
    const cx = (a.match(/cx="([\d.]+)"/) || [])[1], cy = (a.match(/cy="([\d.]+)"/) || [])[1];
    return `${m}<circle cx="${cx}" cy="${cy}" r="9" fill="transparent" data-tip="${esc(fmtDate(w.d, { weekday: 'short', day: 'numeric', month: 'short' }))} : ${fr(w.kg)} kg"/>`; });
})(weightChart);

// ---------- cartes des muscles ----------
heatMapSVG = (orig => function (c) {
  const h = orig(c); const vals = Object.values(c); const isKg = Math.max(0, ...vals) > 300;
  const keys = [...Object.keys(MAP_FRONT), ...Object.keys(MAP_BACK)]; let i = 0;
  return h.replace(/<g style="fill:var\(--accent\);fill-opacity:[^"]*">/g, m => { const k = keys[i++]; const v = c[k] || 0; const nm = (typeof MUS_NAME !== 'undefined' && MUS_NAME[k]) || k;
    return m.replace('<g ', `<g data-tip="${esc(nm)} : ${v ? (isKg ? kgShort(v) : `${fr(r1(v))} série${v >= 2 ? 's' : ''}`) : 'non travaillé'}" `); });
})(heatMapSVG);
muscleMapSVG = (orig => function (X, small) {
  const h = orig(X, small); if (small) return h;
  const keys = [...Object.keys(MAP_FRONT), ...Object.keys(MAP_BACK)]; let i = 0;
  return h.replace(/<g class="(mm-[pso])">/g, (m, cl) => { const k = keys[i++]; const nm = (typeof MUS_NAME !== 'undefined' && MUS_NAME[k]) || k;
    return `<g class="${cl}" data-tip="${esc(nm)} : ${cl === 'mm-p' ? 'muscle principal' : cl === 'mm-s' ? 'muscle secondaire' : 'peu sollicité'}">`; });
})(muscleMapSVG);

// ---------- nutrition : répartition des macros ----------
VIEWS.progres = (orig => function () {
  return orig.apply(this, arguments).replace(/<div class="stackbar">([\s\S]*?)<\/div>/, (m, inner) => { let i = 0;
    return '<div class="stackbar">' + inner.replace(/<i style="width:([\d.]+)%/g, (mm, w) => { const l = MACROS[i++] ? MACROS[i - 1][1] : ''; return `<i data-tip="${esc(l)} : ${r0(+w)} % des calories" style="width:${w}%`; }) + '</div>'; });
})(VIEWS.progres);

// ---------- intensité : la bulle donne le RPE, puis « Voir la séance » ----------
intensityCard = (orig => function () {
  const L = sortedW().map(w => ({ w, I: w.intensity ? { avg: w.intensity } : wIntensity(w) })).filter(x => x.I).slice(0, 12).reverse();
  let i = 0;
  return orig.apply(this, arguments).replace(/<div class="tapbar" data-act="tWOpen" data-id="[^"]*" title="[^"]*">/g, m => { const x = L[i++]; if (!x) return m;
    return `<div class="tapbar" data-tip="${esc(x.w.name)} · ${esc(fmtDate(wDate(x.w), { day: 'numeric', month: 'short' }))}\nRPE moyen ${fr(r1(x.I.avg))}/10 · ${esc(intLabel(x.I.avg)[0])}" data-tip-act="tWOpen" data-tip-id="${x.w.id}" data-tip-l="Voir la séance ›">`; });
})(intensityCard);
