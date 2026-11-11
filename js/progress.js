// ============================================================
//  PROGRÈS v2 : muscles des exercices importés, volume par muscle, records, régularité
// ============================================================

// ---------- Reconnaissance du muscle à partir du nom (anglais ou français) ----------
const MUSCLE_RULES = [
  ['Abdos', /crunch|planche|plank|gainage/],
  ['Cardio', /running|treadmill|cycling|\bbike|\bvelo\b|elliptic|stair|rowing machine|rameur|swim|natation|walking|\bmarche\b|jump rope|corde a sauter|course a pied|hiit|spinning|ski erg|assault/],
  ['Corps entier', /clean|snatch|arrache|epaule-jete|thruster|burpee|swing|turkish|wall ball|man maker/],
  ['Mollets', /calf|calves|mollet/],
  ['Avant-bras', /wrist|forearm|poignet|avant.?bras|\bgrip\b|farmer|fermier|dead hang/],
  ['Ischios', /leg curl|hamstring|ischio|romanian|\brdl\b|stiff|jambes tendues|good ?morning|nordic|roumain/],
  ['Fessiers', /hip thrust|glute|fessier|abduct|bridge|\bpont\b|donkey|kickback.*(cable|poulie|machine)|frog pump/],
  ['Triceps', /tricep|pushdown|push down|skull|barre au front|(couche|bench).*(serree|close)|close grip (bench|press)|kickback|french press|jm press|extension (nuque|verticale|horizontale)/],
  ['Biceps', /curl|bicep|spider/],
  ['Abdos', /crunch|plank|planche|gainage|sit ?up|leg raise|releve de (jambes|genoux)|russian twist|rotation russe|coude-genou|\babdo|ciseaux|hollow|dead bug|toes to bar|ab wheel|roue abdo|pallof|l-sit|wood ?chop|oblique/],
  ['Épaules', /shoulder|overhead press|military|militaire|\blaterale?s?\b|front raise|elevation|rear delt|visage|arriere d.epaule|reverse fly|reverse pec|oiseau|face pull|arnold|upright row|rowing menton|epaule|delt|\by raise|landmine press|push press/],
  ['Pectoraux', /bench|chest|\bpec|\bfly|flye|ecarte|push ?up|pompe|\bdips?\b|developpe couche|developpe incline|developpe decline|crossover|butterfly|svend/],
  ['Dos', /\brow|pull|\blat\b|\blats\b|\bchin|traction|muscle up|tirage|deadlift|souleve|shrug|back extension|hyperext|lombaire|pullover|superman|\bdos\b|rack pull|rowing/],
  ['Quadriceps', /squat|leg press|presse|leg extension|extension (des )?jambes|cuisse|lunge|fente|step ?up|hack|sissy|adduct|wall sit|chaise|pistol/],
  ['Abdos', /crunch|\babs?\b|abdo|plank|gainage|sit ?up|leg raise|releve|twist|oblique|wood ?chop|hollow|dead bug|mountain|v-?up|toes to bar|ab wheel|roue|pallof|l-sit/]
];
const EQUIP_RULES = [['Machine', /machine|smith|hammer strength|presse|leg press|pendul/], ['Poulie', /cable|poulie|poulis|corde|cuff/], ['Kettlebell', /kettlebell/], ['Élastique', /band|elastique/],
  ['Haltères', /dumbbell|haltere/], ['Barre', /barbell|\bbarre\b|ez bar|trap bar/], ['Poids du corps', /bodyweight|poids du corps|push ?up|pull ?up|chin ?up|\bdips?\b|traction|pompe|plank|gainage/]];
function guessMuscle(name) { const n = norm(name); for (const [m, re] of MUSCLE_RULES) if (re.test(n)) return m; return 'Autre'; }
function guessEquip(name) { const n = norm(name); for (const [m, re] of EQUIP_RULES) if (re.test(n)) return m; return 'Autre'; }
// Exercice de la bibliothèque le plus proche : donne les muscles secondaires et l’animation.
// [motif, id bibliothèque, groupe forcé (facultatif)] — le premier qui correspond gagne
const LIKE_RULES = [
  [/crunch.*(poulie|cable|corde)|cable crunch/, 'crunchp'], [/crunch|abdominaux talons|sit ?up/, 'crunch'],
  [/planche|plank|gainage/, 'gainage'], [/rotation russe|russian/, 'russian'], [/ab wheel|roue/, 'abwheel'],
  [/releve|leg raise|knee raise|ciseaux|coude-genou|toes to bar/, 'releve'],
  [/mollets? assis|seated calf/, 'molletsa'], [/mollet|calf/, 'mollets'],
  [/curl.*(avant.?bras|poignet)|wrist|forearm/, 'wristcurl'],
  [/leg curl.*(assis|seated)|seated leg curl/, 'legcurla'], [/leg curl|hamstring curl/, 'legcurl'],
  [/roumain|romanian|\brdl\b|jambes tendues|stiff/, 'sdtjt'], [/good ?morning/, 'goodmorning'],
  [/hip thrust|glute bridge|pont fessier/, 'hipthrust'], [/abduct/, 'abduc'], [/kickback.*(fessier|glute)|glute kickback/, 'glutekb'],
  [/pull-?over|bras tendus|straight arm/, 'pullover'],
  [/tirage.*visage|face pull/, 'facepull'], [/oiseau|arriere d.epaule|rear delt|reverse fly|reverse pec/, 'oiseau'],
  [/elevation.*(frontale|avant)|front raise/, 'front'], [/(elevation|lateral).*(poulie|cable)|cable lateral/, 'elevp'], [/elevation|lateral raise|\blaterale?s?\b raise/, 'elev'],
  [/rowing debout|upright row|rowing menton/, 'elev', 'Épaules'], [/shrug/, 'shrug'],
  [/arnold/, 'arnold'], [/(militaire|military|overhead press|shoulder press|developpe (epaules|assis)).*(machine)/, 'dmm'],
  [/(militaire|military|overhead press).*(barre|barbell)/, 'dm'], [/militaire|military|overhead press|shoulder press|developpe epaules|push press/, 'dmh'],
  [/(couche|bench).*(serree|close)|close grip/, 'dcs'],
  [/(developpe|couche|bench|press).*decline/, 'dd'], [/(incline).*(barre|barbell)/, 'dib'], [/(developpe|bench|chest press|press).*incline|incline (chest|bench)/, 'dih'],
  [/(developpe couche|bench press).*(barre|barbell)/, 'dc'], [/(developpe couche|bench press|chest press).*(machine|smith)|chest press/, 'dcm'], [/developpe couche|bench press/, 'dch'],
  [/crossover|ecartes? poulie|cable fly/, 'ecartep'], [/pec deck|butterfly/, 'pecdeck'], [/ecarte|\bfly|flye/, 'ecarte'],
  [/dips? triceps|triceps dip|bench dip/, 'dips', 'Triceps'], [/\bdips?\b/, 'dips'], [/pompe|push ?up/, 'pompes'],
  [/muscle up/, 'tractions'], [/supination|chin ?up/, 'chinup'], [/traction|pull ?up/, 'tractions'],
  [/tirage (poitrine|vertical|nuque)|lat pulldown|pulldown|tirage machine/, 'tirage'],
  [/tirage assis|rowing (poulie|assis)|seated (cable )?row|cable row/, 'rowpoulie'], [/t.?bar|barre t/, 'tbar'],
  [/rowing.*haltere|dumbbell row/, 'rowh'], [/rowing|bent over row|\brow\b/, 'rowing'],
  [/souleve de terre|deadlift/, 'sdt'], [/extension lombaire|back extension|hyperext/, 'hyper'],
  [/curl marteau|hammer/, 'marteau'], [/curl inverse|reverse curl/, 'marteau'], [/pupitre|preacher/, 'pupitre'], [/curl.*incline|incline.*curl/, 'curlinc'],
  [/curl.*(poulie|poulis|cable)|cable curl|behind the back curl/, 'curlp'], [/curl.*(barre|barbell|ez)/, 'curlb'], [/curl/, 'curlh'],
  [/(triceps|extension).*(au-dessus|overhead|nuque)|overhead.*triceps/, 'extoh'], [/skull|barre au front/, 'barfront'], [/kickback/, 'kickback'],
  [/tricep|pushdown|push down/, 'pushdown'],
  [/bulgare|bulgarian|split squat/, 'bulgare'], [/front squat/, 'frontsq'], [/goblet|gobelet/, 'gobelet'],
  [/hack|pendul|ceinture|belt squat|squat.*machine/, 'hack'], [/squat/, 'squat'],
  [/presse|leg press/, 'presse'], [/extension (des )?jambes|leg extension/, 'legext'], [/fente|lunge/, 'fentes'],
  [/swing/, 'kbswing'], [/thruster/, 'thruster'], [/burpee/, 'burpees'], [/farmer|fermier/, 'farmer']
];
function guessLike(name) { const n = norm(name); for (const [re, id, g] of LIKE_RULES) if (re.test(n) && EXLIB[id]) return [id, g || EXLIB[id].muscle]; return null; }
// type d’exercice déduit des séries réellement faites (corrige aussi l’ancien bug « développé » → cardio)
function kindFromData(id) {
  let reps = 0, kg = 0, t = 0, km = 0;
  for (const w of TS.workouts) for (const e of w.exercises) if (e.exId === id) for (const s of e.sets) { if (num(s.r)) reps++; if (num(s.w)) kg++; if (num(s.t)) t++; if (num(s.km)) km++; }
  if (km) return 'cardio'; if (reps) return kg ? 'wr' : 'bw'; if (t) return 'time'; return null;
}
// classe les exercices importés (on ne touche pas aux choix faits à la main)
const CLASSIFY_V = 4;
function autoClassify(force) {
  let n = 0;
  for (const x of Object.values(TS.exercises)) {
    if (x.src !== 'hevy') continue;
    if (!force && x.cv === CLASSIFY_V) continue;
    const k = kindFromData(x.id); if (k && k !== x.kind) { x.kind = k; n++; }
    if (!x.mManual) {
      const L = guessLike(x.name);
      const m = L ? L[1] : guessMuscle(x.name);
      if (L) x.like = L[0]; else delete x.like;
      if (m !== 'Autre' && m !== x.muscle) { x.muscle = m; n++; }
      if (m !== 'Autre') x.mAuto = true;
    }
    if (x.equip === 'Autre') { const e = guessEquip(x.name); if (e !== 'Autre') x.equip = e; }
    x.cv = CLASSIFY_V; n++;
  }
  return n;
}
if (autoClassify()) tsave();
importHevy = (orig => function (text) { const r = orig(text); autoClassify(true); tsave(); return r; })(importHevy);
// muscles et animation : on emprunte ceux de l’exercice proche de la bibliothèque
if (typeof musclesOf === 'function') musclesOf = (orig => function (X) {
  if (X && X.like && EXLIB[X.like]) { const r = orig(EXLIB[X.like]); if (X.muscle === EXLIB[X.like].muscle || !X.mManual) return r; }
  return orig(X);
})(musclesOf);
if (typeof moveFor === 'function') moveFor = (orig => function (X) { return X && X.like && EXLIB[X.like] && !X.mManual ? orig({ ...EXLIB[X.like], ...X, id: X.like }) : orig(X); })(moveFor);

