// ============================================================
//  SÉANCE & ROUTINES : glisser pour supprimer une série, appui long (menu / déplacer),
//  aperçu d’une routine, éditeur série par série, mise à jour de la routine en fin de séance,
//  notifications qui se remplacent, questionnaire sans clignotement, noms de variantes
// ============================================================
const qa = (s, r = document) => [...r.querySelectorAll(s)];
let SE_SUPPRESS = 0; // ignore le « clic » qui suit un appui long
document.addEventListener('click', e => { if (SE_SUPPRESS && Date.now() - SE_SUPPRESS < 700) { e.preventDefault(); e.stopImmediatePropagation(); SE_SUPPRESS = 0; } }, true);

// ---------- notifications : la nouvelle remplace l’ancienne en douceur ----------
toast = function (msg) {
  qa('.toast').forEach(o => { if (o.classList.contains('tout')) return; o.classList.add('tout'); setTimeout(() => o.remove(), 220); });
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => { t.classList.add('tout'); setTimeout(() => t.remove(), 240); }, 2200);
};

// ---------- questionnaire : on n’anime que quand on change d’étape ----------
if (typeof renderWiz === 'function') renderWiz = (orig => function () {
  const step = typeof W !== 'undefined' && W ? W.step : null; const same = step === renderWiz._s;
  const r = orig.apply(this, arguments); renderWiz._s = step; const el = $('#wiz'); if (el) el.classList.toggle('noanim', same); return r;
})(renderWiz);

// ---------- séries : glisser vers la gauche pour supprimer (en séance et dans l’éditeur de routine) ----------
(function swipeSet() {
  let st = null;
  const rowOf = t => t.closest('#view .srow:not(.shead)') || t.closest('#sheetBody .rtes:not(.head)');
  addEventListener('touchstart', e => {
    st = null; if (e.touches.length !== 1) return; const row = rowOf(e.target); if (!row) return;
    const live = row.matches('.srow'); if (live && (S.ui.tab !== 't_live' || !row.querySelector('.sdone'))) return;
    const t = e.touches[0]; st = { row, live, x: t.clientX, y: t.clientY, on: false, dx: 0 };
  }, { capture: true, passive: true });
  addEventListener('touchmove', e => {
    if (!st) return; const t = e.touches[0]; const dx = t.clientX - st.x, dy = t.clientY - st.y;
    if (!st.on) { if (Math.abs(dy) > 10) { st = null; return; } if (dx < -12 && -dx > Math.abs(dy) * 1.5) { st.on = true; st.row.style.transition = 'none'; } else return; }
    e.preventDefault(); e.stopImmediatePropagation(); st.dx = Math.min(0, dx + 12);
    st.row.style.transform = `translate3d(${st.dx}px,0,0)`;
    st.row.style.boxShadow = `inset ${Math.min(-st.dx, 140)}px 0 0 rgba(255,69,58,${Math.min(.55, -st.dx / 220)})`;
  }, { capture: true, passive: false });
  const end = () => {
    if (!st) return; const s = st; st = null; if (!s.on) return; const row = s.row;
    const inp = row.querySelector('[data-rpw]'); const re = !s.live && RT ? RT.exercises[+inp.dataset.rpw] : null;
    const del = () => {
      if (s.live) { const b = row.querySelector('.sdone'); const ex = TS.active && TS.active.exercises[+b.dataset.ei]; if (ex) { ex.sets.splice(+b.dataset.si, 1); tsave(); } render(); }
      else if (re) { re.plan.splice(+inp.dataset.si, 1); re.sets = re.plan.length; renderRoutineEditor(); rteRefresh(); }
    };
    if (s.dx < -95 && (s.live || (re && re.plan.length > 1))) {
      const h = row.offsetHeight;
      row.style.transition = 'transform .2s ease-in, opacity .2s'; row.style.transform = 'translate3d(-110%,0,0)'; row.style.opacity = '0';
      setTimeout(() => { row.style.transition = 'height .18s ease, margin .18s ease'; row.style.height = h + 'px'; row.style.overflow = 'hidden'; void row.offsetHeight; row.style.height = '0px'; row.style.margin = '0'; }, 190);
      setTimeout(del, 380); if (navigator.vibrate) navigator.vibrate(10);
    } else { row.style.transition = 'transform .25s cubic-bezier(.2,.9,.3,1.1), box-shadow .25s'; row.style.transform = ''; row.style.boxShadow = ''; }
  };
  addEventListener('touchend', end, { capture: true, passive: true }); addEventListener('touchcancel', end, { capture: true, passive: true });
})();

