// ============================================================
//  ACCUEIL : bloc « Aujourd’hui » (récupération, conseil du jour, bilans),
//  objectifs & badges, saisie rapide (texte ou dictée du clavier)
// ============================================================
let CI_CACHE = { k: '', v: [] };
function insightsCached() {
  const k = [todayStr(), TS.workouts.length, S.weights.length, Object.keys(S.journal).length, JSON.stringify(S.checkins[todayStr()] || {}), Object.keys(S.coachOff).length, S.profile.goal].join('|');
  if (CI_CACHE.k !== k) { try { CI_CACHE = { k, v: coachInsights() }; } catch (e) { console.error(e); CI_CACHE = { k, v: [] }; } }
  return CI_CACHE.v;
}
function todayBlock() {
  let R; try { R = recovery(); } catch (e) { R = { score: null, known: 0, hasCk: false }; }
  const [lab, col] = scoreLab(R.score); const I = insightsCached(); const top = I[0];
  const G = goalsState(); const nb = Object.keys(S.badges).length;
  return `<div class="lsec">Aujourd’hui</div><div class="ltoday">
    <button class="lt-rec" data-act="rcOpen"><div class="rcring sm">${lRing((R.score || 0) / 100, col, 64, 8)}<span><b>${R.score ?? '?'}</b></span></div><div><small>Récupération</small><b style="color:${col}">${R.score == null ? 'à évaluer' : lab}</b><small>${R.known}/5 sources</small></div></button>
    <button class="lt-coach" data-act="ccDaily">${top ? `<span class="lt-ci">${top.ic}</span><div class="grow"><small>Conseil du jour · ${top.conf}</small><b>${top.title}</b><small>${I.length > 1 ? `+ ${I.length - 1} autre${I.length > 2 ? 's' : ''} ›` : 'voir le détail ›'}</small></div>` : `<span class="lt-ci">✅</span><div class="grow"><small>Coach</small><b>Rien à signaler aujourd’hui</b><small>d’après tes données</small></div>`}</button></div>
    <div class="lt-acts">${R.hasCk ? '' : '<button data-act="ckOpen">🌅 Bilan du matin</button>'}<button data-act="ccWeek">📅 Bilan semaine</button><button data-act="qOpen">⚡ Saisie rapide</button><button data-act="gOpen">🎯 Objectifs${G.length ? ` · ${G.filter(g => g.done).length}/${G.length}` : ''}${nb ? ` · 🏅${nb}` : ''}</button></div>`;
}
showLauncher = (orig => function () {
  orig.apply(this, arguments);
  try {
    const box = document.querySelector('#launch .lnew'); if (!box) return;
    checkBadges();
    const t = document.createElement('div'); t.className = 'ltoday-wrap'; t.innerHTML = todayBlock();
    const anchor = box.querySelector('.lcard2.train') || box.querySelector('.lcard2.nutri') || box.querySelector('.lhead2');
    anchor ? anchor.after(t) : box.prepend(t);
  } catch (e) { console.error(e); }
})(showLauncher);
// tuiles supplémentaires proposées dans « Personnaliser l’accueil »
if (typeof TILES === 'object') {
  TILES.recov = { name: 'Récupération', f: () => { const R = recovery(); const [l] = scoreLab(R.score); return tileBtn('rcOpen', '#30d158', 'check', 'Récupération', R.score == null ? '?' : R.score + '/100', R.score == null ? 'fais ton bilan du matin' : l); } };
  TILES.tdee = { name: 'Dépense réelle', f: () => { const e = tdeeEstimateNow(); return tileBtn('lqTdee', '#ff6b3d', 'flame', 'Dépense réelle', e ? r0(S.tdee.v || e.value) + ' kcal' : '—', e ? 'confiance ' + e.level : 'profil à remplir'); } };
}
ACTIONS.lqTdee = () => { lGo('nutri'); S.ui.tab = 'profil'; S.ui.pSub = 'poids'; save(); render(); };

