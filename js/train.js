'use strict';
/* ============================================================
   ENTRAÎNEMENT — suivi de musculation (séances, routines,
   progression, records, import de l’historique Hevy)
   + écran d’accueil Nutrition / Entraînement
   ============================================================ */

// ---------- Données ----------
const TKEY = 'macro.train.v1';
const TDEF = { exercises: {}, routines: [], workouts: [], active: null, rest: null, exRest: {}, settings: { rest: 90, restOn: true } };
let TS = (() => { try { const s = JSON.parse(localStorage.getItem(TKEY)); if (s) return deepMerge(structuredClone(TDEF), s); } catch (e) { } return structuredClone(TDEF); })();
function tsave() { try { localStorage.setItem(TKEY, JSON.stringify(TS)); } catch (e) { toast('Stockage plein : exporte une sauvegarde'); } }
function importTrain(d) { TS = deepMerge(structuredClone(TDEF), d); tsave(); }

// ---------- Bibliothèque d’exercices ----------
// kind : wr = charge × reps · bw = poids du corps (+ lest facultatif) · time = durée · cardio = distance + durée
const MUSCLES = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischios', 'Fessiers', 'Mollets', 'Abdos', 'Avant-bras', 'Corps entier', 'Cardio', 'Autre'];
const EQUIP = ['Barre', 'Haltères', 'Machine', 'Poulie', 'Poids du corps', 'Kettlebell', 'Élastique', 'Autre'];
const KINDS = { wr: 'Charge × répétitions', bw: 'Poids du corps (+ lest)', time: 'Durée', cardio: 'Distance + durée' };
const RAW_EX = [
  ['dc', 'Développé couché (barre)', 0, 0, 'wr'], ['dch', 'Développé couché (haltères)', 0, 1, 'wr'], ['dcm', 'Développé couché (machine)', 0, 2, 'wr'],
  ['dib', 'Développé incliné (barre)', 0, 0, 'wr'], ['dih', 'Développé incliné (haltères)', 0, 1, 'wr'], ['dd', 'Développé décliné (barre)', 0, 0, 'wr'],
  ['ecarte', 'Écarté (haltères)', 0, 1, 'wr'], ['ecartep', 'Écarté à la poulie', 0, 3, 'wr'], ['pecdeck', 'Pec deck (machine)', 0, 2, 'wr'],
  ['pompes', 'Pompes', 0, 4, 'bw'], ['dips', 'Dips', 0, 4, 'bw'],
  ['sdt', 'Soulevé de terre (barre)', 1, 0, 'wr'], ['tractions', 'Tractions', 1, 4, 'bw'], ['chinup', 'Tractions supination', 1, 4, 'bw'],
  ['tirage', 'Tirage vertical (poulie)', 1, 3, 'wr'], ['rowing', 'Rowing barre', 1, 0, 'wr'], ['rowh', 'Rowing haltère', 1, 1, 'wr'],
  ['rowpoulie', 'Rowing assis (poulie)', 1, 3, 'wr'], ['tbar', 'Rowing T-bar', 1, 0, 'wr'], ['pullover', 'Pull-over (poulie)', 1, 3, 'wr'],
  ['shrug', 'Shrugs (haltères)', 1, 1, 'wr'], ['hyper', 'Extensions lombaires', 1, 4, 'bw'],
  ['dm', 'Développé militaire (barre)', 2, 0, 'wr'], ['dmh', 'Développé épaules (haltères)', 2, 1, 'wr'], ['dmm', 'Développé épaules (machine)', 2, 2, 'wr'],
  ['arnold', 'Développé Arnold', 2, 1, 'wr'], ['elev', 'Élévations latérales (haltères)', 2, 1, 'wr'], ['elevp', 'Élévations latérales (poulie)', 2, 3, 'wr'],
  ['front', 'Élévations frontales', 2, 1, 'wr'], ['oiseau', 'Oiseau (haltères)', 2, 1, 'wr'], ['facepull', 'Face pull (poulie)', 2, 3, 'wr'],
  ['curlb', 'Curl (barre)', 3, 0, 'wr'], ['curlh', 'Curl (haltères)', 3, 1, 'wr'], ['marteau', 'Curl marteau', 3, 1, 'wr'],
  ['curlp', 'Curl à la poulie', 3, 3, 'wr'], ['pupitre', 'Curl pupitre', 3, 2, 'wr'], ['curlinc', 'Curl incliné (haltères)', 3, 1, 'wr'],
  ['pushdown', 'Extension triceps (poulie)', 4, 3, 'wr'], ['barfront', 'Barre au front', 4, 0, 'wr'], ['extoh', 'Extension nuque (haltère)', 4, 1, 'wr'],
  ['dcs', 'Développé couché prise serrée', 4, 0, 'wr'], ['kickback', 'Kickback triceps (haltère)', 4, 1, 'wr'],
  ['squat', 'Squat (barre)', 5, 0, 'wr'], ['frontsq', 'Front squat', 5, 0, 'wr'], ['presse', 'Presse à cuisses', 5, 2, 'wr'],
  ['hack', 'Hack squat', 5, 2, 'wr'], ['legext', 'Leg extension', 5, 2, 'wr'], ['fentes', 'Fentes (haltères)', 5, 1, 'wr'],
  ['bulgare', 'Squat bulgare', 5, 1, 'wr'], ['gobelet', 'Goblet squat', 5, 5, 'wr'],
  ['sdtjt', 'Soulevé de terre roumain', 6, 0, 'wr'], ['legcurl', 'Leg curl allongé', 6, 2, 'wr'], ['legcurla', 'Leg curl assis', 6, 2, 'wr'], ['goodmorning', 'Good morning', 6, 0, 'wr'],
  ['hipthrust', 'Hip thrust (barre)', 7, 0, 'wr'], ['abduc', 'Abduction (machine)', 7, 2, 'wr'], ['glutekb', 'Kickback fessier (poulie)', 7, 3, 'wr'],
  ['mollets', 'Mollets debout', 8, 2, 'wr'], ['molletsa', 'Mollets assis', 8, 2, 'wr'],
  ['crunch', 'Crunch', 9, 4, 'bw'], ['crunchp', 'Crunch à la poulie', 9, 3, 'wr'], ['releve', 'Relevé de jambes', 9, 4, 'bw'],
  ['abwheel', 'Roue abdominale', 9, 4, 'bw'], ['russian', 'Russian twist', 9, 4, 'bw'], ['gainage', 'Gainage', 9, 4, 'time'],
  ['wristcurl', 'Curl poignets', 10, 1, 'wr'],
  ['kbswing', 'Kettlebell swing', 11, 5, 'wr'], ['thruster', 'Thruster', 11, 0, 'wr'], ['burpees', 'Burpees', 11, 4, 'bw'], ['farmer', 'Marche du fermier', 11, 1, 'wr'],
  ['course', 'Course à pied', 12, 7, 'cardio'], ['velo', 'Vélo', 12, 2, 'cardio'], ['rameur', 'Rameur', 12, 2, 'cardio'],
  ['elliptique', 'Vélo elliptique', 12, 2, 'cardio'], ['marche', 'Marche', 12, 7, 'cardio'], ['corde', 'Corde à sauter', 12, 7, 'time']
];
const EXLIB = Object.fromEntries(RAW_EX.map(r => [r[0], { id: r[0], name: r[1], muscle: MUSCLES[r[2]], equip: EQUIP[r[3]], kind: r[4] }]));
const exById = id => EXLIB[id] || TS.exercises[id] || { id, name: 'Exercice supprimé', muscle: 'Autre', equip: 'Autre', kind: 'wr' };
const allEx = () => [...Object.values(EXLIB), ...Object.values(TS.exercises)].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

