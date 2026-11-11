// ============================================================
//  ACCUEIL PERSONNALISABLE (appui long) + APPUI LONG = menu ⋯ partout
// ============================================================
IC_SVG.cart = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h3l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2l1.4-7.2H6.6"/></svg>';
IC_SVG.scan = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9v6M11 9v6M14 9v6M17 9v6"/></svg>';
IC_SVG.timer = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>';
IC_SVG.clock = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/></svg>';
IC_SVG.chart = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 20V11M12 20V5M19 20v-7"/></svg>';
IC_SVG.dumbbell = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>';
IC_SVG.trophy = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>';
IC_SVG.bolt = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/></svg>';
IC_SVG.drop = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.5S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5z"/></svg>';
IC_SVG.repeat = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.5 20.5 6 17 9.5"/><path d="M4 12V10a4 4 0 0 1 4-4h12.5M7 21.5 3.5 18 7 14.5"/><path d="M20 12v2a4 4 0 0 1-4 4H3.5"/></svg>';
IC_SVG.drumstick = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3.5a5 5 0 0 1 5 5c0 3-2.5 4.5-5 5.5L12 15.5 8.5 12 10 8.5c1-2.5 2.5-5 5.5-5z"/><path d="M8.5 12 5 15.5M12 15.5 8.5 19"/><circle cx="4.3" cy="16.3" r="1.6"/><circle cx="7.7" cy="19.7" r="1.6"/></svg>';
IC_SVG.clipboard = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17.5" rx="3"/><path d="M9 4V3h6v1M9 10l1.6 1.6L14 8.5M9 16h6"/></svg>';
IC_SVG.calendar = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';

// ---------- configuration ----------
const HOME_DEF = { blocks: ['nutri', 'train', 'tiles', 'supps', 'quick'], hidden: [], tiles: ['meal', 'routine', 'weight', 'streak'], quick: ['add', 'start', 'recipes'] };
const homeCfg = () => { const c = S.ui.home || {}; return { blocks: c.blocks || HOME_DEF.blocks, hidden: c.hidden || [], tiles: c.tiles || HOME_DEF.tiles, quick: c.quick || HOME_DEF.quick }; };
const BLOCKS = { nutri: 'Carte Nutrition', train: 'Carte Entraînement', tiles: 'Statistiques', supps: 'Compléments à cocher', quick: 'Raccourcis' };