// ---------- objectifs ----------
const GTYPES = { weight: ['⚖️', 'Poids cible', 'kg'], sessions: ['🏋️', 'Séances par semaine', 'séances'], protein: ['🥩', 'Jours avec protéines atteintes / semaine', 'jours'], lift: ['🏆', '1RM estimé sur un exercice', 'kg'] };
function goalsState() {
  const ws = weekStart(); const T = targets();
  return S.goals.map(g => {
    let cur = null, pct = 0, txt = '';
    if (g.type === 'weight') { const W = S.weights.slice().sort((a, b) => a.d < b.d ? -1 : 1); const l = W[W.length - 1]; if (l) { cur = l.kg; const from = g.from ?? l.kg; pct = from === g.v ? 1 : (from - cur) / (from - g.v); txt = `${fr(r1(cur))} kg → ${fr(g.v)} kg`; } }
    if (g.type === 'sessions') { cur = TS.workouts.filter(w => wDate(w) >= ws).length; pct = cur / g.v; txt = `${cur}/${g.v} cette semaine`; }
    if (g.type === 'protein' && T) { cur = 0; for (let i = 0; i < 7; i++) { const d = addDays(ws, i); const L = S.journal[d]; if (L && L.length && sum(L.map(entryN)).p >= T.p * 0.9) cur++; } pct = cur / g.v; txt = `${cur}/${g.v} jours cette semaine`; }
    if (g.type === 'lift') { const b = exBest(g.exId); cur = b.e1; pct = cur / g.v; txt = `${esc(exById(g.exId).name)} : ${kg(cur)} / ${fr(g.v)} kg`; }
    pct = Math.max(0, Math.min(1, pct || 0));
    return { ...g, cur, pct, txt, done: pct >= 1 };
  });
}
function goalsHTML() {
  const G = goalsState(); const B = badgeList();
  const lifts = topLifts ? topLifts(12) : [];
  return `${G.length ? G.map(g => `<div class="goal ${g.done ? 'done' : ''}"><div class="row between"><b>${GTYPES[g.type][0]} ${GTYPES[g.type][1]}</b><button class="iconbtn" data-act="gDel" data-id="${g.id}" aria-label="Supprimer">✕</button></div>
      <div class="small muted">${g.txt || 'pas encore de données'}${g.done ? ' · atteint ✅' : ''}</div><div class="gbar"><i style="width:${g.pct * 100}%"></i></div></div>`).join('') : '<p class="small muted" style="margin-top:0">Aucun objectif. Fixe-toi un cap simple et mesurable.</p>'}
    <details class="gnew"><summary class="btn sm block">＋ Nouvel objectif</summary>
      <label class="f">Type<select id="gType">${Object.entries(GTYPES).map(([k, [ic, l]]) => `<option value="${k}">${ic} ${l}</option>`).join('')}</select></label>
      <label class="f" id="gExW">Exercice<select id="gEx">${lifts.map(x => `<option value="${x.id}">${esc(exById(x.id).name)} (actuel ${kg(x.best.e1)})</option>`).join('')}</select></label>
      <label class="f">Valeur visée<input id="gVal" type="number" inputmode="decimal" placeholder="ex : 75"></label>
      <button class="btn primary block" data-act="gAdd">Ajouter l’objectif</button></details>
    <h3 style="margin:18px 0 8px">Badges <span class="small muted">${B.filter(b => b.got).length}/${B.length}</span></h3>
    <div class="badges">${B.map(b => `<div class="bdg ${b.got ? 'on' : ''}" title="${esc(b.desc)}"><span>${b.ic}</span><b>${esc(b.name)}</b><small>${b.got ? esc(fmtDate(b.got, { day: 'numeric', month: 'short', year: '2-digit' })) : esc(b.prog)}</small></div>`).join('')}</div>
    <p class="small muted">Les badges récompensent la régularité et les progrès réels, calculés à partir de tes données.</p>`;
}
ACTIONS.gOpen = () => { openSheet('Objectifs & badges', goalsHTML()); };
ACTIONS.gAdd = () => {
  const type = $('#gType').value, v = num($('#gVal').value); if (!(v > 0)) { toast('Indique une valeur'); return; }
  const g = { id: uid(), type, v, created: todayStr() };
  if (type === 'lift') { g.exId = $('#gEx').value; if (!g.exId) { toast('Aucun exercice'); return; } }
  if (type === 'weight') { const W = S.weights.slice().sort((a, b) => a.d < b.d ? -1 : 1); g.from = W.length ? W[W.length - 1].kg : null; }
  S.goals.push(g); save(); stxRefresh(() => openSheet('Objectifs & badges', goalsHTML())); toast('Objectif ajouté');
};
ACTIONS.gDel = el => { S.goals = S.goals.filter(g => g.id !== el.dataset.id); save(); stxRefresh(() => openSheet('Objectifs & badges', goalsHTML())); };
document.addEventListener('change', e => { if (e.target.id === 'gType') { const w = $('#gExW'); if (w) w.style.display = e.target.value === 'lift' ? '' : 'none'; } });