// ---------- Calculs ----------
const e1rm = (w, r) => !(w > 0) || !(r > 0) ? 0 : r === 1 ? w : w * (1 + Math.min(r, 15) / 30); // formule d’Epley
const doneSets = ex => ex.sets.filter(s => s.done);
function setVol(s) { return (num(s.w) || 0) * (num(s.r) || 0); }
function wVolume(w) { return w.exercises.reduce((a, ex) => a + doneSets(ex).filter(s => s.type !== 'w').reduce((b, s) => b + setVol(s), 0), 0); }
function wSets(w) { return w.exercises.reduce((a, ex) => a + doneSets(ex).length, 0); }
const kg = v => `${fr(Math.round(v * 10) / 10)} kg`;
const bigKg = v => `${Math.round(v).toLocaleString('fr-FR')} kg`;
const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + z2(m) : m) + ':' + z2(x); };
const dur = ms => { const m = Math.round(ms / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${z2(m % 60)}`; };
const wDate = w => dstr(new Date(w.start));
const sortedW = () => [...TS.workouts].sort((a, b) => b.start - a.start);
function exHistory(exId, beforeStart = Infinity) {
  const out = [];
  for (const w of sortedW()) { if (w.start >= beforeStart) continue; const e = w.exercises.find(x => x.exId === exId); if (e && doneSets(e).length) out.push({ w, sets: doneSets(e) }); }
  return out;
}
function exBest(exId, beforeStart) {
  const b = { e1: 0, w: 0, r: 0, vol: 0, t: 0, km: 0, e1date: null };
  for (const h of exHistory(exId, beforeStart)) for (const s of h.sets) {
    if (s.type === 'w') continue;
    const e = e1rm(num(s.w), num(s.r)); if (e > b.e1) { b.e1 = e; b.e1date = wDate(h.w); }
    b.w = Math.max(b.w, num(s.w)); b.r = Math.max(b.r, num(s.r)); b.vol = Math.max(b.vol, setVol(s)); b.t = Math.max(b.t, num(s.t)); b.km = Math.max(b.km, num(s.km));
  }
  return b;
}
function setText(s, kind) {
  if (kind === 'time') return `${num(s.t)} s`;
  if (kind === 'cardio') return `${fr(num(s.km))} km · ${num(s.t)} min`;
  if (kind === 'bw') return num(s.w) ? `+${fr(num(s.w))} kg × ${num(s.r)}` : `${num(s.r)} reps`;
  return `${fr(num(s.w))} kg × ${num(s.r)}`;
}

// ============================================================
//  ÉCRAN D’ACCUEIL (choix Nutrition / Entraînement)
// ============================================================
function greeting() { const h = new Date().getHours(); return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'; }
function showLauncher() {
  const T = targets(); const eaten = sum((S.journal[todayStr()] || []).map(entryN)).kcal;
  const last = sortedW()[0];
  const nutriLine = T ? (eaten ? `Il te reste <b>${r0(T.kcal - eaten)} kcal</b> aujourd’hui` : `Objectif du jour : <b>${r0(T.kcal)} kcal</b>`) : 'Calcule tes besoins pour commencer';
  const trainLine = TS.active ? `<b>Séance en cours</b> · <span data-elapsed>${clock(Date.now() - TS.active.start)}</span>`
    : last ? `Dernière séance : <b>${esc(last.name)}</b> · ${esc(relDay(wDate(last)))}` : 'Lance ta première séance';
  let el = $('#launch'); if (!el) { el = document.createElement('div'); el.id = 'launch'; document.body.appendChild(el); }
  el.innerHTML = `<div class="launch-in">
    <div><div class="muted" style="text-transform:capitalize">${esc(fmtDate(todayStr()))}</div><h1 style="margin:2px 0 0">${greeting()} 👋</h1></div>
    <button class="lcard" data-act="launchGo" data-v="nutri"><span class="lic">🥗</span><span class="grow"><b>Nutrition</b><span>${nutriLine}</span></span><span class="lgo">›</span></button>
    <button class="lcard" data-act="launchGo" data-v="train"><span class="lic">🏋️</span><span class="grow"><b>Entraînement</b><span>${trainLine}</span></span><span class="lgo">›</span></button>
    <p class="small muted" style="text-align:center;margin:0">Tu pourras passer de l’un à l’autre avec le bouton ⇄ en bas.</p></div>`;
}
function relDay(d) { const n = daysBetween(d, todayStr()); return n === 0 ? 'aujourd’hui' : n === 1 ? 'hier' : n < 7 ? `il y a ${n} jours` : fmtDate(d, { day: 'numeric', month: 'short' }); }
function setMode(m) {
  S.ui.lastNutriTab = S.ui.tab.startsWith('t_') ? S.ui.lastNutriTab : S.ui.tab;
  S.ui.tab = m === 'train' ? (TS.active ? 't_live' : (S.ui.lastTrainTab || 't_home')) : (S.ui.lastNutriTab || 'journal');
  save(); render(); window.scrollTo(0, 0);
}

// ---------- Onglets selon le mode ----------
const IC = {
  journal: '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h6"/>',
  menus: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8"/>',
  courses: '<path d="M3 4h2l2.4 11h11L21 7H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
  progres: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  profil: '<path d="M12 3v3M12 18v3M4.6 6.6l2.1 2.1M17.3 15.3l2.1 2.1M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/>',
  t_home: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
  t_hist: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  t_ex: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  t_stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  sw: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>'
};
const TABS = {
  nutri: [['journal', 'Journal'], ['menus', 'Menus'], ['courses', 'Courses'], ['progres', 'Progrès'], ['profil', 'Besoins'], ['__switch', 'Sport', 'sw']],
  train: [['t_home', 'Séance'], ['t_hist', 'Historique'], ['t_ex', 'Exercices'], ['t_stats', 'Progrès'], ['__switch', 'Nutrition', 'sw']]
};
function renderTabs() {
  const mode = S.ui.tab.startsWith('t_') ? 'train' : 'nutri';
  const cur = S.ui.tab === 't_live' ? 't_home' : S.ui.tab;
  $('#tabs').innerHTML = TABS[mode].map(([k, l, ic]) => `<button data-tab="${k}" class="${k === cur ? 'on' : ''} ${k === '__switch' ? 'swtab' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[ic || k]}</svg>${l}</button>`).join('');
  document.body.classList.toggle('mode-train', mode === 'train');
}
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tab === '__switch') { e.stopImmediatePropagation(); setMode(S.ui.tab.startsWith('t_') ? 'nutri' : 'train'); return; }
  if (b.dataset.tab === 't_home' && TS.active) { e.stopImmediatePropagation(); S.ui.tab = 't_live'; save(); render(); }
  if (b.dataset.tab.startsWith('t_')) S.ui.lastTrainTab = b.dataset.tab;
}, true);

// ============================================================
//  SÉANCE (accueil + séance en direct)
// ============================================================
function weekStart(d = todayStr()) { const t = new Date(d + 'T12:00:00'); return addDays(d, -((t.getDay() + 6) % 7)); }
function vTHome() {
  const ws = weekStart();
  const week = TS.workouts.filter(w => wDate(w) >= ws);
  let h = `<div class="row between" style="margin:4px 0 16px"><h1 style="margin:0">Entraînement</h1><button class="clockbtn" data-act="tTimer" aria-label="Lancer un minuteur">${CLOCK_SVG}</button></div>`;
  if (TS.active) h += `<button class="card livecard" data-act="tResume"><span>🏋️</span><span class="grow"><b>${esc(TS.active.name)}</b><br><span class="small">En cours · <span data-elapsed>${clock(Date.now() - TS.active.start)}</span></span></span><b>Reprendre ›</b></button>`;
  else h += `<button class="btn primary block" style="margin-bottom:14px" data-act="tStartEmpty">＋ Démarrer une séance vide</button>`;
  h += `<div class="grid2" style="margin-bottom:16px"><div class="stat"><div class="v">${week.length}</div><div class="l">séance${week.length > 1 ? 's' : ''} cette semaine</div></div>
    <div class="stat"><div class="v">${bigKg(week.reduce((a, w) => a + wVolume(w), 0))}</div><div class="l">soulevés cette semaine</div></div></div>`;
  h += `<div class="row between" style="margin:0 2px 10px"><h2 style="margin:0">Mes routines</h2><button class="btn sm" data-act="tRoutineNew">＋ Nouvelle</button></div>`;
  if (!TS.routines.length) h += `<div class="card empty"><div style="font-size:38px">📋</div><h2>Aucune routine</h2><p class="muted">Une routine = une liste d’exercices que tu refais souvent (ex. « Push », « Jambes »).</p>
    <button class="btn primary block" data-act="tRoutineNew">Créer ma routine</button><button class="btn ghost block" style="margin-top:6px" data-act="tStarter">Ajouter des programmes exemples</button></div>`;
  for (const r of TS.routines) {
    const lastDone = sortedW().find(w => w.routineId === r.id);
    h += `<section class="card routine"><div class="mealhead"><div><h2>${esc(r.name)}</h2><div class="small muted">${r.exercises.length} exercice${r.exercises.length > 1 ? 's' : ''}${lastDone ? ` · fait ${esc(relDay(wDate(lastDone)))}` : ''}</div></div>
      <button class="iconbtn" data-act="tRoutineMenu" data-id="${r.id}" aria-label="Options de la routine">⋯</button></div>
      <div class="small muted" style="margin:2px 0 12px">${r.exercises.map(e => esc(exById(e.exId).name)).join(' · ')}</div>
      <button class="btn primary block" data-act="tStartRoutine" data-id="${r.id}" ${TS.active ? 'disabled style="opacity:.5"' : ''}>Démarrer</button></section>`;
  }
  return h;
}

function newSets(n) { return Array.from({ length: n }, () => ({ type: 'n', w: '', r: '', t: '', km: '', done: false })); }
function startWorkout(name, exercises, routineId = null) {
  if (TS.active) { toast('Une séance est déjà en cours'); S.ui.tab = 't_live'; render(); return; }
  TS.active = { id: uid(), name, start: Date.now(), routineId, exercises };
  tsave(); S.ui.tab = 't_live'; save(); render(); window.scrollTo(0, 0);
}
function prevFor(exId, i) {
  const h = exHistory(exId)[0]; if (!h) return null;
  const work = h.sets; return work[i] || work[work.length - 1];
}
// Repos effectif d’un exercice : réglage de la séance > mémorisé pour l’exercice > défaut général
const restOf = ex => ex.rest ?? (TS.exRest || {})[ex.exId] ?? TS.settings.rest;
const restLabel = v => !v ? 'désactivé' : v < 60 ? `${v} s` : `${Math.floor(v / 60)} min${v % 60 ? ' ' + z2(v % 60) : ''}`;
// Répartition musculaire d’une séance : seuls les muscles principaux comptent
function muscleSplit(w) {
  const c = {};
  for (const e of w.exercises) {
    const n = e.sets.filter(s => s.done && s.type !== 'w').length; if (!n) continue;
    const m = typeof musclesOf === 'function' ? musclesOf(exById(e.exId)) : { p: [], s: [] };
    for (const r of m.p) c[r] = (c[r] || 0) + n;
  }
  return c;
}
function heatMapSVG(c) {
  const max = Math.max(1, ...Object.values(c));
  const paint = map => Object.entries(map).map(([k, d]) => `<g style="fill:var(--accent);fill-opacity:${c[k] ? (0.28 + 0.72 * c[k] / max).toFixed(2) : 0}">${d}</g><g class="mm-o" style="opacity:${c[k] ? 0 : 1}">${d}</g>`).join('');
  return `<svg viewBox="0 0 210 198" class="mmap" style="width:100%;max-width:300px;margin:0 auto;display:block" role="img" aria-label="Muscles travaillés"><g class="mm-body">${silhouette(50)}${silhouette(160)}</g>${paint(MAP_FRONT)}${paint(MAP_BACK)}
    <text x="50" y="197" text-anchor="middle" class="mm-lab">Face</text><text x="160" y="197" text-anchor="middle" class="mm-lab">Dos</text></svg>`;
}
function openMuscleSplit() {
  const c = muscleSplit(TS.active || { exercises: [] });
  const L = Object.entries(c).sort((a, b) => b[1] - a[1]); const max = Math.max(1, ...L.map(x => x[1]));
  openSheet('Répartition musculaire', `${heatMapSVG(c)}
    ${L.length ? `<div class="row between small muted" style="margin:16px 0 4px"><span>Muscle</span><span>Séries terminées</span></div>${L.map(([m, n]) => `<div class="mrowbar wide"><span>${esc(MUS_NAME[m] || m)}</span><div class="bar"><i style="width:${n / max * 100}%;background:var(--accent)"></i></div><b class="num">${fr(n)}</b></div>`).join('')}
      <p class="small muted">Seuls les muscles principaux de chaque exercice sont comptés.</p>` : '<p class="muted" style="text-align:center">Valide des séries pour voir les muscles travaillés.</p>'}`);
}

