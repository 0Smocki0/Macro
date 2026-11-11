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

// ---------- séance : glisser une série vers la droite pour la supprimer ----------
(function swipeSet() {
  let st = null;
  document.addEventListener('touchstart', e => {
    st = null; if (S.ui.tab !== 't_live' || e.touches.length !== 1) return;
    const row = e.target.closest('#view .srow:not(.shead)'); if (!row || !row.querySelector('.sdone')) return;
    const t = e.touches[0]; st = { row, x: t.clientX, y: t.clientY, on: false, dx: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!st) return; const t = e.touches[0]; const dx = t.clientX - st.x, dy = t.clientY - st.y;
    if (!st.on) { if (Math.abs(dy) > 10) { st = null; return; } if (dx > 12 && dx > Math.abs(dy) * 1.5) { st.on = true; st.row.style.transition = 'none'; } else return; }
    e.preventDefault(); st.dx = Math.max(0, dx - 12);
    st.row.style.transform = `translate3d(${st.dx}px,0,0)`;
    st.row.style.boxShadow = `inset ${-Math.min(st.dx, 140)}px 0 0 rgba(255,69,58,${Math.min(.55, st.dx / 220)})`;
  }, { passive: false });
  const end = () => {
    if (!st) return; const s = st; st = null; if (!s.on) return; const row = s.row;
    if (s.dx > 95) {
      const b = row.querySelector('.sdone'); const ei = +b.dataset.ei, si = +b.dataset.si; const h = row.offsetHeight;
      row.style.transition = 'transform .2s ease-in, opacity .2s'; row.style.transform = 'translate3d(110%,0,0)'; row.style.opacity = '0';
      setTimeout(() => { row.style.transition = 'height .2s ease, margin .2s ease'; row.style.height = h + 'px'; void row.offsetHeight; row.style.height = '0px'; row.style.margin = '0'; row.style.overflow = 'hidden'; }, 190);
      setTimeout(() => { const ex = TS.active && TS.active.exercises[ei]; if (ex) { ex.sets.splice(si, 1); tsave(); } render(); }, 400);
      if (navigator.vibrate) navigator.vibrate(10);
    } else { row.style.transition = 'transform .25s cubic-bezier(.2,.9,.3,1.1), box-shadow .25s'; row.style.transform = ''; row.style.boxShadow = ''; }
  };
  document.addEventListener('touchend', end, { passive: true }); document.addEventListener('touchcancel', end, { passive: true });
})();

// ---------- séance : appui long sur un exercice = menu ⋮ ; appui long puis glisser = déplacer ----------
(function exoHold() {
  let st = null;
  const reset = () => { if (!st) return; clearTimeout(st.timer); qa('#view section.card.exo').forEach(c => { c.style.transition = ''; c.style.transform = ''; c.classList.remove('exlift'); }); st = null; };
  document.addEventListener('touchstart', e => {
    reset(); if (S.ui.tab !== 't_live' || e.touches.length !== 1) return;
    const card = e.target.closest('#view section.card.exo'); if (!card || e.target.closest('.srow, input, textarea, .addset')) return;
    const t = e.touches[0];
    st = { card, x: t.clientX, y: t.clientY, armed: false, drag: false };
    st.timer = setTimeout(() => { if (!st) return; st.armed = true; card.classList.add('exlift'); lpHaptic(); if (navigator.vibrate) navigator.vibrate(12); }, 450);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!st) return; const t = e.touches[0];
    if (!st.armed) { if (Math.hypot(t.clientX - st.x, t.clientY - st.y) > 10) { clearTimeout(st.timer); st = null; } return; }
    e.preventDefault();
    if (!st.drag) {
      if (Math.abs(t.clientY - st.y) < 8) return;
      st.drag = true; st.cards = qa('#view section.card.exo'); st.from = st.cards.indexOf(st.card); st.to = st.from;
      st.y0 = t.clientY + scrollY; st.rects = st.cards.map(c => { const r = c.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
      st.gap = st.cards.length > 1 ? st.rects[1].top - st.rects[0].top - st.rects[0].h : 12;
      st.cards.forEach(c => { if (c !== st.card) c.style.transition = 'transform .22s cubic-bezier(.2,.9,.3,1)'; });
      st.card.style.transition = 'none'; st.card.style.zIndex = '6';
    }
    st.cy = t.clientY;
    if (t.clientY < 110) scrollBy(0, -10); else if (t.clientY > innerHeight - 140) scrollBy(0, 10);
    const dy = t.clientY + scrollY - st.y0; st.card.style.transform = `translate3d(0,${dy}px,0) scale(1.02)`;
    const R = st.rects, me = R[st.from]; const mid = me.top + dy + me.h / 2; let to = st.from;
    for (let j = 0; j < R.length; j++) { if (j === st.from) continue; const m = R[j].top + R[j].h / 2; if (j > st.from && mid > m) to = Math.max(to, j); if (j < st.from && mid < m) to = Math.min(to, j); }
    if (to !== st.to) { st.to = to; haptic([6]); }
    const sh = me.h + st.gap;
    st.cards.forEach((c, j) => { if (j === st.from) return; let y = 0; if (j > st.from && j <= to) y = -sh; if (j < st.from && j >= to) y = sh; c.style.transform = y ? `translate3d(0,${y}px,0)` : ''; });
  }, { passive: false });
  const end = () => {
    if (!st) return; const s = st; clearTimeout(s.timer);
    if (!s.armed) { st = null; return; }
    SE_SUPPRESS = Date.now();
    if (!s.drag) { reset(); const b = s.card.querySelector('[data-act=tExMenu]'); if (b) { SE_SUPPRESS = 0; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.click(); SE_SUPPRESS = Date.now(); } return; }
    const a = TS.active.exercises; const [m] = a.splice(s.from, 1); a.splice(s.to, 0, m); tsave();
    st = null; s.card.style.zIndex = ''; render();
  };
  document.addEventListener('touchend', end, { passive: true }); document.addEventListener('touchcancel', end, { passive: true });
  addEventListener('scroll', () => { if (st && !st.armed) { clearTimeout(st.timer); st = null; } }, { passive: true });
})();

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
    b.querySelector('.rte-grid').insertAdjacentHTML('afterend', `<div class="rte-sets"><div class="rtes head"><span>Série</span><span>kg</span><span>réps</span><span></span></div>
      ${e.plan.map((p, si) => `<div class="rtes"><span class="rtes-n">${si + 1}</span><input type="number" inputmode="decimal" data-rpw="${i}" data-si="${si}" value="${esc(p.w ?? '')}" placeholder="–"><input type="number" inputmode="numeric" data-rpr="${i}" data-si="${si}" value="${esc(p.r ?? '')}" placeholder="${esc(lo || '–')}"><button class="rtes-del" data-act="rtSetDel" data-i="${i}" data-si="${si}" aria-label="Retirer la série" ${n < 2 ? 'disabled' : ''}>✕</button></div>`).join('')}
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