// ---------- statistiques disponibles ----------
const tileBtn = (act, color, ic, label, big, sub, extra = '', attrs = '') => `<button class="ltile" data-act="${act}" ${attrs}><span class="lt-ic" style="background:${color}">${IC_SVG[ic]}</span><span class="lt-l">${label}</span><b>${big}</b><span class="lt-s">${sub}</span>${extra}</button>`;
function lastDays(n) { const out = []; for (let i = 1; i <= n; i++) { const x = addDays(todayStr(), -i); const L = S.journal[x]; if (L && L.some(e => e.meal !== 'compl')) out.push(sum(L.map(entryN))); } return out; }
const TILES = {
  meal: { name: 'Prochain repas', f: () => {
    const T = targets(); const d = todayStr(); const list = S.journal[d] || []; const pi = typeof planDayIndex === 'function' ? planDayIndex(d) : -1;
    if (T && pi >= 0) { const h = new Date().getHours(); const order = ['pdj', 'snack', 'dej', 'snack', 'diner']; const done = new Set(list.map(e => e.meal));
      const meals = S.plan.days[pi].meals; const slot = h < 10 ? 0 : h < 14 ? 2 : h < 17 ? 3 : 4;
      const m = meals.find(x => order.indexOf(x.key) >= slot && !done.has(x.key)) || meals.find(x => !done.has(x.key));
      if (m) { const k = sum(m.items.map(it => nutr(food(it.id), it.g))).kcal; const names = m.items.filter(it => it.g > 0).slice(0, 2).map(it => food(it.id).name.split(' (')[0]);
        return tileBtn('lqMenu', L_GREEN, 'fork', 'Prochain repas', esc(MEAL_LABEL[m.key] || m.key), `${r0(k)} kcal · ${esc(names.join(', '))}`); } }
    return T ? tileBtn('lqMenu', L_GREEN, 'fork', 'Prochain repas', 'Créer mon menu', 'Repas et courses sur tes macros') : ''; } },
  routine: { name: 'Prochaine séance', f: () => {
    if (TS.active) return tileBtn('lqStart', L_BLUE, 'play', 'Séance en cours', esc(TS.active.name), `<span data-elapsed>${clock(Date.now() - TS.active.start)}</span>`);
    const own = TS.routines.filter(r => !(typeof STARTER_NAMES !== 'undefined' && STARTER_NAMES.has(r.name)) && !r.suggested); const R = own.length ? own : TS.routines;
    const lastOf = r => { const w = sortedW().find(w => w.routineId === r.id || norm(w.name).trim() === norm(r.name).trim()); return w ? w.start : 0; };
    const next = R.slice().sort((x, y) => lastOf(x) - lastOf(y))[0]; if (!next) return '';
    const lt = lastOf(next); return tileBtn('lqRoutine', L_BLUE, 'play', 'Prochaine séance', esc(next.name), `${next.exercises.length} exercices · ${lt ? 'faite ' + esc(relDay(wDate({ start: lt }))) : 'jamais faite'}`, '', `data-id="${next.id}"`); } },
  weight: { name: 'Poids', f: () => {
    const W = (S.weights || []).slice().sort((a, b) => a.d < b.d ? -1 : 1);
    if (!W.length) return targets() ? tileBtn('lqWeight', '#bf5af2', 'scale', 'Poids', 'Ajouter', 'Suis ta courbe semaine après semaine') : '';
    const lw = W[W.length - 1]; const ref = W.filter(x => x.d <= addDays(lw.d, -7)).pop(); const dv = ref ? lw.kg - ref.kg : null;
    const pts = W.slice(-10).map(x => x.kg); const mn = Math.min(...pts), mx = Math.max(...pts);
    const spark = pts.length > 1 ? `<svg viewBox="0 0 80 26" class="lt-spark"><path d="${pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1) * 78 + 1).toFixed(1)} ${(24 - (mx > mn ? (v - mn) / (mx - mn) : .5) * 22).toFixed(1)}`).join('')}" fill="none" stroke="#bf5af2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
    return tileBtn('lqWeight', '#bf5af2', 'scale', 'Poids', `${fr(r1(lw.kg))} kg`, dv != null ? `${dv > 0 ? '+' : dv < 0 ? '−' : ''}${fr(r1(Math.abs(dv)))} kg en 7 jours` : esc(relDay(lw.d)), spark); } },
  streak: { name: 'Régularité', f: () => {
    if (!TS.workouts.length) return ''; const ws = weekStart();
    let streak = 0; for (let i = 0; i < 104; i++) { const s0 = addDays(ws, -7 * i), e0 = addDays(s0, 6); if (TS.workouts.some(w => { const x = wDate(w); return x >= s0 && x <= e0; })) streak++; else if (i === 0) continue; else break; }
    return tileBtn('lqStats', '#ff9f0a', 'repeat', 'Régularité', `${streak} semaine${streak > 1 ? 's' : ''}`, 'd’affilée avec au moins une séance'); } },
  volume: { name: 'Volume de la semaine', f: () => {
    const ws = weekStart(); const L = TS.workouts.filter(w => wDate(w) >= ws); if (!TS.workouts.length) return '';
    return tileBtn('tWeekVol', L_BLUE, 'dumbbell', 'Volume de la semaine', bigKg(L.reduce((a, w) => a + wVolume(w), 0)), `${L.reduce((a, w) => a + wSets(w), 0)} séries · ${L.length} séance${L.length > 1 ? 's' : ''}`); } },
  records: { name: 'Records du mois', f: () => {
    if (!TS.workouts.length) return ''; const m = todayStr().slice(0, 7); const W = TS.workouts.filter(w => wDate(w).startsWith(m) && (w.prDetail || []).length);
    const n = W.reduce((a, w) => a + w.prDetail.length, 0); const lastPr = W.sort((a, b) => b.start - a.start)[0];
    return tileBtn('lqStats', '#ffd60a', 'trophy', 'Records du mois', `${n} record${n > 1 ? 's' : ''}`, lastPr ? esc(`${lastPr.prDetail[0].ex} · ${lastPr.prDetail[0].nw}`) : 'Bats un record pour le voir ici'); } },
  kcal7: { name: 'Calories · 7 jours', f: () => {
    const T = targets(); if (!T) return ''; const L = lastDays(7); if (!L.length) return tileBtn('lqNutriStats', '#ff453a', 'flame', 'Calories · 7 jours', '—', 'Note tes repas pour la voir');
    const avg = L.reduce((a, t) => a + t.kcal, 0) / L.length; const dv = avg - T.kcal;
    return tileBtn('lqNutriStats', '#ff453a', 'flame', 'Calories · 7 jours', `${r0(avg)} kcal`, `${dv >= 0 ? '+' : '−'}${r0(Math.abs(dv))} kcal / objectif · ${L.length} j notés`); } },
  prot7: { name: 'Protéines · 7 jours', f: () => {
    const T = targets(); if (!T) return ''; const L = lastDays(7); if (!L.length) return '';
    const avg = L.reduce((a, t) => a + t.p, 0) / L.length; return tileBtn('lqNutriStats', '#6aa2f2', 'drumstick', 'Protéines · 7 jours', `${r0(avg)} g / jour`, `objectif ${r0(T.p)} g · ${r0(avg / T.p * 100)} %`); } },
  logstreak: { name: 'Jours suivis', f: () => {
    if (typeof streak !== 'function' || !targets()) return ''; const n = streak();
    return tileBtn('lqNutri', '#30b0c7', 'calendar', 'Jours suivis', `${n} jour${n > 1 ? 's' : ''}`, 'd’affilée avec tes repas notés'); } },
  shop: { name: 'Courses', f: () => {
    if (!S.plan || typeof shopList !== 'function') return ''; const L = shopList(); const left = L.filter(x => !(S.shop.checked || {})[x.id]).length;
    return tileBtn('lqShop', '#ff9f0a', 'cart', 'Courses', `${left} article${left > 1 ? 's' : ''}`, left ? 'à acheter pour ton menu' : 'tout est coché ✓'); } }
};
// ---------- raccourcis disponibles ----------
const QUICK = {
  add: ['Ajouter un aliment', L_GREEN, 'plus', 'lqAdd'], scan: ['Scanner un produit', L_GREEN, 'scan', 'lqScan'], recipes: ['Mes recettes', '#ff9f0a', 'book', 'lqRecipes'],
  menu: ['Mon menu', L_GREEN, 'fork', 'lqMenu'], shop: ['Courses', '#ff9f0a', 'cart', 'lqShop'], weight: ['Noter mon poids', '#bf5af2', 'scale', 'lqWeight'],
  start: ['Démarrer une séance', L_BLUE, 'play', 'lqStart'], timer: ['Minuteur', L_BLUE, 'timer', 'lqTimer'], history: ['Historique', L_BLUE, 'clock', 'lqHist'],
  stats: ['Progrès', '#ff9f0a', 'chart', 'lqStats'], program: ['Bilan du programme', L_BLUE, 'clipboard', 'lqProgram']
};