function vTLive() {
  const A_ = TS.active;
  if (!A_) { S.ui.tab = 't_home'; return vTHome(); }
  const vol = wVolume(A_), sets = wSets(A_);
  let h = `<div class="livehead">
    <div class="row between"><input class="livename" data-tname value="${esc(A_.name)}" aria-label="Nom de la séance"><div class="row" style="gap:8px"><button class="clockbtn" data-act="tTimer" aria-label="Lancer un minuteur">${CLOCK_SVG}</button><button class="btn sm primary" data-act="tFinish">Terminer</button></div></div>
    <div class="livestats"><div><span>Durée</span><b data-elapsed class="acc">${clock(Date.now() - A_.start)}</b></div><div><span>Volume</span><b>${bigKg(vol)}</b></div><div><span>Séries</span><b>${sets}</b></div>
      <button class="musbtn" data-act="tMuscles" aria-label="Répartition musculaire">${typeof heatMapSVG === 'function' ? heatMapSVG(muscleSplit(A_)) : ''}</button></div></div>`;
  if (!A_.exercises.length) h += `<div class="hint" style="margin-top:24px">Ajoute ton premier exercice pour commencer.</div>`;
  A_.exercises.forEach((ex, ei) => {
    const X = exById(ex.exId); const k = X.kind; const lift = k === 'wr' || k === 'bw';
    const cols = k === 'time' ? ['sec'] : k === 'cardio' ? ['km', 'min'] : [k === 'bw' ? '+kg' : 'kg', 'réps', 'rpe'];
    const rest = restOf(ex);
    h += `<section class="card exo"><div class="mealhead">${typeof muscleMapSVG === 'function' ? `<button class="exthumb" data-act="tExInfo" data-id="${ex.exId}" aria-label="Voir le mouvement">${muscleMapSVG(X, true)}<span>▶</span></button>` : ''}
      <div class="grow"><h2 data-act="tExInfo" data-id="${ex.exId}" style="cursor:pointer;color:var(--accent);margin:0">${esc(X.name)}</h2><div class="small muted">${esc(X.muscle)}</div></div>
      <button class="iconbtn" data-act="tExMenu" data-ei="${ei}" aria-label="Options de l’exercice">⋮</button></div>
      <div class="pills"><button class="pill" data-act="tRestPick" data-ei="${ei}">⏱ Repos : ${restLabel(rest)}</button><button class="pill" data-act="tNote" data-ei="${ei}">📝 ${ex.notes ? 'Note' : 'Ajouter une note'}</button></div>
      ${ex.notes ? `<div class="exnote" data-act="tNote" data-ei="${ei}">${esc(ex.notes)}</div>` : ''}
      <div class="srow shead c${cols.length}"><span>Série</span><span>Précédent</span>${cols.map(c => `<span>${c}</span>`).join('')}<span>✓</span></div>`;
    let n = 0;
    ex.sets.forEach((s, si) => {
      if (s.type !== 'w') n++;
      const p = prevFor(ex.exId, si);
      const lab = s.type === 'w' ? 'É' : s.type === 'd' ? 'D' : s.type === 'f' ? 'Ec' : n;
      const ph = f => p ? (f === 'w' ? (num(p.w) ? fr(num(p.w)) : '') : num(p[f]) ? String(num(p[f])) : '') : '';
      const inp = (f, mode) => `<input type="number" inputmode="${mode}" data-tset="${f}" data-ei="${ei}" data-si="${si}" value="${esc(s[f])}" placeholder="${ph(f) || '–'}">`;
      const fields = k === 'time' ? inp('t', 'numeric') : k === 'cardio' ? inp('km', 'decimal') + inp('t', 'numeric')
        : inp('w', 'decimal') + inp('r', 'numeric') + `<button class="rpebtn ${s.rpe ? 'on' : ''}" data-act="tRpe" data-ei="${ei}" data-si="${si}" aria-label="RPE">${s.rpe ? fr(s.rpe) : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/></svg>'}</button>`;
      h += `<div class="srow c${cols.length} ${s.done ? 'done' : ''} ${JUST === ei + '-' + si ? 'pop' : ''}"><button class="stype t-${s.type}" data-act="tSetType" data-ei="${ei}" data-si="${si}">${lab}</button>
        <span class="prev">${p ? esc(setText(p, k)) : '—'}</span>${fields}
        <button class="sdone" data-act="tSetDone" data-ei="${ei}" data-si="${si}" aria-label="Série faite">✓</button></div>`;
    });
    h += `<button class="btn sm block addset" data-act="tAddSet" data-ei="${ei}">＋ Ajouter une série</button></section>`;
  });
  h += `<button class="btn block" style="margin:4px 0 12px" data-act="tPick" data-target="live">＋ Ajouter un exercice</button>
    <button class="btn ghost block danger" data-act="tDiscard">Abandonner la séance</button>`;
  return h;
}
function discardWorkout() { TS.active = null; TS.rest = null; tsave(); closeSheet(); S.ui.tab = 't_home'; save(); render(); toast('Séance abandonnée'); }
function finishWorkout() {
  const A_ = TS.active; if (!A_) return;
  const ex = A_.exercises.map(e => ({ exId: e.exId, notes: e.notes || '', sets: e.sets.filter(s => s.done).map(({ done, ...s }) => ({ ...s, done: true })) })).filter(e => e.sets.length);
  if (!ex.length) { askConfirm('Aucune série validée', { msg: 'Abandonner la séance ?', ok: 'Abandonner', danger: true }).then(ok => { if (ok) discardWorkout(); }); return; }
  const w = { id: A_.id, name: A_.name.trim() || 'Séance', start: A_.start, end: Date.now(), routineId: A_.routineId, exercises: ex };
  // records : comparaison avec l’historique avant cette séance
  const det = typeof prDetails === 'function' ? prDetails(w) : [];
  w.prs = det.map(p => `${p.ex} : ${p.type.toLowerCase()} ${p.nw}`); w.prDetail = det;
  TS.workouts.push(w); TS.active = null; TS.rest = null; tsave();
  S.ui.tab = 't_home'; save(); render();
  openSheet(det.length ? 'Nouveaux records' : 'Bravo !', summaryHTML(w, det));
  if (det.length && navigator.vibrate) navigator.vibrate([60, 60, 120]);
}

// ---------- Minuteur de repos ----------
let ACTX = null;
function beep() {
  try {
    ACTX = ACTX || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach(t0 => { const o = ACTX.createOscillator(), g = ACTX.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ACTX.destination); g.gain.setValueAtTime(0.25, ACTX.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.001, ACTX.currentTime + t0 + 0.2); o.start(ACTX.currentTime + t0); o.stop(ACTX.currentTime + t0 + 0.2); });
  } catch (e) { }
}
function startRest(sec) {
  if (!TS.settings.restOn || !(sec > 0)) return;
  TS.rest = { end: Date.now() + sec * 1000, total: sec }; tsave(); tick();
  try { ACTX = ACTX || new (window.AudioContext || window.webkitAudioContext)(); ACTX.resume && ACTX.resume(); } catch (e) { }
}
function tick() {
  document.querySelectorAll('[data-elapsed]').forEach(el => { if (TS.active) el.textContent = clock(Date.now() - TS.active.start); });
  let bar = $('#restbar');
  if (TS.rest) {
    const left = TS.rest.end - Date.now();
    if (left <= 0) { TS.rest = null; tsave(); if (navigator.vibrate) navigator.vibrate([250, 120, 250]); beep(); toast('⏱️ Repos terminé : série suivante !'); }
    else {
      if (!bar) { bar = document.createElement('div'); bar.id = 'restbar'; document.body.appendChild(bar); }
      const pct = Math.min(100, (1 - left / (TS.rest.total * 1000)) * 100);
      if (!bar.firstChild) bar.innerHTML = `<div class="rb-track"><i></i></div><div class="rb-time"></div><div class="rb-btns"><button data-act="tRestAdd" data-n="-15">−15</button><button data-act="tRestAdd" data-n="15">+15</button><button class="rb-skip" data-act="tRestSkip">Passer</button></div>`;
      bar.querySelector('.rb-track i').style.width = pct + '%';
      bar.querySelector('.rb-time').textContent = clock(left).padStart(5, '0');
      return;
    }
  }
  if (bar) bar.remove();
}
setInterval(tick, 250);
function renderLiveBar() {
  let el = $('#livebar');
  if (TS.active && S.ui.tab !== 't_live' && !$('#launch')) {
    if (!el) { el = document.createElement('button'); el.id = 'livebar'; el.dataset.act = 'tResume'; document.body.appendChild(el); }
    el.innerHTML = `🏋️ <b>${esc(TS.active.name)}</b> · <span data-elapsed>${clock(Date.now() - TS.active.start)}</span><span style="margin-left:auto">Reprendre ›</span>`;
  } else if (el) el.remove();
}

