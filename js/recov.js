// ============================================================
//  RÉCUPÉRATION : bilan du matin (déclaré), charge d’entraînement (mesurée),
//  bilan énergétique (estimé) → score compréhensible + détection de fatigue accumulée
//  Rien n’est inventé : une composante sans donnée est simplement ignorée et signalée.
// ============================================================
const CK_FIELDS = [
  ['sleep', 'Sommeil', [5, 6, 6.5, 7, 7.5, 8, 8.5, 9], v => v === 9 ? '9 h +' : fr(v) + ' h'],
  ['sq', 'Qualité du sommeil', [1, 2, 3, 4, 5], v => ['😫', '😕', '😐', '🙂', '😴'][v - 1]],
  ['energy', 'Énergie', [1, 2, 3, 4, 5], v => ['🪫', '😮‍💨', '😐', '🙂', '⚡'][v - 1]],
  ['sore', 'Courbatures', [1, 2, 3, 4, 5], v => ['aucune', 'légères', 'moyennes', 'fortes', 'très fortes'][v - 1]],
  ['stress', 'Stress', [1, 2, 3, 4, 5], v => ['zen', 'faible', 'moyen', 'élevé', 'très élevé'][v - 1]]
];
function ckHTML() {
  const d = todayStr(); const c = S.checkins[d] || {};
  return `<p class="small muted" style="margin-top:0">10 secondes, tout est facultatif. Ces réponses sont <b>déclarées</b> : elles servent au score de récupération et aux conseils, jamais remplacées par des valeurs inventées.</p>
    ${CK_FIELDS.map(([k, l, vals, lab]) => `<div class="ckq"><div class="ckl">${l}</div><div class="chipsrow" style="padding:4px 0 2px">${vals.map(v => `<button class="chip ${c[k] === v ? 'on' : ''}" data-act="ckSet" data-k="${k}" data-v="${v}">${lab(v)}</button>`).join('')}</div></div>`).join('')}
    <button class="btn primary block" data-act="ckDone">Voir ma récupération</button>`;
}
ACTIONS.ckOpen = () => { openSheet('Bilan du matin', ckHTML()); };
ACTIONS.ckSet = el => {
  const d = todayStr(); const c = S.checkins[d] || (S.checkins[d] = {}); const k = el.dataset.k, v = +el.dataset.v;
  if (c[k] === v) delete c[k]; else c[k] = v; if (!Object.keys(c).length) delete S.checkins[d];
  save(); haptic([6]); el.parentElement.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', +b.dataset.v === c[k]));
};
ACTIONS.ckDone = () => { sheetSwap(() => openRecovery(), 1); if (typeof showLauncher === 'function' && $('#launch')) showLauncher(); };

