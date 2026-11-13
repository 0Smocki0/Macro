// ============================================================
//  ENTRAÎNEMENT 2 : objectif proposé pour chaque exercice (double progression),
//  stagnations / baisses, analyse RPE-RIR, volume personnalisé et analyse par muscle
// ============================================================
const e1 = s => e1rm(num(s.w), num(s.r));
// séances d’un exercice : du plus récent au plus ancien, séries de travail avec charge et répétitions
function exSessions(exId, before = Infinity) {
  return exHistory(exId, before).map(h => ({ date: fmtDate(wDate(h.w), { day: 'numeric', month: 'short' }), t: h.w.start, sets: h.sets.filter(s => s.type !== 'w' && num(s.r) > 0).map(s => ({ w: num(s.w), r: num(s.r), rpe: num(s.rpe) || null })) })).filter(s => s.sets.length);
}
function trainLvl() {
  if (!TS.workouts.length) return 'débutant';
  const first = Math.min(...TS.workouts.map(w => w.start)); const n8 = TS.workouts.filter(w => w.start > Date.now() - 56 * 864e5).length;
  return ENG.trainingLevel(first, Date.now(), n8 / 8);
}
// fourchette de répétitions : note « Objectif : 8-12 » de la séance > routine > selon le type d’exercice
function rangeOf(ex, routineId) {
  const m = String(ex.notes || '').match(/objectif\s*:\s*([\d\s\-–à]+)/i);
  if (m) return ENG.parseRange(m[1]);
  const r = TS.routines.find(x => x.id === routineId); const re = r && r.exercises.find(e => e.exId === ex.exId);
  return ENG.parseRange(re && re.reps, isCompound(exById(ex.exId)));
}
const TGT_CACHE = {};
function targetFor(ex, routineId) {
  const X = exById(ex.exId); if (X.kind !== 'wr' && !(X.kind === 'bw' && ex.sets.some(s => num(s.w)))) return null;
  const rg = rangeOf(ex, routineId); const key = ex.exId + '|' + rg + '|' + TS.workouts.length;
  if (!TGT_CACHE[key]) { const S_ = exSessions(ex.exId, TS.active ? TS.active.start : Infinity).slice(0, 6); TGT_CACHE[key] = { ...ENG.nextTarget({ sessions: S_, range: rg, equip: X.equip, lvl: trainLvl() }), range: rg, n: S_.length }; }
  return TGT_CACHE[key];
}
const tgtTxt = t => t.kind === 'start' ? `${t.range[0]}–${t.range[1]} réps` : `${fr(t.w)} kg × ${t.r}${t.kind === 'reps' && t.r < t.range[1] ? '+' : ''}`;
function decorLive() {
  const A_ = TS.active; if (!A_) return;
  document.querySelectorAll('#view .card.exo').forEach((c, ei) => {
    const ex = A_.exercises[ei]; if (!ex || c.querySelector('.tgt')) return;
    const t = targetFor(ex, A_.routineId); if (!t) return;
    const ic = { load: '⬆️', reps: '➕', hold: '⏸️', deload: '⬇️', start: '🎯' }[t.kind];
    const pills = c.querySelector('.pills'); if (pills) pills.insertAdjacentHTML('afterend', `<button class="tgt k-${t.kind}" data-act="tgtWhy" data-ei="${ei}"><span>${ic}</span><span class="grow">Objectif : <b>${esc(tgtTxt(t))}</b></span><span class="tgt-q">pourquoi ›</span></button>`);
  });
}
// carte de conseil au format commun : détecté / données / pourquoi / recommandation / confiance
function insightCard(x) {
  return `<div class="ins ${x.lvl || ''}"><div class="ins-h"><span>${x.ic || '💡'}</span><b>${x.title}</b></div>
    <div class="ins-l">Ce qui a été détecté</div><div>${x.detected}</div>
    ${x.data && x.data.length ? `<div class="ins-l">Données utilisées</div><ul class="ins-d">${x.data.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
    ${x.why ? `<div class="ins-l">Pourquoi c’est important</div><div>${x.why}</div>` : ''}
    <div class="ins-l">Ce qui est recommandé</div><div class="ins-r">${x.reco}</div>
    <div class="ins-f">${confPill(x.conf)}${x.hyp !== false ? '<span class="small muted">hypothèse, pas une certitude</span>' : ''}</div></div>`;
}
ACTIONS.tgtWhy = el => {
  const ei = +el.dataset.ei; const A_ = TS.active; const ex = A_ && A_.exercises[ei]; if (!ex) return;
  const t = targetFor(ex, A_.routineId); const X = exById(ex.exId);
  const empty = ex.sets.some(s => !s.done && s.type !== 'w' && !num(s.w) && !num(s.r));
  openSheet(X.name, insightCard({ ic: '🎯', title: `Objectif du jour : ${tgtTxt(t)}`, detected: t.why,
    data: [t.data, `Fourchette visée : ${t.range[0]} à ${t.range[1]} répétitions`, `${t.n} séance${t.n > 1 ? 's' : ''} analysée${t.n > 1 ? 's' : ''} · niveau estimé : ${trainLvl()}`].filter(Boolean),
    why: 'Progresser un peu à chaque fois (une répétition, puis un peu de charge) est la façon la plus sûre d’augmenter la force et le muscle. Monter la charge seulement quand toute la fourchette est atteinte évite de stagner par excès.',
    reco: t.kind === 'start' ? t.why : `${tgtTxt(t)} sur tes séries de travail. Si une série devient très dure (RPE 9,5–10), garde la charge et note-le : l’objectif suivant en tiendra compte.`, conf: t.conf, hyp: false })
    + (empty && t.kind !== 'start' ? `<button class="btn primary block" data-act="tgtFill" data-ei="${ei}">Remplir mes séries vides avec cet objectif</button>` : ''));
};
ACTIONS.tgtFill = el => {
  const ex = TS.active.exercises[+el.dataset.ei]; const t = targetFor(ex, TS.active.routineId);
  ex.sets.forEach(s => { if (!s.done && s.type !== 'w' && !num(s.w) && !num(s.r)) { s.w = String(t.w); s.r = String(t.r); } });
  tsave(); closeSheet(); render(); toast('Séries remplies');
};

// ---------- stagnations / baisses ----------
function exTrends(days = 120) {
  const since = Date.now() - days * 864e5; const ids = new Set();
  TS.workouts.forEach(w => { if (w.start > since) w.exercises.forEach(e => { const X = exById(e.exId); if (X.kind === 'wr') ids.add(e.exId); }); });
  return [...ids].map(id => { const pts = exHistory(id).filter(h => h.w.start > since).reverse().map(h => ({ t: h.w.start, v: Math.max(0, ...h.sets.filter(s => s.type !== 'w').map(e1)) }));
    return { id, X: exById(id), ...ENG.trendCheck(pts, Date.now()) }; }).filter(x => x.status !== 'peu');
}
// ---------- RPE / RIR ----------
function rpeStats(days = 28) {
  const since = Date.now() - days * 864e5, prev = since - 28 * 864e5; let tot = 0; const R = [], P = []; const dist = [0, 0, 0, 0];
  for (const w of TS.workouts) { if (w.start < prev) continue; for (const e of w.exercises) for (const s of workSets(e)) { if (w.start >= since) { tot++; if (num(s.rpe)) { R.push(num(s.rpe)); dist[num(s.rpe) <= 7 ? 0 : num(s.rpe) < 9 ? 1 : num(s.rpe) < 10 ? 2 : 3]++; } } else if (num(s.rpe)) P.push(num(s.rpe)); } }
  return { tot, n: R.length, cov: tot ? R.length / tot : 0, avg: ENG.avg(R), prevAvg: P.length >= 10 ? ENG.avg(P) : null, dist };
}
// ---------- volume et analyse par muscle ----------
function muscleBlocks(g, nBlocks = 6) {
  const out = []; const t = todayStr();
  for (let b = nBlocks - 1; b >= 0; b--) {
    const e = addDays(t, -28 * b), s = addDays(e, -27); const L = inRange(s, e); const o = groupStats(L).G[g];
    const gains = [];
    if (o) for (const [id, q] of Object.entries(o.ex)) { if (!q.main || exById(id).kind !== 'wr') continue;
      const cur = Math.max(0, ...L.flatMap(w => w.exercises.filter(x => x.exId === id).flatMap(x => workSets(x).map(e1))));
      const pS = addDays(s, -28), pL = inRange(pS, addDays(s, -1)); const pre = Math.max(0, ...pL.flatMap(w => w.exercises.filter(x => x.exId === id).flatMap(x => workSets(x).map(e1))));
      if (cur && pre) gains.push((cur - pre) / pre * 100); }
    out.push({ s, e, sets: o ? o.sets / 4 : 0, gain: gains.length ? ENG.avg(gains) : null, days: o ? new Set(L.filter(w => w.exercises.some(x => o.ex[x.exId])).map(wDate)).size / 4 : 0 });
  }
  return out;
}
function muscleAnalysis() {
  const t = todayStr(); const cur = groupStats(inRange(addDays(t, -27), t)).G;
  return MUSCLES.filter(g => g !== 'Autre' && g !== 'Cardio' && g !== 'Corps entier').map(g => {
    const B = muscleBlocks(g); const z = ENG.volumeZone(B.slice(0, -1)); const now = B[B.length - 1];
    const last = sortedW().find(w => w.exercises.some(e => workSets(e).length && exGroups(exById(e.exId))[g] === 1));
    const st = now.sets < 0.5 ? 'none' : now.sets < z.lo ? 'low' : now.sets > z.hi ? 'high' : 'ok';
    return { g, sets: now.sets, freq: now.days, gain: now.gain, z, st, last: last ? daysBetween(wDate(last), t) : null, used: !!cur[g] || B.some(b => b.sets > 0) };
  }).filter(x => x.used);
}
ACTIONS.tAnalyse = () => {
  const T_ = exTrends(); const bad = T_.filter(x => x.status === 'baisse'), stuck = T_.filter(x => x.status === 'stagne'), up = T_.filter(x => x.status === 'progresse');
  const R = rpeStats(); const M = muscleAnalysis(); const lvl = trainLvl();
  const stLab = { none: ['—', ''], low: ['sous ta zone', 'low'], ok: ['dans ta zone', 'ok'], high: ['au-dessus', 'high'] };
  openSheet('Analyse de l’entraînement', `<div class="small muted" style="margin:-4px 0 10px">Niveau estimé : <b>${lvl}</b> (ancienneté et régularité) · 120 derniers jours ${orig3('m')}</div>
    <div class="an3"><div class="up"><b>${up.length}</b><span>en progrès</span></div><div class="st"><b>${stuck.length}</b><span>stagnent</span></div><div class="dn"><b>${bad.length}</b><span>en baisse</span></div></div>
    ${bad.length || stuck.length ? `<h3 style="margin:14px 0 4px">À surveiller</h3>${[...bad, ...stuck].map(x => `<div class="item" data-act="tExInfo" data-id="${x.id}"><div class="grow"><div class="name">${esc(x.X.name)}</div><div class="meta">${x.status === 'baisse' ? `▼ ${fr(Math.abs(x.drop))} % sur les 3 dernières séances` : `≈ ${fr(x.pctWeek)} %/sem depuis ${x.spanDays} j`} · ${x.n} séances</div></div><span class="anp ${x.status}">${x.status === 'baisse' ? 'baisse' : 'stagne'}</span></div>`).join('')}
      <p class="small muted">Stagnation : 1RM estimé quasi stable (moins de +0,25 %/semaine) sur au moins 3 semaines, sans nouveau meilleur. Baisse : moyenne des 3 dernières séances inférieure d’au moins 5 % au meilleur des 3 précédentes. Une baisse ponctuelle peut venir du sommeil, de l’alimentation ou d’un changement d’exercice.</p>` : '<p class="small muted">Aucune stagnation ni baisse nette détectée. 👍</p>'}
    <h3 style="margin:16px 0 4px">Effort (RPE / RIR)</h3>
    ${R.n ? `<div class="small">${R.n} séries notées sur ${R.tot} (${Math.round(R.cov * 100)} %) · RPE moyen <b>${fr(r1(R.avg))}</b> (≈ ${fr(r1(10 - R.avg))} répétitions en réserve)${R.prevAvg ? ` · avant : ${fr(r1(R.prevAvg))}` : ''}</div>
      <div class="rpebar">${[['≤ 7', 'facile'], ['7,5–8,5', 'efficace'], ['9–9,5', 'dur'], ['10', 'échec']].map(([l, s], i) => `<div style="flex:${R.dist[i] || 0.0001}" class="rb${i}" data-tip="RPE ${l} (${s}) : ${R.dist[i]} série${R.dist[i] > 1 ? 's' : ''}, ${Math.round(R.dist[i] / Math.max(1, R.n) * 100)} %"><span>${R.dist[i] ? `${l}<small>${s}</small>` : ''}</span></div>`).join('')}</div>
      <p class="small muted">${R.cov < 0.3 ? 'Moins d’un tiers de tes séries ont un RPE : les analyses d’effort restent indicatives. Noter au moins la dernière série de chaque exercice suffit.' : R.dist[3] / Math.max(1, R.n) > 0.3 ? 'Plus de 30 % de séries à l’échec : efficace ponctuellement, mais coûteux en récupération.' : 'La majorité de tes séries sont entre 7,5 et 9,5 : la zone la plus efficace d’après les études.'}</p>` : '<p class="small muted">Aucun RPE noté ces 4 dernières semaines. Touche la jauge à droite d’une série pour le noter (RPE 10 = échec, 8 = 2 répétitions en réserve).</p>'}
    <h3 style="margin:16px 0 4px">Muscles</h3><p class="small muted" style="margin:0 0 6px">Séries par semaine (4 dernières semaines), ta zone efficace estimée d’après ton historique, fréquence et évolution de la force.</p>
    ${M.map(m => `<button class="anmus" data-act="tMusWhy" data-g="${esc(m.g)}"><div class="row between"><b>${esc(m.g)}</b><span class="anp ${stLab[m.st][1]}">${stLab[m.st][0]}</span></div>
      <div class="anm-bar"><i class="z" style="left:${m.z.lo / 30 * 100}%;width:${(m.z.hi - m.z.lo) / 30 * 100}%"></i><i class="v" style="left:${Math.min(30, m.sets) / 30 * 100}%"></i></div>
      <div class="small muted">${fr(r1(m.sets))} séries/sem · zone ${m.z.lo}–${m.z.hi} · ${fr(r1(m.freq))}×/sem${m.gain != null ? ` · force ${m.gain >= 0 ? '+' : ''}${fr(r1(m.gain))} %` : ''}${m.last != null ? ` · il y a ${m.last} j` : ''}</div></button>`).join('')}`);
  stxMark(() => ACTIONS.tAnalyse());
};
ACTIONS.tMusWhy = el => {
  const m = muscleAnalysis().find(x => x.g === el.dataset.g); if (!m) return;
  const reco = m.st === 'low' ? `Ajoute progressivement 2 à 4 séries par semaine pour ${m.g.toLowerCase()} (par ex. une série de plus sur 2 exercices), puis observe ta force sur 4 semaines.`
    : m.st === 'high' ? `Si la force ne progresse pas ou que la récupération est difficile, retire 2 à 4 séries par semaine. Sinon, rien ne presse : continue en surveillant.`
      : m.st === 'none' ? 'Muscle peu ou pas travaillé ces 4 dernières semaines.' : 'Tu es dans ta zone : garde ce volume tant que la force progresse.';
  openSheet(m.g, insightCard({ ic: '💪', title: `${fr(r1(m.sets))} séries par semaine`, detected: `Volume ${{ low: 'sous', high: 'au-dessus de', ok: 'dans', none: 'hors de' }[m.st]} ta zone efficace estimée (${m.z.lo}–${m.z.hi} séries/semaine).`,
    data: [`Séries de travail des 4 dernières semaines, exercices dont c’est le muscle principal`, `Fréquence : ${fr(r1(m.freq))} séance(s) par semaine`, m.gain != null ? `Force : ${m.gain >= 0 ? '+' : ''}${fr(r1(m.gain))} % (1RM estimé, vs les 4 semaines d’avant)` : 'Évolution de la force : pas assez de données', m.z.why],
    why: 'Le volume (nombre de séries proches de l’échec) est le principal levier de la prise de muscle, mais chacun répond différemment : trop peu freine les progrès, trop fatigue sans bénéfice.',
    reco, conf: m.z.conf }));
};
VIEWS.t_stats = (orig => function () { return orig.apply(this, arguments).replace('<button class="btn block stx-open"', '<button class="btn block stx-open" data-act="tAnalyse" style="margin-bottom:8px">🧠 Analyse : progression, effort, muscles ›</button><button class="btn block stx-open"'); })(VIEWS.t_stats);
render = (orig => function () { const r = orig.apply(this, arguments); try { if (S.ui.tab === 't_live') decorLive(); } catch (e) { console.error(e); } return r; })(render);
stxDrill('tMusWhy');
