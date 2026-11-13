// ============================================================
//  NUTRITION 2 : dépense réelle adaptative (avec confiance), modes sèche / maintien / prise,
//  journées complètes, repas habituels en un geste, « que manger ? », nutrition autour des séances
// ============================================================
GOALS.perte = 'Sèche'; GOALS.prise = 'Prise de masse';

// ---------- heure de chaque aliment ajouté aujourd’hui (pour l’analyse autour des séances) ----------
addEntry = (orig => function (date) {
  const r = orig.apply(this, arguments); const L = S.journal[date];
  if (L && L.length && date === todayStr()) L[L.length - 1].t = Date.now();
  return r;
})(addEntry);

// ---------- journée complète ? ----------
// automatique : au moins 2 repas notés et ≥ 50 % de l’objectif (ou 1 000 kcal) ; tu peux forcer « complète » / « incomplète »
function dayKcal(d) { const L = S.journal[d]; return L && L.length ? sum(L.map(entryN)).kcal : 0; }
function dayAuto(d) {
  const L = (S.journal[d] || []).filter(e => e.meal !== 'compl'); if (!L.length) return false;
  const meals = new Set(L.map(e => e.meal)).size; const T = targets0();
  return meals >= 2 && dayKcal(d) >= Math.max(1000, T ? T.kcal * 0.5 : 0);
}
function dayComplete(d) { const f = S.dayFlags[d]; return f === 'ok' ? dayKcal(d) > 0 : f === 'inc' ? false : dayAuto(d); }
ACTIONS.nDayFlag = () => {
  const d = S.ui.date || todayStr(); const cur = dayComplete(d);
  S.dayFlags[d] = cur ? 'inc' : 'ok'; if ((S.dayFlags[d] === 'ok') === dayAuto(d)) delete S.dayFlags[d];
  save(); render(); toast(cur ? 'Journée exclue du calcul de ta dépense' : 'Journée comptée dans le calcul de ta dépense');
};

// ---------- dépense réelle : estimation + suivi lissé ----------
const targets0 = targets; // formule seule (sans la dépense adaptative)
function tdeeEstimateNow() {
  const T = targets0({ ...S.profile, tdeeOverride: null }); if (!T) return null;
  const today = todayStr(); const intakes = [];
  for (let i = 1; i <= 28; i++) { const d = addDays(today, -i); if (dayComplete(d)) intakes.push({ d, kcal: dayKcal(d) }); }
  const e = ENG.tdeeEstimate({ intakes, weights: S.weights, prior: T.tdeeCalc, bmr: T.bmr, today });
  return { ...e, T };
}
function tdeeUpdate() {
  const e = tdeeEstimateNow(); if (!e) return null;
  const t = todayStr(); const st = S.tdee;
  if (st.d !== t) {
    const days = st.d ? Math.max(1, daysBetween(st.d, t)) : 1;
    st.v = Math.round(ENG.tdeeStep(st.v, e.value, Math.min(days, 7)));
    st.d = t; st.log = st.log.filter(x => x.d !== t);
    st.log.push({ d: t, v: st.v, obs: e.obs != null ? Math.round(e.obs) : null, conf: e.conf, prior: Math.round(e.prior), intake: e.intake != null ? Math.round(e.intake) : null });
    if (st.log.length > 730) st.log = st.log.slice(-730);
    save();
  }
  return { ...e, v: st.v };
}
// objectifs : si tu l’as choisi, la dépense suivie remplace la formule (jamais d’un coup : elle avance d’au plus 15 kcal/jour)
targets = (orig => function (p = S.profile) {
  if (p === S.profile && p.tdeeAuto && !p.tdeeOverride && S.tdee && S.tdee.v > 0) {
    const T = orig({ ...p, tdeeOverride: S.tdee.v }); if (T) { T.adaptive = true; } return T;
  }
  return orig(p);
})(targets);
try { tdeeUpdate(); } catch (e) { }