// ---------- appui long sur un exercice (séance et éditeur) : lâcher = menu ; glisser = déplacer une bande repliée ----------
(function holdDrag() {
  const KINDS = [
    { item: '#view section.card.exo', box: () => $('#view'), scroller: () => null, menu: '[data-act=tExMenu]', ok: () => S.ui.tab === 't_live',
      drop: (a, b) => { const x = TS.active.exercises; const [m] = x.splice(a, 1); x.splice(b, 0, m); tsave(); render(); } },
    { item: '#sheetBody .rtex2', box: () => $('#sheetBody'), scroller: () => $('#sheetBody'), menu: '[data-act=rteMenu]', ok: () => !!RT,
      drop: (a, b) => { const x = RT.exercises; const [m] = x.splice(a, 1); x.splice(b, 0, m); renderRoutineEditor(); rteRefresh(); } }
  ];
  let st = null;
  const sTop = sc => sc ? sc.scrollTop : scrollY;
  const clear = () => { if (!st) return; clearTimeout(st.timer); const b = st.K.box(); if (b) b.classList.remove('dragmode'); qa(st.K.item).forEach(c => { c.style.transition = ''; c.style.transform = ''; c.classList.remove('exlift', 'dragging'); }); };
  addEventListener('touchstart', e => {
    if (st) { clear(); st = null; } if (e.touches.length !== 1) return;
    const K = KINDS.find(k => k.ok() && e.target.closest(k.item)); if (!K) return;
    if (e.target.closest('.srow, .rtes, .rte-grid, input, textarea, .addset, .rte-sets')) return;
    const card = e.target.closest(K.item); const t = e.touches[0];
    st = { K, card, x: t.clientX, y: t.clientY, armed: false, drag: false };
    st.timer = setTimeout(() => { if (!st) return; st.armed = true; card.classList.add('exlift'); lpHaptic(); if (navigator.vibrate) navigator.vibrate(12); }, 450);
  }, { capture: true, passive: true });
  addEventListener('touchmove', e => {
    if (!st) return; const t = e.touches[0];
    if (!st.armed) { if (Math.hypot(t.clientX - st.x, t.clientY - st.y) > 10) { clearTimeout(st.timer); st = null; } return; }
    e.preventDefault(); e.stopImmediatePropagation();
    const K = st.K, sc = K.scroller();
    if (!st.drag) {
      if (Math.abs(t.clientY - st.y) < 8) return;
      st.drag = true; const before = st.card.getBoundingClientRect(); const grab = Math.min(t.clientY - before.top, 30);
      K.box().classList.add('dragmode'); st.card.classList.add('dragging');
      const nr = st.card.getBoundingClientRect(); const want = t.clientY - grab; if (sc) sc.scrollTop += nr.top - want; else scrollBy(0, nr.top - want);
      st.cards = qa(K.item); st.from = st.cards.indexOf(st.card); st.to = st.from;
      st.y0 = t.clientY + sTop(sc); st.rects = st.cards.map(c => { const r = c.getBoundingClientRect(); return { top: r.top + sTop(sc), h: r.height }; });
      st.gap = st.cards.length > 1 ? st.rects[1].top - st.rects[0].top - st.rects[0].h : 10;
      st.cards.forEach(c => { c.style.transition = c === st.card ? 'none' : 'transform .2s cubic-bezier(.2,.9,.3,1)'; });
    }
    st.ty = t.clientY; if (!st.raf) { const loop = () => { if (!st || !st.drag) return; move(); st.raf = requestAnimationFrame(loop); }; st.raf = requestAnimationFrame(loop); }
  }, { capture: true, passive: false });
  // position du doigt → bande déplacée + voisines décalées ; défilement continu près des bords (vitesse selon la proximité)
  function move() {
    const K = st.K, sc = K.scroller(), y = st.ty;
    if (!st.edge) {
      const b = sc ? sc.getBoundingClientRect() : { top: 0, bottom: innerHeight }; let top = b.top, bot = b.bottom;
      if (!sc) { const hd = $('.livehead'); if (hd) top = Math.max(top, hd.getBoundingClientRect().bottom); for (const q of ['#tabs', '#restbar']) { const e = $(q); if (e) { const r = e.getBoundingClientRect(); if (r.height && r.top > innerHeight / 2) bot = Math.min(bot, r.top); } } }
      st.edge = { top, bot };
    }
    const up = st.edge.top + 110 - y, dn = y - (st.edge.bot - 110);
    if (up > 0) { const v = Math.min(22, 3 + up / 5); if (sc) sc.scrollTop -= v; else scrollBy(0, -v); } else if (dn > 0) { const v = Math.min(22, 3 + dn / 5); if (sc) sc.scrollTop += v; else scrollBy(0, v); }
    const dy = y + sTop(sc) - st.y0; st.dy = dy; st.card.style.transform = `translate3d(0,${dy}px,0) scale(1.03)`;
    const R = st.rects, me = R[st.from]; const mid = me.top + dy + me.h / 2; let to = st.from;
    for (let j = 0; j < R.length; j++) { if (j === st.from) continue; const m = R[j].top + R[j].h / 2; if (j > st.from && mid > m) to = Math.max(to, j); if (j < st.from && mid < m) to = Math.min(to, j); }
    if (to !== st.to) { st.to = to; haptic([6]); }
    const sh = me.h + st.gap;
    st.cards.forEach((c, j) => { if (j === st.from) return; let v = 0; if (j > st.from && j <= to) v = -sh; if (j < st.from && j >= to) v = sh; const tr = v ? `translate3d(0,${v}px,0)` : ''; if (c.style.transform !== tr) c.style.transform = tr; });
  }
  const end = () => {
    if (!st) return; const s = st; clearTimeout(s.timer); cancelAnimationFrame(s.raf); if (!s.armed) { st = null; return; }
    SE_SUPPRESS = Date.now();
    if (!s.drag) { clear(); st = null; const b = s.card.querySelector(s.K.menu); if (b) { SE_SUPPRESS = 0; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.click(); SE_SUPPRESS = Date.now(); } return; }
    st = null;
    // la bande se pose en douceur dans sa nouvelle place, puis on reconstruit en gardant l’exercice sous les yeux
    const R = s.rects; let ty = 0;
    if (s.to > s.from) for (let j = s.from + 1; j <= s.to; j++) ty += R[j].h + s.gap; else for (let j = s.to; j < s.from; j++) ty -= R[j].h + s.gap;
    s.card.style.transition = 'transform .2s cubic-bezier(.2,.9,.3,1)'; s.card.style.transform = `translate3d(0,${ty}px,0)`;
    setTimeout(() => {
      const sc = s.K.scroller(); const anchor = s.card.getBoundingClientRect().top;
      const b = s.K.box(); if (b) b.classList.remove('dragmode'); qa(s.K.item).forEach(c => { c.style.transition = 'none'; c.style.transform = ''; c.classList.remove('exlift', 'dragging'); });
      if (s.to !== s.from) s.K.drop(s.from, s.to);
      const c = qa(s.K.item)[s.to]; if (!c) return;
      const d = c.getBoundingClientRect().top - anchor; if (sc) sc.scrollTop += d; else scrollTo(0, scrollY + d);
      c.classList.add('dropped'); setTimeout(() => c.classList.remove('dropped'), 500);
      requestAnimationFrame(() => qa(s.K.item).forEach(x => { x.style.transition = ''; }));
    }, 210);
  };
  addEventListener('touchend', end, { capture: true, passive: true }); addEventListener('touchcancel', end, { capture: true, passive: true });
})();
// plus de « Monter / Descendre » : on déplace au doigt
for (const [k, act] of [['tExMenu', 'tExMove'], ['rteMenu', 'tRtMove']]) ACTIONS[k] = (orig => (el, e) => {
  const o = openSheet; openSheet = (t, b) => o(t, String(b).replace(new RegExp('<button[^>]*data-act="' + act + '"[\\s\\S]*?</button>', 'g'), ''));
  try { return orig(el, e); } finally { openSheet = o; }
})(ACTIONS[k]);
// les fenêtres n’animent leur contenu qu’à l’ouverture (pas à chaque retouche)
openSheet = (orig => function () { const r = orig.apply(this, arguments); const sh = document.querySelector('#modal .sheet'); if (sh) { sh.classList.add('fresh'); setTimeout(() => sh.classList.remove('fresh'), 450); } return r; })(openSheet);