// ---------- Répartition par groupe musculaire ----------
const REGION_GROUP = { pecs: 'Pectoraux', lats: 'Dos', traps: 'Dos', lowback: 'Dos', delts: 'Épaules', reardelts: 'Épaules', biceps: 'Biceps', triceps: 'Triceps',
  quads: 'Quadriceps', adductors: 'Quadriceps', hams: 'Ischios', glutes: 'Fessiers', calves: 'Mollets', tibialis: 'Mollets', abs: 'Abdos', obliques: 'Abdos', forearms: 'Avant-bras' };
const GROUP_IC = { Pectoraux: '🫁', Dos: '🔙', Épaules: '🥥', Biceps: '💪', Triceps: '🦾', Quadriceps: '🦵', Ischios: '🦿', Fessiers: '🍑', Mollets: '🦶', Abdos: '🧱', 'Avant-bras': '✊', 'Corps entier': '🤸', Autre: '❔' };
// poids de chaque groupe pour un exercice : principal = 1, secondaire = 0 (affiché mais pas compté)
function exGroups(X) {
  const g = {};
  if (X.kind === 'cardio' || X.muscle === 'Cardio') return g;
  const m = typeof musclesOf === 'function' ? musclesOf(X) : { p: [], s: [] };
  for (const r of m.s) if (REGION_GROUP[r] && !(REGION_GROUP[r] in g)) g[REGION_GROUP[r]] = 0;
  for (const r of m.p) if (REGION_GROUP[r]) g[REGION_GROUP[r]] = 1;
  if (X.muscle && X.muscle !== 'Corps entier' && MUSCLES.includes(X.muscle) && X.muscle !== 'Autre') g[X.muscle] = 1;
  // muscle imposé (ex. « Dips Triceps ») : lui seul est principal
  const T = X.like && EXLIB[X.like];
  if (T && T.muscle !== X.muscle && g[X.muscle]) for (const k in g) if (k !== X.muscle) g[k] = 0;
  if (!Object.values(g).some(Boolean)) g[X.muscle === 'Corps entier' ? 'Corps entier' : 'Autre'] = 1;
  return g;
}
function exRegions(X) {
  const g = {}; if (X.kind === 'cardio') return g;
  const m = typeof musclesOf === 'function' ? musclesOf(X) : { p: [], s: [] };
  for (const r of m.p) g[r] = 1; return g;
}
const workSets = e => doneSets(e).filter(s => s.type !== 'w');
// stats par groupe sur une liste de séances : séries, kg, exercices
function groupStats(list) {
  const G = {}, R = {};
  for (const w of list) for (const e of w.exercises) {
    const X = exById(e.exId); const sets = workSets(e); if (!sets.length) continue;
    const vol = sets.reduce((a, s) => a + setVol(s), 0);
    for (const [g, k] of Object.entries(exGroups(X))) {
      const o = G[g] || (G[g] = { sets: 0, kg: 0, ex: {} });
      o.sets += sets.length * k; o.kg += vol * k;
      const q = o.ex[e.exId] || (o.ex[e.exId] = { sets: 0, kg: 0, main: k === 1 }); q.sets += sets.length; q.kg += vol;
    }
    for (const [r, k] of Object.entries(exRegions(X))) { const o = R[r] || (R[r] = { sets: 0, kg: 0 }); o.sets += sets.length * k; o.kg += vol * k; }
  }
  return { G, R };
}
const inRange = (from, to) => TS.workouts.filter(w => { const d = wDate(w); return d >= from && d <= to; });
const serTxt = n => `${fr(r1(n))} série${n >= 2 ? 's' : ''}`;
const kgShort = v => v >= 10000 ? `${fr(r1(v / 1000))} t` : bigKg(v);
const pctDelta = (a, b) => !b ? '' : (() => { const p = Math.round((a - b) / b * 100); return `<span class="delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)} %</span>`; })();

// ---------- « Soulevés cette semaine » : détail par muscle ----------
function openWeekVolume() {
  const ws = weekStart(), today = todayStr();
  // comparaison juste : semaine dernière arrêtée au même jour
  const cur = inRange(ws, today), prev = inRange(addDays(ws, -7), addDays(ws, -1)), same = inRange(addDays(ws, -7), addDays(today, -7));
  const A_ = groupStats(cur), B_ = groupStats(same);
  const tot = cur.reduce((a, w) => a + wVolume(w), 0), totP = prev.reduce((a, w) => a + wVolume(w), 0), totS = same.reduce((a, w) => a + wVolume(w), 0);
  const L = Object.entries(A_.G).filter(([, o]) => o.sets > 0).sort((a, b) => b[1].kg - a[1].kg || b[1].sets - a[1].sets);
  const max = Math.max(1, ...L.map(x => x[1].kg));
  const regKg = Object.fromEntries(Object.entries(A_.R).map(([r, o]) => [r, o.kg || o.sets]));
  openSheet('Cette semaine', `<div class="wvhero"><div class="wvbig">${bigKg(tot)}</div><div class="muted">soulevés en ${cur.length} séance${cur.length > 1 ? 's' : ''} ${pctDelta(tot, totS)}</div>
      <div class="small muted">Semaine dernière à la même date : ${bigKg(totS)} · sur toute la semaine : ${bigKg(totP)}</div></div>
    ${L.length ? `${heatMapSVG(regKg)}
      <div class="row between small muted" style="margin:16px 2px 4px"><span>Muscle</span><span>kg · séries</span></div>
      ${L.map(([g, o]) => `<button class="mvrow" data-act="tMuscleDetail" data-g="${esc(g)}" data-p="week"><span class="mvname">${esc(g)}</span>
        <span class="bar"><i style="width:${o.kg / max * 100}%"></i></span><span class="mvval"><b>${kgShort(o.kg)}</b><small>${serTxt(o.sets)} ${B_.G[g] ? pctDelta(o.kg, B_.G[g].kg) : ''}</small></span></button>`).join('')}
      <p class="small muted">Volume = charge × répétitions des séries validées (hors échauffement). Seuls les muscles principaux de chaque exercice sont comptés. Touche un muscle pour le détail.</p>`
    : '<p class="muted" style="text-align:center">Aucune série validée cette semaine pour l’instant.</p>'}`);
}

