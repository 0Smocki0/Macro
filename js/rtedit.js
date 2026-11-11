// ============================================================
//  ÉDITEUR DE ROUTINE (refait) : séries, fourchette de répétitions, repos, note,
//  remplacer / déplacer / retirer, durée estimée et conseils en direct
// ============================================================
const repsSplit = s => { const m = String(s || '').match(/(\d+)\s*[-–à]\s*(\d+)/); if (m) return [m[1], m[2]]; const n = String(s || '').match(/\d+/); return n ? [n[0], ''] : ['', '']; };
const rteRest = e => e.rest ?? (TS.exRest || {})[e.exId] ?? TS.settings.rest;
function rteMinutes() { // estimation : ~40 s par série + repos entre les séries
  let s = 0; RT.exercises.forEach((e, i) => { const n = +e.sets || 3; s += n * 40 + (n - 1) * rteRest(e) + (i < RT.exercises.length - 1 ? 90 : 0); });
  return Math.max(1, Math.round(s / 60));
}
function rteSummaryHTML() {
  const sets = RT.exercises.reduce((a, e) => a + (+e.sets || 0), 0);
  const a = RT.exercises.length ? analyseRoutine(RT) : null;
  return `<div><b>${RT.exercises.length}</b><span>exercices</span></div><div><b>${sets}</b><span>séries</span></div><div><b>≈ ${rteMinutes()} min</b><span>durée</span></div>
    ${a ? `<div class="rte-score ${scoreCls(a.score)}"><b>${fr(a.score)}</b><span>/10</span></div>` : ''}`;
}
function rteAdviceHTML() {
  if (!RT.exercises.length) return '';
  const a = analyseRoutine(RT);
  if (!a.issues.length) return `<div class="rte-ok">👍 Structure conforme aux recommandations des études.</div>`;
  return `<details class="rte-adv"><summary>💡 ${a.issues.length} conseil${a.issues.length > 1 ? 's' : ''} pour améliorer cette routine</summary>${a.issues.map(tipCard).join('')}</details>`;
}
function rteRefresh() { const s = $('#rteSum'), d = $('#rteAdv'); if (s) s.innerHTML = rteSummaryHTML(); if (d) d.innerHTML = rteAdviceHTML(); }
renderRoutineEditor = function () {
  $('#sheetTitle').textContent = RT.isNew ? 'Nouvelle routine' : 'Modifier la routine';
  const timeLike = X => X.kind === 'time' || X.kind === 'cardio';
  $('#sheetBody').innerHTML = `<input class="rte-name" type="text" data-rt="name" value="${esc(RT.name)}" placeholder="Nom de la séance (ex. Push)" aria-label="Nom de la routine">
    <div class="rte-sum" id="rteSum">${rteSummaryHTML()}</div>
    <div id="rteAdv">${rteAdviceHTML()}</div>
    ${RT.exercises.length ? '' : '<div class="hint" style="margin:18px 0">Ajoute tes exercices : tu régleras ensuite les séries, les répétitions et le repos de chacun.</div>'}
    ${RT.exercises.map((e, i) => { const X = exById(e.exId); const [lo, hi] = repsSplit(e.reps);
      return `<div class="rtex2">
        <div class="rte-top"><span class="rte-n">${i + 1}</span>${typeof muscleMapSVG === 'function' ? `<span class="rte-th">${muscleMapSVG(X, true)}</span>` : ''}
          <div class="grow" style="min-width:0"><b class="rte-x">${esc(X.name)}</b><span class="small muted">${esc(X.muscle)}${isCompound(X) ? ' · polyarticulaire' : ''}</span></div>
          <button class="iconbtn" data-act="rteMenu" data-i="${i}" aria-label="Options de l’exercice">⋯</button></div>
        <div class="rte-grid">
          <div class="rte-f"><span class="rte-l">Séries</span><span class="stepper"><button data-act="tRtSets" data-i="${i}" data-n="-1" aria-label="Moins de séries">−</button><b>${e.sets}</b><button data-act="tRtSets" data-i="${i}" data-n="1" aria-label="Plus de séries">＋</button></span></div>
          <div class="rte-f"><span class="rte-l">${timeLike(X) ? 'Objectif' : 'Répétitions'}</span>${timeLike(X)
            ? `<input type="text" class="rte-in wide" data-rtreps="${i}" value="${esc(e.reps || '')}" placeholder="ex. 45 s">`
            : `<span class="rte-reps"><input type="number" inputmode="numeric" class="rte-in" data-rtlo="${i}" value="${esc(lo)}" placeholder="8"><i>à</i><input type="number" inputmode="numeric" class="rte-in" data-rthi="${i}" value="${esc(hi)}" placeholder="12"></span>`}</div>
          <div class="rte-f"><span class="rte-l">Repos</span><button class="pill rte-rest" data-act="rteRest" data-i="${i}">⏱ ${restLabel(rteRest(e))}</button></div>
        </div>
        ${e.note ? `<button class="rte-note" data-act="rteNote" data-i="${i}">📝 ${esc(e.note)}</button>` : ''}
      </div>`; }).join('')}
    <button class="btn block rte-add" data-act="tPick" data-target="routine">＋ Ajouter des exercices</button>
    ${RT.isNew ? '' : '<button class="btn ghost danger block sm" style="margin-top:4px" data-act="tRtRemove">Supprimer la routine</button>'}
    <div class="rte-foot"><button class="btn" data-act="rteCancel">Annuler</button><button class="btn primary grow" data-act="tRtSave">Enregistrer</button></div>`;
};
// saisie des répétitions : mise à jour sans tout redessiner (le clavier reste ouvert)
document.addEventListener('input', e => {
  const el = e.target; if (!RT || !el.dataset) return;
  const i = el.dataset.rtlo ?? el.dataset.rthi; if (i == null) { if (el.dataset.rtreps != null) rteRefresh(); return; }
  const ex = RT.exercises[+i]; const box = el.closest('.rte-reps');
  const lo = box.querySelector('[data-rtlo]').value.trim(), hi = box.querySelector('[data-rthi]').value.trim();
  ex.reps = lo && hi ? `${lo}-${hi}` : lo || hi; rteRefresh();
});
function reopenEditor() { openSheet(RT.isNew ? 'Nouvelle routine' : 'Modifier la routine', ''); renderRoutineEditor(); }
Object.assign(ACTIONS, {
  rteMenu: el => { const i = +el.dataset.i; const e = RT.exercises[i];
    openSheet(exById(e.exId).name, `${i > 0 ? `<button class="menuopt" data-act="tRtMove" data-i="${i}" data-n="-1"><span>↑</span>Monter</button>` : ''}
      ${i < RT.exercises.length - 1 ? `<button class="menuopt" data-act="tRtMove" data-i="${i}" data-n="1"><span>↓</span>Descendre</button>` : ''}
      <button class="menuopt" data-act="rteReplace" data-i="${i}"><span>⇄</span>Remplacer l’exercice</button>
      <button class="menuopt" data-act="rteNote" data-i="${i}"><span>📝</span>${e.note ? 'Modifier la note' : 'Ajouter une note'}</button>
      <button class="menuopt" data-act="tRtDel" data-i="${i}" style="color:var(--warn)"><span>✕</span>Retirer de la routine</button>`); },
  // petit menu collé au bouton : l’éditeur reste ouvert derrière
  rteRest: el => { const i = +el.dataset.i; const e = RT.exercises[i]; const cur = rteRest(e);
    openSheet('Repos', [60, 90, 120, 150, 180, 240].map(v => `<button class="menuopt ${v === cur ? 'sel' : ''}" data-act="rteRestSet" data-i="${i}" data-v="${v}"><span>${v === cur ? '✓' : ''}</span>${restLabel(v)}${v >= 120 && isCompound(exById(e.exId)) ? ' · conseillé' : ''}</button>`).join('')); },
  rteRestSet: el => { RT.exercises[+el.dataset.i].rest = +el.dataset.v; renderRoutineEditor(); },
  rteCancel: () => { RT = null; closeSheet(); },
  rteNote: async el => { const e = RT.exercises[+el.dataset.i]; const t = await askText('Note pour cet exercice', e.note || '', { ok: 'Enregistrer' }); if (t === null) return; if (t.trim()) e.note = t.trim(); else delete e.note; renderRoutineEditor(); },
  rteReplace: el => { PICK = { target: 'rtReplace', idx: +el.dataset.i, sel: [], q: '', m: exById(RT.exercises[+el.dataset.i].exId).muscle || '' }; openSheet('Remplacer par…', ''); renderPicker(); }
});
// choix du remplaçant dans le sélecteur d’exercices
ACTIONS.tPickOk = (orig => () => {
  if (PICK && PICK.target === 'rtReplace') { const id = PICK.sel[0]; if (id && RT) { const e = RT.exercises[PICK.idx]; e.exId = id; delete e.rest; } PICK = null; reopenEditor(); return; }
  return orig();
})(ACTIONS.tPickOk);
// les retouches dans l’éditeur rafraîchissent le résumé
for (const k of ['tRtSets', 'tRtMove', 'tRtDel']) ACTIONS[k] = (orig => (el, e) => { orig(el, e); if (RT && $('#rteSum')) rteRefresh(); })(ACTIONS[k]);
// au démarrage d’une routine : la note de l’exercice suit dans la séance
ACTIONS.tStartRoutine = (orig => el => {
  orig(el); const r = TS.routines.find(x => x.id === el.dataset.id);
  if (r && TS.active && TS.active.routineId === r.id) { r.exercises.forEach((e, i) => { const a = TS.active.exercises[i]; if (e.note && a) a.notes = e.note + (a.notes ? ` · ${a.notes}` : ''); }); tsave(); render(); }
})(ACTIONS.tStartRoutine);