// ---------- routines : toucher la carte = aperçu (sans lancer la séance) ----------
function routinePreview(id) {
  const r = TS.routines.find(x => x.id === id); if (!r) return;
  const rows = r.exercises.map(e => {
    const X = exById(e.exId); const n = e.plan && e.plan.length ? e.plan.length : (+e.sets || 3);
    const det = e.plan && e.plan.some(p => p.w || p.r) ? e.plan.map(p => `${p.w ? fr(num(p.w)) + ' kg' : '–'} × ${p.r || e.reps || '–'}`).join(' · ') : `${n} série${n > 1 ? 's' : ''}${e.reps ? ` · ${esc(e.reps)} réps` : ''}`;
    return `<div class="rpv-ex">${typeof muscleMapSVG === 'function' ? `<span class="rte-th">${muscleMapSVG(X, true)}</span>` : ''}<div class="grow" style="min-width:0"><b>${esc(exLabel(X))}</b><span class="small muted">${det}</span></div></div>`;
  }).join('');
  openSheet(r.name, `<div class="rpv">${rows || '<p class="muted">Aucun exercice.</p>'}</div>
    <div class="row" style="gap:8px;margin-top:14px"><button class="btn" data-act="rpvEdit" data-id="${id}">Modifier</button><button class="btn primary grow" data-act="rpvStart" data-id="${id}" ${TS.active ? 'disabled style="opacity:.5"' : ''}>Démarrer</button></div>`);
}
document.addEventListener('click', e => {
  const card = e.target.closest('#view section.card.routine'); if (!card || e.target.closest('button, a, input, summary, select')) return;
  const b = card.querySelector('[data-act=tRoutineMenu]'); if (b) routinePreview(b.dataset.id);
});
Object.assign(ACTIONS, {
  rpvStart: el => { closeSheet(); ACTIONS.tStartRoutine(el); },
  rpvEdit: el => ACTIONS.tRtEdit(el)
});