// ---------- Détail d’un muscle ----------
const PERIODS = { week: ['Cette semaine', 0], '7': ['7 jours', 7], '30': ['30 jours', 30], '90': ['3 mois', 90], '365': ['1 an', 365] };
function musPeriodRange(p) { const t = todayStr(); return p === 'week' ? [weekStart(), t] : [addDays(t, -(+p - 1)), t]; }
function openMuscleDetail(g, p = '30') {
  const [from, to] = musPeriodRange(p); const st = groupStats(inRange(from, to)).G[g] || { sets: 0, kg: 0, ex: {} };
  // 12 semaines de volume pour ce muscle
  const ws = weekStart(); const weeks = [];
  for (let i = 11; i >= 0; i--) { const s = addDays(ws, -7 * i); const o = groupStats(inRange(s, addDays(s, 6))).G[g]; weeks.push({ s, kg: o ? o.kg : 0, sets: o ? o.sets : 0 }); }
  const mx = Math.max(1, ...weeks.map(w => w.kg)); const avgSets = weeks.slice(-4).reduce((a, w) => a + w.sets, 0) / 4;
  const all = Object.entries(st.ex).sort((a, b) => b[1].kg - a[1].kg || b[1].sets - a[1].sets); const ex = all.filter(x => x[1].main), sec = all.filter(x => !x[1].main);
  openSheet(g, `<div class="grid2" style="margin-bottom:12px"><div class="stat"><div class="v">${kgShort(st.kg)}</div><div class="l">${PERIODS[p][0].toLowerCase()}</div></div>
      <div class="stat"><div class="v">${fr(r1(st.sets))}</div><div class="l">série${st.sets >= 2 ? 's' : ''}</div></div></div>
    <div class="card" style="background:var(--surface)"><b>Volume par semaine</b> <span class="small muted">· 12 semaines</span>
      <div class="wchart" style="height:120px;margin-bottom:20px">${weeks.map(w => `<div title="${fmtDate(w.s, { day: 'numeric', month: 'short' })} : ${bigKg(w.kg)}"><i style="height:${w.kg / mx * 100}%"></i><span>${new Date(w.s + 'T12:00:00').getDate()}</span></div>`).join('')}</div>
      <p class="small muted" style="margin:10px 0 0">${zoneTxt(avgSets)}</p></div>
    ${ex.length ? `<h3 style="margin:14px 0 6px">Exercices · ${PERIODS[p][0].toLowerCase()}</h3>${ex.map(([id, o]) => `<div class="item" data-act="tExInfo" data-id="${id}"><div class="grow"><div class="name">${esc(exById(id).name)}</div>
      <div class="meta">${o.sets} série${o.sets > 1 ? 's' : ''}</div></div><b>${o.kg ? kgShort(o.kg) : '—'}</b></div>`).join('')}` : '<p class="muted">Aucun exercice sur cette période.</p>'}
    ${sec.length ? `<details style="margin-top:12px"><summary class="muted">Aussi sollicité en secondaire (${sec.length}) · non compté</summary>${sec.map(([id, o]) => `<div class="item" data-act="tExInfo" data-id="${id}"><div class="grow"><div class="name small">${esc(exById(id).name)}</div><div class="meta">${o.sets} série${o.sets > 1 ? 's' : ''}</div></div></div>`).join('')}</details>` : ''}`);
}
function zoneTxt(perWeek) {
  const v = fr(r1(perWeek));
  if (perWeek < 1) return 'Pas travaillé ces 4 dernières semaines.';
  if (perWeek < 10) return `≈ ${v} séries par semaine (4 dernières semaines). Pour progresser, vise plutôt 10 à 20.`;
  if (perWeek <= 20) return `≈ ${v} séries par semaine : pile dans la zone 10–20 qui fait progresser. 👌`;
  return `≈ ${v} séries par semaine : beaucoup. Surveille la récupération.`;
}

