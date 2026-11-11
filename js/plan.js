// ============================================================
//  PROGRAMME CONSEILLÉ (version améliorée de tes routines, sans toucher aux originales)
//  + DOSSIERS de routines et onglets « Mes routines / Programme conseillé »
// ============================================================
const isMine = r => !(typeof STARTER_NAMES !== 'undefined' && STARTER_NAMES.has(r.name)) && !r.suggested;
const groupsOf = id => mainGroups(exById(id));
// ajoute un exercice de la bibliothèque pour un muscle donné (le plus classique d’abord)
const ADD_FOR = { Quadriceps: ['squat', 'presse', 'legext'], Ischios: ['sdtjt', 'legcurla', 'legcurl'], Fessiers: ['hipthrust', 'bulgare'], Pectoraux: ['dch', 'dih', 'ecartep'],
  'Grand dorsal': ['tirage', 'tractions'], 'Haut du dos': ['rowpoulie', 'rowh', 'tbar'], 'Deltoïde latéral': ['elev', 'elevp'], Biceps: ['curlh', 'marteau'], Triceps: ['pushdown', 'extoh'] };
const ROUTINE_FOR = { Quadriceps: /leg|jambe|lower|bas|full/, Ischios: /leg|jambe|lower|bas|full/, Fessiers: /leg|jambe|lower|bas|full/, Pectoraux: /push|pec|upper|haut|full/, 'Deltoïde latéral': /push|epaule|upper|haut|full/,
  Triceps: /push|tri|bras|arm|upper|full/, 'Grand dorsal': /pull|dos|upper|haut|full/, 'Haut du dos': /pull|dos|upper|haut|full/, Biceps: /pull|bi|bras|arm|upper|full/ };
