// ============================================================
//  COACH : conseils fondés sur des études, à partir de tes vraies données
//  · fin de séance : conseils SEULEMENT si un problème est détecté
//  · routines créées par toi : note /10, points forts, problèmes et solutions
//  Règles reprises de méta-analyses publiées (références affichées avec chaque conseil).
// ============================================================
// chaque règle s’appuie sur plusieurs travaux qui vont dans le même sens
const REFS = {
  volume: ['Schoenfeld, Ogborn & Krieger, 2017 — J Sports Sci (méta-analyse dose-réponse)', 'Baz-Valle et al., 2022 — J Hum Kinet (revue systématique : 12–20 séries/semaine)', 'Krieger, 2010 — J Strength Cond Res (méta-analyse)'],
  load: ['Schoenfeld et al., 2017 — J Strength Cond Res (méta-analyse charges lourdes / légères)', 'Lopez et al., 2021 — Med Sci Sports Exerc (méta-analyse en réseau)'],
  failure: ['Refalo et al., 2023 — Sports Med (méta-analyse proximité de l’échec)', 'Grgic et al., 2022 — J Sport Health Sci (méta-analyse échec / non-échec)'],
  rest: ['Schoenfeld et al., 2016 — J Strength Cond Res (essai : 3 min vs 1 min)', 'Singer et al., 2024 — Front Sports Act Living (méta-analyse durée de repos)'],
  sets: ['Krieger, 2010 — J Strength Cond Res (méta-analyse 1 vs plusieurs séries)', 'Schoenfeld, Ogborn & Krieger, 2017 — J Sports Sci (méta-analyse)'],
  order: ['Simão et al., 2012 — Sports Med (revue ordre des exercices)', 'Nunes et al., 2021 — Eur J Sport Sci (méta-analyse : effet sur la force)'],
  overload: ['Plotkin et al., 2022 — PeerJ (essai : progresser en charge ou en répétitions)', 'ACSM, 2009 — Med Sci Sports Exerc (position officielle sur la progression)'],
  freq: ['Schoenfeld, Grgic & Krieger, 2019 — J Sports Sci (méta-analyse à volume égal)', 'Schoenfeld, Ogborn & Krieger, 2016 — Sports Med (méta-analyse fréquence)'],
  protein: ['Morton et al., 2018 — Br J Sports Med (méta-analyse)', 'Jäger et al., 2017 — J Int Soc Sports Nutr (position ISSN : 1,4–2 g/kg/jour)']
};
// exercices polyarticulaires (plusieurs articulations, charges lourdes)
const COMPOUND = new Set('dc dch dcm dib dih dd dcs dips pompes sdt sdtjt rowing rowh rowpoulie tbar tractions chinup tirage dm dmh dmm arnold squat frontsq presse hack fentes bulgare gobelet hipthrust goodmorning thruster'.split(' '));
const isCompound = X => COMPOUND.has(X.id) || (X.like && COMPOUND.has(X.like));
// Muscles précis pour l’analyse : le « dos » est séparé en grand dorsal (tirages verticaux), haut du dos (rowings)
// et lombaires ; l’épaule en deltoïde antérieur (développés), latéral (élévations) et postérieur (oiseau, face pull).
const ANA_NAME = { pecs: 'Pectoraux', lats: 'Grand dorsal', traps: 'Haut du dos', lowback: 'Lombaires', delts: 'Deltoïde antérieur', latdelts: 'Deltoïde latéral', reardelts: 'Deltoïde postérieur',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Avant-bras', quads: 'Quadriceps', adductors: 'Adducteurs', hams: 'Ischios', glutes: 'Fessiers', calves: 'Mollets', abs: 'Abdos', obliques: 'Obliques', tibialis: 'Tibias' };
const GROUP_ANA = { Pectoraux: ['pecs'], Dos: ['lats'], Épaules: ['latdelts'], Biceps: ['biceps'], Triceps: ['triceps'], Quadriceps: ['quads'], Ischios: ['hams'], Fessiers: ['glutes'], Adducteurs: ['adductors'], Mollets: ['calves'], Abdos: ['abs'], 'Avant-bras': ['forearms'] };
const ROW_IDS = new Set(['rowing', 'rowh', 'rowpoulie', 'tbar']);
function anaRegions(X) {
  if (X.kind === 'cardio' || X.muscle === 'Cardio') return { p: [], s: [] };
  const base = X.like || X.id; const n = norm(X.name || '');
  const T = X.like && EXLIB[X.like];
  // muscle imposé par le nom (ex. « Dips Triceps ») : lui seul est principal
  if (T && T.muscle !== X.muscle && GROUP_ANA[X.muscle]) return { p: GROUP_ANA[X.muscle], s: [] };
  let m = typeof musclesOf === 'function' ? musclesOf(X) : { p: [], s: [] };
  // rowings : haut du dos en principal, grand dorsal en soutien
  if (ROW_IDS.has(base) || (/\brow|rowing|tirage horizontal/.test(n) && !/menton|debout|upright/.test(n))) m = { p: ['traps'], s: ['lats', 'reardelts', 'biceps'] };
  // élévations latérales, rowing menton : deltoïde latéral
  const lateral = base === 'elev' || base === 'elevp' || /lateral|laterale|menton|upright|rowing debout/.test(n);
  const fix = r => r === 'delts' && lateral ? 'latdelts' : r;
  return { p: [...new Set(m.p.map(fix))], s: [...new Set(m.s.map(fix))] };
}
const anaMuscles = X => { const r = anaRegions(X); const p = r.p.map(k => ANA_NAME[k]).filter(Boolean); return p.length ? p : (X.muscle && X.muscle !== 'Autre' ? [X.muscle] : []); };
// muscles pour lesquels on signale un manque de volume (les petits muscles déjà sollicités indirectement ne sont pas signalés)
const MAJOR = ['Pectoraux', 'Grand dorsal', 'Haut du dos', 'Deltoïde latéral', 'Biceps', 'Triceps', 'Quadriceps', 'Ischios', 'Fessiers'];
const mainGroups = anaMuscles;
const refList = r => (Array.isArray(r) ? r : [r]).flatMap(k => REFS[k] || [k]);
const tipCard = t => { const R = refList(t.ref);
  return `<div class="tipc ${t.lvl || ''}"><div class="tipc-h"><span>${t.ic}</span><b>${t.title}</b></div>
    <div class="tipc-l">Pourquoi</div><div class="tipc-b">${t.body}</div>
    ${t.fix ? `<div class="tipc-l">Que faire</div><div class="tipc-f">${t.fix}</div>` : ''}
    <details class="tipc-r"><summary>📚 ${R.length} source${R.length > 1 ? 's' : ''} concordante${R.length > 1 ? 's' : ''}</summary>${R.map(x => `<div>· ${esc(x)}</div>`).join('')}</details></div>`; };

// ---------- Conseils de fin de séance ----------
function sessionTips(w, remember) {
  const tips = []; TS.coachSeen = TS.coachSeen || {};
  const fresh = id => !(TS.coachSeen[id] && w.start - TS.coachSeen[id] < 14 * 864e5); // pas le même rappel plus d’une fois par 14 jours
  const ex = w.exercises.map(e => ({ e, X: exById(e.exId), sets: workSets(e) })).filter(o => o.sets.length);
  // 1. effort trop loin de l’échec (RPE noté ≤ 6)
  const rpeSets = ex.flatMap(o => o.sets.filter(s => num(s.rpe)));
  const easy = rpeSets.filter(s => num(s.rpe) <= 6);
  if (rpeSets.length >= 4 && easy.length / rpeSets.length >= 0.4)
    tips.push({ ic: '🎯', title: `${easy.length} série${easy.length > 1 ? 's' : ''} sur ${rpeSets.length} à RPE 6 ou moins`, body: 'Ces séries s’arrêtaient à 4 répétitions ou plus de l’échec. Les séries plus proches de l’échec donnent en moyenne un peu plus de croissance musculaire.', fix: 'Vise RPE 7 à 9 (1 à 3 répétitions en réserve) : ajoute une ou deux répétitions ou un peu de charge.', ref: 'failure' });
  // 2. stagnation : aucun progrès du 1RM estimé sur les 5 dernières séances de l’exercice (≥ 4 semaines)
  const stuck = [];
  for (const o of ex) {
    if (!(o.X.kind === 'wr' || (o.X.kind === 'bw' && o.sets.some(s => num(s.w))))) continue;
    const H_ = exHistory(o.e.exId, w.start + 1).slice(0, 6); if (H_.length < 6) continue;
    const best = h => Math.max(0, ...h.sets.filter(s => s.type !== 'w').map(s => e1rm(num(s.w), num(s.r))));
    const recent = H_.slice(0, 5), before = H_[5];
    const span = (H_[0].w.start - H_[4].w.start) / 864e5;
    if (span >= 28 && Math.max(...recent.map(best)) <= best(before) * 1.01 && fresh('stuck:' + o.e.exId)) { stuck.push(o.X.name); if (remember) TS.coachSeen['stuck:' + o.e.exId] = w.start; }
  }
  if (remember && stuck.length) tsave();
  if (stuck.length)
    tips.push({ ic: '📈', title: `Pas de progrès depuis 5 séances : ${stuck.slice(0, 3).map(esc).join(', ')}${stuck.length > 3 ? '…' : ''}`, body: 'Ton 1RM estimé n’a pas augmenté sur ces exercices depuis plus de 4 semaines. Progresser en ajoutant des répétitions ou de la charge donne des résultats comparables.', fix: 'Double progression : garde la charge jusqu’à atteindre le haut de ta fourchette (ex. 12 réps) sur toutes les séries, puis ajoute 2,5 à 5 %. Si ça bloque encore, change de variante.', ref: 'overload' });
  // 3. baisse nette par rapport à la dernière fois sur au moins 2 exercices
  const drops = [];
  for (const o of ex) {
    const last = exHistory(o.e.exId, w.start)[0]; if (!last) continue;
    const vol = l => l.filter(s => s.type !== 'w').reduce((a, s) => a + (setVol(s) || num(s.r)), 0);
    const a = vol(o.sets), b = vol(last.sets); if (b > 0 && o.sets.length >= last.sets.filter(s => s.type !== 'w').length && a < b * 0.85) drops.push(o.X.name);
  }
  if (drops.length >= 2) {
    const T = typeof targets === 'function' ? targets() : null; const y = addDays(wDate(w), -1); const ate = sum((S.journal[y] || []).map(entryN));
    const low = T && (S.journal[y] || []).length && ate.kcal < T.kcal * 0.8;
    tips.push({ ic: '🔋', title: `Performance en baisse sur ${drops.length} exercices`, body: `Volume au moins 15 % sous ta dernière séance sur : ${drops.slice(0, 3).map(esc).join(', ')}.${low ? ` Hier tu as mangé ${r0(ate.kcal)} kcal pour un objectif de ${r0(T.kcal)}.` : ''} Une baisse ponctuelle est normale ; si elle se répète, regarde sommeil, apport calorique et fatigue accumulée.`, fix: low ? 'Mange à ton objectif la veille des grosses séances, surtout en glucides.' : 'Si ça se répète 2 ou 3 séances de suite, fais une semaine plus légère (environ moitié moins de séries).', ref: 'Facteurs connus de fatigue : sommeil, énergie disponible, volume accumulé' });
  }
  // 4. protéines du jour (si le journal est rempli)
  const d = wDate(w); const kgBody = num(S.profile.weight); const L = S.journal[d] || [];
  if (kgBody && L.length >= 2 && d === todayStr()) {
    const p = sum(L.map(entryN)).p; const need = 1.6 * kgBody;
    if (p < need * 0.75) tips.push({ ic: '🥩', title: `${r0(p)} g de protéines aujourd’hui pour l’instant`, body: `Le gain musculaire progresse jusqu’à environ 1,6 g par kg et par jour en moyenne (≈ ${r0(need)} g pour toi).`, fix: `Il te reste environ ${r0(need - p)} g : un skyr (≈ 20 g) ou une portion de viande / poisson (≈ 30 g) au prochain repas.`, ref: 'protein' });
  }
  // 5. repos trop court réglé sur des polyarticulaires
  const short = ex.filter(o => isCompound(o.X) && typeof restOf === 'function' && restOf(o.e) > 0 && restOf(o.e) < 90).map(o => o.X.name);
  if (short.length) tips.push({ ic: '⏱', title: `Repos de moins de 1 min 30 sur ${short.slice(0, 2).map(esc).join(', ')}`, body: 'Sur les gros exercices, 3 min de repos ont donné plus de force et de muscle que 1 min à programme égal.', fix: 'Règle le repos à 2–3 min sur ces exercices (touche la pastille ⏱ de l’exercice).', ref: 'rest' });
  return tips;
}
summaryHTML = (orig => function (w, det) {
  const h = orig(w, det); const tips = sessionTips(w, true); if (!tips.length) return h;
  const block = `<h3 style="margin:18px 0 8px">À améliorer</h3>${tips.map(tipCard).join('')}`;
  const i = h.lastIndexOf('<button'); return i < 0 ? h + block : h.slice(0, i) + block + h.slice(i);
})(summaryHTML);

// ---------- Analyse d’une routine ----------
function parseReps(s) { const m = String(s || '').match(/(\d+)\s*[-–à]\s*(\d+)/); if (m) return [+m[1], +m[2]]; const n = parseInt(s); return n ? [n, n] : null; }
function routineFreq() { return 1; } // analyse théorique : chaque séance faite 1 fois par semaine
function routineFreqReal(r) {
  const since = Date.now() - 28 * 864e5;
  const n = TS.workouts.filter(w => w.start >= since && (w.routineId === r.id || norm(w.name).trim() === norm(r.name).trim())).length;
  return n ? n / 4 : 1; // pas d’historique récent : on suppose 1 fois par semaine
}
function analyseRoutine(r) {
  const issues = [], good = [];
  const ex = r.exercises.map((e, i) => ({ e, i, X: exById(e.exId), sets: +e.sets || 3, reps: parseReps(e.reps) }));
  const total = ex.reduce((a, o) => a + o.sets, 0);
  // séries par muscle dans la séance
  const per = {}; for (const o of ex) for (const g of mainGroups(o.X)) per[g] = (per[g] || 0) + o.sets;
  const heavy = Object.entries(per).filter(([, n]) => n > 12);
  if (heavy.length) issues.push({ w: 1, ic: '📦', title: `Beaucoup de séries pour ${heavy.map(([g, n]) => `${g.toLowerCase()} (${n})`).join(', ')} dans une seule séance`, body: 'Le gain par série supplémentaire diminue quand le volume augmente. Au-delà d’une dizaine de séries pour un même muscle dans une séance, les dernières séries apportent peu et ajoutent de la fatigue.', fix: 'Répartis ces séries sur 2 séances dans la semaine, ou retire 2 à 4 séries de l’exercice le moins important.', ref: 'volume' });
  // une seule série sur plusieurs exercices
  const single = ex.filter(o => o.sets <= 1 && o.X.kind !== 'cardio');
  if (single.length >= 2) issues.push({ w: 1, ic: '1️⃣', title: `${single.length} exercices à une seule série`, body: 'Plusieurs séries par exercice donnent en moyenne nettement plus de croissance musculaire qu’une seule.', fix: 'Passe-les à 2–3 séries, ou garde moins d’exercices avec plus de séries chacun.', ref: 'sets' });
  // fourchettes de répétitions
  const tooHigh = ex.filter(o => o.reps && o.reps[0] > 30), tooLow = ex.filter(o => o.reps && o.reps[1] < 3);
  if (tooHigh.length) issues.push({ w: 1, ic: '🔁', title: `Plus de 30 répétitions sur ${tooHigh.map(o => esc(o.X.name)).join(', ')}`, body: 'Le muscle grossit de façon comparable entre environ 6 et 30 répétitions si la série est menée près de l’échec. Au-delà, les données sont rares et la fatigue cardio limite souvent avant le muscle.', fix: 'Ajoute de la charge pour revenir entre 8 et 20 répétitions.', ref: 'load' });
  if (tooLow.length) issues.push({ w: 0.5, ic: '🏋️', title: `Moins de 3 répétitions sur ${tooLow.map(o => esc(o.X.name)).join(', ')}`, body: 'Les charges très lourdes développent surtout la force maximale ; pour le volume musculaire, des séries plus longues sont aussi efficaces et moins risquées.', fix: 'Si ton objectif est la masse, vise 5 à 12 répétitions sur ces exercices.', ref: 'load' });
  const ranged = ex.filter(o => o.reps); const inZone = ranged.filter(o => o.reps[0] >= 5 && o.reps[1] <= 30);
  if (ranged.length && inZone.length === ranged.length) good.push('Fourchettes de répétitions dans la zone efficace (5–30)');
  if (!ranged.length && ex.length) issues.push({ w: 0.5, ic: '✍️', title: 'Aucune fourchette de répétitions', body: 'Sans objectif de répétitions, difficile de savoir quand ajouter de la charge, alors que la surcharge progressive est le moteur du progrès.', fix: 'Indique une fourchette pour chaque exercice (ex. 8-12) dans « Modifier ».', ref: 'overload' });
  // ordre : isolation avant un polyarticulaire du même muscle
  const badOrder = [];
  ex.forEach(o => { if (isCompound(o.X)) return; const gs = mainGroups(o.X); const later = ex.find(p => p.i > o.i && isCompound(p.X) && mainGroups(p.X).some(g => gs.includes(g))); if (later) badOrder.push([o.X.name, later.X.name]); });
  if (badOrder.length) issues.push({ w: 0.5, ic: '🔀', title: `${esc(badOrder[0][0])} avant ${esc(badOrder[0][1])}`, body: 'L’exercice fait en premier est celui sur lequel tu progresses le plus en force : pré-fatiguer le muscle réduit tes charges sur l’exercice principal. Pour le volume musculaire, l’ordre compte peu.', fix: `Place ${esc(badOrder[0][1])} avant ${esc(badOrder[0][0])}, sauf si tu veux volontairement prioriser l’isolation.`, ref: 'order' });
  else if (ex.some(o => isCompound(o.X))) good.push('Exercices polyarticulaires placés en premier');
  // repos réglé trop court sur les polyarticulaires
  const shortRest = ex.filter(o => isCompound(o.X) && typeof restOf === 'function' && restOf({ exId: o.e.exId }) > 0 && restOf({ exId: o.e.exId }) < 90);
  if (shortRest.length) issues.push({ w: 1, ic: '⏱', title: `Repos de moins de 1 min 30 sur ${shortRest.length} gros exercice${shortRest.length > 1 ? 's' : ''}`, body: 'À programme égal, 3 min de repos ont donné plus de force et de muscle que 1 min sur les exercices polyarticulaires.', fix: 'Règle le repos à 2–3 min sur ces exercices (pastille ⏱ pendant la séance).', ref: 'rest' });
  // doublons
  const dup = ex.filter((o, i) => ex.findIndex(p => p.e.exId === o.e.exId) !== i);
  if (dup.length) issues.push({ w: 0.5, ic: '♊', title: `${esc(dup[0].X.name)} apparaît 2 fois`, body: 'Deux blocs du même exercice compliquent le suivi de ta progression.', fix: 'Regroupe-les en un seul exercice avec plus de séries.', ref: 'overload' });
  if (total >= 10 && total <= 30) good.push(`${total} séries au total : volume de séance raisonnable`);
  const score = Math.max(1, Math.min(10, Math.round((10 - issues.reduce((a, x) => a + x.w * 1.5, 0)) * 2) / 2));
  return { score, issues, good, total, per, freq: routineFreq(r), ex };
}
// ---------- Bilan du programme (toutes les routines, à leur fréquence réelle) ----------
// un programme = les routines rangées ensemble (sans dossier, ou dans le même dossier), toutes faites 1 fois par semaine
function programGroups() {
  const own = TS.routines.filter(r => !(typeof STARTER_NAMES !== 'undefined' && STARTER_NAMES.has(r.name)));
  const G = [];
  if (own.some(r => !r.folder || !(TS.folders || []).some(f => f.id === r.folder))) G.push({ id: '', name: 'Mes routines' });
  for (const f of TS.folders || []) if (own.some(r => r.folder === f.id)) G.push({ id: f.id, name: f.name });
  return G;
}
function analyseProgram(fid) {
  const G = programGroups(); if (fid == null || !G.some(g => g.id === fid)) fid = G.length ? G[0].id : '';
  const inFolder = r => fid ? r.folder === fid : !r.folder || !(TS.folders || []).some(f => f.id === r.folder);
  const R = TS.routines.filter(r => !(typeof STARTER_NAMES !== 'undefined' && STARTER_NAMES.has(r.name)) && inFolder(r));
  const week = {}; for (const r of R) { const a = analyseRoutine(r); for (const [g, n] of Object.entries(a.per)) week[g] = (week[g] || 0) + n * a.freq; }
  const issues = [];
  const low = MAJOR.filter(g => (week[g] || 0) < 10), high = Object.keys(week).filter(g => week[g] > 20);
  const legs = ['Quadriceps', 'Ischios', 'Fessiers'].every(g => !(week[g] > 0));
  if (legs && R.length) issues.push({ ic: '🦵', brief: 'Ajoute une séance jambes chaque semaine (squat ou presse, soulevé de terre roumain, leg curl).', title: 'Pas de travail des jambes', body: 'Aucune de tes routines ne travaille quadriceps, ischios ou fessiers, qui sont les plus gros muscles du corps.', fix: 'Ajoute une séance jambes (squat ou presse, soulevé de terre roumain, leg curl) au moins une fois par semaine.', ref: 'volume' });
  const lowShown = legs ? low.filter(g => !['Quadriceps', 'Ischios', 'Fessiers'].includes(g)) : low;
  if (lowShown.length) issues.push({ ic: '📉', brief: `Monte à au moins 10 séries par semaine : ${lowShown.map(g => g.toLowerCase()).join(', ')}.`, title: `Moins de 10 séries par semaine : ${lowShown.map(g => `${g.toLowerCase()} (${fr(r1(week[g] || 0))})`).join(', ')}`, body: 'Le gain musculaire augmente avec le nombre de séries par semaine ; environ 10 séries ou plus par muscle donnent en moyenne plus de croissance que moins de 5.', fix: 'Ajoute 2 à 4 séries par semaine pour ces muscles, réparties sur tes séances existantes.', ref: 'volume' });
  if (high.length) issues.push({ ic: '📈', brief: `Redescends vers 12–20 séries par semaine : ${high.map(g => g.toLowerCase()).join(', ')}.`, title: `Plus de 20 séries par semaine : ${high.map(g => `${g.toLowerCase()} (${fr(r1(week[g]))})`).join(', ')}`, body: 'Au-delà de 20 séries par semaine, le gain supplémentaire moyen devient faible alors que la fatigue continue d’augmenter.', fix: 'Si tu progresses bien, garde ; sinon, redescends vers 12–20 séries pour ces muscles et investis l’énergie ailleurs.', ref: 'volume' });
  return { week, issues, n: R.length, fid, groups: G, routines: R };
}

// ---------- Affichage ----------
const scoreCls = s => s >= 8 ? 'ok' : s >= 6 ? 'mid' : 'low';
function openRoutineNote(id) {
  const r = TS.routines.find(x => x.id === id); if (!r) return;
  const a = analyseRoutine(r);
  openSheet(`Analyse : ${r.name}`, `<div class="scorehero ${scoreCls(a.score)}"><div class="scorev">${fr(a.score)}<small>/10</small></div>
      <div class="small muted">${a.ex.length} exercices · ${a.total} séries · ≈ ${typeof RT !== 'undefined' ? Math.round(r.exercises.reduce((s, e) => s + (+e.sets || 3) * (40 + (e.rest ?? (TS.exRest || {})[e.exId] ?? TS.settings.rest)), 0) / 60) : ''} min</div>
      <div class="small muted" style="margin-top:4px">Note de la séance elle-même, telle qu’elle est écrite (pas de ce que tu as fait réellement).</div></div>
    ${a.good.length ? `<div class="goodlist">${a.good.map(g => `<div>👍 ${esc(g)}</div>`).join('')}</div>` : ''}
    ${a.issues.length ? `<h3 style="margin:14px 0 8px">À améliorer</h3>${a.issues.map(tipCard).join('')}` : '<p class="muted" style="text-align:center">Rien à corriger : la structure de cette routine correspond aux recommandations des études.</p>'}
    <h3 style="margin:16px 0 6px">Séries par muscle dans cette séance</h3>
    ${Object.entries(a.per).sort((x, y) => y[1] - x[1]).map(([g, n]) => `<div class="row between small" style="padding:3px 0"><span>${esc(g)}</span><b>${n}</b></div>`).join('')}
    <p class="small muted" style="margin-top:12px">Seuls les muscles principaux de chaque exercice sont comptés (ex. un rowing compte pour le haut du dos, un tirage vertical pour le grand dorsal). Tes résultats réels sont analysés à la fin de chaque séance.</p>
    <button class="btn block" data-act="tProgramNote" data-f="${esc(r.folder && (TS.folders || []).some(f => f.id === r.folder) ? r.folder : '')}">Voir le bilan du programme</button>`);
}
function openProgramNote(fid) {
  const p = analyseProgram(fid); const max = Math.max(20, ...Object.values(p.week));
  openSheet('Bilan du programme', `${p.groups.length > 1 ? `<div class="chipsrow">${p.groups.map(g => `<span class="chip ${g.id === p.fid ? 'on' : ''}" data-act="tProgramNote" data-f="${esc(g.id)}">${g.id ? '📁 ' : ''}${esc(g.name)}</span>`).join('')}</div>` : ''}
    <p class="small muted" style="margin-top:0">Programme théorique : ${p.routines.map(r => esc(r.name)).join(', ') || 'aucune routine'}, chaque séance faite <b>1 fois par semaine</b>. Séries par semaine et par muscle principal, zone visée : 10 à 20. <i>Grand dorsal</i> = tirages verticaux et tractions ; <i>haut du dos</i> = trapèzes et rhomboïdes (rowings) ; l’épaule est séparée en deltoïde antérieur (développés), latéral (élévations) et postérieur.</p>
    <div class="progbars">${MAJOR.concat(Object.keys(p.week).filter(g => !MAJOR.includes(g))).filter(g => MAJOR.includes(g) || p.week[g]).map(g => { const v = p.week[g] || 0; const z = !MAJOR.includes(g) ? '' : v < 10 ? 'low' : v > 20 ? 'high' : 'ok';
      return `<div class="pb"><span>${esc(g)}</span><div class="pbt"><i class="zone" style="left:${10 / max * 100}%;width:${10 / max * 100}%"></i><i class="v ${z}" style="width:${Math.min(100, v / max * 100)}%"></i></div><b>${fr(r1(v))}</b></div>`; }).join('')}</div>
    ${p.issues.length ? `<h3 style="margin:14px 0 8px">À améliorer</h3>${p.issues.map(tipCard).join('')}` : '<p class="muted" style="text-align:center;margin-top:14px">Tous les grands muscles sont dans la zone de 10 à 20 séries par semaine. 👌</p>'}
    ${tipCard({ ic: '📅', title: 'Fréquence : pas besoin de changer', body: 'À volume égal, travailler un muscle 1, 2 ou 3 fois par semaine donne des résultats proches. Augmenter la fréquence sert surtout à répartir plus de séries sans séances trop longues.', fix: 'Choisis la fréquence qui te permet de faire toutes tes séries avec une bonne qualité.', ref: 'freq' })}`);
}
vTHome = (orig => function () {
  let h = orig();
  for (const r of TS.routines) {
    if (typeof STARTER_NAMES !== 'undefined' && STARTER_NAMES.has(r.name)) continue;
    const a = analyseRoutine(r);
    h = h.replace(`<button class="iconbtn" data-act="tRoutineMenu" data-id="${r.id}"`, `<button class="rnote ${scoreCls(a.score)}" data-act="tRoutineNote" data-id="${r.id}" aria-label="Note de la routine">${fr(a.score)}/10</button><button class="iconbtn" data-act="tRoutineMenu" data-id="${r.id}"`);
  }
  if (TS.routines.some(r => !(typeof STARTER_NAMES !== 'undefined' && STARTER_NAMES.has(r.name))))
    h = h.replace(/(<h2 style="margin:0">Mes routines<\/h2>)/, `$1<button class="btn sm ghost progbtn" data-act="tProgramNote">📊 Bilan</button>`);
  return h;
})(vTHome);
VIEWS.t_home = vTHome;
Object.assign(ACTIONS, { tRoutineNote: el => openRoutineNote(el.dataset.id), tProgramNote: el => openProgramNote(el && el.dataset ? el.dataset.f : undefined) });