// ---------- éditeur de routine : une ligne par série, avec kg et répétitions (comme en séance) ----------
renderRoutineEditor = (orig => function () {
  const sb = $('#sheetBody'); const keep = sb ? sb.scrollTop : 0;
  orig.apply(this, arguments);
  const boxes = qa('#sheetBody .rtex2');
  RT.exercises.forEach((e, i) => {
    const X = exById(e.exId); if (X.kind === 'time' || X.kind === 'cardio') return;
    const n = Math.max(1, +e.sets || 3); e.plan = (e.plan || []).slice(0, n);
    while (e.plan.length < n) { const l = e.plan[e.plan.length - 1]; e.plan.push(l ? { ...l } : { w: '', r: '' }); }
    const b = boxes[i]; if (!b) return; const f = b.querySelector('.rte-f'); if (f) f.remove();
    const lo = repsSplit(e.reps)[0];
    b.querySelector('.rte-grid').insertAdjacentHTML('afterend', `<div class="rte-sets"><div class="rtes head"><span>Série</span><span>kg</span><span>réps</span></div>
      ${e.plan.map((p, si) => `<div class="rtes"><span class="rtes-n">${si + 1}</span><input type="number" inputmode="decimal" data-rpw="${i}" data-si="${si}" value="${esc(p.w ?? '')}" placeholder="–"><input type="number" inputmode="numeric" data-rpr="${i}" data-si="${si}" value="${esc(p.r ?? '')}" placeholder="${esc(lo || '–')}"></div>`).join('')}
      <button class="btn sm block addset" data-act="rtSetAdd" data-i="${i}">＋ Ajouter une série</button></div>`);
  });
  const nb = $('#sheetBody'); if (nb) nb.scrollTop = keep;
})(renderRoutineEditor);
document.addEventListener('input', e => {
  const el = e.target; if (!RT || !el.dataset) return; const i = el.dataset.rpw ?? el.dataset.rpr; if (i == null) return;
  const p = RT.exercises[+i].plan[+el.dataset.si]; if (el.dataset.rpw != null) p.w = el.value; else p.r = el.value;
});
Object.assign(ACTIONS, {
  rtSetAdd: el => { const e = RT.exercises[+el.dataset.i]; const l = e.plan[e.plan.length - 1]; e.plan.push(l ? { ...l } : { w: '', r: '' }); e.sets = e.plan.length; renderRoutineEditor(); rteRefresh(); },
  rtSetDel: el => { const e = RT.exercises[+el.dataset.i]; if (e.plan.length < 2) return; e.plan.splice(+el.dataset.si, 1); e.sets = e.plan.length; renderRoutineEditor(); rteRefresh(); }
});
// au démarrage : les kg / répétitions prévus remplissent les séries
ACTIONS.tStartRoutine = (orig => el => {
  orig(el); const r = TS.routines.find(x => x.id === el.dataset.id); if (!r || !TS.active || TS.active.routineId !== r.id) return;
  let ch = false;
  r.exercises.forEach((e, i) => { const a = TS.active.exercises[i]; if (!a || !e.plan || !e.plan.length) return; a.sets = e.plan.map(p => ({ type: 'n', w: p.w ?? '', r: p.r ?? '', t: '', km: '', done: false })); ch = true; });
  if (ch) { tsave(); render(); }
})(ACTIONS.tStartRoutine);

