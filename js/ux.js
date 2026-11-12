'use strict';
/* ============================================================
   Interactions : roue de sélection (repos, minuteur), RPE à curseur,
   gestes tactiles, aperçu d’exercice, animation perso, records.
   ============================================================ */

// ---------- Roue de sélection (carrousel) ----------
const WROW = 48; let WHEEL = null;
function openWheel(o) {
  WHEEL = { ...o, i: Math.max(0, o.values.findIndex(x => x.v === o.value)) };
  openSheet(o.title, `${o.sub ? `<p class="wheel-sub">${esc(o.sub)}</p>` : ''}
    <div class="wheel"><div class="wheel-band"></div><div class="wheel-list" id="wheel"><div style="height:${WROW * 2}px"></div>${o.values.map((x, i) => `<div class="witem" data-i="${i}">${esc(x.label)}</div>`).join('')}<div style="height:${WROW * 2}px"></div></div></div>
    ${o.extra || ''}<button class="btn primary block" style="margin-top:14px" data-act="wheelDone">${esc(o.ok || 'Terminé')}</button>`);
  const el = $('#wheel'); el.scrollTop = WHEEL.i * WROW; wheelPaint();
  el.addEventListener('scroll', () => requestAnimationFrame(wheelPaint), { passive: true });
  el.addEventListener('click', e => { const it = e.target.closest('.witem'); if (it) el.scrollTo({ top: +it.dataset.i * WROW, behavior: 'smooth' }); });
}
function wheelPaint() {
  const el = $('#wheel'); if (!el || !WHEEL) return;
  const pos = el.scrollTop / WROW; WHEEL.i = clamp(Math.round(pos), 0, WHEEL.values.length - 1);
  el.querySelectorAll('.witem').forEach(it => { const d = Math.abs(+it.dataset.i - pos); it.style.opacity = Math.max(0.15, 1 - d * 0.3).toFixed(2); it.style.transform = `scale(${Math.max(0.76, 1 - d * 0.08).toFixed(3)})`; it.classList.toggle('on', d < 0.5); });
}
const longLabel = v => !v ? 'Désactivé' : v < 60 ? `${v} s` : `${Math.floor(v / 60)} min ${z2(v % 60)} s`;
const REST_VALUES = [0, 5, 10, ...Array.from({ length: 20 }, (_, i) => 15 * (i + 1)), ...Array.from({ length: 10 }, (_, i) => 300 + 30 * (i + 1))];
const TIMER_VALUES = [...Array.from({ length: 20 }, (_, i) => 15 * (i + 1)), ...Array.from({ length: 30 }, (_, i) => 300 + 30 * (i + 1)), ...Array.from({ length: 10 }, (_, i) => 1200 + 60 * (i + 1))];

// ---------- RPE (curseur) ----------
const RPE_TXT = {
  6: ['Effort modéré', 'Tu pourrais faire 4 répétitions de plus'], 6.5: ['Effort modéré', '3 à 4 répétitions de plus'],
  7: ['Effort soutenu', '3 répétitions de plus'], 7.5: ['Effort soutenu', '2 à 3 répétitions de plus'],
  8: ['Effort important', '2 répétitions de plus'], 8.5: ['Effort très important', '1 à 2 répétitions de plus'],
  9: ['Effort quasi maximal', '1 répétition de plus'], 9.5: ['Presque à l’échec', 'Peut-être une de plus, de justesse'],
  10: ['Effort maximal', 'Échec : impossible d’en faire une de plus']
};
const rpeColor = v => v <= 7 ? '#30d158' : v <= 8 ? '#ffd60a' : v <= 9 ? '#ff9f0a' : '#ff453a';
let RPEC = null;
function openRpe(ei, si) {
  const s = TS.active.exercises[ei].sets[si];
  RPEC = { ei, si, v: s.rpe || 8 };
  openSheet('Effort ressenti (RPE)', `<div class="rpe">
      <div class="rpe-main"><div class="rpe-v" id="rpeV"></div><div class="rpe-t" id="rpeT"></div><div class="rpe-d" id="rpeD"></div>
        <div class="rpe-slider"><input type="range" min="6" max="10" step="0.5" id="rpeR" aria-label="RPE"><div class="rpe-ticks">${[6, 7, 8, 9, 10].map(v => `<span>${v}</span>`).join('')}</div></div></div>
      <div class="rpe-side"><button data-act="rpeStep" data-n="0.5" aria-label="Plus">＋</button><button data-act="rpeStep" data-n="-0.5" aria-label="Moins">−</button><button class="rpe-ok" data-act="rpeOk" aria-label="Valider">✓</button></div>
    </div><button class="btn ghost block" style="margin-top:8px" data-act="rpeClear">Effacer le RPE</button>`);
  const r = $('#rpeR'); r.value = RPEC.v; r.addEventListener('input', () => { RPEC.v = +r.value; paintRpe(); }); paintRpe();
}
function paintRpe() {
  const v = RPEC.v, [t, d] = RPE_TXT[v];
  $('#rpeV').textContent = fr(v); $('#rpeT').textContent = t; $('#rpeD').textContent = d;
  const r = $('#rpeR'); r.value = v; r.style.setProperty('--thumb', rpeColor(v)); r.style.setProperty('--p', ((v - 6) / 4 * 100) + '%');
}