// ---------- l’accueil, construit selon la configuration ----------
let HOME_SILENT = false, HOME_NEW = null;
const _launcherBase = showLauncher;
showLauncher = function () {
  _launcherBase();
  const el = $('#launch'); const box = el && el.querySelector('.lnew'); if (!box) return;
  const cfg = homeCfg();
  const parts = { nutri: box.querySelector('.lcard2.nutri'), train: box.querySelector('.lcard2.train') };
  const supEl = box.querySelector('.lsup');
  [...box.querySelectorAll('.lsec, .ltiles, .lquick, .lsup')].forEach(n => n.remove());
  const make = html => { const t = document.createElement('div'); t.innerHTML = html.trim(); return [...t.childNodes]; };
  const tilesHTML = cfg.tiles.map(id => TILES[id] ? TILES[id].f().replace('<button class="ltile"', `<button class="ltile" data-tid="${id}"`) : '').filter(Boolean);
  const blocks = {
    nutri: parts.nutri ? [parts.nutri] : [], train: parts.train ? [parts.train] : [],
    tiles: tilesHTML.length ? make(`<div class="lsec">Mes statistiques</div><div class="ltiles">${tilesHTML.join('')}</div>`) : [],
    supps: supEl ? [supEl] : [],
    quick: cfg.quick.length ? make(`<div class="lsec">Raccourcis</div><div class="lquick">${cfg.quick.filter(id => QUICK[id]).map(id => { const [l, c, ic, act] = QUICK[id]; return `<button data-act="${act}" data-qid="${id}"><span style="--c:${c}">${IC_SVG[ic]}</span>${id === 'start' && TS.active ? 'Reprendre la séance' : l}</button>`; }).join('')}</div>`) : []
  };
  for (const n of [parts.nutri, parts.train]) if (n) n.remove();
  for (const b of cfg.blocks) if (!cfg.hidden.includes(b)) for (const n of blocks[b] || []) box.appendChild(n);
  box.insertAdjacentHTML('beforeend', '<button class="lcustom" data-act="homeJiggleOn">Personnaliser l’accueil · ou appui long</button>');
  if (HOME_SILENT) box.classList.add('lsilent');
  if (HOME_NEW) { const n = box.querySelector(`[data-tid="${HOME_NEW}"], [data-qid="${HOME_NEW}"]`); if (n) { n.classList.add('lpop'); setTimeout(() => n.classList.remove('lpop'), 600); } HOME_NEW = null; }
  if (HOME_JIGGLE) homeJiggleDecorate();
};