// ---------- fin de séance : proposer de mettre à jour la routine si on a ajouté / retiré séries ou exercices ----------
finishWorkout = (orig => async function () {
  const A_ = TS.active; const r = A_ && A_.routineId && TS.routines.find(x => x.id === A_.routineId);
  if (r) {
    const done = A_.exercises.map(e => ({ exId: e.exId, sets: e.sets.filter(s => s.done) })).filter(e => e.sets.length);
    const changed = done.length && (done.length !== r.exercises.length || done.some((e, i) => e.exId !== r.exercises[i].exId || e.sets.length !== (r.exercises[i].plan ? r.exercises[i].plan.length : +r.exercises[i].sets || 3)));
    if (changed && await askConfirm('Mettre à jour la routine ?', { msg: `« ${r.name} » reprendra les exercices et le nombre de séries de cette séance.`, ok: 'Mettre à jour', cancel: 'Garder telle quelle' })) {
      r.exercises = done.map(e => { const old = r.exercises.find(o => o.exId === e.exId) || {}; const X = exById(e.exId); const lift = X.kind === 'wr' || X.kind === 'bw';
        const n = { ...old, exId: e.exId, sets: e.sets.length }; if (lift) n.plan = e.sets.map(s => ({ w: s.w ?? '', r: s.r ?? '' })); else delete n.plan; return n; });
      tsave(); toast('Routine mise à jour');
    }
  }
  return orig.apply(this, arguments);
})(finishWorkout);

// ---------- noms : quand plusieurs exercices ont le même nom, on précise le matériel ----------
function exLabel(X) {
  const n = norm(X.name).trim(); if (/\(/.test(X.name) || !X.equip) return X.name;
  const dup = allEx().filter(y => norm(y.name).trim() === n).length > 1; return dup ? `${X.name} (${X.equip.toLowerCase()})` : X.name;
}
renderPickList = (orig => function () {
  orig.apply(this, arguments);
  qa('#plist .item[data-id]').forEach(it => { const X = exById(it.dataset.id); const nm = it.querySelector('.name'); if (X && nm) { const l = exLabel(X); if (l !== X.name) nm.textContent = l; } });
})(renderPickList);
