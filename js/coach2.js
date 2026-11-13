// ============================================================
//  COACH INTELLIGENT : conseils du jour + bilan de la semaine
//  Chaque conseil dit : ce qui est détecté, les données utilisées, pourquoi, quoi faire, et la confiance.
//  Formulé comme une hypothèse, jamais comme une certitude.
// ============================================================
function coachInsights() {
  const out = []; const t = todayStr(); const T = targets(); const p = S.profile; const kg = num(p.weight);
  const push = x => out.push({ prio: 2, conf: 'moyenne', ...x });
  const W = S.weights.slice().sort((a, b) => a.d < b.d ? -1 : 1);
  const lastDays = n => { const a = []; for (let i = 1; i <= n; i++) { const d = addDays(t, -i); if (dayComplete(d)) a.push({ d, n: sum(S.journal[d].map(entryN)) }); } return a; };
  // --- poids : stagnation / rythme
  const W21 = W.filter(w => w.d >= addDays(t, -21));
  if (W21.length >= 6 && daysBetween(W21[0].d, W21[W21.length - 1].d) >= 14) {
    const r = ENG.linreg(W21.map(w => daysBetween(W21[0].d, w.d)), W21.map(w => w.kg)); const wk = r.b * 7; const pct = kg ? wk / kg * 100 : 0;
    const D = lastDays(21); const avgK = D.length ? ENG.avg(D.map(x => x.n.kcal)) : null;
    if (p.goal === 'perte' && wk > -0.1) push({ id: 'wstall', cat: 'nutri', ic: '⚖️', prio: 3, title: 'Ton poids ne baisse plus', conf: W21.length >= 10 ? 'moyenne' : 'faible',
      detected: `Tendance de ${wk >= 0 ? '+' : '−'}${fr(r1(Math.abs(wk)))} kg par semaine sur ${daysBetween(W21[0].d, W21[W21.length - 1].d)} jours, alors que ton objectif est la sèche.`,
      data: [`${W21.length} pesées sur 3 semaines (mesuré)`, avgK ? `${r0(avgK)} kcal mangées en moyenne sur ${D.length} journées complètes (déclaré)` : 'peu de journées complètes dans le journal', T ? `objectif : ${r0(T.kcal)} kcal` : ''].filter(Boolean),
      why: 'Plusieurs causes possibles : apports sous-estimés (huiles, sauces, boissons, week-ends), rétention d’eau (sel, stress, début d’un nouveau programme), ou recomposition si ta force augmente. Sur 3 semaines, la rétention d’eau seule est moins probable.',
      reco: avgK && T && avgK > T.kcal + 100 ? `Tu manges en moyenne ${r0(avgK - T.kcal)} kcal au-dessus de ton objectif : commence par revenir à l’objectif plutôt que de le baisser.` : 'Vérifie 1 semaine en notant absolument tout (y compris l’huile de cuisson). Si le poids ne bouge toujours pas, baisse de 100 à 150 kcal par jour.' });
    if (p.goal === 'perte' && pct < -1.1) push({ id: 'wfast', cat: 'nutri', ic: '🏃', title: 'Perte de poids rapide', conf: 'moyenne', detected: `${fr(r1(Math.abs(wk)))} kg par semaine, soit ${fr(r1(Math.abs(pct)))} % de ton poids.`, data: [`${W21.length} pesées sur 3 semaines`], why: 'Au-delà d’environ 1 % du poids par semaine, la part de muscle perdue et la fatigue augmentent.', reco: 'Remonte légèrement tes apports (+100 à 200 kcal) en gardant les protéines élevées.' });
    if (p.goal === 'prise' && pct > 0.6) push({ id: 'wgain', cat: 'nutri', ic: '📈', title: 'Prise de poids rapide', conf: 'moyenne', detected: `+${fr(r1(wk))} kg par semaine (${fr(r1(pct))} % du poids).`, data: [`${W21.length} pesées sur 3 semaines`], why: 'Au-delà de 0,25 à 0,5 % par semaine, l’excédent se stocke surtout en gras.', reco: 'Baisse de 100 à 200 kcal par jour.' });
  } else if (p.goal !== 'maintien' && W.length && daysBetween(W[W.length - 1].d, t) >= 7) push({ id: 'noweigh', cat: 'data', ic: '⚖️', prio: 1, conf: 'élevée', hyp: false, title: 'Pas de pesée depuis une semaine', detected: `Dernière pesée le ${fmtDate(W[W.length - 1].d, { day: 'numeric', month: 'long' })}.`, data: ['historique des pesées'], why: 'Sans pesées régulières, impossible de savoir si ton objectif avance ni d’estimer ta vraie dépense.', reco: '2 à 3 pesées par semaine, le matin à jeun après les toilettes, suffisent.' });
  // --- protéines
  const D14 = lastDays(14);
  if (T && D14.length >= 5) { const low = D14.filter(x => x.n.p < T.p * 0.85); if (low.length / D14.length >= 0.6) push({ id: 'prot', cat: 'nutri', ic: '🥩', prio: 3, conf: D14.length >= 9 ? 'élevée' : 'moyenne',
    title: 'Protéines régulièrement trop basses', detected: `${low.length} journées complètes sur ${D14.length} sous 85 % de ton objectif (${r0(T.p)} g).`, data: [`moyenne : ${r0(ENG.avg(D14.map(x => x.n.p)))} g/jour sur 14 jours (déclaré)`, kg ? `soit ${fr(r1(ENG.avg(D14.map(x => x.n.p)) / kg))} g/kg` : ''].filter(Boolean),
    why: 'Les protéines soutiennent la récupération et le maintien du muscle, surtout en sèche. Au-delà de ~1,6 g/kg les bénéfices plafonnent, en dessous ils diminuent.', reco: 'Ajoute une source protéinée à chaque repas (skyr, œufs, viande, poisson, tofu) ou une collation protéinée : « Que manger ? » dans le journal te propose les meilleures options.' }); }
  // --- journal incomplet (fiabilité)
  const nC = D14.length; const nLog = Array.from({ length: 14 }, (_, i) => addDays(t, -i - 1)).filter(d => (S.journal[d] || []).length).length;
  if (nLog >= 3 && nC < nLog * 0.5) push({ id: 'logq', cat: 'data', ic: '📝', prio: 1, conf: 'élevée', hyp: false, title: 'Beaucoup de journées incomplètes', detected: `${nLog} journées notées sur 14, dont ${nC} complètes.`, data: ['journal des 14 derniers jours'], why: 'Les journées incomplètes sont exclues du calcul de ta dépense réelle : moins il y en a de complètes, moins l’estimation est fiable.', reco: 'Note tous tes repas, ou marque la journée « incomplète » en bas du journal pour qu’elle ne fausse rien.' });
  // --- entraînement
  if (TS.workouts.length >= 6) {
    const tr = exTrends(60); const bad = tr.filter(x => x.status === 'baisse'), stuck = tr.filter(x => x.status === 'stagne');
    if (bad.length) push({ id: 'perfdrop', cat: 'train', ic: '📉', prio: 3, conf: bad.length >= 2 ? 'moyenne' : 'faible', title: `Baisse de performance : ${bad.slice(0, 2).map(x => esc(x.X.name)).join(', ')}${bad.length > 2 ? '…' : ''}`,
      detected: bad.map(x => `${esc(x.X.name)} : ${fr(Math.abs(x.drop))} % sous ton meilleur récent`).join(' · '), data: ['1RM estimé (formule d’Epley) de chaque séance, 60 derniers jours (mesuré)'],
      why: 'Une baisse sur 3 séances d’affilée peut venir d’une fatigue accumulée, d’un sommeil insuffisant, d’un déficit calorique important ou simplement d’une technique modifiée.', reco: bad.length >= 2 ? 'Regarde ton score de récupération ; si la fatigue est probable, fais une semaine allégée (moins de séries, mêmes charges).' : 'Rien d’inquiétant sur un seul exercice : vérifie la technique et l’ordre des exercices de la séance.' });
    if (stuck.length) push({ id: 'stall', cat: 'train', ic: '⏸️', title: `Stagnation : ${stuck.slice(0, 2).map(x => esc(x.X.name)).join(', ')}${stuck.length > 2 ? '…' : ''}`, conf: 'moyenne',
      detected: stuck.map(x => `${esc(x.X.name)} : ≈ ${fr(x.pctWeek)} %/sem depuis ${x.spanDays} j`).join(' · '), data: ['meilleure série de chaque séance, convertie en 1RM estimé'],
      why: 'Après plusieurs semaines sans progrès, refaire la même chose donne rarement un résultat différent.', reco: 'Change une seule variable : fourchette de répétitions (ex. 6–8 au lieu de 8–12), une série de plus, ou une variante de l’exercice. L’objectif affiché en séance t’aide à progresser par petites étapes.' });
    const M = muscleAnalysis(); const low = M.filter(m => m.st === 'low' && ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischios', 'Fessiers'].includes(m.g)), high = M.filter(m => m.st === 'high' && m.gain != null && m.gain <= 0);
    if (low.length) push({ id: 'vlow', cat: 'train', ic: '🔽', prio: 1, conf: low[0].z.conf, title: `Volume peut-être insuffisant : ${low.slice(0, 3).map(m => m.g).join(', ')}`, detected: low.map(m => `${m.g} : ${fr(r1(m.sets))} séries/sem (zone ${m.z.lo}–${m.z.hi})`).join(' · '), data: ['séries de travail des 4 dernières semaines', 'zone estimée d’après tes meilleures périodes de progression, sinon repère 10–20'], why: 'Un volume trop bas limite la stimulation de ces muscles.', reco: 'Ajoute 2 à 4 séries par semaine sur ces muscles, puis observe ta force sur 4 semaines.' });
    if (high.length) push({ id: 'vhigh', cat: 'train', ic: '🔼', prio: 1, conf: high[0].z.conf, title: `Volume élevé sans progrès : ${high.slice(0, 3).map(m => m.g).join(', ')}`, detected: high.map(m => `${m.g} : ${fr(r1(m.sets))} séries/sem, force ${fr(r1(m.gain))} %`).join(' · '), data: ['séries des 4 dernières semaines', 'évolution du 1RM estimé vs les 4 semaines d’avant'], why: 'Au-delà de ta zone efficace, des séries en plus ajoutent surtout de la fatigue.', reco: 'Essaie de retirer 2 à 4 séries par semaine sur ces muscles pendant 4 semaines.' });
    const R = rpeStats(28); if (R.tot >= 30 && R.cov < 0.2) push({ id: 'rpe', cat: 'data', ic: '🎚️', prio: 1, conf: 'élevée', hyp: false, title: 'Peu de séries avec un RPE', detected: `${Math.round(R.cov * 100)} % de tes séries des 4 dernières semaines ont un RPE.`, data: [`${R.n} séries notées sur ${R.tot}`], why: 'Sans RPE, l’appli ne peut pas savoir si une série était facile ou à l’échec : les objectifs de charge et l’analyse de fatigue restent approximatifs.', reco: 'Note le RPE de la dernière série de chaque exercice (10 = échec, 8 = 2 répétitions en réserve). C’est suffisant.' });
    const last = sortedW()[0]; const gap = last ? daysBetween(wDate(last), t) : 0;
    if (gap >= 10) push({ id: 'gap', cat: 'train', ic: '🗓️', prio: 2, conf: 'élevée', hyp: false, title: `Pas de séance depuis ${gap} jours`, detected: `Dernière séance : ${esc(last.name)}, le ${fmtDate(wDate(last), { day: 'numeric', month: 'long' })}.`, data: ['historique des séances'], why: 'La force se maintient bien 2 à 3 semaines, mais la régularité est le premier facteur de progrès.', reco: 'Reprends avec des charges environ 10 % plus légères la première séance.' });
    // nutrition autour des séances
    const recent = sortedW().slice(0, 8).map(w => ({ w, P: periWorkout(w) })).filter(x => x.P && x.P.origin === 'm');
    const minP = Math.round((kg || 75) * 0.3);
    if (recent.length >= 4) { const lowP = recent.filter(x => x.P.post.p < minP); if (lowP.length / recent.length >= 0.5) push({ id: 'peri', cat: 'nutri', ic: '⏱️', conf: 'moyenne', title: 'Peu de protéines après tes séances', detected: `${lowP.length} séances sur ${recent.length} avec moins de ${minP} g de protéines dans les 2 h qui suivent.`, data: ['heures des aliments notés (mesuré) et heures de séance'], why: 'L’apport total de la journée compte le plus ; un repas protéiné après la séance reste un moyen simple de l’atteindre.', reco: `Prévois ~${minP} g de protéines après l’entraînement (ex. 250 g de skyr, ou une dose de whey + un fruit).` }); }
  }
  // --- récupération
  const RC = recovery(); if (RC.fatigue === 'probable') push({ id: 'fatigue', cat: 'recup', ic: '🔋', prio: 3, conf: RC.flags.length >= 3 ? 'moyenne' : 'faible', title: 'Fatigue accumulée probable', detected: `${RC.flags.length} signaux convergents.`, data: RC.flags.map(esc), why: 'Plusieurs indicateurs qui se dégradent ensemble signalent souvent une récupération insuffisante plutôt qu’un manque d’effort.', reco: 'Semaine allégée : garde tes charges mais retire 30 à 50 % des séries, et soigne sommeil et apports.' });
  // --- dépense : écart formule / mesure
  const e = typeof tdeeEstimateNow === 'function' ? tdeeEstimateNow() : null;
  if (e && e.obs != null && e.conf >= 0.3 && Math.abs(e.obs - e.prior) > 250) push({ id: 'tdee', cat: 'nutri', ic: '🔥', prio: 1, conf: e.level, title: `Ta dépense réelle semble ${e.obs > e.prior ? 'plus élevée' : 'plus basse'} que la formule`, detected: `Mesure : ${r0(e.obs)} kcal/jour contre ${r0(e.prior)} kcal par la formule.`, data: [`${e.days} journées complètes, ${e.weighs} pesées sur ${e.span} jours`], why: 'Les formules ont environ ±10 % d’erreur selon les personnes ; tes données réelles corrigent cet écart.', reco: S.profile.tdeeAuto ? 'C’est déjà pris en compte progressivement dans tes objectifs.' : 'Active « Utiliser ma dépense réelle pour mes objectifs » dans Besoins → Poids.' });
  const off = S.coachOff || {};
  return out.filter(x => !off[t + '|' + x.id]).sort((a, b) => b.prio - a.prio);
}
const CAT = { nutri: 'Nutrition', train: 'Entraînement', recup: 'Récupération', data: 'Données' };
function coachCard(x, i) {
  return `<details class="cc"><summary><span class="cc-ic">${x.ic}</span><div class="grow"><b>${x.title}</b><div class="small muted">${CAT[x.cat]} · confiance ${x.conf}</div></div><span class="cc-ch">›</span></summary>${insightCard(x).replace(/^<div class="ins[^"]*"><div class="ins-h">.*?<\/div>/s, '<div class="ins">')}
    <button class="btn sm ghost" data-act="ccOff" data-id="${x.id}" style="margin-top:6px">Masquer pour aujourd’hui</button></details>`;
}
ACTIONS.ccOff = el => { S.coachOff[todayStr() + '|' + el.dataset.id] = 1; const ks = Object.keys(S.coachOff); if (ks.length > 200) ks.slice(0, ks.length - 200).forEach(k => delete S.coachOff[k]); save(); const d = el.closest('details'); if (d) d.remove(); if ($('#launch') && typeof showLauncher === 'function') showLauncher(); };
ACTIONS.ccDaily = () => {
  const I = coachInsights();
  openSheet('Conseils du jour', I.length ? `<p class="small muted" style="margin-top:0">Touche un conseil pour voir le détail : ce qui a été détecté, les données utilisées, pourquoi et quoi faire.</p>${I.map(coachCard).join('')}` : '<div class="card empty"><div style="font-size:34px">✅</div><p class="muted">Rien à signaler aujourd’hui d’après tes données.</p></div>');
  stxMark(() => ACTIONS.ccDaily());
};
// ---------- bilan de la semaine ----------
let WK_OFF = 1;
function weekSummary(off) {
  const s = addDays(weekStart(), -7 * off), e = addDays(s, 6); const ps = addDays(s, -7), pe = addDays(s, -1);
  const W = inRange(s, e), PW = inRange(ps, pe); const vol = W.reduce((a, w) => a + wVolume(w), 0), pvol = PW.reduce((a, w) => a + wVolume(w), 0);
  const sets = W.reduce((a, w) => a + wSets(w), 0); const prs = W.reduce((a, w) => a + (w.prs || []).length, 0);
  const days = []; for (let i = 0; i < 7; i++) { const d = addDays(s, i); if (d < todayStr() && dayComplete(d)) days.push(sum(S.journal[d].map(entryN))); }
  const ws = S.weights.filter(w => w.d >= s && w.d <= e).map(w => w.kg), pws = S.weights.filter(w => w.d >= ps && w.d <= pe).map(w => w.kg);
  const ck = Object.keys(S.checkins).filter(d => d >= s && d <= e).map(d => S.checkins[d]); const sl = ck.filter(c => c.sleep).map(c => c.sleep);
  const lg = S.tdee.log.filter(x => x.d >= s && x.d <= e).pop();
  return { s, e, n: W.length, pn: PW.length, vol, pvol, sets, prs, kcal: days.length ? ENG.avg(days.map(x => x.kcal)) : null, prot: days.length ? ENG.avg(days.map(x => x.p)) : null, nd: days.length, w: ws.length ? ENG.avg(ws) : null, pw: pws.length ? ENG.avg(pws) : null, sleep: sl.length ? ENG.avg(sl) : null, nck: ck.length, tdee: lg ? lg.v : null };
}
function weeklyHTML() {
  const x = weekSummary(WK_OFF); const T = targets();
  const tile = (v, l, sub = '') => `<div class="stat"><div class="v">${v}</div><div class="l">${l}${sub ? `<br><small>${sub}</small>` : ''}</div></div>`;
  const pts = []; if (x.n < x.pn) pts.push(`moins de séances que la semaine précédente (${x.n} contre ${x.pn})`); if (x.prs) pts.push(`${x.prs} record${x.prs > 1 ? 's' : ''} battu${x.prs > 1 ? 's' : ''} 🏆`);
  if (T && x.prot != null) pts.push(x.prot >= T.p * 0.9 ? 'protéines dans l’objectif 👍' : `protéines en moyenne à ${r0(x.prot)} g pour ${r0(T.p)} g visés`);
  if (x.w != null && x.pw != null) pts.push(`poids moyen ${x.w - x.pw >= 0 ? '+' : '−'}${fr(r1(Math.abs(x.w - x.pw)))} kg vs la semaine d’avant`);
  const I = WK_OFF <= 1 ? coachInsights() : [];
  return `<div class="row between" style="margin-bottom:8px"><button class="iconbtn" data-act="wkNav" data-n="1" aria-label="Semaine précédente">‹</button><b>Semaine du ${esc(fmtDate(x.s, { day: 'numeric', month: 'long' }))}</b><button class="iconbtn" data-act="wkNav" data-n="-1" ${WK_OFF <= 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Semaine suivante">›</button></div>
    <div class="stx-tiles stx-fade">${tile(x.n, 'séances', x.pn ? `${x.n - x.pn >= 0 ? '+' : ''}${x.n - x.pn} vs sem. préc.` : '')}${tile(kgShort(x.vol), 'volume', x.pvol ? `${x.vol >= x.pvol ? '+' : '−'}${r0(Math.abs(x.vol - x.pvol) / x.pvol * 100)} %` : '')}
      ${tile(x.kcal != null ? r0(x.kcal) : '—', 'kcal/jour mangées', x.nd ? `${x.nd} j complets` : 'aucune journée complète')}${tile(x.prot != null ? r0(x.prot) + ' g' : '—', 'protéines/jour', T ? `objectif ${r0(T.p)} g` : '')}
      ${tile(x.w != null ? fr(r1(x.w)) + ' kg' : '—', 'poids moyen')}${tile(x.tdee ? r0(x.tdee) : '—', 'dépense estimée')}
      ${tile(x.sleep != null ? fr(r1(x.sleep)) + ' h' : '—', 'sommeil moyen', x.nck ? `${x.nck} bilans` : 'aucun bilan')}${tile(x.prs, 'records')}</div>
    ${pts.length ? `<div class="card stx-fade" style="background:var(--surface)"><b>En bref</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${pts.map(p => `<li>${p}</li>`).join('')}</ul></div>` : ''}
    ${I.length ? `<h3 style="margin:14px 0 6px">Conseils</h3>${I.map(coachCard).join('')}` : WK_OFF <= 1 ? '<p class="small muted">Aucun point d’attention détecté.</p>' : ''}`;
}
ACTIONS.ccWeek = () => { WK_OFF = 1; openSheet('Bilan de la semaine', weeklyHTML()); stxMark(() => openSheet('Bilan de la semaine', weeklyHTML())); };
ACTIONS.wkNav = el => { WK_OFF = Math.max(0, WK_OFF + +el.dataset.n); stxRefresh(() => openSheet('Bilan de la semaine', weeklyHTML())); };