// ---------- fenêtre de personnalisation ----------
const TILE_LOOK = { meal: ['fork', L_GREEN], routine: ['play', L_BLUE], weight: ['scale', '#bf5af2'], streak: ['repeat', '#ff9f0a'], volume: ['dumbbell', L_BLUE], records: ['trophy', '#ffd60a'],
  kcal7: ['flame', '#ff453a'], prot7: ['drumstick', '#6aa2f2'], logstreak: ['calendar', '#30b0c7'], shop: ['cart', '#ff9f0a'] };
function tilePreview(id) {
  let h = ''; try { h = TILES[id].f(); } catch (e) { }
  if (!h) { const [ic, col] = TILE_LOOK[id] || ['chart', '#8e8e93']; h = tileBtn('x', col, ic, TILES[id].name, '—', 'Pas encore de données'); }
  // un bouton ne peut pas contenir un autre bouton : l’aperçu devient un simple bloc
  return h.replace(/data-act="[^"]*"/, '').replace(/data-id="[^"]*"/, '').replace(/^<button/, '<div').replace(/<\/button>\s*$/, '</div>');
}
const badge = on => `<span class="hbadge ${on ? 'on' : ''}">${on ? IC_SVG.check : IC_SVG.plus}</span>`;
function blocksHTML() {
  const c = homeCfg();
  return c.blocks.map((id, i) => `<div class="hrow"><label class="hsw"><input type="checkbox" data-hblock="${id}" ${c.hidden.includes(id) ? '' : 'checked'}><span></span></label><span class="grow">${BLOCKS[id]}</span>
    <button class="iconbtn" data-act="homeMove" data-id="${id}" data-n="-1" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Monter">↑</button><button class="iconbtn" data-act="homeMove" data-id="${id}" data-n="1" ${i === c.blocks.length - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Descendre">↓</button></div>`).join('');
}
function homeEditHTML() {
  const c = homeCfg();
  return `<p class="small muted" style="margin:-2px 2px 4px">Touche un élément pour l’ajouter ou le retirer. Pour changer l’ordre, glisse les icônes directement sur l’accueil.</p>
    <h3 class="hh">Statistiques <span class="hcount" id="hcT">${c.tiles.length}/6</span></h3>
    <div class="hgal">${Object.keys(TILES).map(id => { const on = c.tiles.includes(id); return `<button class="hprev ${on ? 'on' : ''}" data-act="homeTile" data-id="${id}"><div class="hprev-in">${tilePreview(id)}</div>${badge(on)}</button>`; }).join('')}</div>
    <h3 class="hh">Raccourcis <span class="hcount" id="hcQ">${c.quick.length}/6</span></h3>
    <div class="hqgal">${Object.entries(QUICK).map(([id, [l, col, ic]]) => { const on = c.quick.includes(id); return `<button class="hqprev ${on ? 'on' : ''}" data-act="homeQuick" data-id="${id}"><span class="hq-ic" style="--c:${col}">${IC_SVG[ic]}</span><span class="hq-l">${esc(l)}</span>${badge(on)}</button>`; }).join('')}</div>
    <h3 class="hh">Blocs</h3><div class="hblocks" id="hBlocks">${blocksHTML()}</div>
    <div class="row" style="gap:8px;margin-top:16px"><button class="btn" data-act="homeReset">Réinitialiser</button><button class="btn primary grow" data-act="closeSheet">Terminé</button></div>`;
}
// enregistre et redessine l’accueil sans l’animation d’arrivée
function homeSaveSilent(c, newId) { S.ui.home = c; save(); HOME_SILENT = true; HOME_NEW = newId || null; try { showLauncher(); } finally { HOME_SILENT = false; } }
function homeSave(c) { homeSaveSilent(c); const b = $('#hBlocks'); if (b) b.innerHTML = blocksHTML(); }
document.addEventListener('change', e => { const id = e.target.dataset && e.target.dataset.hblock; if (!id) return; const c = homeCfg(); c.hidden = e.target.checked ? c.hidden.filter(x => x !== id) : [...c.hidden, id]; homeSave(c); });
const toggleIn = (arr, id, max) => arr.includes(id) ? arr.filter(x => x !== id) : arr.length >= max ? (toast(`${max} au maximum`), arr) : [...arr, id];
// bascule un aperçu sur place (pas de rafraîchissement de la fenêtre)
function togglePreview(el, key, countId) {
  const c = homeCfg(); const id = el.dataset.id; const was = c[key].includes(id);
  c[key] = toggleIn(c[key], id, 6); const now = c[key].includes(id); if (now === was) return;
  el.classList.toggle('on', now); const b = el.querySelector('.hbadge'); if (b) { b.outerHTML = badge(now); }
  el.animate([{ scale: 1 }, { scale: .94 }, { scale: 1.03 }, { scale: 1 }], { duration: 320, easing: 'ease-out' });
  const cnt = $('#' + countId); if (cnt) cnt.textContent = `${c[key].length}/6`;
  haptic([8]); homeSaveSilent(c, now ? id : null);
}
Object.assign(ACTIONS, {
  homeEdit: () => openSheet('Personnaliser l’accueil', homeEditHTML()),
  homeMove: el => { const c = homeCfg(); const a = [...c.blocks], i = a.indexOf(el.dataset.id), j = i + +el.dataset.n; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; c.blocks = a; homeSave(c); },
  homeTile: el => togglePreview(el, 'tiles', 'hcT'),
  homeQuick: el => togglePreview(el, 'quick', 'hcQ'),
  homeReset: () => { delete S.ui.home; homeSaveSilent(homeCfg()); const b = $('#sheetBody'); if (b) b.innerHTML = homeEditHTML(); toast('Accueil réinitialisé'); },
  // nouveaux raccourcis
  lqScan: () => { lGo('nutri'); if (!targets()) return; S.ui.tab = 'journal'; save(); render(); const h = new Date().getHours(); openAdd(h < 11 ? 'pdj' : h < 15 ? 'dej' : h < 18 ? 'snack' : 'diner'); A.view = 'scan'; renderAdd(); },
  lqShop: () => { lGo('nutri'); S.ui.tab = 'courses'; save(); render(); },
  lqTimer: () => { lGo('train'); S.ui.tab = TS.active ? 't_live' : 't_home'; save(); render(); ACTIONS.tTimer(); },
  lqHist: () => { lGo('train'); S.ui.tab = 't_hist'; save(); render(); },
  lqProgram: () => { lGo('train'); S.ui.tab = 't_home'; save(); render(); openProgramNote(); },
  lqNutri: () => lGo('nutri'),
  lqNutriStats: () => { lGo('nutri'); S.ui.tab = 'progres'; save(); render(); }
});