// ---------- badges (calculés à partir des données, date d’obtention mémorisée) ----------
function weekStreak() { const ws = weekStart(); let n = 0; for (let i = 0; i < 260; i++) { const s0 = addDays(ws, -7 * i), e0 = addDays(s0, 6); if (TS.workouts.some(w => { const x = wDate(w); return x >= s0 && x <= e0; })) n++; else if (i === 0) continue; else break; } return n; }
function badgeList() {
  const nW = TS.workouts.length, st = weekStreak(), prs = TS.workouts.reduce((a, w) => a + (w.prs || []).length, 0);
  const tons = TS.workouts.reduce((a, w) => a + wVolume(w), 0) / 1000;
  const comp = Object.keys(S.journal).filter(d => d < todayStr() && dayComplete(d)).length; const nWg = S.weights.length, nCk = Object.keys(S.checkins).length;
  const gDone = goalsState().filter(g => g.done).length;
  const B = [
    ['s1', '🏁', 'Première séance', 'Terminer une séance', nW, 1], ['s25', '💪', '25 séances', '25 séances terminées', nW, 25], ['s100', '🦾', '100 séances', '100 séances terminées', nW, 100], ['s250', '🏛️', '250 séances', '250 séances terminées', nW, 250],
    ['st4', '🔥', '4 semaines', '4 semaines d’affilée avec au moins une séance', st, 4], ['st12', '🔥', '12 semaines', '12 semaines d’affilée', st, 12], ['st26', '☄️', '6 mois', '26 semaines d’affilée', st, 26],
    ['pr10', '🏆', '10 records', '10 records battus', prs, 10], ['pr50', '👑', '50 records', '50 records battus', prs, 50], ['t100', '🏋️', '100 tonnes', '100 tonnes soulevées au total', tons, 100],
    ['j7', '📒', '7 jours notés', '7 journées complètes dans le journal', comp, 7], ['j30', '📚', '30 jours notés', '30 journées complètes', comp, 30],
    ['w10', '⚖️', '10 pesées', '10 pesées enregistrées', nWg, 10], ['ck7', '🌅', '7 bilans du matin', '7 bilans du matin remplis', nCk, 7], ['g1', '🎯', 'Objectif atteint', 'Atteindre un de tes objectifs', gDone, 1]
  ];
  return B.map(([id, ic, name, desc, v, n]) => ({ id, ic, name, desc, ok: v >= n, got: S.badges[id] || null, prog: `${fr(Math.min(n, Math.floor(v)))}/${n}` }));
}
function checkBadges() {
  const fresh = badgeList().filter(b => b.ok && !b.got); if (!fresh.length) return;
  fresh.forEach(b => { S.badges[b.id] = todayStr(); }); save();
  if (S.ui.badgesInit) toast(`🏅 Nouveau badge : ${fresh.map(b => b.name).join(', ')}`); else { S.ui.badgesInit = true; save(); }
}