// ---------- Classer les exercices sans muscle ----------
function unclassified() {
  const used = new Set(TS.workouts.flatMap(w => w.exercises.map(e => e.exId)));
  return Object.values(TS.exercises).filter(x => x.muscle === 'Autre' && used.has(x.id));
}
function openClassify() {
  const L = unclassified().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  openSheet('Classer mes exercices', L.length ? `<p class="muted">Ces exercices n’ont pas été reconnus. Choisis leur muscle principal pour qu’ils comptent dans tes statistiques.</p>
    ${L.map(x => `<label class="f">${esc(x.name)}<select data-classify="${x.id}">${MUSCLES.map(m => `<option ${m === x.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>`).join('')}
    <button class="btn primary block" data-act="tClassifyDone">Terminé</button>` : '<p class="muted" style="text-align:center">Tous tes exercices sont classés. ✅</p>');
}
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset && el.dataset.classify) { const x = TS.exercises[el.dataset.classify]; if (x) { x.muscle = el.value; x.mManual = true; if (x.like && EXLIB[x.like] && EXLIB[x.like].muscle !== x.muscle) delete x.like; if (x.equip === 'Autre') x.equip = guessEquip(x.name); tsave(); } }
  if (el.id === 'exMuscleSel') { const x = TS.exercises[el.dataset.id]; if (x) { x.muscle = el.value; x.mManual = true; if (x.like && EXLIB[x.like] && EXLIB[x.like].muscle !== x.muscle) delete x.like; tsave(); toast('Muscle mis à jour'); } }
});
// fiche exercice : muscle modifiable pour les exercices perso / importés
openExInfo0 = (orig => function (id) {
  orig(id);
  const x = TS.exercises[id], b = $('#sheetBody');
  if (x && b) b.insertAdjacentHTML('beforeend', `<label class="f" style="margin-top:12px">Muscle principal<select id="exMuscleSel" data-id="${id}">${MUSCLES.map(m => `<option ${m === x.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>`);
})(openExInfo0);

// ---------- Records & régularité ----------
function topLifts(n = 6) {
  const cnt = {};
  for (const w of TS.workouts) for (const e of w.exercises) { const X = exById(e.exId); if (X.kind === 'wr' && workSets(e).some(s => num(s.w) && num(s.r))) cnt[e.exId] = (cnt[e.exId] || 0) + 1; }
  const ago = Date.now() - 90 * 864e5;
  return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, c]) => {
    const H_ = exHistory(id); const best = exBest(id); const old = exBest(id, ago);
    const pts = H_.slice(0, 16).reverse().map(h => Math.max(0, ...h.sets.filter(s => s.type !== 'w').map(s => e1rm(num(s.w), num(s.r)))));
    return { id, c, best, gain: old.e1 ? best.e1 - old.e1 : null, pts };
  });
}
function spark(pts) {
  if (pts.length < 2) return '';
  const mn = Math.min(...pts), mx = Math.max(...pts), W = 70, H = 26;
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1) * W).toFixed(1)} ${(H - 3 - (mx > mn ? (v - mn) / (mx - mn) : .5) * (H - 6)).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="spk"><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function calendarHTML() {
  const days = new Set(TS.workouts.map(wDate)); const ws = weekStart(); const start = addDays(ws, -7 * 15); const t = todayStr();
  let cols = '';
  for (let c = 0; c < 16; c++) { let col = ''; for (let r = 0; r < 7; r++) { const d = addDays(start, c * 7 + r); col += `<i class="${days.has(d) ? 'on' : ''} ${d > t ? 'fut' : ''}" title="${fmtDate(d, { day: 'numeric', month: 'short' })}"></i>`; } cols += `<div>${col}</div>`; }
  return `<div class="cal">${cols}</div><div class="row between small muted" style="margin-top:6px"><span>${fmtDate(start, { day: 'numeric', month: 'short' })}</span><span>aujourd’hui</span></div>`;
}

// ---------- Vue Progrès ----------
function vTStats2() {
  const L = TS.workouts;
  let h = `<div class="row between" style="margin:4px 0 16px"><h1 style="margin:0">Progrès</h1></div>`;
  if (!L.length) return h + `<div class="card empty"><div style="font-size:38px">📈</div><h2>Pas encore de séance</h2><p class="muted">Termine une séance ou importe ton historique Hevy pour voir ta progression.</p>
    <label class="btn primary block">⤓ Importer mon historique Hevy (CSV)<input type="file" id="hevyIn" accept=".csv,text/csv" hidden></label></div>` + settingsCard();
  const weeks = []; const ws = weekStart();
  for (let i = 11; i >= 0; i--) { const s = addDays(ws, -7 * i), e = addDays(s, 6); const list = inRange(s, e); weeks.push({ s, n: list.length, vol: list.reduce((a, w) => a + wVolume(w), 0), dur: list.reduce((a, w) => a + (w.end ? (w.end - w.start) / 3600000 : 0), 0), reps: list.reduce((a, w) => a + w.exercises.reduce((b, e2) => b + workSets(e2).reduce((c2, x) => c2 + num(x.r), 0), 0), 0) }); }
  let streak = 0; for (let i = weeks.length - 1; i >= 0; i--) { if (weeks[i].n) streak++; else if (i === weeks.length - 1) continue; else break; }
  const tot = L.reduce((a, w) => a + wVolume(w), 0), time = L.reduce((a, w) => a + (w.end ? w.end - w.start : 0), 0);
  const avg4 = weeks.slice(-5, -1).reduce((a, w) => a + w.n, 0) / 4;
  h += `<div class="grid2" style="margin-bottom:14px">
    <div class="stat"><div class="v">${L.length}</div><div class="l">séances au total</div></div>
    <div class="stat"><div class="v">🔥 ${streak}</div><div class="l">semaine${streak > 1 ? 's' : ''} d’affilée</div></div>
    <div class="stat"><div class="v">${kgShort(tot)}</div><div class="l">soulevés au total</div></div>
    <div class="stat"><div class="v">${Math.round(time / 3600000)} h</div><div class="l">d’entraînement</div></div></div>`;
  // graphique hebdo (durée / volume / réps / séances)
  const met = S.ui.tMetric || 'dur';
  const MET = { dur: ['Durée', v => v >= 1 ? `${fr(r1(v))} h` : `${r0(v * 60)} min`], vol: ['Volume', v => kgShort(v)], reps: ['Réps', v => `${r0(v)} réps`], n: ['Séances', v => `${fr(r1(v))} séance${v >= 2 ? 's' : ''}`] };
  const m_ = MET[met] ? met : 'dur'; const cur = weeks[11][m_], maxM = Math.max(0.001, ...weeks.map(w => w[m_]));
  h += `<div class="card"><div class="row between" style="align-items:baseline"><h2 style="margin:0"><b>${MET[m_][1](cur)}</b> <span class="muted" style="font-weight:500">cette semaine</span></h2><span class="small muted">moy. ${MET[m_][1](weeks.slice(7, 11).reduce((a, w) => a + w[m_], 0) / 4)}</span></div>
    <div class="wchart">${weeks.map((w, i) => `<div title="${fmtDate(w.s, { day: 'numeric', month: 'short' })} : ${MET[m_][1](w[m_])}"><i style="height:${w[m_] / maxM * 100}%;${i === 11 ? '' : 'opacity:.55'}"></i><span>${new Date(w.s + 'T12:00:00').getDate()}</span></div>`).join('')}</div>
    <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">${Object.entries(MET).map(([k, [l]]) => `<button class="chip ${m_ === k ? 'on' : ''}" data-act="tMetric" data-v="${k}">${l}</button>`).join('')}</div></div>`;
  // muscles
  const p = S.ui.tPeriod || '30', mm = S.ui.tMusM || 'sets';
  const [from, to] = musPeriodRange(p); const st = groupStats(inRange(from, to));
  const G = Object.entries(st.G).filter(([, o]) => o.sets > 0).sort((a, b) => b[1][mm] - a[1][mm]);
  const mx = Math.max(1, ...G.map(x => x[1][mm])); const nW = p === 'week' ? 1 : +p / 7;
  const unc = unclassified();
  h += `<div class="card"><div class="row between"><h2 style="margin:0">Muscles</h2><div class="seg mini">${[['sets', 'Séries'], ['kg', 'kg']].map(([k, l]) => `<button class="${mm === k ? 'on' : ''}" data-act="tMusM" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div class="row" style="gap:6px;margin:12px 0 4px;flex-wrap:wrap">${Object.entries(PERIODS).filter(([k]) => k !== 'week').reverse().map(([k, [l]]) => `<button class="chip ${p === k ? 'on' : ''}" data-act="tPeriod" data-v="${k}">${l}</button>`).join('')}</div>
    ${G.length ? `${heatMapSVG(Object.fromEntries(Object.entries(st.R).map(([r, o]) => [r, o[mm]])))}
      ${G.map(([g, o]) => { const pw = o.sets / nW; const z = g === 'Autre' || g === 'Corps entier' ? '' : pw < 10 ? 'low' : pw <= 20 ? 'ok' : 'high';
        return `<button class="mvrow" data-act="tMuscleDetail" data-g="${esc(g)}" data-p="${p}"><span class="mvname">${esc(g)}</span><span class="bar"><i style="width:${o[mm] / mx * 100}%"></i></span>
        <span class="mvval"><b>${mm === 'kg' ? kgShort(o.kg) : fr(r1(o.sets))}</b><small>${z ? `<i class="zd ${z}"></i>${fr(r1(pw))}/sem` : mm === 'kg' ? serTxt(o.sets) : kgShort(o.kg)}</small></span></button>`; }).join('')}
      <p class="small muted" style="margin:8px 0 0"><i class="zd ok"></i> 10–20 séries/sem · <i class="zd low"></i> moins · <i class="zd high"></i> plus. Touche un muscle pour voir ses exercices.</p>`
    : '<p class="muted">Aucune séance sur cette période.</p>'}
    ${unc.length ? `<button class="hint warnhint" data-act="tClassify">❔ ${unc.length} exercice${unc.length > 1 ? 's' : ''} sans muscle : <b>les classer ›</b></button>` : ''}</div>`;
  // records
  const T = topLifts();
  if (T.length) h += `<div class="card"><h2>Mes principaux exercices</h2><p class="small muted" style="margin:-4px 0 6px">1RM estimé et évolution sur 3 mois</p>
    ${T.map(x => `<div class="item liftrow" data-act="tExInfo" data-id="${x.id}"><div class="grow"><div class="name">${esc(exById(x.id).name)}</div><div class="meta">${x.c} séance${x.c > 1 ? 's' : ''} · max ${kg(x.best.w)}</div></div>
      ${spark(x.pts)}<div class="liftv"><b>${kg(x.best.e1)}</b>${x.gain != null ? `<small class="${x.gain >= 0 ? 'up' : 'down'}">${x.gain >= 0 ? '+' : '−'}${fr(r1(Math.abs(x.gain)))} kg</small>` : '<small class="muted">nouveau</small>'}</div></div>`).join('')}</div>`;
  // régularité
  h += `<div class="card"><div class="row between" style="align-items:baseline"><h2 style="margin:0">Régularité</h2><span class="small muted">${fr(r1(avg4))} séance${avg4 >= 2 ? 's' : ''}/sem en moyenne</span></div><div style="margin-top:12px">${calendarHTML()}</div></div>`;
  return h + settingsCard();
}
function settingsCard() {
  return `<div class="card"><h2>Réglages</h2>
    <label class="check" style="border:0;padding-top:0"><input type="checkbox" id="t_restOn" ${TS.settings.restOn ? 'checked' : ''}><div class="grow">Minuteur de repos automatique</div></label>
    <label class="f">Temps de repos par défaut<select id="t_rest">${[30, 45, 60, 90, 120, 150, 180, 240].map(v => `<option value="${v}" ${TS.settings.rest === v ? 'selected' : ''}>${clock(v * 1000)}</option>`).join('')}</select></label>
    <label class="btn block">⤓ Importer mon historique Hevy (CSV)<input type="file" id="hevyIn" accept=".csv,text/csv" hidden></label>
    <p class="small muted" style="margin:8px 0 0">Les séances font partie de la sauvegarde exportée dans Nutrition → Besoins → Réglages.</p></div>`;
}
vTStats = vTStats2; VIEWS.t_stats = vTStats2;

// accueil : la carte « soulevés cette semaine » devient un bouton
vTHome = (orig => function () {
  return orig().replace(/<div class="stat">(<div class="v">[^<]*<\/div><div class="l">soulevés cette semaine)<\/div>/,
    '<div class="stat tap" data-act="tWeekVol" role="button">$1 <span class="chev">›</span></div>');
})(vTHome);
VIEWS.t_home = vTHome;

Object.assign(ACTIONS, {
  tWeekVol: () => openWeekVolume(),
  tMuscleDetail: el => openMuscleDetail(el.dataset.g, el.dataset.p || '30'),
  tPeriod: el => { S.ui.tPeriod = el.dataset.v; save(); render(); },
  tMusM: el => { S.ui.tMusM = el.dataset.v; save(); render(); },
  tClassify: () => openClassify(),
  tClassifyDone: () => { closeSheet(); render(); toast('Classement enregistré'); }
});

// ============================================================
//  COURBE DE PROGRESSION D’UN EXERCICE (lisible : axes, tendance, période, curseur)
// ============================================================
const PG_RANGES = [['90', '3 mois'], ['180', '6 mois'], ['365', '1 an'], ['all', 'Tout']];
function pgMetrics(X, H_) {
  const k = X.kind, ws = h => h.sets.filter(s => s.type !== 'w');
  const weighted = H_.some(h => h.sets.some(s => num(s.w)));
  if (k === 'wr' || (k === 'bw' && weighted)) return {
    e1: ['1RM estimé', 'kg', h => Math.max(0, ...ws(h).map(s => e1rm(num(s.w), num(s.r))))],
    max: ['Charge max', 'kg', h => Math.max(0, ...ws(h).map(s => num(s.w)))],
    vol: ['Volume', 'kg', h => ws(h).reduce((a, s) => a + setVol(s), 0)]
  };
  if (k === 'bw') return { reps: ['Meilleure série', 'réps', h => Math.max(0, ...ws(h).map(s => num(s.r)))], tot: ['Total', 'réps', h => ws(h).reduce((a, s) => a + num(s.r), 0)] };
  if (k === 'time') return { t: ['Meilleure durée', 's', h => Math.max(0, ...ws(h).map(s => num(s.t)))] };
  return { km: ['Distance', 'km', h => Math.max(0, ...ws(h).map(s => num(s.km)))] };
}
function niceTicks(lo, hi, n = 4) {
  if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step; const out = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}
const fmtV = (v, u) => u === 'kg' && v >= 1000 ? `${fr(r1(v / 1000))} t` : `${fr(v >= 100 ? r0(v) : r1(v))}`;
const unitV = (v, u) => u === 'kg' && v >= 1000 ? '' : ' ' + u;
let PG_DATA = null;
function pgCardHTML(id) {
  const X = exById(id); const H_ = exHistory(id).slice().reverse(); const M = pgMetrics(X, H_);
  const m = S.ui.pgM in M ? S.ui.pgM : Object.keys(M)[0]; const rg = S.ui.pgR || '180';
  const [lab, unit, fn] = M[m];
  const since = rg === 'all' ? '' : addDays(todayStr(), -(+rg));
  const pts = H_.map(h => ({ d: wDate(h.w), t: h.w.start, v: fn(h) })).filter(p => p.v > 0 && p.d >= since);
  const chips = (list, cur, act) => list.map(([k, l]) => `<button class="chip ${cur === k ? 'on' : ''}" data-act="${act}" data-v="${k}" data-id="${id}">${l}</button>`).join('');
  let body; PG_DATA = null;
  if (pts.length < 2) body = `<p class="muted small" style="margin:18px 0">${pts.length ? 'Une seule séance' : 'Aucune séance'} sur cette période. Choisis une période plus longue.</p>`;
  else {
    // tendance : moyenne glissante exponentielle (lisse les variations d’une séance à l’autre)
    // tendance : moyenne centrée (pas de retard sur les séances)
    const hw = pts.length < 12 ? 1 : pts.length < 40 ? 2 : 4;
    const tr = pts.map((p, i) => { const a = Math.max(0, i - hw), b = Math.min(pts.length - 1, i + hw); let t = 0; for (let j = a; j <= b; j++) t += pts[j].v; return t / (b - a + 1); });
    // séances régulièrement espacées : pas de trous écrasés entre les périodes sans entraînement
    const W = 320, Hh = 210, L = 38, R = 8, T = 12, B = 28; const n = pts.length;
    const vals = pts.map(p => p.v); const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const X_ = i => L + i / Math.max(1, n - 1) * (W - L - R), Y_ = v => T + (1 - (v - y0) / Math.max(1e-6, y1 - y0)) * (Hh - T - B);
    // courbe qui passe par chaque séance (lissage monotone : pas de dépassement entre deux points)
    const line = smoothPath(pts.map((p, i) => [X_(i), Y_(p.v)]));
    const trend = tr.map((v, i) => `${i ? 'L' : 'M'}${X_(i).toFixed(1)},${Y_(v).toFixed(1)}`).join('');
    const area = `${line}L${X_(n - 1).toFixed(1)},${Hh - B}L${L},${Hh - B}Z`;
    // repères de mois sous l’axe
    const months = []; let lastX = -99, prevKey = '';
    pts.forEach((p, i) => { const dt = new Date(p.t); const key = dt.getFullYear() + '-' + dt.getMonth(); if (key === prevKey) return; prevKey = key;
      const x = X_(i); if (x - lastX < 46 || x > W - R - 10) return; lastX = x;
      const yr = !months.length || dt.getMonth() === 0 || months[months.length - 1].y !== dt.getFullYear();
      months.push({ x, y: dt.getFullYear(), t: dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') + (yr ? ' ' + String(dt.getFullYear()).slice(2) : '') }); });
    const bi = pts.reduce((a, p, i) => p.v > pts[a].v ? i : a, 0), best = pts[bi];
    const first = tr[0], last = tr[tr.length - 1], dv = last - first, dp = first ? Math.round(dv / first * 100) : 0;
    const lastP = pts[pts.length - 1];
    body = `<div class="pghead"><div><div class="pgbig">${fmtV(lastP.v, unit)}<small>${unitV(lastP.v, unit)}</small></div><div class="small muted">dernière séance · ${esc(fmtDate(lastP.d, { day: 'numeric', month: 'short' }))}</div></div>
      <div style="text-align:right"><span class="delta ${dv >= 0 ? 'up' : 'down'}">${dv >= 0 ? '▲ +' : '▼ −'}${fmtV(Math.abs(dv), unit)}${unitV(Math.abs(dv), unit)}${dp ? ` · ${Math.abs(dp)} %` : ''}</span><div class="small muted" style="margin-top:4px">sur la période</div></div></div>
    <div class="pgchart" data-id="${id}"><div class="pgtip" hidden></div>
    <svg viewBox="0 0 ${W} ${Hh}" class="pgsvg" role="img" aria-label="Courbe de progression : ${esc(lab)}">
      <defs><linearGradient id="pgfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".32"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y_(v).toFixed(1)}" y2="${Y_(v).toFixed(1)}" class="pggrid"/><text x="${L - 6}" y="${(Y_(v) + 4).toFixed(1)}" text-anchor="end" class="pglab">${fmtV(v, unit)}</text>`).join('')}
      ${months.map(m_ => `<line x1="${m_.x.toFixed(1)}" x2="${m_.x.toFixed(1)}" y1="${Hh - B}" y2="${Hh - B + 4}" class="pgtick"/><text x="${m_.x.toFixed(1)}" y="${Hh - 8}" text-anchor="start" class="pglab">${m_.t}</text>`).join('')}
      <path d="${area}" fill="url(#pgfill)"/>
      <path d="${trend}" fill="none" class="pgtrend"/>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
      ${n <= 60 ? pts.map((p, i) => `<circle cx="${X_(i).toFixed(1)}" cy="${Y_(p.v).toFixed(1)}" r="3" class="pgdot"/>`).join('') : ''}
      <circle cx="${X_(bi).toFixed(1)}" cy="${Y_(best.v).toFixed(1)}" r="5.5" class="pgbest"/>
      <line class="pgcur" x1="0" x2="0" y1="${T}" y2="${Hh - B}" style="display:none"/><circle class="pgcurdot" r="5" style="display:none"/>
    </svg></div>
    <div class="row small muted" style="gap:14px;margin-top:2px;flex-wrap:wrap"><span><i class="lg-line"></i>séances</span><span><i class="lg-trend"></i>tendance</span><span><i class="lg-best"></i>record ${fmtV(best.v, unit)}${unitV(best.v, unit)}</span></div>`;
    PG_DATA = { pts, tr, unit, W, X_, Y_ };
  }
  return `<div class="card pgcard" style="background:var(--surface)"><div class="row between" style="align-items:center"><b>Progression</b><span class="small muted">touche la courbe</span></div>
    <div class="row pgchips">${chips(Object.entries(M).map(([k, v]) => [k, v[0]]), m, 'pgM')}</div>
    ${body}
    <div class="row pgchips">${chips(PG_RANGES, rg, 'pgR')}</div></div>`;
}
function smoothPath(P) {
  const n = P.length; if (n < 3) return P.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0] || 1));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (!d[i]) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b; if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  let s = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) { const dx = (P[i + 1][0] - P[i][0]) / 3;
    s += `C${(P[i][0] + dx).toFixed(1)},${(P[i][1] + m[i] * dx).toFixed(1)} ${(P[i + 1][0] - dx).toFixed(1)},${(P[i + 1][1] - m[i + 1] * dx).toFixed(1)} ${P[i + 1][0].toFixed(1)},${P[i + 1][1].toFixed(1)}`; }
  return s;
}
function pgRefresh(id) { const c = $('#sheetBody .pgcard'); if (c) c.outerHTML = pgCardHTML(id); }
openExInfo0 = (orig => function (id) {
  orig(id);
  const b = $('#sheetBody'); if (!b || exHistory(id).length < 2) return;
  const old = [...b.querySelectorAll('.card')].find(c => /Progression/.test(c.textContent));
  if (old) old.outerHTML = pgCardHTML(id);
})(openExInfo0);
Object.assign(ACTIONS, {
  pgM: el => { S.ui.pgM = el.dataset.v; save(); pgRefresh(el.dataset.id); },
  pgR: el => { S.ui.pgR = el.dataset.v; save(); pgRefresh(el.dataset.id); }
});
// curseur : on touche / glisse sur la courbe pour lire la valeur
function pgPoint(e) {
  const box = e.target && e.target.closest && e.target.closest('.pgchart'); if (!box || !PG_DATA) return;
  const svg = box.querySelector('svg'); const r = svg.getBoundingClientRect(); const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const x = (cx - r.left) / r.width * PG_DATA.W; const D = PG_DATA;
  const bi = Math.round(Math.min(Math.max(0, (x - D.X_(0)) / Math.max(1e-6, D.X_(1) - D.X_(0))), D.pts.length - 1));
  const p = D.pts[bi], px = D.X_(bi), py = D.Y_(p.v);
  const cur = svg.querySelector('.pgcur'), dot = svg.querySelector('.pgcurdot');
  cur.setAttribute('x1', px); cur.setAttribute('x2', px); cur.style.display = ''; dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.style.display = '';
  const tip = box.querySelector('.pgtip'); tip.hidden = false;
  tip.innerHTML = `<b>${fmtV(p.v, D.unit)}${unitV(p.v, D.unit)}</b><span>${esc(fmtDate(p.d, { day: 'numeric', month: 'short', year: 'numeric' }))}</span><span class="muted">tendance ${fmtV(D.tr[bi], D.unit)}${unitV(D.tr[bi], D.unit)}</span>`;
  const left = px / D.W * r.width; tip.style.left = Math.min(Math.max(left, 64), r.width - 64) + 'px';
}
document.addEventListener('pointerdown', pgPoint);
document.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') pgPoint(e); });
document.addEventListener('touchmove', e => { if (e.target.closest && e.target.closest('.pgchart')) pgPoint(e); }, { passive: true });