// ---------- Choix d’exercices ----------
let PICK = null;
const CLOCK_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6M19 5l1.5 1.5"/></svg>';
let JUST = null; // série qui vient d’être validée (animation)
function openPicker(target) {
  PICK = { target, sel: [], q: '', m: '' };
  openSheet('Ajouter des exercices', '');
  renderPicker();
}
function renderPicker() {
  $('#sheetTitle').textContent = 'Ajouter des exercices';
  $('#sheetBody').innerHTML = `<input type="search" id="pq" placeholder="Rechercher un exercice" value="${esc(PICK.q)}" style="width:100%" autocomplete="off">
    <div class="chipsrow">${['', ...MUSCLES].map(m => `<span class="chip ${PICK.m === m ? 'on' : ''}" data-act="tPickM" data-m="${esc(m)}">${m || 'Tous'}</span>`).join('')}</div>
    <div id="plist"></div>
    <div class="pickfoot"><button class="btn pfcreate" data-act="tExNew">＋ Créer</button><button class="btn primary grow" data-act="tPickOk" ${PICK.sel.length ? '' : 'disabled style="opacity:.5"'}>Ajouter${PICK.sel.length ? ` (${PICK.sel.length})` : ''}</button></div>`;
  renderPickList();
  $('#pq').addEventListener('input', e => { PICK.q = e.target.value; renderPickList(); });
}
function renderPickList() {
  const q = norm(PICK.q.trim());
  const L = allEx().filter(x => (!PICK.m || x.muscle === PICK.m) && (!q || q.split(/\s+/).every(w => norm(x.name + ' ' + x.muscle + ' ' + x.equip).includes(w))));
  $('#plist').innerHTML = L.map(x => `<div class="item ${PICK.sel.includes(x.id) ? 'picked' : ''}" data-act="tPickToggle" data-id="${x.id}">${typeof muscleMapSVG === 'function' ? muscleMapSVG(x, true) : ''}<div class="grow"><div class="name">${esc(x.name)}</div><div class="meta">${esc(x.muscle)} · ${esc(x.equip)}</div></div><button class="pprev" data-act="tPickPreview" data-id="${x.id}" aria-label="Voir le mouvement">▶</button><span class="pcheck">${PICK.sel.includes(x.id) ? '✓' : ''}</span></div>`).join('') || '<p class="muted">Aucun exercice. Crée-le avec « ＋ Créer ».</p>';
}
function openExCreate() {
  openSheet('Nouvel exercice', `<label class="f">Nom<input type="text" id="nx_name" value="${esc(PICK ? PICK.q : '')}"></label>
    <div class="grid2"><label class="f">Muscle<select id="nx_m">${MUSCLES.map(m => `<option>${m}</option>`).join('')}</select></label>
    <label class="f">Matériel<select id="nx_e">${EQUIP.map(m => `<option>${m}</option>`).join('')}</select></label></div>
    <label class="f">Type de suivi<select id="nx_k">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    <button class="btn primary block" data-act="tExSave">Créer l’exercice</button>`);
}

// ---------- Routines ----------
let RT = null;
function openRoutineEditor(id) {
  const r = id && TS.routines.find(x => x.id === id);
  RT = r ? structuredClone(r) : { id: uid(), name: '', exercises: [] }; RT.isNew = !r;
  openSheet(r ? 'Modifier la routine' : 'Nouvelle routine', ''); renderRoutineEditor();
}
function renderRoutineEditor() {
  $('#sheetTitle').textContent = RT.isNew ? 'Nouvelle routine' : 'Modifier la routine';
  $('#sheetBody').innerHTML = `<label class="f">Nom<input type="text" data-rt="name" value="${esc(RT.name)}" placeholder="ex : Push, Jambes, Full body A"></label>
    ${RT.exercises.map((e, i) => `<div class="card rtex"><div class="row between"><b>${esc(exById(e.exId).name)}</b>
        <span class="row" style="gap:0"><button class="iconbtn" data-act="tRtMove" data-i="${i}" data-n="-1" aria-label="Monter">↑</button><button class="iconbtn" data-act="tRtMove" data-i="${i}" data-n="1" aria-label="Descendre">↓</button><button class="iconbtn" data-act="tRtDel" data-i="${i}" aria-label="Retirer">✕</button></span></div>
      <div class="row" style="gap:10px;margin-top:6px"><span class="stepper"><button data-act="tRtSets" data-i="${i}" data-n="-1">−</button><b>${e.sets}</b><button data-act="tRtSets" data-i="${i}" data-n="1">+</button></span><span class="muted small">séries</span>
        <input type="text" data-rtreps="${i}" value="${esc(e.reps || '')}" placeholder="reps (ex : 8-12)" style="width:120px"></div></div>`).join('')}
    <button class="btn block" style="margin:4px 0 12px" data-act="tPick" data-target="routine">＋ Ajouter des exercices</button>
    <div class="row">${RT.isNew ? '' : `<button class="btn danger" data-act="tRtRemove">Supprimer</button>`}<button class="btn primary grow" data-act="tRtSave">Enregistrer</button></div>`;
}
function starterRoutines() {
  const mk = (name, list) => ({ id: uid(), name, exercises: list.map(([exId, sets, reps]) => ({ exId, sets, reps })) });
  return [
    mk('Push (pecs, épaules, triceps)', [['dc', 4, '6-8'], ['dmh', 3, '8-10'], ['dih', 3, '8-12'], ['elev', 3, '12-15'], ['pushdown', 3, '10-12']]),
    mk('Pull (dos, biceps)', [['tractions', 4, '6-10'], ['rowing', 3, '8-10'], ['tirage', 3, '10-12'], ['facepull', 3, '12-15'], ['curlh', 3, '10-12']]),
    mk('Legs (jambes)', [['squat', 4, '5-8'], ['sdtjt', 3, '8-10'], ['presse', 3, '10-12'], ['legcurl', 3, '10-12'], ['mollets', 3, '12-15']]),
    mk('Full body', [['squat', 3, '6-8'], ['dc', 3, '6-8'], ['rowing', 3, '8-10'], ['dm', 2, '8-10'], ['gainage', 3, '45 s']])
  ];
}