const confPill = (lvl, c) => `<span class="cpill ${lvl === 'élevée' ? 'hi' : lvl === 'moyenne' ? 'mid' : 'lo'}">confiance ${lvl}${c != null ? ` · ${Math.round(c * 100)} %` : ''}</span>`;
const orig3 = o => `<span class="opill ${o}">${{ m: 'mesuré', d: 'déclaré', e: 'estimé' }[o]}</span>`;
function avgIntake(n) { const a = []; for (let i = 1; i <= n; i++) { const d = addDays(todayStr(), -i); if (dayComplete(d)) a.push(dayKcal(d)); } return a.length ? { v: ENG.avg(a), n: a.length } : null; }
function tdeeCardHTML() {
  const e = tdeeUpdate(); if (!e) return `<div class="card"><h2>Ma dépense réelle</h2><p class="small muted" style="margin:0">Renseigne ton profil (âge, taille, poids) pour commencer.</p></div>`;
  const p = S.profile; const a7 = avgIntake(7);
  return `<div class="card" id="tdeeCard"><div class="row between"><h2 style="margin:0">Ma dépense réelle</h2>${confPill(e.level, e.conf)}</div>
    <div class="tdee3">
      <div><span>Métabolisme de base</span><b>${r0(e.T.bmr)}</b><small>au repos ${orig3('e')}</small></div>
      <div class="main"><span>Dépense totale</span><b>${r0(e.v)}</b><small>suivie au quotidien ${orig3('e')}</small></div>
      <div><span>Mangé (7 j)</span><b>${a7 ? r0(a7.v) : '—'}</b><small>${a7 ? `${a7.n} j complets` : 'aucune journée complète'} ${orig3('d')}</small></div></div>
    ${e.obs != null ? `<p class="small" style="margin:10px 0 4px">Mesure sur 28 jours : <b>${r0(e.obs)} kcal</b> · formule : ${r0(e.prior)} kcal · poids ${e.slope >= 0 ? '+' : '−'}${fr(r1(Math.abs(e.slope * 7)))} kg/sem</p>` : ''}
    ${e.reasons.length ? `<div class="small muted" style="margin:6px 0 0">Pour une estimation plus fiable : ${e.reasons.map(esc).join(' · ')}.</div>` : ''}
    <label class="check" style="border:0;padding:12px 0 0"><input type="checkbox" data-act="nTdeeAuto" ${p.tdeeAuto ? 'checked' : ''}><div class="grow">Utiliser ma dépense réelle pour mes objectifs<div class="small muted">Les calories visées suivent la dépense estimée, sans à-coups (± 15 kcal par jour au maximum).</div></div></label>
    ${p.tdeeOverride ? `<p class="small" style="margin:8px 0 0">Dépense fixée à la main : <b>${r0(p.tdeeOverride)} kcal</b> (prioritaire) <button class="btn sm" data-act="clearTdee">Revenir au calcul</button></p>` : ''}
    <details style="margin-top:10px"><summary class="small" style="color:var(--accent)">Comment c’est calculé ?</summary><div class="small muted">
      <p><b>Métabolisme de base</b> : énergie au repos complet (formule ${e.T.katch ? 'Katch-McArdle, avec ta masse maigre' : 'Mifflin-St Jeor'}).</p>
      <p><b>Dépense mesurée</b> = calories mangées en moyenne sur les journées complètes − variation du poids × 7 700 kcal/kg. La variation vient d’une droite tracée à travers toutes tes pesées des 28 derniers jours (une pesée isolée pèse peu).</p>
      <p><b>Confiance</b> : nombre de journées complètes (idéal 21), de pesées (idéal 12), durée couverte (21 j) et régularité du poids. Une valeur peu plausible (sous le métabolisme de base) est presque ignorée.</p>
      <p><b>Dépense suivie</b> = mélange formule / mesure selon la confiance, qui ne bouge que de 15 kcal par jour au maximum : quelques journées atypiques ne la font pas varier brutalement.</p>
      <p>Une journée est comptée si au moins 2 repas sont notés et qu’elle atteint la moitié de ton objectif. Tu peux forcer « complète » ou « incomplète » en bas du journal.</p></div></details>
    <button class="btn sm block" style="margin-top:10px" data-act="nHist">📈 Historique poids · calories · dépense</button></div>`;
}
ACTIONS.nTdeeAuto = el => { S.profile.tdeeAuto = el.checked; save(); toast(el.checked ? 'Objectifs basés sur ta dépense réelle' : 'Objectifs basés sur la formule'); };
VIEWS.profil = (orig => function () {
  let h = orig.apply(this, arguments);
  const i = h.indexOf('<div class="card"><h2>Ajustement sur tes données réelles</h2>');
  if (i >= 0) h = h.slice(0, i) + tdeeCardHTML();
  return h;
})(VIEWS.profil);
renderProfilResults = (orig => function () {
  orig.apply(this, arguments); const T = targets(); const b = $('#pres');
  if (b && T && T.adaptive) b.innerHTML = b.innerHTML.replace('Dépense totale (estimée)', 'Dépense totale (adaptée à tes données)');
})(renderProfilResults);