// ---------- charge d’entraînement ----------
function dayLoads(days = 35) {
  const out = {}; const since = Date.now() - days * 864e5;
  for (const w of TS.workouts) if (w.start > since) { const d = wDate(w); out[d] = (out[d] || 0) + w.exercises.reduce((a, e) => a + ENG.sessionLoad(workSets(e).map(s => ({ rpe: num(s.rpe) }))), 0); }
  return out;
}
function recovery() {
  const d = todayStr(); const c = S.checkins[d] || {};
  const L = dayLoads(); const ac = ENG.acwr(L, d);
  const last = sortedW()[0]; const hSince = last ? (Date.now() - (last.end || last.start)) / 3600e3 : null;
  // composantes
  const sl = c.sleep != null || c.sq != null ? ENG.avg([ENG.sleepScore(c.sleep), ENG.scale5(c.sq)].filter(x => x != null)) : null;
  const fe = [ENG.scale5(c.energy), ENG.scale5(c.sore, true), ENG.scale5(c.stress, true)].filter(x => x != null);
  let ld = TS.workouts.length >= 6 ? ENG.loadScore(ac.ratio) : null; if (ld != null && hSince != null && hSince < 20) ld -= 12;
  const tr = TS.workouts.length >= 6 ? exTrends(35) : []; const drops = tr.filter(x => x.status === 'baisse');
  const pf = tr.length ? (drops.length === 0 ? 85 : drops.length === 1 ? 60 : 35) : null;
  const a7 = typeof avgIntake === 'function' ? avgIntake(7) : null; const tv = S.tdee && S.tdee.v;
  const def = a7 && a7.n >= 3 && tv ? (tv - a7.v) / tv * 100 : null;
  const en = def == null ? null : def <= 10 ? 85 : def <= 20 ? 65 : def <= 30 ? 45 : 25;
  const parts = [
    { key: 'sleep', label: 'Sommeil', score: sl, weight: 3, origin: 'd', txt: c.sleep != null ? `${fr(c.sleep)} h${c.sq ? ', qualité ' + c.sq + '/5' : ''}` : c.sq ? `qualité ${c.sq}/5` : 'non renseigné aujourd’hui' },
    { key: 'feel', label: 'Sensations', score: fe.length ? ENG.avg(fe) : null, weight: 2, origin: 'd', txt: fe.length ? [c.energy && `énergie ${c.energy}/5`, c.sore && `courbatures ${c.sore}/5`, c.stress && `stress ${c.stress}/5`].filter(Boolean).join(', ') : 'non renseignées aujourd’hui' },
    { key: 'load', label: 'Charge d’entraînement', score: ld, weight: 2, origin: 'm', txt: ac.ratio != null ? `7 derniers jours = ${fr(r1(ac.ratio))} × ta moyenne des 4 semaines${hSince != null && hSince < 20 ? ' · séance il y a moins de 20 h' : ''}` : 'pas assez de séances' },
    { key: 'perf', label: 'Performances', score: pf, weight: 2, origin: 'm', txt: pf == null ? 'pas assez de données' : drops.length ? `${drops.length} exercice${drops.length > 1 ? 's' : ''} en baisse (5 semaines)` : 'aucune baisse récente' },
    { key: 'energy', label: 'Bilan énergétique', score: en, weight: 1, origin: 'e', txt: def == null ? 'journal ou dépense insuffisants' : `${def > 0 ? 'déficit' : 'surplus'} d’environ ${r0(Math.abs(def))} % (7 j)` }
  ];
  const R = ENG.recoveryScore(parts);
  // fatigue accumulée : plusieurs signaux convergents
  const flags = [];
  if (ac.ratio != null && ac.ratio > 1.3 && TS.workouts.length >= 6) flags.push(`charge des 7 derniers jours ${fr(r1(ac.ratio))} × supérieure à ta moyenne`);
  if (drops.length >= 2) flags.push(`${drops.length} exercices en baisse sur 5 semaines`);
  const rs = typeof rpeStats === 'function' ? rpeStats(14) : null; if (rs && rs.n >= 15 && rs.prevAvg && rs.avg - rs.prevAvg >= 0.7) flags.push(`effort ressenti en hausse (RPE ${fr(r1(rs.prevAvg))} → ${fr(r1(rs.avg))})`);
  const lastCk = Object.keys(S.checkins).sort().slice(-5).map(k => S.checkins[k]).filter(x => x.energy); if (lastCk.length >= 3 && lastCk.filter(x => x.energy <= 2).length >= 3) flags.push('énergie basse sur au moins 3 des 5 derniers bilans');
  if (def != null && def > 25) flags.push(`déficit calorique marqué (${r0(def)} %)`);
  return { ...R, flags, fatigue: flags.length >= 2 ? 'probable' : flags.length === 1 ? 'possible' : 'non', hasCk: !!S.checkins[d] };
}
const scoreLab = s => s == null ? ['—', 'var(--muted)'] : s >= 75 ? ['Bonne', '#30d158'] : s >= 55 ? ['Correcte', '#ffd60a'] : s >= 40 ? ['Moyenne', '#ff9f0a'] : ['Basse', '#ff453a'];
function openRecovery() {
  const R = recovery(); const [lab, col] = scoreLab(R.score);
  openSheet('Récupération', `<div class="rchead">${typeof lRing === 'function' ? `<div class="rcring">${lRing((R.score || 0) / 100, col, 92, 10)}<span><b>${R.score ?? '?'}</b><small>/100</small></span></div>` : ''}
      <div><b style="color:${col};font-size:20px">${R.score == null ? 'Pas encore de score' : lab}</b><div class="small muted">Basé sur ${R.known}/5 sources aujourd’hui. ${R.known < 3 ? 'Plus de sources = score plus fiable.' : ''}</div>
      ${R.hasCk ? '' : '<button class="btn sm primary" data-act="ckOpen" style="margin-top:8px">Faire mon bilan du matin</button>'}</div></div>
    ${R.parts.map(p => `<div class="rcp ${p.score == null ? 'off' : ''}"><div class="grow"><div class="row" style="gap:6px"><b>${p.label}</b>${orig3(p.origin)}</div><div class="small muted">${esc(p.txt)}</div></div><b class="rcs">${p.score == null ? '—' : Math.round(p.score)}</b></div>`).join('')}
    <div class="card" style="background:var(--surface);margin-top:12px"><b>Fatigue accumulée : ${R.fatigue === 'probable' ? '<span style="color:#ff9f0a">probable</span>' : R.fatigue === 'possible' ? 'possible' : '<span style="color:#30d158">pas de signal</span>'}</b>
      ${R.flags.length ? `<ul class="small" style="margin:6px 0 0;padding-left:18px">${R.flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul><p class="small muted" style="margin:6px 0 0">${R.fatigue === 'probable' ? 'Plusieurs signaux vont dans le même sens : une semaine plus légère (−30 à −50 % de séries, mêmes charges) permet souvent de repartir. Ce n’est qu’une hypothèse : à toi de juger avec tes sensations.' : 'Un seul signal : rien d’alarmant, à surveiller.'}</p>` : '<p class="small muted" style="margin:6px 0 0">Aucun des signaux suivis (charge, performances, effort ressenti, énergie, déficit) n’est en alerte.</p>'}</div>
    <details style="margin-top:8px"><summary class="small" style="color:var(--accent)">Comment le score est calculé ?</summary><div class="small muted">
      <p>Moyenne pondérée des composantes disponibles : sommeil ×3, sensations ×2, charge ×2, performances ×2, bilan énergétique ×1. Une composante sans donnée est ignorée (jamais devinée).</p>
      <p><b>Sommeil</b> : 100 à 8 h, moins 18 points par heure d’écart (et davantage sous 6 h), moyenné avec la qualité. <b>Sensations</b> : énergie, courbatures et stress ramenés sur 100. <b>Charge</b> : séries × effort (RPE/10, ou 0,75 s’il n’est pas noté) sur 7 jours, comparées à ta moyenne hebdomadaire sur 28 jours (≤ 1,1 : 90 ; ≤ 1,3 : 70 ; ≤ 1,5 : 45 ; au-delà : 25). <b>Performances</b> : exercices en baisse sur 5 semaines. <b>Bilan énergétique</b> : écart entre ce que tu manges (journées complètes) et ta dépense estimée.</p>
      <p>Les étiquettes <i>mesuré</i>, <i>déclaré</i> et <i>estimé</i> indiquent l’origine de chaque donnée.</p></div></details>
    <button class="btn block" data-act="ckOpen" style="margin-top:10px">${R.hasCk ? 'Modifier mon bilan du matin' : 'Bilan du matin'}</button>`);
}
ACTIONS.rcOpen = () => openRecovery();