function buildSuggestion() {
  const mine = TS.routines.filter(isMine); if (!mine.length) return null;
  // copie de travail ; hypothèse claire : chaque séance faite 1 fois par semaine
  const R = mine.map(r => ({ src: r.id, name: r.name, changes: [], exercises: r.exercises.map(e => ({ exId: e.exId, sets: Math.max(1, +e.sets || 3), reps: e.reps || '' })) }));
  // une raison claire par type de changement (le détail exercice par exercice est visible dans la liste)
  const note = (r, key, t) => { r.why = r.why || {}; if (!r.why[key]) { r.why[key] = t; r.changes.push(t); } };
  const nm = id => exById(id).name;
  for (const r of R) {
    // doublons : fusion
    const seen = {}; r.exercises = r.exercises.filter(e => { if (seen[e.exId]) { seen[e.exId].sets += e.sets; note(r, 'merge', 'Exercices en double regroupés en un seul (suivi de progression plus simple)'); return false; } seen[e.exId] = e; return true; });
    // ordre : polyarticulaires d’abord (ordre relatif conservé)
    const before = r.exercises.map(e => e.exId).join();
    r.exercises = [...r.exercises.filter(e => isCompound(exById(e.exId))), ...r.exercises.filter(e => !isCompound(exById(e.exId)))];
    if (r.exercises.map(e => e.exId).join() !== before) note(r, 'order', 'Gros exercices (polyarticulaires) placés en premier : tu y mets tes meilleures charges');
    for (const e of r.exercises) {
      const X = exById(e.exId);
      if (e.sets < 2 && X.kind !== 'cardio') { e.sets = 2; note(r, 'single', 'Au moins 2 séries par exercice : plusieurs séries font plus progresser qu’une seule'); }
      const rp = parseReps(e.reps);
      if (rp && rp[0] > 30) { e.reps = '12-20'; note(r, 'reps', 'Répétitions ramenées entre 12 et 20 en ajoutant de la charge'); }
      if (!rp && (X.kind === 'wr' || X.kind === 'bw')) e.reps = isCompound(X) ? '6-10' : '10-15';
      if (isCompound(X)) e.rest = 150;
    }
    // trop de séries pour un muscle dans la séance : on retire sur les isolations
    for (let guard = 0; guard < 30; guard++) {
      const per = {}; for (const e of r.exercises) for (const g of groupsOf(e.exId)) per[g] = (per[g] || 0) + e.sets;
      const over = Object.entries(per).find(([, n]) => n > 12); if (!over) break;
      const pos = e => r.exercises.indexOf(e);
      const cand = r.exercises.filter(e => groupsOf(e.exId).includes(over[0]) && !isCompound(exById(e.exId)) && e.sets > 2).sort((a, b) => b.sets - a.sets || pos(b) - pos(a))[0]
        || r.exercises.filter(e => groupsOf(e.exId).includes(over[0]) && e.sets > 2 && pos(e) > 0).sort((a, b) => pos(b) - pos(a))[0];
      if (!cand) break; cand.sets--; note(r, 'cap:' + over[0], `${over[0]} : ramené à 12 séries maximum dans la séance (au-delà, chaque série apporte peu)`);
    }
  }
  // volume hebdomadaire (1×/semaine par séance) → zone 10–20 pour les grands muscles
  const weekly = () => { const w = {}; for (const r of R) for (const e of r.exercises) for (const g of groupsOf(e.exId)) w[g] = (w[g] || 0) + e.sets; return w; };
  for (let guard = 0; guard < 80; guard++) {
    const w = weekly(); const over = Object.keys(w).find(g => w[g] > 20); if (!over) break;
    // on retire d’abord là où le muscle n’est pas le sujet de la séance (ex. élévations latérales dans « Pull »)
    const opts = R.flatMap(r => r.exercises.filter(e => groupsOf(e.exId).includes(over) && e.sets > 2).map(e => ({ r, e, off: !(ROUTINE_FOR[over] || /$^/).test(norm(r.name)), iso: !isCompound(exById(e.exId)) })))
      .sort((a, b) => (b.off - a.off) || (b.iso - a.iso) || b.e.sets - a.e.sets);
    const o = opts[0]; if (!o) break; o.e.sets--; note(o.r, 'high:' + over, `${over} : moins de séries ici pour ne pas dépasser 20 par semaine sur tout le programme`);
  }
  for (let guard = 0; guard < 80; guard++) {
    const w = weekly(); const low = MAJOR.find(g => (w[g] || 0) < 10); if (!low) break;
    const home = R.find(r => (ROUTINE_FOR[low] || /$^/).test(norm(r.name))) || R.find(r => r.exercises.some(e => groupsOf(e.exId).includes(low))) || R[0];
    const ex = home.exercises.filter(e => groupsOf(e.exId).includes(low) && e.sets < 4).sort((a, b) => a.sets - b.sets)[0];
    if (ex) { ex.sets++; note(home, 'low:' + low, `${low} : séries ajoutées pour atteindre 10 par semaine (zone qui fait progresser)`); continue; }
    const add = (ADD_FOR[low] || []).find(id => EXLIB[id] && !R.some(r => r.exercises.some(e => e.exId === id || exById(e.exId).like === id)));
    if (!add) break;
    home.exercises.push({ exId: add, sets: 3, reps: isCompound(EXLIB[add]) ? '6-10' : '10-15', rest: isCompound(EXLIB[add]) ? 150 : undefined, added: 1 });
    note(home, 'add:' + add, `＋ ${EXLIB[add].name} ajouté pour ${low.toLowerCase()} (pas assez d’exercices pour ce muscle)`);
  }
  return { routines: R, week: weekly() };
}
// mémorise la proposition tant que tes routines ne changent pas
let SUG_CACHE = { key: null, val: null };
function suggestion() { const key = JSON.stringify(TS.routines.filter(isMine).map(r => [r.id, r.exercises])); if (SUG_CACHE.key !== key) SUG_CACHE = { key, val: buildSuggestion() }; return SUG_CACHE.val; }