// ---------- Aperçu d’exercice depuis la sélection + animation perso ----------
const MEDIA_URL = {};
async function decorateExMedia(id) {
  const vis = $('#sheetBody .exvis'); if (!vis) return;
  vis.insertAdjacentHTML('afterend', `<div class="mediarow"><label class="pill">📎 Mettre ma propre animation<input type="file" id="exMediaIn" data-id="${esc(id)}" accept="image/*,video/*" hidden></label><span id="mediaDel"></span></div>`);
  let m = null; try { m = await PDB.mget(id); } catch (e) { }
  if (!m || !$('#sheetBody .exvis')) return;
  const url = MEDIA_URL[id] || (MEDIA_URL[id] = URL.createObjectURL(m.blob));
  const stage = $('#sheetBody .exstage');
  if (stage) stage.outerHTML = m.type.startsWith('video') ? `<video class="exmedia" src="${url}" autoplay loop muted playsinline></video>` : `<img class="exmedia" src="${url}" alt="Animation de l’exercice">`;
  $('#mediaDel').innerHTML = `<button class="pill" data-act="exMediaDel" data-id="${esc(id)}">✕ Revenir à l’animation de l’appli</button>`;
}
if (typeof openExInfo === 'function') {
  const _openExInfo = openExInfo;
  openExInfo = function (id) {
    _openExInfo(id);
    if (PICK && PICK.preview) { PICK.preview = false; $('#sheetBody').insertAdjacentHTML('afterbegin', `<button class="btn sm backbtn" data-act="tPickBack">‹ Retour à la sélection</button>`); }
    decorateExMedia(id);
  };
}