// ---------- saisie rapide ----------
let QK = [];
function qMatch(q) {
  const words = norm(q).split(/\s+/).filter(Boolean).map(w => w.replace(/s$/, '')); if (!words.length) return null;
  let best = null;
  for (const f of allFoodsList()) { const n = norm(f.name + ' ' + (f.brand || '')); if (!words.every(w => n.includes(w))) continue; const sc = (n.startsWith(words[0]) ? 0 : 2) + n.length / 100 + (BASE[f.id] ? 0 : 0.5); if (!best || sc < best[0]) best = [sc, f]; }
  return best && best[1];
}
function qResolve(items) {
  return items.map(it => {
    if (it.type === 'food') { const f = qMatch(it.q); if (!f) return { ...it, err: 'aliment introuvable' }; const g = it.g || (f.unit ? f.unit.g * it.units : 100 * it.units); return { ...it, f, g: Math.round(g), approx: !it.g && !f.unit }; }
    if (it.type === 'set') { const A_ = TS.active; if (!A_) return { ...it, err: 'aucune séance en cours' }; const w = norm(it.q).split(/\s+/); const ei = A_.exercises.findIndex(e => { const n = norm(exById(e.exId).name); return w.every(x => n.includes(x)); }); return ei < 0 ? { ...it, err: 'exercice absent de la séance' } : { ...it, ei }; }
    return it;
  });
}
const qMealNow = () => { const h = new Date().getHours(); return h < 11 ? 'pdj' : h < 15 ? 'dej' : h < 18 ? 'snack' : 'diner'; };
function qPrevHTML() {
  if (!QK.length) return '';
  return `<div class="qprev">${QK.map((x, i) => `<div class="qrow ${x.err ? 'err' : ''}"><span>${x.type === 'weight' ? '⚖️' : x.type === 'set' ? '🏋️' : '🍽️'}</span><div class="grow">${x.err ? `<b>${esc(x.q)}</b><div class="small">${esc(x.err)}</div>`
    : x.type === 'weight' ? `<b>Poids : ${fr(x.kg)} kg</b>` : x.type === 'set' ? `<b>${esc(exById(TS.active.exercises[x.ei].exId).name)}</b><div class="small muted">${fr(x.w)} kg × ${x.r}${x.rpe ? ' @' + fr(x.rpe) : ''}</div>`
      : `<b>${esc(x.f.name)}</b><div class="small muted">${r0(nutr(x.f, x.g).kcal)} kcal · ${r0(nutr(x.f, x.g).p)} g prot.${x.approx ? ' · quantité supposée, vérifie' : ''}</div>`}</div>
    ${x.type === 'food' && !x.err ? `<input type="number" inputmode="decimal" class="qg" data-qi="${i}" value="${x.g}"><span class="small muted">${uLabel(x.f)}</span>` : ''}<button class="iconbtn" data-act="qDel" data-i="${i}" aria-label="Retirer">✕</button></div>`).join('')}</div>
    ${QK.some(x => x.type === 'food' && !x.err) ? `<div class="chipsrow">${MEALS.map(([k, l]) => `<button class="chip ${QK.meal === k ? 'on' : ''}" data-act="qMeal" data-k="${k}">${l}</button>`).join('')}</div>` : ''}
    <button class="btn primary block" data-act="qGo" ${QK.every(x => x.err) ? 'disabled' : ''}>Tout ajouter (${QK.filter(x => !x.err).length})</button>`;
}
ACTIONS.qOpen = () => {
  QK = []; QK.meal = qMealNow();
  openSheet('Saisie rapide', `<textarea id="qIn" rows="3" class="qin" placeholder="ex : 200 g riz, 2 œufs, poids 78,4${TS.active ? ', squat 100x5 @8' : ''}"></textarea>
    <div class="row" style="gap:8px;margin:8px 0"><button class="btn primary grow" data-act="qParse">Analyser</button></div>
    <p class="small muted" style="margin:0 0 8px">Sépare par des virgules. 🎙️ Astuce : touche le micro du clavier de l’iPhone pour dicter. Aliments, poids du jour${TS.active ? ' et séries de la séance en cours (« développé couché 80x8 @9 »)' : ''}.</p>
    <div id="qPrev"></div>`);
  setTimeout(() => { const t = $('#qIn'); if (t) t.focus(); }, 300);
};
ACTIONS.qParse = () => { const m = QK.meal; QK = qResolve(ENG.parseQuick($('#qIn').value)); QK.meal = m; $('#qPrev').innerHTML = qPrevHTML() || '<p class="small muted">Rien de reconnu.</p>'; };
ACTIONS.qDel = el => { const m = QK.meal; QK.splice(+el.dataset.i, 1); QK.meal = m; $('#qPrev').innerHTML = qPrevHTML(); };
ACTIONS.qMeal = el => { QK.meal = el.dataset.k; $('#qPrev').innerHTML = qPrevHTML(); };
document.addEventListener('input', e => { if (e.target.classList && e.target.classList.contains('qg')) { const x = QK[+e.target.dataset.qi]; if (x) x.g = num(e.target.value); } });
ACTIONS.qGo = () => {
  const d = todayStr(); let n = 0;
  for (const x of QK) { if (x.err) continue;
    if (x.type === 'weight') { S.weights = S.weights.filter(w => w.d !== d); S.weights.push({ d, kg: x.kg }); n++; }
    if (x.type === 'food' && x.g > 0) { addEntry(d, QK.meal, x.f, x.g); n++; }
    if (x.type === 'set') { const ex = TS.active.exercises[x.ei]; const s = ex.sets.find(s => !s.done && s.type !== 'w' && !num(s.w) && !num(s.r)); const o = { w: String(x.w), r: String(x.r), rpe: x.rpe || '', done: true };
      if (s) Object.assign(s, o); else ex.sets.push({ type: 'n', ...o }); n++; } }
  save(); tsave(); closeSheet(); render(); if ($('#launch') && typeof showLauncher === 'function') showLauncher(); toast(`${n} élément${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}`);
};