// ---------- Dossiers ----------
TS.folders = TS.folders || [];
const folderOf = r => TS.folders.find(f => f.id === r.folder) || null;
function routineCardHTML(r, extraBtns = '') {
  const lastDone = sortedW().find(w => w.routineId === r.id || norm(w.name).trim() === norm(r.name).trim());
  const a = isMine(r) || r.suggested ? analyseRoutine(r) : null;
  return `<section class="card routine"><div class="mealhead"><div class="grow" style="min-width:0"><h2>${esc(r.name)}</h2><div class="small muted">${r.exercises.length} exercice${r.exercises.length > 1 ? 's' : ''} · ${r.exercises.reduce((s, e) => s + (+e.sets || 0), 0)} séries${lastDone ? ` · fait ${esc(relDay(wDate(lastDone)))}` : ''}</div></div>
      ${a ? `<button class="rnote ${scoreCls(a.score)}" data-act="tRoutineNote" data-id="${r.id}" aria-label="Note de la routine">${fr(a.score)}/10</button>` : ''}
      <button class="iconbtn" data-act="tRoutineMenu" data-id="${r.id}" aria-label="Options de la routine">⋯</button></div>
    <div class="small muted" style="margin:2px 0 12px">${r.exercises.map(e => esc(exById(e.exId).name)).join(' · ')}</div>
    <button class="btn primary block" data-act="tStartRoutine" data-id="${r.id}" ${TS.active ? 'disabled style="opacity:.5"' : ''}>Démarrer</button>${extraBtns}</section>`;
}
function myRoutinesHTML() {
  if (!TS.routines.length) return `<div class="card empty"><div style="font-size:38px">📋</div><h2>Aucune routine</h2><p class="muted">Une routine = une liste d’exercices que tu refais souvent (ex. « Push », « Jambes »).</p>
    <button class="btn primary block" data-act="tRoutineNew">Créer ma routine</button><button class="btn ghost block" style="margin-top:6px" data-act="tStarter">Ajouter des programmes exemples</button></div>`;
  let h = TS.routines.filter(r => !folderOf(r)).map(r => routineCardHTML(r)).join('');
  for (const f of TS.folders) {
    const L = TS.routines.filter(r => r.folder === f.id);
    h += `<details class="folder" data-fid="${f.id}" ${f.open !== false ? 'open' : ''}><summary><span class="fic">📁</span><b class="grow">${esc(f.name)}</b><span class="small muted">${L.length}</span>
      <button class="iconbtn" data-act="tFolderMenu" data-id="${f.id}" aria-label="Options du dossier">⋯</button></summary>
      ${L.length ? L.map(r => routineCardHTML(r)).join('') : '<p class="small muted" style="margin:4px 6px 10px">Dossier vide : range une routine avec ⋯ → Ranger dans un dossier.</p>'}</details>`;
  }
  return h + `<button class="btn ghost block sm" data-act="tFolderNew" style="margin-top:4px">📁 Nouveau dossier</button>`;
}
function suggestedHTML() {
  const s = suggestion();
  if (!s) return `<div class="card empty"><div style="font-size:38px">🧪</div><h2>Pas encore de routine à analyser</h2><p class="muted">Crée tes routines (ou importe-les depuis ton historique) : l’appli te proposera ici une version améliorée, sans modifier les tiennes.</p></div>`;
  const zone = g => { const v = s.week[g] || 0; return v < 10 ? 'low' : v > 20 ? 'high' : 'ok'; };
  let h = `<div class="card sugintro"><b>Ton programme, version optimisée</b><p class="small muted" style="margin:6px 0 10px">Tes routines restent intactes. Cette version corrige ce que le bilan a détecté, en partant du principe que chaque séance est faite 1 fois par semaine. Ouvre une séance pour voir ce qui change.</p>
    <div class="sugweek">${MAJOR.map(g => `<span class="${zone(g)}">${esc(g)} <b>${fr(r1(s.week[g] || 0))}</b></span>`).join('')}</div>
    <div class="small muted" style="margin-top:6px">Séries par semaine · zone visée 10 à 20</div></div>`;
  s.routines.forEach((r, i) => {
    const before = TS.routines.find(x => x.id === r.src);
    h += `<details class="sugr"><summary><div class="grow"><b>${esc(r.name)}</b><div class="small muted">${r.exercises.length} exercices · ${r.exercises.reduce((a, e) => a + e.sets, 0)} séries${before ? ` (avant : ${before.exercises.reduce((a, e) => a + (+e.sets || 0), 0)})` : ''}</div></div>
      <span class="sugchg ${r.changes.length ? '' : 'none'}">${r.changes.length ? `${r.changes.length} changement${r.changes.length > 1 ? 's' : ''}` : 'déjà bien'}</span></summary>
      <div class="sugbody">${r.exercises.map(e => { const X = exById(e.exId); const old = before && before.exercises.find(x => x.exId === e.exId); const diff = !old ? 'new' : (+old.sets !== e.sets ? 'chg' : '');
        return `<div class="sugex ${diff}"><span class="grow">${diff === 'new' ? '＋ ' : ''}${esc(X.name)}</span><span>${e.sets} × ${esc(e.reps || '—')}${old && +old.sets !== e.sets ? ` <s class="muted">${old.sets}</s>` : ''}</span></div>`; }).join('')}
        ${r.changes.length ? `<div class="sugwhy"><b>Pourquoi ces changements</b>${r.changes.map(c => `<div>· ${esc(c)}</div>`).join('')}<div class="small muted" style="margin-top:4px">Repos conseillé : 2 min 30 sur les exercices polyarticulaires.</div></div>` : '<p class="small muted">Rien à changer sur cette séance.</p>'}
        <button class="btn block" data-act="sugSave" data-i="${i}">⤓ Ranger dans mes routines</button></div></details>`;
  });
  return h + `<button class="btn primary block" data-act="sugSaveAll" style="margin-top:6px">⤓ Ranger tout le programme dans un dossier</button>`;
}