// ---------- appui long ----------
// sur une carte qui a un menu ⋯, l’appui long ouvre ce même menu ; sur l’accueil, il ouvre la personnalisation
const LP_TARGETS = [
  ['section.card.meal', '[data-act=mealMenu]'], ['section.card.routine', '[data-act=tRoutineMenu]'], ['.whist2', '[data-act=tWMenu]'],
  ['.rtex2', '[data-act=rteMenu]'], ['section.card.exo', '[data-act=tExMenu]'], ['details.folder > summary', '[data-act=tFolderMenu]'],
  ['.suppcard', '[data-act=suppManage]'], ['.srow:not(.shead)', '.stype']
];
// retour tactile d’un appui long : Android vibre tout de suite ; iPhone n’accepte le retour haptique
// que pendant un vrai geste, on le déclenche donc au moment où le doigt se relève
let LP_PENDING = false;
function lpHaptic() { if (navigator.vibrate && navigator.vibrate(14)) return; LP_PENDING = true; }
for (const ev of ['touchend', 'pointerup']) document.addEventListener(ev, () => { if (LP_PENDING) { LP_PENDING = false; haptic([12]); } }, { capture: true, passive: true });
(function longPress() {
  let timer = null, sx = 0, sy = 0, fired = 0;
  const cancel = () => { clearTimeout(timer); timer = null; };
  document.addEventListener('pointerdown', e => {
    cancel(); if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target; if (t.closest('input, textarea, select, .ctxpop')) return;
    sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => {
      timer = null;
      if (t.closest('#launch') && !t.closest('.sheet')) { if (!HOME_JIGGLE) { fired = Date.now(); lpHaptic(); homeJiggle(true); } return; }
      for (const [sel, btnSel] of LP_TARGETS) {
        const box = t.closest(sel); if (!box) continue;
        const btn = box.querySelector(btnSel); if (!btn) continue;
        fired = Date.now(); lpHaptic();
        btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); // pour que le petit menu s’ouvre à côté
        btn.click(); return;
      }
    }, 480);
  }, { capture: true, passive: true });
  document.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); }, { passive: true });
  for (const ev of ['pointerup', 'pointercancel', 'scroll']) document.addEventListener(ev, cancel, { capture: true, passive: true });
  // le relâchement après un appui long ne doit pas aussi « toucher » la carte
  document.addEventListener('click', e => { if (fired && Date.now() - fired < 900 && !e.target.closest('.ctxpop, .sheet')) { e.preventDefault(); e.stopImmediatePropagation(); fired = 0; } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest('#launch, section.card, .whist2, .rtex2, .srow, details.folder')) e.preventDefault(); });
})();