// ============================================================
//  HISTORIQUE
// ============================================================
function vTHist() {
  const L = sortedW();
  let h = `<div class="row between" style="margin:4px 0 16px"><h1 style="margin:0">Historique</h1>
    <label class="btn sm">⤓ Importer Hevy<input type="file" id="hevyIn" accept=".csv,text/csv" hidden></label></div>`;
  if (!L.length) return h + `<div class="card empty"><div style="font-size:38px">🗓️</div><h2>Pas encore de séance</h2><p class="muted">Tes séances terminées apparaîtront ici. Tu peux aussi récupérer tout ton historique Hevy : dans Hevy, Profil → Réglages → Export &amp; Import Data → Export Workouts, puis « Importer Hevy » ici.</p></div>`;
  let month = '';
  for (const w of L) {
    const m = fmtDate(wDate(w), { month: 'long', year: 'numeric' });
    if (m !== month) { month = m; h += `<h3 class="monthhead">${esc(m)}</h3>`; }
    h += `<section class="card whist" data-act="tWOpen" data-id="${w.id}"><div class="row between"><h2 style="margin:0">${esc(w.name)}</h2><span class="small muted">${esc(fmtDate(wDate(w), { weekday: 'short', day: 'numeric' }))}</span></div>
      <div class="small muted" style="margin:2px 0 8px">${w.end ? dur(w.end - w.start) + ' · ' : ''}${bigKg(wVolume(w))} · ${wSets(w)} séries${w.prs && w.prs.length ? ` · 🏆 ${w.prs.length}` : ''}</div>
      ${w.exercises.slice(0, 4).map(e => `<div class="small">${doneSets(e).length} × ${esc(exById(e.exId).name)}</div>`).join('')}${w.exercises.length > 4 ? `<div class="small muted">+ ${w.exercises.length - 4} autres</div>` : ''}</section>`;
  }
  return h;
}
function openWorkout(id) {
  const w = TS.workouts.find(x => x.id === id); if (!w) return;
  openSheet(w.name, `<div class="small muted" style="margin-bottom:10px;text-transform:capitalize">${esc(fmtDate(wDate(w), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}${w.end ? ' · ' + dur(w.end - w.start) : ''} · ${bigKg(wVolume(w))}</div>
    ${w.prDetail && w.prDetail.length ? w.prDetail.map(p => `<div class="prcard"><div class="prmed">🏅</div><div class="grow"><div class="prex">${esc(p.ex)}</div><div class="small muted">${esc(p.type)}</div></div><div class="prval"><b>${esc(p.nw)}</b><span>avant : ${esc(p.old)}</span></div></div>`).join('')
      : w.prs && w.prs.length ? `<div class="solbox"><b>🏆 Records</b><ul>${w.prs.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
    ${w.exercises.map((e, ei) => { const X = exById(e.exId); let n = 0; return `<div class="card" style="background:var(--surface)"><b data-act="tExInfo" data-id="${e.exId}" style="color:var(--accent);cursor:pointer">${esc(X.name)}</b>
      ${e.sets.map((s, si) => { if (s.type !== 'w') n++; const pr = (w.prSets || []).includes(ei + '-' + si); return `<div class="row between small hset ${pr ? 'isPr' : ''}"><span class="muted">${s.type === 'w' ? 'Échauffement' : s.type === 'd' ? 'Drop set' : s.type === 'f' ? 'Échec' : 'Série ' + n}</span><span>${pr ? '🏆 ' : ''}${esc(setText(s, X.kind))}${s.rpe ? ` <span class="muted">@${fr(s.rpe)}</span>` : ''}</span></div>`; }).join('')}</div>`; }).join('')}
    <div class="row"><button class="btn danger" data-act="tWDel" data-id="${w.id}">Supprimer</button><button class="btn primary grow" data-act="tWRedo" data-id="${w.id}">Refaire cette séance</button></div>`);
}

// ============================================================
//  EXERCICES + fiche détaillée
// ============================================================
function vTEx() {
  const q = norm((S.ui.exQ || '').trim()); const m = S.ui.exM || '';
  const L = allEx().filter(x => (!m || x.muscle === m) && (!q || q.split(/\s+/).every(w => norm(x.name + ' ' + x.muscle).includes(w))));
  const counts = {}; for (const w of TS.workouts) for (const e of w.exercises) counts[e.exId] = (counts[e.exId] || 0) + 1;
  let h = `<div class="row between" style="margin:4px 0 14px"><h1 style="margin:0">Exercices</h1><button class="btn sm" data-act="tExNew">＋ Créer</button></div>
    <input type="search" id="exq" placeholder="Rechercher" value="${esc(S.ui.exQ || '')}" style="width:100%" autocomplete="off">
    <div class="chipsrow">${['', ...MUSCLES].map(x => `<span class="chip ${m === x ? 'on' : ''}" data-act="tExM" data-m="${esc(x)}">${x || 'Tous'}</span>`).join('')}</div>
    <div class="card" id="exlist" style="padding-top:6px;padding-bottom:6px">${exListHTML(L, counts)}</div>`;
  return h;
}
function exListHTML(L, counts) {
  return L.map(x => { const b = counts[x.id] ? exBest(x.id) : null; return `<div class="item" data-act="tExInfo" data-id="${x.id}">${typeof muscleMapSVG === 'function' ? muscleMapSVG(x, true) : ''}<div class="grow"><div class="name">${esc(x.name)}</div><div class="meta">${esc(x.muscle)} · ${esc(x.equip)}${counts[x.id] ? ` · ${counts[x.id]} séance${counts[x.id] > 1 ? 's' : ''}` : ''}</div></div>
    ${b && b.e1 ? `<span class="small num" style="text-align:right">${kg(b.e1)}<br><span class="muted">1RM est.</span></span>` : ''}</div>`; }).join('') || '<p class="muted">Aucun exercice.</p>';
}
function lineChart(pts, unit) {
  if (pts.length < 2) return '';
  const W = 320, H = 120, P = 8;
  const xs = pts.map(p => new Date(p.d + 'T12:00:00').getTime()); const ys = pts.map(p => p.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1, y0 = Math.min(...ys) * 0.97, y1 = Math.max(...ys) * 1.02 || 1;
  const X = x => P + (x - x0) / Math.max(1, x1 - x0) * (W - 2 * P), Y = y => H - P - (y - y0) / Math.max(0.001, y1 - y0) * (H - 2 * P);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Progression">
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3" fill="var(--accent)"><title>${fmtDate(p.d, { day: 'numeric', month: 'short' })} : ${fr(r1(p.v))} ${unit}</title></circle>`).join('')}</svg>
    <div class="row between small muted"><span>${fmtDate(pts[0].d, { day: 'numeric', month: 'short', year: '2-digit' })} · ${fr(r1(pts[0].v))}</span><span>${fmtDate(pts[pts.length - 1].d, { day: 'numeric', month: 'short', year: '2-digit' })} · <b style="color:var(--text)">${fr(r1(pts[pts.length - 1].v))} ${unit}</b></span></div>`;
}
function openExInfo(id) { openExInfo0(id); if (typeof kickAnim === 'function') kickAnim(); }
function openExInfo0(id) {
  const X = exById(id); const H_ = exHistory(id); const b = exBest(id);
  const k = X.kind;
  const metric = s => k === 'wr' || (k === 'bw' && num(s.w)) ? e1rm(num(s.w), num(s.r)) : k === 'bw' ? num(s.r) : k === 'time' ? num(s.t) : num(s.km);
  const unit = k === 'wr' || k === 'bw' && H_.some(h => h.sets.some(s => num(s.w))) ? 'kg' : k === 'bw' ? 'reps' : k === 'time' ? 's' : 'km';
  const pts = H_.slice(0, 40).reverse().map(h => ({ d: wDate(h.w), v: Math.max(...h.sets.filter(s => s.type !== 'w').map(metric), 0) })).filter(p => p.v > 0);
  const stats = k === 'wr' || k === 'bw' ? [[b.e1 ? kg(b.e1) : '—', '1RM estimé'], [b.w ? kg(b.w) : '—', 'charge max'], [b.r || '—', 'reps max'], [b.vol ? bigKg(b.vol) : '—', 'meilleure série (volume)']]
    : k === 'time' ? [[b.t ? b.t + ' s' : '—', 'meilleure durée'], [H_.length, 'séances']] : [[b.km ? fr(b.km) + ' km' : '—', 'plus longue distance'], [H_.length, 'séances']];
  openSheet(X.name, `${typeof exVisualHTML === 'function' ? exVisualHTML(X) : ''}<div class="small muted" style="margin-bottom:10px">${esc(X.muscle)} · ${esc(X.equip)} · ${H_.length} séance${H_.length > 1 ? 's' : ''}</div>
    <div class="grid2" style="margin-bottom:12px">${stats.map(([v, l]) => `<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
    ${pts.length >= 2 ? `<div class="card" style="background:var(--surface)"><b>Progression</b> <span class="small muted">(${k === 'wr' || unit === 'kg' ? '1RM estimé par séance' : 'meilleure série'})</span>${lineChart(pts, unit)}</div>` : '<p class="muted small">La courbe de progression apparaîtra après 2 séances.</p>'}
    ${H_.length ? `<h3 style="margin:14px 0 6px">Historique</h3>${H_.slice(0, 15).map(h => `<div class="item" style="cursor:default"><div class="grow"><div class="name small" style="font-weight:600">${esc(fmtDate(wDate(h.w), { day: 'numeric', month: 'short', year: 'numeric' }))}</div>
      <div class="meta">${h.sets.filter(s => s.type !== 'w').map(s => esc(setText(s, k))).join(' · ')}</div></div></div>`).join('')}` : ''}
    ${TS.exercises[id] ? `<button class="btn ghost danger block" style="margin-top:10px" data-act="tExDel" data-id="${id}">Supprimer cet exercice perso</button>` : ''}`);
}

// ============================================================
//  PROGRÈS (statistiques d’entraînement)
// ============================================================
function vTStats() {
  let h = `<div class="row between" style="margin:4px 0 16px"><h1 style="margin:0">Progrès</h1></div>`;
  const L = TS.workouts;
  // 12 dernières semaines
  const weeks = []; let ws = weekStart();
  for (let i = 11; i >= 0; i--) { const s = addDays(ws, -7 * i), e = addDays(s, 6); const list = L.filter(w => { const d = wDate(w); return d >= s && d <= e; }); weeks.push({ s, n: list.length, vol: list.reduce((a, w) => a + wVolume(w), 0), dur: list.reduce((a, w) => a + (w.end ? (w.end - w.start) / 3600000 : 0), 0), reps: list.reduce((a, w) => a + w.exercises.reduce((b, e) => b + doneSets(e).filter(x => x.type !== 'w').reduce((c2, x) => c2 + num(x.r), 0), 0), 0) }); }
  let streak = 0; for (let i = weeks.length - 1; i >= 0; i--) { if (weeks[i].n) streak++; else if (i === weeks.length - 1) continue; else break; }
  const tot = L.reduce((a, w) => a + wVolume(w), 0), time = L.reduce((a, w) => a + (w.end ? w.end - w.start : 0), 0);
  h += `<div class="grid2" style="margin-bottom:14px">
    <div class="stat"><div class="v">${L.length}</div><div class="l">séances au total</div></div>
    <div class="stat"><div class="v">🔥 ${streak}</div><div class="l">semaine${streak > 1 ? 's' : ''} d’affilée</div></div>
    <div class="stat"><div class="v">${Math.round(tot / 1000).toLocaleString('fr-FR')} t</div><div class="l">soulevées au total</div></div>
    <div class="stat"><div class="v">${Math.round(time / 3600000)} h</div><div class="l">d’entraînement</div></div></div>`;
  const maxN = Math.max(1, ...weeks.map(w => w.n)), maxV = Math.max(1, ...weeks.map(w => w.vol));
  const bars = (key, max, col) => `<div class="wbars">${weeks.map(w => `<div title="${fmtDate(w.s, { day: 'numeric', month: 'short' })}"><i style="height:${w[key] / max * 100}%;background:${col}"></i><span>${new Date(w.s + 'T12:00:00').getDate()}</span></div>`).join('')}</div>`;
  const met = S.ui.tMetric || 'dur';
  const MET = { dur: ['Durée', v => v >= 1 ? `${fr(r1(v))} h` : `${r0(v * 60)} min`], vol: ['Volume', v => bigKg(v)], reps: ['Réps', v => `${r0(v)} réps`] };
  const cur = weeks[11][met], maxM = Math.max(0.001, ...weeks.map(w => w[met]));
  h += `<div class="card"><div class="row between" style="align-items:baseline"><h2 style="margin:0"><b>${MET[met][1](cur)}</b> <span class="muted" style="font-weight:500">cette semaine</span></h2><span class="small muted">12 semaines</span></div>
    <div class="wchart">${weeks.map(w => `<div title="${fmtDate(w.s, { day: 'numeric', month: 'short' })} : ${MET[met][1](w[met])}"><i style="height:${w[met] / maxM * 100}%"></i><span>${new Date(w.s + 'T12:00:00').getDate()}</span></div>`).join('')}</div>
    <div class="row" style="gap:8px;margin-top:12px">${Object.entries(MET).map(([k, [l]]) => `<button class="chip ${met === k ? 'on' : ''}" data-act="tMetric" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div class="card"><h2>Séances par semaine</h2>${bars('n', maxN, 'var(--accent)')}</div>`;
  // séries par muscle sur 30 jours
  const since = addDays(todayStr(), -29); const mus = {};
  for (const w of L) if (wDate(w) >= since) for (const e of w.exercises) { const m = exById(e.exId).muscle; mus[m] = (mus[m] || 0) + doneSets(e).filter(s => s.type !== 'w').length; }
  const ml = Object.entries(mus).sort((a, b) => b[1] - a[1]); const mm = Math.max(1, ...ml.map(x => x[1]));
  h += `<div class="card"><h2>Séries par muscle <span class="small muted" style="font-weight:400">· 30 jours</span></h2>
    ${ml.length ? ml.map(([m, n]) => `<div class="mrowbar"><span>${esc(m)}</span><div class="bar"><i style="width:${n / mm * 100}%;background:var(--accent)"></i></div><b class="num">${n}</b></div>`).join('') : '<p class="muted">Pas de séance ces 30 derniers jours.</p>'}
    <p class="small muted" style="margin:8px 0 0">Repère : 10 à 20 séries par muscle et par semaine pour progresser (soit 40 à 80 sur 30 jours).</p></div>`;
  // réglages
  h += `<div class="card"><h2>Réglages</h2>
    <label class="check" style="border:0;padding-top:0"><input type="checkbox" id="t_restOn" ${TS.settings.restOn ? 'checked' : ''}><div class="grow">Minuteur de repos automatique</div></label>
    <label class="f">Temps de repos par défaut<select id="t_rest">${[30, 45, 60, 90, 120, 150, 180, 240].map(v => `<option value="${v}" ${TS.settings.rest === v ? 'selected' : ''}>${clock(v * 1000)}</option>`).join('')}</select></label>
    <label class="btn block">⤓ Importer mon historique Hevy (CSV)<input type="file" id="hevyIn" accept=".csv,text/csv" hidden></label>
    <p class="small muted" style="margin:8px 0 0">Les séances font partie de la sauvegarde exportée dans Nutrition → Besoins → Réglages.</p></div>`;
  return h;
}

// ============================================================
//  IMPORT HEVY (CSV « Export Workouts »)
// ============================================================
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
const MONTHS = { jan: 0, janv: 0, feb: 1, fev: 1, fevr: 1, mar: 2, mars: 2, apr: 3, avr: 3, may: 4, mai: 4, jun: 5, juin: 5, jul: 6, juil: 6, aug: 7, aou: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
function parseHevyDate(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);
  if (m) { const mo = MONTHS[norm(m[2]).replace('.', '').slice(0, 4)] ?? MONTHS[norm(m[2]).slice(0, 3)]; if (mo != null) return new Date(+m[3], mo, +m[1], +m[4], +m[5]).getTime(); }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime();
  const t = Date.parse(s); return isFinite(t) ? t : null;
}
// Noms Hevy (anglais) → exercices de la bibliothèque
const HEVY_ALIAS = {
  'bench press (barbell)': 'dc', 'bench press (dumbbell)': 'dch', 'bench press (smith machine)': 'dcm', 'chest press (machine)': 'dcm',
  'incline bench press (barbell)': 'dib', 'incline bench press (dumbbell)': 'dih', 'decline bench press (barbell)': 'dd',
  'chest fly (dumbbell)': 'ecarte', 'cable fly crossovers': 'ecartep', 'butterfly (pec deck)': 'pecdeck', 'push up': 'pompes', 'chest dip': 'dips', 'triceps dip': 'dips',
  'deadlift (barbell)': 'sdt', 'pull up': 'tractions', 'chin up': 'chinup', 'lat pulldown (cable)': 'tirage', 'bent over row (barbell)': 'rowing',
  'dumbbell row': 'rowh', 'seated cable row - v grip (cable)': 'rowpoulie', 'seated row (machine)': 'rowpoulie', 't bar row': 'tbar', 'shrug (dumbbell)': 'shrug', 'back extension (hyperextension)': 'hyper',
  'overhead press (barbell)': 'dm', 'shoulder press (dumbbell)': 'dmh', 'seated overhead press (dumbbell)': 'dmh', 'shoulder press (machine plates)': 'dmm', 'shoulder press (machine)': 'dmm', 'arnold press (dumbbell)': 'arnold',
  'lateral raise (dumbbell)': 'elev', 'lateral raise (cable)': 'elevp', 'front raise (dumbbell)': 'front', 'rear delt reverse fly (dumbbell)': 'oiseau', 'face pull': 'facepull',
  'bicep curl (barbell)': 'curlb', 'bicep curl (dumbbell)': 'curlh', 'hammer curl (dumbbell)': 'marteau', 'bicep curl (cable)': 'curlp', 'preacher curl (machine)': 'pupitre', 'preacher curl (barbell)': 'pupitre', 'seated incline curl (dumbbell)': 'curlinc',
  'triceps pushdown': 'pushdown', 'triceps rope pushdown': 'pushdown', 'skullcrusher (barbell)': 'barfront', 'overhead triceps extension (dumbbell)': 'extoh', 'triceps extension (dumbbell)': 'extoh', 'bench press - close grip (barbell)': 'dcs', 'triceps kickback (dumbbell)': 'kickback',
  'squat (barbell)': 'squat', 'front squat': 'frontsq', 'leg press (machine)': 'presse', 'leg press': 'presse', 'hack squat (machine)': 'hack', 'leg extension (machine)': 'legext',
  'lunge (dumbbell)': 'fentes', 'bulgarian split squat': 'bulgare', 'goblet squat': 'gobelet', 'romanian deadlift (barbell)': 'sdtjt', 'romanian deadlift (dumbbell)': 'sdtjt',
  'lying leg curl (machine)': 'legcurl', 'seated leg curl (machine)': 'legcurla', 'good morning (barbell)': 'goodmorning', 'hip thrust (barbell)': 'hipthrust', 'hip abduction (machine)': 'abduc',
  'standing calf raise (machine)': 'mollets', 'standing calf raise': 'mollets', 'seated calf raise': 'molletsa', 'crunch': 'crunch', 'cable crunch': 'crunchp', 'hanging leg raise': 'releve', 'ab wheel': 'abwheel', 'russian twist (weighted)': 'russian', 'plank': 'gainage',
  'kettlebell swing': 'kbswing', 'burpee': 'burpees', 'farmers walk': 'farmer', 'running': 'course', 'treadmill': 'course', 'cycling': 'velo', 'rowing machine': 'rameur', 'elliptical trainer': 'elliptique', 'walking': 'marche', 'jump rope': 'corde'
};
function findExByName(name) {
  const n = norm(name).trim();
  if (HEVY_ALIAS[n]) return HEVY_ALIAS[n];
  const hit = allEx().find(x => norm(x.name) === n); if (hit) return hit.id;
  const id = 'h_' + n.replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  if (!TS.exercises[id]) TS.exercises[id] = { id, name: name.trim(), muscle: 'Autre', equip: 'Autre', kind: 'wr', src: 'hevy' };
  return id;
}
function importHevy(text) {
  const rows = parseCSV(text); if (rows.length < 2) throw new Error('Fichier vide');
  const H_ = rows[0].map(h => norm(h).trim().replace(/\s+/g, '_'));
  const col = (...names) => { for (const n of names) { const i = H_.indexOf(n); if (i >= 0) return i; } return -1; };
  const c = { title: col('title'), start: col('start_time'), end: col('end_time'), ex: col('exercise_title'), notes: col('exercise_notes'), type: col('set_type'), kg: col('weight_kg'), lbs: col('weight_lbs'), reps: col('reps'), km: col('distance_km'), mi: col('distance_miles'), sec: col('duration_seconds'), rpe: col('rpe') };
  if (c.start < 0 || c.ex < 0) throw new Error('Colonnes Hevy introuvables');
  const known = new Set(TS.workouts.map(w => w.start + '|' + w.name));
  const byW = new Map(); let bad = 0;
  for (const r of rows.slice(1)) {
    const start = parseHevyDate(r[c.start]); if (!start) { bad++; continue; }
    const name = (r[c.title] || 'Séance').trim();
    const key = start + '|' + name; if (known.has(key)) continue;
    if (!byW.has(key)) byW.set(key, { id: uid(), name, start, end: parseHevyDate(r[c.end]) || null, routineId: null, src: 'hevy', exercises: [] });
    const w = byW.get(key);
    const exName = (r[c.ex] || '').trim(); if (!exName) continue;
    const exId = findExByName(exName);
    let e = w.exercises[w.exercises.length - 1];
    if (!e || e.exId !== exId) { e = { exId, notes: c.notes >= 0 ? (r[c.notes] || '').trim() : '', sets: [] }; w.exercises.push(e); }
    const t = norm(r[c.type] || 'normal');
    const wkg = c.kg >= 0 && r[c.kg] !== '' ? num(r[c.kg]) : c.lbs >= 0 && r[c.lbs] !== '' ? num(r[c.lbs]) * 0.45359 : 0;
    const km = c.km >= 0 ? num(r[c.km]) : c.mi >= 0 ? num(r[c.mi]) * 1.609 : 0;
    const sec = c.sec >= 0 ? num(r[c.sec]) : 0;
    const X = exById(exId);
    if (TS.exercises[exId] && TS.exercises[exId].src === 'hevy' && !num(r[c.reps])) TS.exercises[exId].kind = km ? 'cardio' : sec ? 'time' : TS.exercises[exId].kind;
    e.sets.push({ type: t.startsWith('warm') ? 'w' : t.startsWith('drop') ? 'd' : t.startsWith('fail') ? 'f' : 'n', w: Math.round(wkg * 100) / 100 || '', r: num(r[c.reps]) || '', t: X.kind === 'cardio' ? Math.round(sec / 60) || '' : sec || '', km: km ? Math.round(km * 100) / 100 : '', rpe: c.rpe >= 0 && num(r[c.rpe]) ? num(r[c.rpe]) : '', done: true });
  }
  const list = [...byW.values()].filter(w => w.exercises.length);
  TS.workouts.push(...list); tsave();
  return { n: list.length, bad, newEx: Object.values(TS.exercises).filter(x => x.src === 'hevy').length };
}

// ============================================================
//  LIEN AVEC LA NUTRITION
// ============================================================
function trainBadge(d) {
  const L = TS.workouts.filter(w => wDate(w) === d);
  if (!L.length) return '';
  return `<div class="hint" style="margin-top:-4px">🏋️ Jour d’entraînement : ${L.map(w => `<b>${esc(w.name)}</b>${w.end ? ' · ' + dur(w.end - w.start) : ''}`).join(', ')}</div>`;
}

// ============================================================
//  ACTIONS
// ============================================================
const curEx = el => TS.active.exercises[+el.dataset.ei];
Object.assign(ACTIONS, {
  tMuscles: () => openMuscleSplit(),
  tMetric: el => { S.ui.tMetric = el.dataset.v; save(); render(); },
  tRestPick: el => {
    const ei = +el.dataset.ei; const ex = TS.active.exercises[ei]; const cur = restOf(ex); const X = exById(ex.exId);
    const opts = [0, 15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];
    openSheet('Minuteur de repos', `<p class="muted" style="margin:0 0 12px">${esc(X.name)} · le temps choisi sera repris automatiquement les prochaines fois.</p>
      <div class="restgrid">${opts.map(v => `<button class="chip ${cur === v ? 'on' : ''}" data-act="tRestSet" data-ei="${ei}" data-v="${v}">${v ? restLabel(v) : 'Désactivé'}</button>`).join('')}</div>
      <label class="check" style="border:0;margin-top:12px"><input type="checkbox" id="t_restAll"><div class="grow">Utiliser aussi comme repos par défaut pour tous les exercices</div></label>`);
  },
  tRestSet: el => {
    const ex = TS.active.exercises[+el.dataset.ei]; const v = +el.dataset.v;
    ex.rest = v; TS.exRest = TS.exRest || {}; TS.exRest[ex.exId] = v;
    const all = $('#t_restAll') && $('#t_restAll').checked; if (all) TS.settings.rest = v;
    if (TS.rest && v === 0) TS.rest = null;
    tsave(); closeSheet(); render(); toast(all ? `Repos par défaut : ${restLabel(v)}` : `Repos ${restLabel(v)} mémorisé pour cet exercice`);
  },
  tNote: el => {
    const ei = +el.dataset.ei; const ex = TS.active.exercises[ei];
    openSheet('Note', `<textarea id="t_note" rows="4" style="width:100%" placeholder="ex : siège en position 4, prise large…">${esc(ex.notes || '')}</textarea>
      <button class="btn primary block" style="margin-top:12px" data-act="tNoteSave" data-ei="${ei}">Enregistrer</button>`);
    setTimeout(() => { const t = $('#t_note'); if (t) t.focus(); }, 80);
  },
  tNoteSave: el => { TS.active.exercises[+el.dataset.ei].notes = $('#t_note').value.trim(); tsave(); closeSheet(); render(); },
  tRpe: el => {
    const ei = +el.dataset.ei, si = +el.dataset.si; const s = TS.active.exercises[ei].sets[si];
    const lab = { 6: 'Facile, 4+ réps en réserve', 7: '3 réps en réserve', 8: '2 réps en réserve', 9: '1 rép en réserve', 10: 'Échec, plus rien en réserve' };
    openSheet('Effort ressenti (RPE)', `<p class="muted" style="margin:0 0 12px">À quel point la série était dure ?</p>
      ${[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => `<button class="menuopt ${s.rpe === v ? 'sel' : ''}" data-act="tRpeSet" data-ei="${ei}" data-si="${si}" data-v="${v}"><span><b>${fr(v)}</b></span>${lab[v] || ''}</button>`).join('')}
      <button class="btn ghost block" data-act="tRpeSet" data-ei="${ei}" data-si="${si}" data-v="">Effacer</button>`);
  },
  tRpeSet: el => { TS.active.exercises[+el.dataset.ei].sets[+el.dataset.si].rpe = el.dataset.v ? +el.dataset.v : ''; tsave(); closeSheet(); render(); },
  launchGo: el => { const m = el.dataset.v; $('#launch')?.remove(); try { sessionStorage.setItem('macro.launched', '1'); } catch (e) { } setMode(m); if (m === 'nutri' && !S.ui.onboarded && !targets() && typeof startGuide === 'function') startGuide(); },
  tStartEmpty: () => startWorkout(`Séance du ${fmtDate(todayStr(), { day: 'numeric', month: 'short' })}`, []),
  tStartRoutine: el => {
    const r = TS.routines.find(x => x.id === el.dataset.id); if (!r) return;
    startWorkout(r.name, r.exercises.map(e => ({ exId: e.exId, notes: e.reps ? `Objectif : ${e.reps}` : '', sets: newSets(e.sets || 3) })), r.id);
  },
  tResume: () => { S.ui.tab = 't_live'; save(); render(); },
  tFinish: () => finishWorkout(),
  tDiscard: async () => { if (await askConfirm('Abandonner cette séance ?', { msg: 'Rien ne sera enregistré.', ok: 'Abandonner', danger: true })) discardWorkout(); },
  tAddSet: el => { const ex = curEx(el); const last = ex.sets[ex.sets.length - 1]; ex.sets.push({ type: 'n', w: last ? last.w : '', r: last ? last.r : '', t: last ? last.t : '', km: '', done: false }); tsave(); render(); },
  tSetDone: el => {
    const ex = curEx(el); const s = ex.sets[+el.dataset.si]; const X = exById(ex.exId);
    if (!s.done) {
      const p = prevFor(ex.exId, +el.dataset.si);
      for (const f of ['w', 'r', 't', 'km']) if ((s[f] === '' || s[f] == null) && p && num(p[f])) s[f] = num(p[f]);
      const ok = X.kind === 'time' ? num(s.t) > 0 : X.kind === 'cardio' ? num(s.km) > 0 || num(s.t) > 0 : num(s.r) > 0;
      if (!ok) { toast(X.kind === 'time' ? 'Indique la durée' : X.kind === 'cardio' ? 'Indique la distance ou la durée' : 'Indique le nombre de répétitions'); return; }
      s.done = true; JUST = el.dataset.ei + '-' + el.dataset.si; if (navigator.vibrate) navigator.vibrate(30);
      startRest(restOf(ex));
    } else s.done = false;
    tsave(); render();
  },
  tSetType: el => {
    const ei = +el.dataset.ei, si = +el.dataset.si;
    openSheet('Type de série', [['n', '1', 'Série normale'], ['w', 'É', 'Échauffement (non compté dans le volume)'], ['d', 'D', 'Drop set'], ['f', 'Ec', 'Jusqu’à l’échec']].map(([t, ic, l]) => `<button class="menuopt" data-act="tSetTypeGo" data-ei="${ei}" data-si="${si}" data-t="${t}"><span>${ic}</span>${l}</button>`).join('')
      + `<button class="menuopt" data-act="tSetDel" data-ei="${ei}" data-si="${si}" style="color:var(--warn)"><span>✕</span>Supprimer cette série</button>`);
  },
  tSetTypeGo: el => { curEx(el).sets[+el.dataset.si].type = el.dataset.t; tsave(); closeSheet(); render(); },
  tSetDel: el => { curEx(el).sets.splice(+el.dataset.si, 1); tsave(); closeSheet(); render(); },
  tExMenu: el => {
    const ei = +el.dataset.ei; const ex = TS.active.exercises[ei];
    openSheet(exById(ex.exId).name, `<button class="menuopt" data-act="tExInfo" data-id="${ex.exId}"><span>▶</span>Voir le mouvement et l’historique</button>
      <button class="menuopt" data-act="tExMove" data-ei="${ei}" data-n="-1"><span>↑</span>Monter</button>
      <button class="menuopt" data-act="tExMove" data-ei="${ei}" data-n="1"><span>↓</span>Descendre</button>
      <button class="menuopt" data-act="tExRemove" data-ei="${ei}" style="color:var(--warn)"><span>✕</span>Retirer l’exercice</button>`);
  },
  tExMove: el => { const a = TS.active.exercises, i = +el.dataset.ei, j = i + +el.dataset.n; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; tsave(); closeSheet(); render(); },
  tExRemove: async el => { if (!(await askConfirm('Retirer cet exercice de la séance ?', { ok: 'Retirer', danger: true }))) return; TS.active.exercises.splice(+el.dataset.ei, 1); tsave(); closeSheet(); render(); },
  tRestAdd: el => { if (TS.rest) { TS.rest.end += +el.dataset.n * 1000; TS.rest.total = Math.max(TS.rest.total, (TS.rest.end - Date.now()) / 1000); tsave(); tick(); } },
  tRestSkip: () => { TS.rest = null; tsave(); tick(); },
  // choix d’exercices
  tPick: el => openPicker(el.dataset.target),
  tPickM: el => { PICK.m = el.dataset.m; renderPicker(); },
  tPickToggle: el => { const id = el.dataset.id; PICK.sel = PICK.sel.includes(id) ? PICK.sel.filter(x => x !== id) : [...PICK.sel, id]; const b = $('[data-act=tPickOk]'); if (b) { b.disabled = !PICK.sel.length; b.style.opacity = PICK.sel.length ? 1 : .5; b.textContent = 'Ajouter' + (PICK.sel.length ? ` (${PICK.sel.length})` : ''); } el.classList.toggle('picked'); el.querySelector('.pcheck').textContent = PICK.sel.includes(id) ? '✓' : ''; },
  tPickOk: () => {
    if (PICK.target === 'routine') { for (const id of PICK.sel) RT.exercises.push({ exId: id, sets: 3, reps: '' }); renderRoutineEditor(); PICK = null; return; }
    for (const id of PICK.sel) { const h = exHistory(id)[0]; TS.active.exercises.push({ exId: id, notes: '', sets: newSets(h ? Math.min(6, h.sets.filter(s => s.type !== 'w').length) || 3 : 3) }); }
    PICK = null; tsave(); closeSheet(); render();
  },
  tExNew: () => { if (!PICK) PICK = { target: null, sel: [], q: '', m: '' }; openExCreate(); },
  tExSave: () => {
    const name = $('#nx_name').value.trim(); if (!name) { toast('Donne un nom'); return; }
    const id = 'x_' + uid(); TS.exercises[id] = { id, name, muscle: $('#nx_m').value, equip: $('#nx_e').value, kind: $('#nx_k').value }; tsave();
    if (PICK && PICK.target) { PICK.sel.push(id); PICK.q = ''; openSheet('Ajouter des exercices', ''); renderPicker(); }
    else { PICK = null; closeSheet(); render(); toast('Exercice créé'); }
  },
  tExInfo: el => openExInfo(el.dataset.id),
  tExDel: async el => {
    const id = el.dataset.id; const used = TS.workouts.some(w => w.exercises.some(e => e.exId === id));
    if (!(await askConfirm('Supprimer cet exercice ?', { msg: used ? 'Il apparaît dans ton historique.' : '', ok: 'Supprimer', danger: true }))) return;
    delete TS.exercises[id]; tsave(); closeSheet(); render();
  },
  tExM: el => { S.ui.exM = el.dataset.m; save(); render(); },
  // routines
  tRoutineNew: () => openRoutineEditor(null),
  tRoutineMenu: el => {
    const id = el.dataset.id;
    openSheet(TS.routines.find(r => r.id === id).name, `<button class="menuopt" data-act="tRtEdit" data-id="${id}"><span>✏️</span>Modifier</button>
      <button class="menuopt" data-act="tRtDup" data-id="${id}"><span>⧉</span>Dupliquer</button>
      <button class="menuopt" data-act="tRtDelete" data-id="${id}" style="color:var(--warn)"><span>✕</span>Supprimer</button>`);
  },
  tRtEdit: el => openRoutineEditor(el.dataset.id),
  tRtDup: el => { const r = TS.routines.find(x => x.id === el.dataset.id); TS.routines.push({ ...structuredClone(r), id: uid(), name: r.name + ' (copie)' }); tsave(); closeSheet(); render(); },
  tRtDelete: async el => { if (!(await askConfirm('Supprimer cette routine ?', { msg: 'Ton historique est conservé.', ok: 'Supprimer', danger: true }))) return; TS.routines = TS.routines.filter(r => r.id !== el.dataset.id); tsave(); closeSheet(); render(); },
  tRtMove: el => { const a = RT.exercises, i = +el.dataset.i, j = i + +el.dataset.n; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; renderRoutineEditor(); },
  tRtDel: el => { RT.exercises.splice(+el.dataset.i, 1); renderRoutineEditor(); },
  tRtSets: el => { const e = RT.exercises[+el.dataset.i]; e.sets = clamp((e.sets || 3) + +el.dataset.n, 1, 10); renderRoutineEditor(); },
  tRtSave: () => {
    if (!RT.name.trim()) { toast('Donne un nom à la routine'); return; }
    if (!RT.exercises.length) { toast('Ajoute au moins un exercice'); return; }
    const { isNew, ...r } = RT; const i = TS.routines.findIndex(x => x.id === r.id);
    if (i >= 0) TS.routines[i] = r; else TS.routines.push(r);
    tsave(); RT = null; closeSheet(); render(); toast('Routine enregistrée');
  },
  tRtRemove: async () => { if (!(await askConfirm('Supprimer cette routine ?', { ok: 'Supprimer', danger: true }))) return; TS.routines = TS.routines.filter(r => r.id !== RT.id); tsave(); RT = null; closeSheet(); render(); },
  tStarter: () => { TS.routines.push(...starterRoutines()); tsave(); render(); toast('4 programmes ajoutés : modifie-les à ta guise'); },
  // historique
  tWOpen: el => openWorkout(el.dataset.id),
  tWDel: async el => { if (!(await askConfirm('Supprimer définitivement cette séance ?', { ok: 'Supprimer', danger: true }))) return; TS.workouts = TS.workouts.filter(w => w.id !== el.dataset.id); tsave(); closeSheet(); render(); },
  tWRedo: el => {
    const w = TS.workouts.find(x => x.id === el.dataset.id); closeSheet();
    startWorkout(w.name, w.exercises.map(e => ({ exId: e.exId, notes: '', sets: newSets(e.sets.filter(s => s.type !== 'w').length || 3) })), w.routineId);
  }
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.tset != null && TS.active) { const s = TS.active.exercises[+el.dataset.ei]?.sets[+el.dataset.si]; if (s) { s[el.dataset.tset] = el.value === '' ? '' : num(el.value); tsave(); } }
  if (el.dataset.tname != null && TS.active) { TS.active.name = el.value; tsave(); }
  if (el.dataset.rt && RT) RT[el.dataset.rt] = el.value;
  if (el.dataset.rtreps != null && RT) RT.exercises[+el.dataset.rtreps].reps = el.value;
  if (el.id === 'exq') { S.ui.exQ = el.value; const q = norm(el.value.trim()), m = S.ui.exM || ''; const counts = {}; for (const w of TS.workouts) for (const x of w.exercises) counts[x.exId] = (counts[x.exId] || 0) + 1; $('#exlist').innerHTML = exListHTML(allEx().filter(x => (!m || x.muscle === m) && (!q || q.split(/\s+/).every(w => norm(x.name + ' ' + x.muscle).includes(w)))), counts); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 't_exrest' && TS.active) { TS.active.exercises[+el.dataset.ei].rest = +el.value; tsave(); render(); }
  if (el.id === 't_exnote' && TS.active) { TS.active.exercises[+el.dataset.ei].notes = el.value; tsave(); render(); }
  if (el.id === 't_rest') { TS.settings.rest = +el.value; tsave(); }
  if (el.id === 't_restOn') { TS.settings.restOn = el.checked; tsave(); }
  if (el.id === 'hevyIn' && el.files[0]) {
    const f = el.files[0]; const rd = new FileReader();
    rd.onload = () => {
      try { const r = importHevy(rd.result); render(); toast(r.n ? `✅ ${r.n} séance${r.n > 1 ? 's' : ''} importée${r.n > 1 ? 's' : ''} depuis Hevy` : 'Rien de nouveau à importer (déjà importé ?)'); }
      catch (err) { toast('Fichier non reconnu : utilise « Export Workouts » de Hevy'); }
    };
    rd.readAsText(f); el.value = '';
  }
});

// ---------- Branchement dans l’appli ----------
Object.assign(VIEWS, { t_home: vTHome, t_live: vTLive, t_hist: vTHist, t_ex: vTEx, t_stats: vTStats });
const _baseRender = render;
let LAST_VIEW = '';
render = function () {
  _baseRender(); renderTabs(); renderLiveBar(); tick();
  const key = S.ui.tab + '|' + (S.ui.date || '') + '|' + (S.ui.mDay ?? '') + '|' + (S.ui.pSub || '') + '|' + (S.ui.statP || '') + (S.ui.statOff || '');
  if (key !== LAST_VIEW) { LAST_VIEW = key; const v = $('#view'); v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); clearTimeout(render._t); render._t = setTimeout(() => v.classList.remove('enter'), 1100); }
  JUST = null;
};
if (!sessionStorage.getItem('macro.launched')) showLauncher();