// ---------- Accueil Entraînement ----------
vTHome = function () {
  const ws = weekStart(); const week = TS.workouts.filter(w => wDate(w) >= ws); const tab = S.ui.rtTab || 'mine';
  let h = `<div class="row between" style="margin:4px 0 16px"><h1 style="margin:0">Entraînement</h1><button class="clockbtn" data-act="tTimer" aria-label="Lancer un minuteur">${CLOCK_SVG}</button></div>`;
  if (TS.active) h += `<button class="card livecard" data-act="tResume"><span>🏋️</span><span class="grow"><b>${esc(TS.active.name)}</b><br><span class="small">En cours · <span data-elapsed>${clock(Date.now() - TS.active.start)}</span></span></span><b>Reprendre ›</b></button>`;
  else h += `<button class="btn primary block" style="margin-bottom:14px" data-act="tStartEmpty">＋ Démarrer une séance vide</button>`;
  h += `<div class="grid2" style="margin-bottom:16px"><div class="stat"><div class="v">${week.length}</div><div class="l">séance${week.length > 1 ? 's' : ''} cette semaine</div></div>
    <div class="stat tap" data-act="tWeekVol" role="button"><div class="v">${bigKg(week.reduce((a, w) => a + wVolume(w), 0))}</div><div class="l">soulevés cette semaine <span class="chev">›</span></div></div></div>`;
  h += `<div class="row between" style="margin:0 2px 10px"><h2 style="margin:0">Mes routines</h2>${TS.routines.some(isMine) ? '<button class="btn sm ghost progbtn" data-act="tProgramNote">📊 Bilan</button>' : ''}<button class="btn sm" data-act="tRoutineNew">＋ Nouvelle</button></div>`;
  if (TS.workouts.length) h += `<button class="btn block rtibtn" data-act="tRoutinesFromHist">⤓ Routines depuis mon historique</button>`;
  h += `<div class="seg" style="margin-bottom:12px">${[['mine', 'Mes routines'], ['sug', '✨ Programme conseillé']].map(([k, l]) => `<button data-act="rtTab" data-v="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  return h + (tab === 'sug' ? suggestedHTML() : myRoutinesHTML());
};
VIEWS.t_home = vTHome;