// ---------- historique hebdomadaire ----------
ACTIONS.nHist = () => {
  const ws = weekStart(); const rows = [];
  for (let i = 11; i >= 0; i--) {
    const s = addDays(ws, -7 * i), e = addDays(s, 6);
    const W = S.weights.filter(w => w.d >= s && w.d <= e).map(w => w.kg);
    const K = []; for (let k = 0; k < 7; k++) { const d = addDays(s, k); if (d < todayStr() && dayComplete(d)) K.push(dayKcal(d)); }
    const lg = S.tdee.log.filter(x => x.d >= s && x.d <= e).pop();
    rows.push({ s, w: W.length ? ENG.avg(W) : null, k: K.length ? ENG.avg(K) : null, nk: K.length, t: lg ? lg.v : null });
  }
  const kv = rows.flatMap(r => [r.k, r.t]).filter(x => x); const mx = Math.max(1, ...kv) * 1.05, mn = Math.min(...kv, mx) * 0.85;
  const wv = rows.map(r => r.w).filter(x => x); const wmx = Math.max(...wv, 0), wmn = Math.min(...wv, wmx);
  const X = i => 14 + i * (292 / 11), Yk = v => 112 - (v - mn) / (mx - mn || 1) * 100, Yw = v => 112 - (wmx > wmn ? (v - wmn) / (wmx - wmn) : .5) * 100;
  const tl = rows.map((r, i) => r.t ? [X(i), Yk(r.t)] : null).filter(Boolean), wl = rows.map((r, i) => r.w ? [X(i), Yw(r.w)] : null).filter(Boolean);
  const path = P => P.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  openSheet('Poids · calories · dépense', `<svg viewBox="0 0 320 132" class="nhchart">${rows.map((r, i) => r.k ? `<rect x="${X(i) - 8}" y="${Yk(r.k)}" width="16" height="${112 - Yk(r.k)}" rx="3" class="nh-k" data-tip="Sem. du ${esc(fmtDate(r.s, { day: 'numeric', month: 'short' }))} : ${r0(r.k)} kcal/jour mangées (${r.nk} j complets)${r.t ? `
Dépense suivie : ${r0(r.t)} kcal` : ''}"/>` : '').join('')}
      ${tl.length > 1 ? `<path d="${path(tl)}" class="nh-t"/>` : ''}${wl.length > 1 ? `<path d="${path(wl)}" class="nh-w"/>` : ''}${rows.map((r, i) => r.w ? `<circle cx="${X(i)}" cy="${Yw(r.w)}" r="2.5" class="nh-wd"/><circle cx="${X(i)}" cy="${Yw(r.w)}" r="9" fill="transparent" data-tip="Sem. du ${esc(fmtDate(r.s, { day: 'numeric', month: 'short' }))} : ${fr(r1(r.w))} kg en moyenne"/>` : '').join('')}${rows.map((r, i) => r.t && !r.k ? `<circle cx="${X(i)}" cy="${Yk(r.t)}" r="9" fill="transparent" data-tip="Dépense suivie : ${r0(r.t)} kcal/jour"/>` : '').join('')}
      ${rows.map((r, i) => i % 2 ? '' : `<text x="${X(i)}" y="128" class="nh-l">${new Date(r.s + 'T12:00:00').getDate()}/${new Date(r.s + 'T12:00:00').getMonth() + 1}</text>`).join('')}</svg>
    <div class="row small" style="gap:12px;flex-wrap:wrap;margin:4px 0 10px"><span><i class="lg k"></i>calories mangées (moy.)</span><span><i class="lg t"></i>dépense suivie</span><span><i class="lg w"></i>poids (échelle à part)</span></div>
    <div class="nhtab"><div class="nhr h"><span>Semaine</span><span>Poids</span><span>Mangé</span><span>Dépense</span></div>
    ${rows.slice().reverse().map(r => `<div class="nhr"><span>${esc(fmtDate(r.s, { day: 'numeric', month: 'short' }))}</span><span>${r.w ? fr(r1(r.w)) + ' kg' : '—'}</span><span>${r.k ? r0(r.k) + `<small> (${r.nk} j)</small>` : '—'}</span><span>${r.t ? r0(r.t) : '—'}</span></div>`).join('')}</div>
    <p class="small muted">Mangé = moyenne des journées complètes de la semaine (déclaré). Dépense = valeur suivie par l’appli à la fin de la semaine (estimé). Poids = moyenne des pesées (mesuré).</p>`);
};

// ---------- repas habituels ----------
const saveFav0 = ACTIONS.saveFav;
ACTIONS.saveFav = async el => { const n = S.favs.length; await saveFav0(el); if (S.favs.length > n) { S.favs[0].meal = el.dataset.meal; save(); } };
// habitudes : favoris de ce repas + combinaisons revenues au moins 3 fois en 45 jours
function habits(k) {
  const out = S.favs.filter(f => f.meal === k).map(f => ({ name: f.name, items: f.items, src: 'fav', id: f.id }));
  const cnt = {}; const t = todayStr();
  for (let i = 1; i <= 45; i++) {
    const d = addDays(t, -i); const L = (S.journal[d] || []).filter(e => e.meal === k); if (!L.length) continue;
    const sig = L.map(e => e.fid).sort().join('|'); const c = cnt[sig] || (cnt[sig] = { n: 0, items: L }); c.n++;
  }
  Object.entries(cnt).filter(([, c]) => c.n >= 3).sort((a, b) => b[1].n - a[1].n).slice(0, 2).forEach(([sig, c]) => {
    if (out.some(o => o.items.map(x => x.fid).sort().join('|') === sig)) return;
    out.push({ name: c.items.slice(0, 2).map(x => x.name.split(' (')[0]).join(' + ') + (c.items.length > 2 ? '…' : ''), items: c.items, src: 'auto', n: c.n, sig });
  });
  return out;
}
let HAB = {};
ACTIONS.nHab = el => {
  const h = HAB[el.dataset.h]; if (!h) return; const d = S.ui.date || todayStr(); const k = el.dataset.meal;
  if (!S.journal[d]) S.journal[d] = [];
  h.items.forEach(({ id, meal, t, ...e }) => S.journal[d].push({ ...e, id: uid(), meal: k, ...(d === todayStr() ? { t: Date.now() } : {}) }));
  save(); render(); toast(`${h.name} ajouté`);
};

// ---------- « Que manger ? » : ce qui comble le mieux ce qui reste ----------
function suggestions(rem) {
  const P = S.menuPrefs; const meals = [];
  const add = (name, items, tag) => { const n = sum(items.map(entryN)); meals.push({ name, items, n, tag, s: ENG.fitScore(rem, n) }); };
  S.favs.forEach(f => add(f.name, f.items, '★ favori'));
  MEALS.forEach(([k]) => habits(k).filter(h => h.src === 'auto').forEach(h => add(h.name, h.items, '↺ habituel')));
  const M = meals.filter(m => m.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
  const cands = BASE_FOODS.filter(f => dietOk(f, P.diet) && !P.exclude.includes(f.id) && !NO_SUGGEST.includes(f.id) && f.cat !== 'Boissons' && f.kcal > 20);
  const F = cands.map(f => { const g0 = clamp(rem.kcal * 0.45 / f.kcal * 100, 30, /poudre|whey|cas[ée]ine|prot[ée]in/i.test(f.name) ? 40 : capFor(f)); const g = portionFor(f, g0); const n = nutr(f, g); return { f, g, n, s: ENG.fitScore(rem, n) + (f.p / Math.max(f.kcal, 1) * 4) }; })
    .filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  // variété : une seule variante par famille d’aliment
  const seen = new Set(), out = [];
  for (const x of F) { const fam = norm(x.f.name).split(' ')[0]; if (seen.has(fam)) continue; seen.add(fam); out.push(x); if (out.length >= 6) break; }
  return { M, F: out };
}
ACTIONS.nSuggest = () => {
  const T = targets(); if (!T) return; const d = S.ui.date || todayStr(); const tot = sum((S.journal[d] || []).map(entryN));
  const rem = { kcal: T.kcal - tot.kcal, p: T.p - tot.p, c: T.c - tot.c, f: T.f - tot.f };
  const h = new Date().getHours(); const meal = h < 11 ? 'pdj' : h < 15 ? 'dej' : h < 18 ? 'snack' : 'diner';
  if (rem.kcal < 120) { openSheet('Que manger ?', `<p class="muted" style="text-align:center">Ton objectif du jour est ${rem.kcal < 0 ? 'dépassé' : 'presque atteint'} (${r0(Math.abs(rem.kcal))} kcal ${rem.kcal < 0 ? 'en trop' : 'restantes'}).${rem.p > 15 ? ` Il manque encore ${r0(rem.p)} g de protéines : privilégie un aliment très protéiné et peu calorique (skyr, blanc de poulet, whey).` : ''}</p>`); return; }
  const { M, F } = suggestions(rem); HAB = {};
  M.forEach((m, i) => { HAB['s' + i] = m; });
  openSheet('Que manger ?', `<div class="nrem">${[['kcal', 'kcal', rem.kcal], ['Prot.', 'g', rem.p], ['Gluc.', 'g', rem.c], ['Lip.', 'g', rem.f]].map(([l, u, v]) => `<div><b>${r0(Math.max(0, v))}</b><span>${l} ${u === 'g' ? '(g)' : ''}</span></div>`).join('')}</div>
    <p class="small muted" style="margin:6px 0 10px">Ce qu’il te reste aujourd’hui. Classement : ce qui comble le mieux tes protéines restantes, puis glucides et lipides, sans dépasser tes calories.</p>
    ${M.length ? `<h3 style="margin:8px 0 4px">Tes repas</h3>${M.map((m, i) => `<div class="item"><div class="grow"><div class="name">${esc(m.name)} <span class="small muted">${m.tag}</span></div><div class="meta">${macroLine(m.n)}</div></div><button class="btn sm" data-act="nHab" data-h="s${i}" data-meal="${meal}">＋</button></div>`).join('')}` : ''}
    <h3 style="margin:12px 0 4px">Aliments</h3>${F.map(x => `<div class="item"><div class="grow"><div class="name">${esc(x.f.name)}</div><div class="meta">${x.g} ${uLabel(x.f)}${unitNote(x.f, x.g)} · ${macroLine(x.n)}</div></div><button class="btn sm" data-act="nSugAdd" data-id="${x.f.id}" data-g="${x.g}" data-meal="${meal}">＋</button></div>`).join('') || '<p class="muted small">Aucun aliment ne rentre dans ce qu’il reste.</p>'}
    <p class="small muted">Ajout dans : ${esc(MEALS.find(m => m[0] === meal)[1])} (selon l’heure).</p>`);
};
ACTIONS.nSugAdd = el => { const d = S.ui.date || todayStr(); addEntry(d, el.dataset.meal, food(el.dataset.id), +el.dataset.g); save(); el.textContent = '✓'; el.disabled = true; render(); toast('Ajouté'); };

// ---------- nutrition autour d’une séance ----------
const SLOT_H = { pdj: 8, dej: 12.5, snack: 16, diner: 20 };
function periWorkout(w) {
  const d = wDate(w); const L = S.journal[d] || []; if (!L.length) return null;
  const end = w.end || w.start + 3600e3; let est = false;
  const when = e => { if (e.t && dstr(new Date(e.t)) === d) return e.t; est = true; const h = SLOT_H[e.meal]; return h == null ? null : new Date(d + 'T00:00:00').getTime() + h * 3600e3; };
  const pre = [], post = [];
  for (const e of L) { const t = when(e); if (t == null) continue; if (t >= w.start - 3 * 3600e3 && t <= w.start) pre.push(e); else if (t > end - 600e3 && t <= end + 2 * 3600e3) post.push(e); }
  return { pre: sum(pre.map(entryN)), post: sum(post.map(entryN)), npre: pre.length, npost: post.length, origin: est ? 'e' : 'm' };
}
function periHTML(w) {
  const P = periWorkout(w); if (!P) return '';
  const kg = num(S.profile.weight) || 75; const pMin = Math.round(kg * 0.3);
  const preTxt = P.npre ? `${r0(P.pre.kcal)} kcal · ${r0(P.pre.c)} g glucides · ${r0(P.pre.p)} g prot.` : 'rien de noté';
  const postTxt = P.npost ? `${r0(P.post.kcal)} kcal · ${r0(P.post.p)} g prot.` : 'rien de noté';
  const tips = [];
  if (!P.npre) tips.push('Un repas ou une collation 1 à 3 h avant (glucides + un peu de protéines) aide à tenir l’intensité.');
  if (P.post.p < pMin) tips.push(`Vise environ ${pMin} g de protéines (≈ 0,3 g/kg) dans les 2 h après : c’est le repère le plus étudié pour la récupération musculaire.`);
  return `<div class="card peri"><div class="row between"><b>Nutrition autour de la séance</b>${orig3(P.origin)}</div>
    <div class="peri2"><div><span>Avant (3 h)</span><b>${preTxt}</b></div><div><span>Après (2 h)</span><b>${postTxt}</b></div></div>
    ${tips.length ? `<div class="small muted" style="margin-top:6px">${tips.map(esc).join('<br>')}</div>` : '<div class="small" style="margin-top:6px;color:#30d158">Apports bien placés autour de la séance 👍</div>'}
    ${P.origin === 'e' ? '<div class="small muted" style="margin-top:4px">Heures estimées d’après le repas (petit-déj 8 h, déjeuner 12 h 30, collation 16 h, dîner 20 h) : les aliments ajoutés désormais sont horodatés.</div>' : ''}</div>`;
}
openWorkout = (orig => function (id) {
  orig.apply(this, arguments); const w = TS.workouts.find(x => x.id === id); const b = $('#sheetBody');
  if (w && b) { const h = periHTML(w); if (h) { const first = b.querySelector('.small.muted'); if (first) first.insertAdjacentHTML('afterend', h); } }
})(openWorkout);

// ---------- Journal : raccourcis, repas habituels, journée complète ----------
function decorJournal() {
  const v = $('#view'); const T = targets(); if (!v || !T) return;
  const d = S.ui.date || todayStr(); const list = S.journal[d] || [];
  const sumEl = v.querySelector('.card.summary');
  if (sumEl && !v.querySelector('.nbar')) sumEl.insertAdjacentHTML('afterend', `<div class="nbar"><button data-act="nSuggest">🍽️ Que manger ?</button><button data-act="qOpen">⚡ Saisie rapide</button></div>`);
  HAB = {};
  v.querySelectorAll('.card.meal').forEach(c => {
    const b = c.querySelector('.addbtn'); if (!b || c.querySelector('.item, .habrow')) return;
    const k = b.dataset.meal; const H_ = habits(k); if (!H_.length) return;
    const h = H_[0]; const key = k + '0'; HAB[key] = h; const n = sum(h.items.map(entryN));
    c.insertAdjacentHTML('beforeend', `<button class="planrow habrow" data-act="nHab" data-h="${key}" data-meal="${k}"><span>${h.src === 'fav' ? '★' : '↺'} ${esc(h.name)} · ${r0(n.kcal)} kcal</span><b>Ajouter</b></button>`);
  });
  if (list.some(e => e.meal !== 'compl') && d <= todayStr()) {
    const ok = dayComplete(d); const forced = S.dayFlags[d];
    v.insertAdjacentHTML('beforeend', `<button class="dayflag ${ok ? 'ok' : ''}" data-act="nDayFlag"><span>${ok ? '✓' : '○'}</span><div class="grow"><b>${ok ? 'Journée complète' : 'Journée incomplète'}</b><div class="small muted">${ok ? 'Comptée' : 'Non comptée'} dans le calcul de ta dépense réelle${forced ? ' · choisi par toi' : ' · automatique'} — touche pour changer</div></div></button>`);
  }
}
render = (orig => function () { const r = orig.apply(this, arguments); try { if (S.ui.tab === 'journal') decorJournal(); } catch (e) { console.error(e); } return r; })(render);