// ============================================================
//  MODE ÉDITION (comme l’écran d’accueil d’iOS) : les icônes tremblent, on les déplace en glissant
// ============================================================
let HOME_JIGGLE = false;
function homeJiggleDecorate() {
  const el = $('#launch'); if (!el) return;
  el.classList.add('ledit');
  for (const b of el.querySelectorAll('.ltile[data-tid], .lquick [data-qid]')) if (!b.querySelector('.lrm')) b.insertAdjacentHTML('afterbegin', '<span class="lrm" data-rm="1" aria-label="Retirer">−</span>');
  if (!el.querySelector('.leditbar')) el.insertAdjacentHTML('beforeend', `<div class="leditbar"><button data-act="homeEdit">＋ Ajouter · blocs</button><button class="ok" data-act="homeJiggleOff">OK</button></div>`);
}
function homeJiggle(on) {
  HOME_JIGGLE = on; const el = $('#launch'); if (!el) return;
  clearTimeout(homeJiggle._t);
  if (on) { el.classList.remove('lexit'); homeJiggleDecorate(); return; }
  // les « − » rétrécissent, la barre descend, le tremblement se calme… puis on nettoie
  el.classList.add('lexit');
  homeJiggle._t = setTimeout(() => { el.classList.remove('ledit', 'lexit'); el.querySelectorAll('.lrm, .leditbar').forEach(n => n.remove()); }, 280);
}
ACTIONS.homeJiggleOn = () => homeJiggle(true);
ACTIONS.homeJiggleOff = () => homeJiggle(false);
(function dragIcons() {
  let drag = null, lastSwap = 0;
  const items = grid => [...grid.querySelectorAll(':scope > .ltile[data-tid], :scope > button[data-qid]')];
  const EASE = 'cubic-bezier(.2, .9, .3, 1.12)';
  // FLIP : chaque icône part de sa position visible et glisse vers sa nouvelle place
  // (on anime « translate », indépendant du « transform » du tremblement)
  function flip(grid, mutate, skip) {
    const L = items(grid).filter(x => x !== skip);
    const before = new Map(L.map(x => [x, x.getBoundingClientRect()]));
    mutate();
    for (const x of L) {
      if (!x.isConnected) continue; const r0 = before.get(x), r1 = x.getBoundingClientRect();
      const dx = r0.left - r1.left, dy = r0.top - r1.top; if (!dx && !dy) continue;
      if (x._flip) x._flip.cancel();
      x._flip = x.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 320, easing: EASE });
    }
  }
  // en mode édition : un toucher n’ouvre rien ; « − » retire l’icône (elle rétrécit, les autres comblent la place)
  document.addEventListener('click', e => {
    if (!HOME_JIGGLE || !e.target.closest('#launch') || e.target.closest('.leditbar, .lcustom, .sheet')) return;
    const rm = e.target.closest('.lrm'); const it = e.target.closest('.ltile[data-tid], button[data-qid]');
    e.preventDefault(); e.stopImmediatePropagation();
    if (!(rm && it)) return;
    const c = homeCfg(); if (it.dataset.tid) c.tiles = c.tiles.filter(x => x !== it.dataset.tid); else c.quick = c.quick.filter(x => x !== it.dataset.qid); S.ui.home = c; save();
    const grid = it.parentElement; haptic([8]);
    it.style.pointerEvents = 'none';
    let gone = false; const finish = () => { if (gone) return; gone = true; flip(grid, () => it.remove(), it); if (!items(grid).length) setTimeout(() => homeSaveSilent(homeCfg()), 320); };
    it.animate([{ scale: 1, opacity: 1 }, { scale: .2, opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).onfinish = finish;
    setTimeout(finish, 230);
  }, true);
  document.addEventListener('pointerdown', e => {
    if (!HOME_JIGGLE) return; const it = e.target.closest('#launch .ltile[data-tid], #launch .lquick button[data-qid]'); if (!it || e.target.closest('.lrm')) return;
    if (it._drop) { it._drop(); }
    drag = { it, grid: it.parentElement, sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId };
  }, true);
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved) { if (Math.hypot(dx, dy) < 6) return; drag.moved = true; drag.it.classList.add('ldrag'); }
    drag.it.style.transform = `translate(${dx}px, ${dy}px) scale(1.07)`;
    // l’icône survolée laisse sa place (avec un petit délai pour éviter les allers-retours)
    if (Date.now() - lastSwap < 140) return;
    drag.it.style.pointerEvents = 'none';
    const under = document.elementFromPoint(e.clientX, e.clientY); drag.it.style.pointerEvents = '';
    const over = under && under.closest('.ltile[data-tid], button[data-qid]');
    if (over && over !== drag.it && over.parentElement === drag.grid) {
      const L = items(drag.grid); const beforeIt = L.indexOf(over) < L.indexOf(drag.it);
      const r0_ = drag.it.getBoundingClientRect();
      flip(drag.grid, () => drag.grid.insertBefore(drag.it, beforeIt ? over : over.nextSibling), drag.it);
      const r1_ = drag.it.getBoundingClientRect(); drag.sx += r1_.left - r0_.left; drag.sy += r1_.top - r0_.top;
      drag.it.style.transform = `translate(${e.clientX - drag.sx}px, ${e.clientY - drag.sy}px) scale(1.07)`;
      lastSwap = Date.now(); haptic([6]);
    }
  }, { passive: true });
  const end = () => {
    if (!drag) return; const d = drag; drag = null;
    const it = d.it; it.classList.remove('ldrag');
    if (!d.moved) { it.style.transform = ''; return; }
    // l’icône lâchée glisse jusqu’à sa place
    it.classList.add('ldrop'); void it.offsetWidth; it.style.transform = '';
    const done = () => { it.classList.remove('ldrop'); it.removeEventListener('transitionend', done); it._drop = null; };
    it._drop = done; it.addEventListener('transitionend', done); setTimeout(done, 450);
    const c = homeCfg();
    if (it.dataset.tid) { const order = items(d.grid).map(x => x.dataset.tid); c.tiles = [...order, ...c.tiles.filter(x => !order.includes(x))]; }
    else c.quick = items(d.grid).map(x => x.dataset.qid);
    S.ui.home = c; save();
  };
  document.addEventListener('pointerup', end, true); document.addEventListener('pointercancel', end, true);
})();
// à chaque ouverture ou actualisation de l’appli, on arrive sur l’accueil
showLauncher();