// garde l’état ouvert / fermé des dossiers
document.addEventListener('toggle', e => { const d = e.target; if (d.classList && d.classList.contains('folder')) { const f = TS.folders.find(x => x.id === d.dataset.fid); if (f) { f.open = d.open; tsave(); } } }, true);
function saveSuggested(r, folderId) {
  const nr = { id: uid(), name: `${r.name} (conseillé)`, suggested: 1, folder: folderId || null, exercises: r.exercises.map(e => ({ exId: e.exId, sets: e.sets, reps: e.reps, rest: e.rest })) };
  TS.routines.push(nr); return nr;
}
function sugFolder() { let f = TS.folders.find(x => x.sug); if (!f) { f = { id: 'f_' + uid(), name: 'Programme conseillé', sug: 1, open: true }; TS.folders.push(f); } return f; }
Object.assign(ACTIONS, {
  rtTab: el => { S.ui.rtTab = el.dataset.v; save(); render(); },
  sugSave: el => { const s = suggestion(); const r = s.routines[+el.dataset.i]; const f = sugFolder(); saveSuggested(r, f.id); tsave(); toast(`« ${r.name} (conseillé) » rangée dans le dossier ${f.name}`); },
  sugSaveAll: () => { const s = suggestion(); const f = sugFolder(); s.routines.forEach(r => saveSuggested(r, f.id)); tsave(); S.ui.rtTab = 'mine'; save(); render(); toast(`${s.routines.length} séances rangées dans « ${f.name} »`); },
  tFolderNew: async () => { const n = await askText('Nom du dossier', '', { ok: 'Créer' }); if (!n || !n.trim()) return; TS.folders.push({ id: 'f_' + uid(), name: n.trim(), open: true }); tsave(); render(); },
  tFolderMenu: (el, e) => { if (e) { e.preventDefault(); e.stopPropagation(); } const id = el.dataset.id; const f = TS.folders.find(x => x.id === id);
    openSheet(f.name, `<button class="menuopt" data-act="tFolderRename" data-id="${id}"><span>✏️</span>Renommer</button><button class="menuopt" data-act="tFolderDel" data-id="${id}" style="color:var(--warn)"><span>✕</span>Supprimer le dossier</button>`); },
  tFolderRename: async el => { const f = TS.folders.find(x => x.id === el.dataset.id); const n = await askText('Nouveau nom', f.name, { ok: 'Renommer' }); if (n && n.trim()) { f.name = n.trim(); tsave(); render(); } },
  tFolderDel: async el => { const f = TS.folders.find(x => x.id === el.dataset.id); if (!(await askConfirm(`Supprimer le dossier « ${f.name} » ?`, { msg: 'Les routines qu’il contient ne sont pas supprimées : elles reviennent dans la liste principale.', ok: 'Supprimer', danger: true }))) return;
    TS.routines.forEach(r => { if (r.folder === f.id) delete r.folder; }); TS.folders = TS.folders.filter(x => x !== f); tsave(); render(); },
  tRtFolder: el => { const id = el.dataset.id; const r = TS.routines.find(x => x.id === id);
    openSheet('Ranger dans…', `${TS.folders.map(f => `<button class="menuopt ${r.folder === f.id ? 'sel' : ''}" data-act="tRtToFolder" data-id="${id}" data-f="${f.id}"><span>📁</span>${esc(f.name)}</button>`).join('')}
      ${r.folder ? `<button class="menuopt" data-act="tRtToFolder" data-id="${id}" data-f=""><span>↩︎</span>Sortir du dossier</button>` : ''}<button class="menuopt" data-act="tRtMoveNew" data-id="${id}"><span>＋</span>Nouveau dossier…</button>`); },
  tRtToFolder: el => { const r = TS.routines.find(x => x.id === el.dataset.id); if (el.dataset.f) r.folder = el.dataset.f; else delete r.folder; tsave(); closeSheet(); render(); },
  tRtMoveNew: async el => { const n = await askText('Nom du dossier', '', { ok: 'Créer' }); if (!n || !n.trim()) return; const f = { id: 'f_' + uid(), name: n.trim(), open: true }; TS.folders.push(f); TS.routines.find(x => x.id === el.dataset.id).folder = f.id; tsave(); closeSheet(); render(); }
});
// menu ⋯ d’une routine : ajoute « Ranger dans un dossier »
ACTIONS.tRoutineMenu = el => {
  const id = el.dataset.id; const r = TS.routines.find(x => x.id === id);
  openSheet(r.name, `<button class="menuopt" data-act="tRtEdit" data-id="${id}"><span>✏️</span>Modifier</button>
    <button class="menuopt" data-act="tRtDup" data-id="${id}"><span>⧉</span>Dupliquer</button>
    <button class="menuopt" data-act="tRtFolder" data-id="${id}"><span>📁</span>Ranger dans un dossier</button>
    <button class="menuopt" data-act="tRtDelete" data-id="${id}" style="color:var(--warn)"><span>✕</span>Supprimer</button>`);
};
// repos conseillé repris quand on démarre une routine qui en contient
ACTIONS.tStartRoutine = (orig => el => {
  orig(el); const r = TS.routines.find(x => x.id === el.dataset.id);
  if (r && TS.active && TS.active.routineId === r.id) { r.exercises.forEach((e, i) => { if (e.rest && TS.active.exercises[i]) TS.active.exercises[i].rest = e.rest; }); tsave(); }
})(ACTIONS.tStartRoutine);
// lien depuis le bilan
openProgramNote = (orig => function (fid) {
  orig(fid); const b = $('#sheetBody'); if (!b) return; const p = analyseProgram(fid);
  const brief = p.issues.length ? `<div class="brief"><b>En bref</b>${p.issues.slice(0, 3).map((x, i) => `<div><span>${i + 1}</span>${x.brief || x.fix}</div>`).join('')}</div>` : '';
  b.insertAdjacentHTML('afterbegin', brief);
  b.insertAdjacentHTML('beforeend', `<button class="btn primary block" data-act="sugOpen" style="margin-top:6px">✨ Voir le programme conseillé</button>`);
})(openProgramNote);
ACTIONS.sugOpen = () => { S.ui.rtTab = 'sug'; S.ui.tab = 't_home'; save(); closeSheet(); render(); window.scrollTo(0, 0); };