// mini-courbes de « Mes principaux exercices » : plus grandes, avec le dernier point
spark = function (pts) {
  if (pts.length < 2) return '';
  const mn = Math.min(...pts), mx = Math.max(...pts), W = 84, H = 34;
  const P = pts.map((v, i) => [3 + i / (pts.length - 1) * (W - 6), H - 4 - (mx > mn ? (v - mn) / (mx - mn) : .5) * (H - 8)]);
  const d = P.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(''); const l = P[P.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="spk"><path d="${d}L${l[0].toFixed(1)} ${H}L3 ${H}Z" fill="var(--accent)" opacity=".14"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${l[0].toFixed(1)}" cy="${l[1].toFixed(1)}" r="3" fill="var(--accent)"/></svg>`;
};

// ============================================================
//  HISTORIQUE v2 : recherche, filtres, cartes lisibles, détail de séance comparé
// ============================================================
const wRegions = w => { const c = {}; for (const e of w.exercises) { const n = workSets(e).length; if (!n) continue; for (const [r, k] of Object.entries(exRegions(exById(e.exId)))) c[r] = (c[r] || 0) + n * k; } return c; };
const wMainGroups = w => { const G = groupStats([w]).G; return Object.entries(G).filter(([, o]) => o.sets > 0).sort((a, b) => b[1].sets - a[1].sets).map(([g]) => g); };
const bestSet = (e, kind) => { const L = workSets(e); if (!L.length) return null; if (kind === 'time') return L.reduce((a, s) => num(s.t) > num(a.t) ? s : a); if (kind === 'cardio') return L.reduce((a, s) => num(s.km) > num(a.km) ? s : a);
  return L.reduce((a, s) => (e1rm(num(s.w), num(s.r)) || num(s.r) / 100) > (e1rm(num(a.w), num(a.r)) || num(a.r) / 100) ? s : a); };
const prevSameName = w => sortedW().find(x => x.start < w.start && norm(x.name) === norm(w.name));
const HIST_PAGE = 25;
let HIST_N = HIST_PAGE;
function histFiltered() {
  const q = norm((S.ui.hQ || '').trim()), f = S.ui.hF || '';
  return sortedW().filter(w => (!f || norm(w.name) === f) && (!q || q.split(/\s+/).every(t => norm(w.name + ' ' + w.exercises.map(e => exById(e.exId).name).join(' ')).includes(t))));
}
function histCardHTML(w) {
  const d = new Date(w.start); const pv = prevSameName(w); const vol = wVolume(w);
  const dv = pv && wVolume(pv) ? Math.round((vol - wVolume(pv)) / wVolume(pv) * 100) : null;
  const groups = wMainGroups(w).slice(0, 3);
  const ex = w.exercises.filter(e => workSets(e).length);
  return `<section class="card whist2" data-act="tWOpen" data-id="${w.id}">
    <div class="wh-top"><div class="wh-date"><b>${d.getDate()}</b><span>${d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span></div>
      <div class="grow" style="min-width:0"><h2 class="wh-name">${esc(w.name)}</h2>
        <div class="wh-tags">${groups.map(g => `<span>${esc(g)}</span>`).join('')}${w.prs && w.prs.length ? `<span class="pr">🏆 ${w.prs.length} record${w.prs.length > 1 ? 's' : ''}</span>` : ''}</div></div>
      <div class="wh-map">${heatMapSVG(wRegions(w))}</div></div>
    <div class="wh-stats"><div><b>${w.end ? dur(w.end - w.start) : '—'}</b><span>durée</span></div><div><b>${kgShort(vol)}</b><span>volume${dv != null ? ` <i class="${dv >= 0 ? 'up' : 'down'}">${dv >= 0 ? '▲' : '▼'}${Math.abs(dv)} %</i>` : ''}</span></div><div><b>${wSets(w)}</b><span>séries</span></div></div>
    <div class="wh-ex">${ex.slice(0, 4).map(e => { const X = exById(e.exId); const b = bestSet(e, X.kind); return `<div><span class="n">${workSets(e).length}×</span><span class="grow">${esc(X.name)}</span><span class="b">${b ? esc(setText(b, X.kind)) : ''}</span></div>`; }).join('')}
      ${ex.length > 4 ? `<div class="more">+ ${ex.length - 4} exercice${ex.length - 4 > 1 ? 's' : ''}</div>` : ''}</div></section>`;
}
function histListHTML() {
  const L = histFiltered(); if (!L.length) return '<p class="muted" style="text-align:center;margin-top:24px">Aucune séance ne correspond.</p>';
  let h = '', month = '';
  const byMonth = {}; for (const w of L) { const k = wDate(w).slice(0, 7); (byMonth[k] = byMonth[k] || []).push(w); }
  for (const w of L.slice(0, HIST_N)) {
    const k = wDate(w).slice(0, 7);
    if (k !== month) { month = k; const M = byMonth[k]; h += `<div class="monthhead2"><b>${esc(fmtDate(k + '-15', { month: 'long', year: 'numeric' }))}</b><span>${M.length} séance${M.length > 1 ? 's' : ''} · ${kgShort(M.reduce((a, x) => a + wVolume(x), 0))}</span></div>`; }
    h += histCardHTML(w);
  }
  if (L.length > HIST_N) h += `<button class="btn block" data-act="tHistMore" style="margin-top:6px">Voir plus (${L.length - HIST_N} séances)</button>`;
  return h;
}
vTHist = function () {
  const all = TS.workouts;
  let h = `<div class="row between" style="margin:4px 0 14px"><h1 style="margin:0">Historique</h1>
    <label class="btn sm">⤓ Importer Hevy<input type="file" id="hevyIn" accept=".csv,text/csv" hidden></label></div>`;
  if (!all.length) return h + `<div class="card empty"><div style="font-size:38px">🗓️</div><h2>Pas encore de séance</h2><p class="muted">Tes séances terminées apparaîtront ici. Tu peux aussi récupérer tout ton historique Hevy : dans Hevy, Profil → Réglages → Export &amp; Import Data → Export Workouts, puis « Importer Hevy » ici.</p></div>`;
  const names = {}; for (const w of all) { const k = norm(w.name); names[k] = names[k] || { n: 0, label: w.name }; names[k].n++; }
  const top = Object.entries(names).sort((a, b) => b[1].n - a[1].n).slice(0, 8); const f = S.ui.hF || '';
  h += `<input type="search" id="histq" placeholder="Rechercher une séance ou un exercice" value="${esc(S.ui.hQ || '')}" style="width:100%" autocomplete="off">
    <div class="chipsrow">${[['', 'Toutes', all.length], ...top.map(([k, o]) => [k, o.label, o.n])].map(([k, l, n]) => `<span class="chip ${f === k ? 'on' : ''}" data-act="tHistF" data-v="${esc(k)}">${esc(l)} <small class="muted">${n}</small></span>`).join('')}</div>
    <div id="histlist">${histListHTML()}</div>`;
  return h;
};
VIEWS.t_hist = vTHist;
document.addEventListener('input', e => { if (e.target.id === 'histq') { S.ui.hQ = e.target.value; save(); HIST_N = HIST_PAGE; const b = $('#histlist'); if (b) b.innerHTML = histListHTML(); } });

// ---------- Détail d’une séance ----------
openWorkout = function (id) {
  const w = TS.workouts.find(x => x.id === id); if (!w) return;
  const pv = prevSameName(w); const vol = wVolume(w); const pr = w.prSets || [];
  const reps = w.exercises.reduce((a, e) => a + workSets(e).reduce((b, s) => b + num(s.r), 0), 0);
  const delta = (a, b, f) => b ? `<i class="${a >= b ? 'up' : 'down'}">${a >= b ? '+' : '−'}${f(Math.abs(a - b))}</i>` : '';
  const G = groupStats([w]).G; const GL = Object.entries(G).filter(([, o]) => o.sets > 0).sort((a, b) => b[1].sets - a[1].sets); const gm = Math.max(1, ...GL.map(x => x[1].sets));
  let h = `<div class="small muted" style="margin:-4px 0 12px;text-transform:capitalize">${esc(fmtDate(wDate(w), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · ${new Date(w.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    <div class="wd-stats"><div><b>${w.end ? dur(w.end - w.start) : '—'}</b><span>durée</span></div><div><b>${kgShort(vol)}</b><span>volume ${pv ? delta(vol, wVolume(pv), kgShort) : ''}</span></div>
      <div><b>${wSets(w)}</b><span>séries ${pv ? delta(wSets(w), wSets(pv), v => v) : ''}</span></div></div>
    <div class="small muted" style="margin:6px 2px 0">${reps} répétitions au total</div>
    ${pv ? `<p class="small muted" style="margin:6px 2px 12px">Comparé à ta séance « ${esc(pv.name)} » du ${esc(fmtDate(wDate(pv), { day: 'numeric', month: 'short' }))}.</p>` : ''}`;
  if (w.prDetail && w.prDetail.length) h += w.prDetail.map(p => `<div class="prcard"><div class="prmed">🏅</div><div class="grow"><div class="prex">${esc(p.ex)}</div><div class="small muted">${esc(p.type)}</div></div><div class="prval"><b>${esc(p.nw)}</b><span>avant : ${esc(p.old)}</span></div></div>`).join('');
  else if (w.prs && w.prs.length) h += `<div class="solbox"><b>🏆 Records</b><ul>${w.prs.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
  if (GL.length) h += `<div class="card wd-mus" style="background:var(--surface)"><div class="wd-map">${heatMapSVG(wRegions(w))}</div><div class="grow">${GL.map(([g, o]) => `<div class="wd-mrow"><span>${esc(g)}</span><div class="bar"><i style="width:${o.sets / gm * 100}%"></i></div><b>${fr(r1(o.sets))}</b></div>`).join('')}<div class="small muted" style="margin-top:4px">séries par muscle</div></div></div>`;
  h += w.exercises.map((e, ei) => {
    const X = exById(e.exId); const k = X.kind; const lift = k === 'wr' || k === 'bw';
    const last = exHistory(e.exId, w.start)[0]; const b = bestSet(e, k);
    const now1 = b && lift ? e1rm(num(b.w), num(b.r)) : 0; const lb = last ? bestSet({ sets: last.sets }, k) : null; const old1 = lb && lift ? e1rm(num(lb.w), num(lb.r)) : 0;
    let n = 0;
    return `<div class="card wd-ex" style="background:var(--surface)"><div class="row between" style="align-items:flex-start;gap:10px"><div class="grow"><b data-act="tExInfo" data-id="${e.exId}" class="wd-exn">${esc(X.name)}</b>
        <div class="small muted">${last ? `Dernière fois (${esc(fmtDate(wDate(last.w), { day: 'numeric', month: 'short' }))}) : ${esc(lb ? setText(lb, k) : '—')}` : 'Première fois'}</div></div>
        ${now1 && old1 ? `<span class="wd-trend ${now1 >= old1 ? 'up' : 'down'}">${now1 > old1 ? '▲' : now1 < old1 ? '▼' : '='} ${fr(r1(Math.abs(now1 - old1)))} kg</span>` : ''}</div>
      ${e.notes ? `<div class="wd-note">📝 ${esc(e.notes)}</div>` : ''}
      <div class="wd-sets"><div class="wd-sh"><span>Série</span><span>${k === 'time' ? 'Durée' : k === 'cardio' ? 'Distance' : k === 'bw' ? 'Réps (+kg)' : 'Charge × réps'}</span><span>${lift ? '1RM est.' : ''}</span></div>
      ${e.sets.filter(s => s.done).map((s) => { const si = e.sets.indexOf(s); if (s.type !== 'w') n++; const isPr = pr.includes(ei + '-' + si); const isBest = s === b;
        return `<div class="wd-set ${isPr ? 'isPr' : ''} ${isBest ? 'best' : ''} ${s.type === 'w' ? 'warm' : ''}"><span class="wd-st ${s.type}">${s.type === 'w' ? 'É' : s.type === 'd' ? 'D' : s.type === 'f' ? 'F' : n}</span>
          <span>${isPr ? '🏆 ' : ''}${esc(setText(s, k))}${s.rpe ? ` <small class="muted">RPE ${fr(s.rpe)}</small>` : ''}</span><span class="muted">${lift && s.type !== 'w' && num(s.w) && num(s.r) ? kg(e1rm(num(s.w), num(s.r))) : ''}</span></div>`; }).join('')}</div></div>`;
  }).join('');
  h += `<div class="row" style="gap:10px;margin-top:4px"><button class="btn danger" data-act="tWDel" data-id="${w.id}">Supprimer</button><button class="btn primary grow" data-act="tWRedo" data-id="${w.id}">↻ Refaire cette séance</button></div>`;
  openSheet(w.name, h);
};
Object.assign(ACTIONS, {
  tHistF: el => { S.ui.hF = el.dataset.v; save(); HIST_N = HIST_PAGE; render(); },
  tHistMore: el => { HIST_N += HIST_PAGE * 2; const b = $('#histlist'); if (b) b.innerHTML = histListHTML(); },
  tWOpen: el => openWorkout(el.dataset.id)
});

// ============================================================
//  ROUTINES DEPUIS L’HISTORIQUE : Push, Pull, Legs, Upper… reconstruites à partir des séances importées
// ============================================================
const STARTER_NAMES = new Set(starterRoutines().map(r => r.name));
const SPLIT_RE = /\b(push|pull|legs?|upper|lower|full ?body)\b/;
function sessionGroups() {
  const G = {};
  for (const w of sortedW()) { const k = norm(w.name).trim(); if (!k) continue; (G[k] = G[k] || { name: w.name, list: [] }).list.push(w); }
  return Object.entries(G).map(([k, o]) => ({ key: k, ...o })).sort((a, b) => b.list.length - a.list.length);
}
// routine type à partir des dernières séances de ce nom
function routineFromSessions(name, list) {
  const recent = list.slice(0, 6); // les plus récentes d’abord
  const stats = {};
  recent.forEach((w, wi) => {
    // un même exercice fait en deux blocs dans la séance compte une seule fois (séries additionnées)
    const M = new Map();
    for (const e of w.exercises) { const ws = workSets(e); if (!ws.length) continue; const m = M.get(e.exId) || { sets: 0, reps: [] }; m.sets += ws.length; for (const s of ws) if (num(s.r)) m.reps.push(num(s.r)); M.set(e.exId, m); }
    const ids = [...M.keys()];
    ids.forEach((id, pos) => {
      const o = stats[id] || (stats[id] = { n: 0, pos: 0, sets: [], reps: [], last: Infinity }); const m = M.get(id);
      o.n++; o.pos += pos / Math.max(1, ids.length - 1); o.sets.push(m.sets); o.last = Math.min(o.last, wi); o.reps.push(...m.reps);
    });
  });
  const minN = recent.length >= 3 ? Math.ceil(recent.length * 0.4) : 1;
  const med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
  const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.max(0, Math.round((b.length - 1) * p)))] : 0; };
  const keep = Object.entries(stats).filter(([, o]) => o.n >= minN || o.last === 0 && recent.length < 3)
    .sort((a, b) => a[1].pos / a[1].n - b[1].pos / b[1].n);
  return {
    id: uid(), name, src: 'hist',
    exercises: keep.map(([exId, o]) => { const lo = q(o.reps, .2), hi = q(o.reps, .8); const X = exById(exId);
      return { exId, sets: Math.max(1, Math.min(8, med(o.sets))), reps: X.kind === 'time' || X.kind === 'cardio' || !lo ? '' : lo === hi ? String(lo) : `${lo}-${hi}` }; })
  };
}
let RTI = null;
function openRoutineImport() {
  const G = sessionGroups().filter(g => g.list.length >= 1);
  if (!G.length) { toast('Aucune séance dans ton historique'); return; }
  const existing = new Set(TS.routines.map(r => norm(r.name).trim()));
  RTI = { sel: new Set(G.filter(g => SPLIT_RE.test(g.key)).map(g => g.key)), dropStarter: TS.routines.some(r => STARTER_NAMES.has(r.name)) };
  const body = () => `<p class="muted" style="margin-top:0">Choisis les séances à transformer en routine. Pour chacune, l’appli reprend les exercices que tu fais vraiment (sur tes 6 dernières séances de ce nom), dans ton ordre habituel, avec ton nombre de séries et ta fourchette de répétitions.</p>
    ${G.map(g => { const on = RTI.sel.has(g.key); const r = routineFromSessions(g.name, g.list);
      return `<div class="rti ${on ? 'on' : ''}" data-act="rtiToggle" data-k="${esc(g.key)}"><div class="row between" style="gap:10px"><div class="grow"><b>${esc(g.name)}</b>
        <div class="small muted">${g.list.length} séance${g.list.length > 1 ? 's' : ''} · dernière ${esc(relDay(wDate(g.list[0])))}${existing.has(g.key) ? ' · <span style="color:var(--warn)">remplacera ta routine du même nom</span>' : ''}</div></div><span class="pcheck">${on ? '✓' : ''}</span></div>
        ${on ? `<div class="rti-ex">${r.exercises.map(e => `<div><span>${esc(exById(e.exId).name)}</span><span class="muted">${e.sets} × ${esc(e.reps || '—')}</span></div>`).join('')}</div>` : ''}</div>`; }).join('')}
    ${TS.routines.some(r => STARTER_NAMES.has(r.name)) ? `<label class="check" style="border:0"><input type="checkbox" id="rti_drop" ${RTI.dropStarter ? 'checked' : ''}><div class="grow">Retirer les programmes exemples</div></label>` : ''}
    <button class="btn primary block" data-act="rtiCreate">Créer ${RTI.sel.size || ''} routine${RTI.sel.size > 1 ? 's' : ''}</button>`;
  RTI.body = body; RTI.G = G;
  openSheet('Routines depuis mon historique', body());
}
document.addEventListener('change', e => { if (e.target.id === 'rti_drop' && RTI) RTI.dropStarter = e.target.checked; });
Object.assign(ACTIONS, {
  tRoutinesFromHist: () => openRoutineImport(),
  rtiToggle: el => { const k = el.dataset.k; RTI.sel.has(k) ? RTI.sel.delete(k) : RTI.sel.add(k); const b = $('#sheetBody'); const st = b.scrollTop; b.innerHTML = RTI.body(); b.scrollTop = st; },
  rtiCreate: () => {
    if (!RTI || !RTI.sel.size) { toast('Choisis au moins une séance'); return; }
    const made = [];
    for (const g of RTI.G) if (RTI.sel.has(g.key)) {
      const r = routineFromSessions(g.name, g.list); if (!r.exercises.length) continue;
      const i = TS.routines.findIndex(x => norm(x.name).trim() === g.key);
      if (i >= 0) { r.id = TS.routines[i].id; TS.routines[i] = r; } else TS.routines.push(r);
      made.push(r.name);
    }
    if (RTI.dropStarter) TS.routines = TS.routines.filter(r => !STARTER_NAMES.has(r.name));
    tsave(); RTI = null; closeSheet(); S.ui.tab = 't_home'; save(); render();
    toast(`${made.length} routine${made.length > 1 ? 's' : ''} créée${made.length > 1 ? 's' : ''} : ${made.join(', ')}`);
  }
});
// accueil Entraînement : bouton d’accès
vTHome = (orig => function () {
  let h = orig();
  if (!TS.workouts.length) return h;
  const btn = `<button class="btn block rtibtn" data-act="tRoutinesFromHist">⤓ Routines depuis mon historique</button>`;
  return h.replace(/(<h2 style="margin:0">Mes routines<\/h2>[\s\S]*?<\/div>)/, `$1${btn}`);
})(vTHome);
VIEWS.t_home = vTHome;