// ---------- Records en fin de séance ----------
function prDetails(w) {
  const out = []; w.prSets = [];
  w.exercises.forEach((e, ei) => {
    const X = exById(e.exId); const before = exBest(e.exId, w.start);
    if (!exHistory(e.exId, w.start).length) return; // première fois : pas de record à comparer
    const work = e.sets.map((s, si) => ({ s, si })).filter(x => x.s.type !== 'w');
    const best = f => work.reduce((b, x) => (f(x.s) > (b ? f(b.s) : -1) ? x : b), null);
    const push = (type, old, nw, x, fmt) => { const s = x.s; const det = X.kind === 'wr' || X.kind === 'bw' ? `${num(s.w) ? fr(num(s.w)) + ' kg' : 'Poids du corps'} × ${r0(num(s.r))} réps` : ''; out.push({ ex: X.name, type, old: fmt(old), nw: fmt(nw), up: fmt(nw - old), det }); w.prSets.push(ei + '-' + x.si); };
    if (X.kind === 'wr' || X.kind === 'bw') {
      const bw = best(s => num(s.w)), be = best(s => e1rm(num(s.w), num(s.r))), br = best(s => num(s.r));
      if (bw && num(bw.s.w) > before.w && num(bw.s.w) > 0) push('Charge max', before.w, num(bw.s.w), bw, kg);
      else if (be && e1rm(num(be.s.w), num(be.s.r)) > before.e1 + 0.01 && num(be.s.w) > 0) push('1RM estimé', before.e1, e1rm(num(be.s.w), num(be.s.r)), be, kg);
      if (br && num(br.s.r) > before.r && (X.kind === 'bw' || !bw || num(br.s.w) >= before.w)) push('Répétitions', before.r, num(br.s.r), br, v => `${r0(v)} réps`);
    } else if (X.kind === 'time') { const b = best(s => num(s.t)); if (b && num(b.s.t) > before.t) push('Durée', before.t, num(b.s.t), b, v => `${r0(v)} s`); }
    else { const b = best(s => num(s.km)); if (b && num(b.s.km) > before.km) push('Distance', before.km, num(b.s.km), b, v => `${fr(r1(v))} km`); }
  });
  return out;
}
function summaryHTML(w, det) {
  const conf = det.length ? `<div class="confetti" aria-hidden="true">${Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 9) * 0.07}s;background:${['#ffd60a', '#0a84ff', '#30d158', '#ff453a', '#bf5af2'][i % 5]}"></i>`).join('')}</div>` : '';
  return `${conf}<div class="sumhero ${det.length ? 'pr' : ''}"><div class="sumic">${det.length ? '🏆' : '💪'}</div>
      <h2>${det.length ? `${det.length} record${det.length > 1 ? 's' : ''} battu${det.length > 1 ? 's' : ''} !` : 'Séance terminée'}</h2>
      <div class="muted">${esc(w.name)}</div></div>
    <div class="grid2" style="grid-template-columns:repeat(3,1fr);margin:14px 0">
      <div class="stat"><div class="v">${dur(w.end - w.start)}</div><div class="l">durée</div></div>
      <div class="stat"><div class="v">${wSets(w)}</div><div class="l">séries</div></div>
      <div class="stat"><div class="v">${bigKg(wVolume(w))}</div><div class="l">volume</div></div></div>
    ${det.map((p, i) => `<div class="prcard" style="animation-delay:${0.25 + i * 0.12}s"><div class="prmed">🏅</div><div class="grow"><div class="prex">${esc(p.ex)}</div><div class="small muted">${esc(p.type)}</div>${p.det ? `<div class="prdet">${esc(p.det)}</div>` : ''}</div>
      <div class="prval"><b>${esc(p.nw)}</b><span>avant : ${esc(p.old)}</span></div></div>`).join('')}
    ${det.length ? '' : '<p class="muted" style="text-align:center">Pas de record aujourd’hui, mais la régularité, c’est ce qui fait progresser.</p>'}
    <button class="btn primary block" style="margin-top:12px" data-act="closeSheet">Super</button>`;
}

// ---------- Gestes tactiles ----------
function swipeTab(dir) {
  const mode = S.ui.tab.startsWith('t_') ? 'train' : 'nutri';
  const list = TABS[mode].map(x => x[0]).filter(k => !k.startsWith('__'));
  const cur = S.ui.tab === 't_live' ? 't_home' : S.ui.tab; const i = list.indexOf(cur); if (i < 0) return;
  const j = i + dir; if (j < 0 || j >= list.length) return;
  S.ui.tab = list[j] === 't_home' && TS.active ? 't_live' : list[j];
  if (mode === 'train') S.ui.lastTrainTab = list[j];
  $('#view').dataset.dir = dir > 0 ? 'l' : 'r';
  save(); render(); window.scrollTo(0, 0);
}
(function gestures() {
  let sx = 0, sy = 0, st = 0, mode = null, sheet = null, dy = 0;
  document.addEventListener('touchstart', e => {
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); mode = null; sheet = null; dy = 0;
    const sh = e.target.closest('.sheet');
    if (sh && !e.target.closest('.wheel, input[type=range], textarea, .chipsrow, .pgchart')) {
      const body = sh.querySelector('.sheet-b');
      if (e.target.closest('.sheet-h') || !body || body.scrollTop <= 0) sheet = sh;
    }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    const t = e.touches[0]; const dx = t.clientX - sx; dy = t.clientY - sy;
    if (!mode) {
      if (sheet && dy > 8 && dy > Math.abs(dx)) mode = 'sheet';
      else if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.6) mode = 'h';
      else if (Math.abs(dy) > 14) mode = 'v';
    }
    if (mode === 'sheet') { e.preventDefault(); sheet.style.transition = 'none'; sheet.style.transform = `translateY(${Math.max(0, dy)}px)`; }
  }, { passive: false });
  document.addEventListener('touchend', e => {
    if (mode === 'sheet' && sheet) {
      const v = dy / Math.max(1, Date.now() - st);
      if (dy > 110 || v > 0.6) { sheet.style.transition = 'transform .2s ease-in'; sheet.style.transform = 'translateY(105%)'; setTimeout(() => ACTIONS.closeSheet(), 190); }
      else { sheet.style.transition = 'transform .28s cubic-bezier(.2,.9,.3,1.2)'; sheet.style.transform = ''; }
    } else if (mode === 'h') {
      const dx = e.changedTouches[0].clientX - sx;
      const adx = Math.abs(dx), dt = Date.now() - st;
      if (adx > 55 || (adx > 24 && adx / Math.max(1, dt) > 0.35)) {
        if ($('#wiz') && W) { (dx < 0 ? ACTIONS.wNext : ACTIONS.wBack)(); }
        else if (!$('#modal').innerHTML && !$('#launch') && !e.target.closest('.daystrip, .chipsrow, .srow, input, .exstage, nav.tabs, .wchart')) swipeTab(dx < 0 ? 1 : -1);
      }
    }
    mode = null; sheet = null;
  });
})();

// ---------- Actions ----------
Object.assign(ACTIONS, {
  wheelDone: () => { const o = WHEEL; if (!o) return; const v = o.values[o.i].v; o.onDone(v); WHEEL = null; },
  tRestPick: el => {
    const ei = +el.dataset.ei; const ex = TS.active.exercises[ei]; const X = exById(ex.exId);
    openWheel({
      title: 'Minuteur de repos', sub: X.name, value: restOf(ex), values: REST_VALUES.map(v => ({ v, label: longLabel(v) })),
      extra: `<label class="check" style="border:0;margin-top:6px"><input type="checkbox" id="t_restAll"><div class="grow small">Utiliser aussi pour tous les exercices</div></label>`,
      onDone: v => {
        ex.rest = v; TS.exRest = TS.exRest || {}; TS.exRest[ex.exId] = v;
        const all = $('#t_restAll') && $('#t_restAll').checked; if (all) TS.settings.rest = v;
        tsave(); closeSheet(); render(); toast(all ? `Repos par défaut : ${restLabel(v)}` : `Repos ${restLabel(v)} mémorisé pour cet exercice`);
      }
    });
  },
  tTimer: () => openWheel({
    title: 'Minuteur', sub: TS.rest ? 'Un minuteur est en cours : il sera remplacé.' : 'Lance un compte à rebours', ok: 'Démarrer', value: S.ui.lastTimer || 60,
    values: TIMER_VALUES.map(v => ({ v, label: longLabel(v) })),
    onDone: v => { S.ui.lastTimer = v; save(); closeSheet(); TS.rest = { end: Date.now() + v * 1000, total: v }; tsave(); tick(); try { ACTX = ACTX || new (window.AudioContext || window.webkitAudioContext)(); ACTX.resume && ACTX.resume(); } catch (e) { } }
  }),
  tRpe: el => openRpe(+el.dataset.ei, +el.dataset.si),
  rpeStep: el => { RPEC.v = clamp(RPEC.v + +el.dataset.n, 6, 10); paintRpe(); },
  rpeOk: () => { TS.active.exercises[RPEC.ei].sets[RPEC.si].rpe = RPEC.v; tsave(); closeSheet(); render(); },
  rpeClear: () => { TS.active.exercises[RPEC.ei].sets[RPEC.si].rpe = ''; tsave(); closeSheet(); render(); },
  tPickPreview: (el, e) => { e.stopPropagation(); PICK.preview = true; openExInfo(el.dataset.id); },
  tPickBack: () => { openSheet('Ajouter des exercices', ''); renderPicker(); },
  exMediaDel: async el => { await PDB.mdel(el.dataset.id); delete MEDIA_URL[el.dataset.id]; openExInfo(el.dataset.id); toast('Animation de l’appli rétablie'); }
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.id === 'exMediaIn' && el.files[0]) {
    const f = el.files[0];
    if (f.size > 30 * 1024 * 1024) { toast('Fichier trop lourd (30 Mo max)'); return; }
    try { await PDB.mput({ id: el.dataset.id, blob: f, type: f.type || 'image/gif' }); delete MEDIA_URL[el.dataset.id]; openExInfo(el.dataset.id); toast('Animation enregistrée pour cet exercice'); }
    catch (err) { toast('Impossible d’enregistrer ce fichier'); }
  }
});
