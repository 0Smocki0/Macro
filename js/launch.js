// ============================================================
//  ACCUEIL (refait) : résumé du jour, deux grandes cartes, raccourcis, réglages
// ============================================================
const L_GREEN = '#34c27a', L_BLUE = '#0a84ff';
const GEAR_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
function lRing(pct, color, size = 76, stroke = 9) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="lring" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
const IC_SVG = {
  plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  book: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  fork: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M17 3c-1.7 1.3-2.5 3.3-2.5 6s1 3 2.5 3v9"/></svg>',
  scale: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8.5 9a5 5 0 0 1 7 0L12 12.5z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5c-3.9 0-6.5-2.7-6.5-6.3 0-3.3 2.2-5.4 3.6-7.4.3 1.6 1.1 2.7 2.3 3.2.4-3.3 1.6-6 3.9-8.5.2 3.5 4.7 6.2 4.7 11.3 0 4.4-3.3 7.7-8 7.7z"/><path d="M12 21.5c-1.8 0-3-1.3-3-3 0-1.9 1.6-2.9 2.4-4.5.9 1.7 3.6 2.5 3.6 4.7 0 1.6-1.3 2.8-3 2.8z"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
};
const lBar = (v, max, color) => `<span class="lbar"><i style="width:${max > 0 ? Math.min(100, v / max * 100) : 0}%;background:${color}"></i></span>`;
showLauncher = function () {
  const T = targets(); const d = todayStr(); const list = S.journal[d] || []; const tot = sum(list.map(entryN));
  const ws = weekStart(); const week = TS.workouts.filter(w => wDate(w) >= ws); const days = new Set(TS.workouts.map(wDate));
  const last = sortedW()[0];
  // nutrition
  let nutri;
  if (!T) nutri = `<div class="lc-body"><div class="lc-big">Calcule tes besoins</div><div class="lc-sub">2 minutes pour fixer tes calories et tes macros</div></div>`;
  else {
    const left = T.kcal - tot.kcal;
    nutri = `<div class="lc-ringbox">${lRing(tot.kcal / T.kcal, L_GREEN)}<span class="lc-ringtxt"><b>${r0(Math.abs(left))}</b><small>${left < 0 ? 'en trop' : 'restantes'}</small></span></div>
      <div class="lc-body"><div class="lc-macros">
        <div><span>Protéines</span>${lBar(tot.p, T.p, '#6aa2f2')}<b>${r0(tot.p)}<small>/${r0(T.p)} g</small></b></div>
        <div><span>Glucides</span>${lBar(tot.c, T.c, '#f0bd4a')}<b>${r0(tot.c)}<small>/${r0(T.c)} g</small></b></div>
        <div><span>Lipides</span>${lBar(tot.f, T.f, '#f07c9c')}<b>${r0(tot.f)}<small>/${r0(T.f)} g</small></b></div></div></div>`;
  }
  // entraînement
  const dots = Array.from({ length: 7 }, (_, i) => { const x = addDays(ws, i); return `<span class="ldot ${days.has(x) ? 'on' : ''} ${x === d ? 'today' : ''}"><i></i>${'LMMJVSD'[i]}</span>`; }).join('');
  const train = TS.active
    ? `<div class="lc-body"><div class="lc-big">${esc(TS.active.name)}</div><div class="lc-sub live">● En cours · <span data-elapsed>${clock(Date.now() - TS.active.start)}</span></div></div>`
    : `<div class="lc-body"><div class="lc-big">${week.length} séance${week.length > 1 ? 's' : ''} <small>cette semaine</small></div>
        <div class="lc-sub">${last ? `Dernière : ${esc(last.name)} · ${esc(relDay(wDate(last)))}` : 'Lance ta première séance'}</div><div class="ldots">${dots}</div></div>`;
  // ---- à suivre : prochain repas du menu, prochaine séance ----
  const tiles = [];
  const pi = typeof planDayIndex === 'function' ? planDayIndex(d) : -1;
  if (T && pi >= 0) {
    const h = new Date().getHours(); const order = ['pdj', 'snack', 'dej', 'snack', 'diner'];
    const done = new Set(list.map(e => e.meal));
    const meals = S.plan.days[pi].meals; const slot = h < 10 ? 0 : h < 14 ? 2 : h < 17 ? 3 : 4;
    const m = meals.find(x => order.indexOf(x.key) >= slot && !done.has(x.key)) || meals.find(x => !done.has(x.key));
    if (m) { const k = sum(m.items.map(it => nutr(food(it.id), it.g))).kcal; const names = m.items.filter(it => it.g > 0).slice(0, 2).map(it => food(it.id).name.split(' (')[0]);
      tiles.push(`<button class="ltile" data-act="lqMenu"><span class="lt-ic" style="background:${L_GREEN}">${IC_SVG.fork}</span><span class="lt-l">Prochain repas</span><b>${esc(MEAL_LABEL[m.key] || m.key)}</b><span class="lt-s">${r0(k)} kcal · ${esc(names.join(', '))}</span></button>`); }
  } else if (T) tiles.push(`<button class="ltile" data-act="lqMenu"><span class="lt-ic" style="background:${L_GREEN}">${IC_SVG.fork}</span><span class="lt-l">Menu</span><b>Créer mon menu</b><span class="lt-s">Repas et courses sur tes macros</span></button>`);
  if (!TS.active) {
    const own = TS.routines.filter(r => !(typeof STARTER_NAMES !== 'undefined' && STARTER_NAMES.has(r.name)) && !r.suggested);
    const R = own.length ? own : TS.routines;
    const lastOf = r => { const w = sortedW().find(w => w.routineId === r.id || norm(w.name).trim() === norm(r.name).trim()); return w ? w.start : 0; };
    const next = R.slice().sort((x, y) => lastOf(x) - lastOf(y))[0];
    if (next) { const lt = lastOf(next);
      tiles.push(`<button class="ltile" data-act="lqRoutine" data-id="${next.id}"><span class="lt-ic" style="background:${L_BLUE}">${IC_SVG.play}</span><span class="lt-l">Prochaine séance</span><b>${esc(next.name)}</b><span class="lt-s">${next.exercises.length} exercices · ${lt ? 'faite ' + esc(relDay(wDate({ start: lt }))) : 'jamais faite'}</span></button>`); }
  }
  // ---- poids et régularité ----
  const W = (S.weights || []).slice().sort((a, b) => a.d < b.d ? -1 : 1);
  if (W.length) { const lw = W[W.length - 1]; const ref = W.filter(x => x.d <= addDays(lw.d, -7)).pop(); const dv = ref ? lw.kg - ref.kg : null;
    const pts = W.slice(-10).map(x => x.kg); const mn = Math.min(...pts), mx = Math.max(...pts);
    const spark = pts.length > 1 ? `<svg viewBox="0 0 80 26" class="lt-spark"><path d="${pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1) * 78 + 1).toFixed(1)} ${(24 - (mx > mn ? (v - mn) / (mx - mn) : .5) * 22).toFixed(1)}`).join('')}" fill="none" stroke="#bf5af2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
    tiles.push(`<button class="ltile" data-act="lqWeight"><span class="lt-ic" style="background:#bf5af2">${IC_SVG.scale}</span><span class="lt-l">Poids</span><b>${fr(r1(lw.kg))} kg</b><span class="lt-s">${dv != null ? `${dv > 0 ? '+' : dv < 0 ? '−' : ''}${fr(r1(Math.abs(dv)))} kg en 7 jours` : esc(relDay(lw.d))}</span>${spark}</button>`);
  } else if (T) tiles.push(`<button class="ltile" data-act="lqWeight"><span class="lt-ic" style="background:#bf5af2">${IC_SVG.scale}</span><span class="lt-l">Poids</span><b>Ajouter</b><span class="lt-s">Suis ta courbe semaine après semaine</span></button>`);
  if (TS.workouts.length) {
    let streak = 0; for (let i = 0; i < 104; i++) { const s0 = addDays(ws, -7 * i), e0 = addDays(s0, 6); const n = TS.workouts.some(w => { const x = wDate(w); return x >= s0 && x <= e0; }); if (n) streak++; else if (i === 0) continue; else break; }
    const month = d.slice(0, 7); const prs = TS.workouts.filter(w => wDate(w).startsWith(month)).reduce((a, w) => a + ((w.prDetail || w.prs || []).length), 0);
    tiles.push(`<button class="ltile" data-act="lqStats"><span class="lt-ic" style="background:#ff9f0a">${IC_SVG.flame}</span><span class="lt-l">Régularité</span><b>${streak} semaine${streak > 1 ? 's' : ''}</b><span class="lt-s">d’affilée${prs ? ` · ${prs} record${prs > 1 ? 's' : ''} ce mois` : ''}</span></button>`);
  }
  // ---- compléments du jour ----
  const sup = (S.supps || []);
  const supHTML = sup.length ? `<div class="lsup"><div class="lsec">Compléments</div><div class="lsup-row">${sup.map(x => { const on = typeof suppEntry === 'function' && suppEntry(d, x.id);
    return `<button class="lchip ${on ? 'on' : ''}" data-act="lqSupp" data-id="${x.id}"><span>${on ? IC_SVG.check : ''}</span>${esc(x.name)}</button>`; }).join('')}</div></div>` : '';
  let el = $('#launch'); if (!el) { el = document.createElement('div'); el.id = 'launch'; document.body.appendChild(el); }
  el.innerHTML = `<div class="lbg" aria-hidden="true"><i></i><i></i><i></i></div><div class="launch-in lnew">
    <header class="lhead2"><div><div class="ldate">${esc(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</div><h1>${greeting()}</h1></div>
      <button class="lset2" data-act="openSettings" aria-label="Réglages">${GEAR_SVG}</button></header>
    <button class="lcard2 nutri" data-act="launchGo" data-v="nutri"><div class="lc-top"><span class="lc-name" style="color:${L_GREEN}">Nutrition</span><span class="lc-go">›</span></div><div class="lc-row">${nutri}</div></button>
    <button class="lcard2 train" data-act="launchGo" data-v="train"><div class="lc-top"><span class="lc-name" style="color:${L_BLUE}">Entraînement</span><span class="lc-go">${TS.active ? 'Reprendre ›' : '›'}</span></div><div class="lc-row">${train}</div></button>
    ${tiles.length ? `<div class="lsec">À suivre</div><div class="ltiles">${tiles.join('')}</div>` : ''}
    ${supHTML}
    <div class="lsec">Raccourcis</div>
    <div class="lquick">
      <button data-act="lqAdd"><span style="background:${L_GREEN}">${IC_SVG.plus}</span>Ajouter un aliment</button>
      <button data-act="lqStart"><span style="background:${L_BLUE}">${IC_SVG.play}</span>${TS.active ? 'Reprendre la séance' : 'Démarrer une séance'}</button>
      <button data-act="lqRecipes"><span style="background:#ff9f0a">${IC_SVG.book}</span>Mes recettes</button>
    </div></div>`;
};
const lGo = m => ACTIONS.launchGo({ dataset: { v: m } });
Object.assign(ACTIONS, {
  lqAdd: () => { lGo('nutri'); if (!targets()) return; S.ui.tab = 'journal'; S.ui.date = null; save(); render(); const h = new Date().getHours(); openAdd(h < 11 ? 'pdj' : h < 15 ? 'dej' : h < 18 ? 'snack' : 'diner'); },
  lqStart: () => { lGo('train'); S.ui.tab = TS.active ? 't_live' : 't_home'; save(); render(); window.scrollTo(0, 0); },
  lqRecipes: () => { lGo('nutri'); if (!targets()) return; S.ui.tab = 'menus'; save(); render(); openRecipes(); },
  lqMenu: () => { lGo('nutri'); if (!targets()) return; S.ui.tab = 'menus'; save(); render(); },
  lqRoutine: el => { const id = el.dataset.id; lGo('train'); S.ui.tab = 't_home'; save(); render(); ACTIONS.tStartRoutine({ dataset: { id } }); },
  lqWeight: () => { lGo('nutri'); S.ui.tab = 'profil'; S.ui.pSub = 'poids'; save(); render(); },
  lqStats: () => { lGo('train'); S.ui.tab = 't_stats'; save(); render(); },
  lqSupp: el => { toggleSupp(el.dataset.id, todayStr()); if (navigator.vibrate) navigator.vibrate(10); showLauncher(); }
});
// au lancement, l’accueil a pu être affiché avant ce fichier : on le redessine
if ($('#launch')) showLauncher();
