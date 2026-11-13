// ============================================================
//  PROGRÈS INTERACTIF : statistiques cliquables, détails, filtres
//  (navigation dans la fenêtre sans la refermer, bouton ‹ retour)
// ============================================================

// ---------- Navigation dans une même fenêtre ----------
let ST_STACK = [], ST_CUR = null;
function sheetSwap(fn, dir) {
  const b = $('#sheetBody'); if (!b) return fn();
  const o = openSheet;
  openSheet = (t, body) => { const h = $('#sheetTitle'); if (h) h.textContent = t; b.innerHTML = body; };
  try { fn(); } finally { openSheet = o; }
  if (dir) { b.classList.remove('stx-in-r', 'stx-in-l'); void b.offsetWidth; b.classList.add(dir > 0 ? 'stx-in-r' : 'stx-in-l'); }
  stxBackSync();
}
function stxMark(reopen) { const b = $('#sheetBody'); if (!b) return; b.dataset.stx = '1'; ST_CUR = reopen; stxBackSync(); }
function stxBackSync() {
  const h = document.querySelector('#modal .sheet-h'); if (!h) return;
  let k = h.querySelector('.stx-back');
  if (ST_STACK.length && !k) { h.insertAdjacentHTML('afterbegin', '<button class="iconbtn stx-back" data-act="stBack" aria-label="Retour">‹</button>'); }
  else if (!ST_STACK.length && k) k.remove();
}
openSheet = (orig => function () { ST_STACK = []; ST_CUR = null; return orig.apply(this, arguments); })(openSheet);
closeSheet = (orig => function () { ST_STACK = []; ST_CUR = null; return orig.apply(this, arguments); })(closeSheet);
// ouvrir un détail depuis une fenêtre de stats : on glisse vers la page suivante au lieu de tout refermer
function stxDrill(n) {
  const orig = ACTIONS[n]; if (!orig) return;
  ACTIONS[n] = (el, e) => {
    const b = $('#sheetBody');
    if (!(b && b.dataset.stx && b.contains(el))) return orig(el, e);
    ST_STACK.push({ fn: ST_CUR, y: b.scrollTop });
    const ds = { ...el.dataset }; const re = () => orig({ dataset: ds, closest: () => null });
    ST_CUR = re; sheetSwap(re, 1); b.dataset.stx = '1'; b.scrollTop = 0;
    if (n === 'tExInfo' && typeof kickAnim === 'function') kickAnim();
  };
}
['tWOpen', 'tExInfo', 'tMuscleDetail', 'stList'].forEach(stxDrill);
ACTIONS.stBack = () => {
  const s = ST_STACK.pop(); const b = $('#sheetBody'); if (!s || !b) return;
  ST_CUR = s.fn; sheetSwap(s.fn, -1); b.dataset.stx = '1'; b.scrollTop = s.y;
};
// mettre à jour le contenu de la fenêtre sur place (filtres), sans animation ni perte de position
function stxRefresh(fn) {
  const b = $('#sheetBody'); if (!b) return;
  const y = b.scrollTop, xs = [...b.querySelectorAll('.chipsrow')].map(r => r.scrollLeft);
  sheetSwap(fn, 0); b.dataset.stx = '1';
  b.scrollTop = y; b.querySelectorAll('.chipsrow').forEach((r, i) => { r.scrollLeft = xs[i] || 0; });
  b.querySelectorAll('.stx-fade').forEach(x => { x.classList.remove('stx-fade'); void x.offsetWidth; x.classList.add('stx-fade'); });
}

// ---------- Calculs ----------
const SP = { '30': ['30 jours', 30], '90': ['3 mois', 90], '180': ['6 mois', 180], '365': ['1 an', 365], all: ['Tout', 0] };
const monthKey = d => d.slice(0, 7) + '-01';
const nextMonth = d => { const x = new Date(d + 'T12:00:00'); return dstr(new Date(x.getFullYear(), x.getMonth() + 1, 1, 12)); };
function firstDay() { return TS.workouts.length ? dstr(new Date(Math.min(...TS.workouts.map(w => w.start)))) : todayStr(); }
function spRange(p) { const t = todayStr(); return p === 'all' ? [firstDay(), t] : [addDays(t, -(SP[p][1] - 1)), t]; }
function wEx(w, g) { return g === 'all' ? w.exercises : w.exercises.filter(e => exById(e.exId).muscle === g); }
function agg(list, g = 'all') {
  const o = { n: 0, vol: 0, sets: 0, reps: 0, dur: 0, prs: 0, rpe: [], ex: {}, dow: [0, 0, 0, 0, 0, 0, 0], ws: [] };
  for (const w of list) {
    const E = wEx(w, g).filter(e => workSets(e).length); if (!E.length) continue;
    o.n++; o.ws.push(w); if (w.end) o.dur += w.end - w.start; o.prs += (w.prs || []).length;
    o.dow[(new Date(w.start).getDay() + 6) % 7]++;
    for (const e of E) {
      const S_ = workSets(e); const v = S_.reduce((a, s) => a + setVol(s), 0);
      const x = o.ex[e.exId] || (o.ex[e.exId] = { vol: 0, sets: 0, n: 0 }); x.vol += v; x.sets += S_.length; x.n++;
      o.sets += S_.length; o.vol += v; o.reps += S_.reduce((a, s) => a + (num(s.r) || 0), 0);
      for (const s of S_) if (num(s.rpe) > 0) o.rpe.push(num(s.rpe));
    }
  }
  return o;
}
function buckets(from, to, monthly) {
  const B = [];
  if (monthly) for (let s = monthKey(from); s <= to; s = nextMonth(s)) B.push({ s, e: addDays(nextMonth(s), -1), m: true });
  else for (let s = weekStart(from); s <= to; s = addDays(s, 7)) B.push({ s, e: addDays(s, 6) });
  return B;
}
function bLabel(b, long) {
  const t = todayStr();
  if (b.m) { const cur = b.s === monthKey(t); const l = fmtDate(b.s, long ? { month: 'long', year: 'numeric' } : { month: 'short' }).replace('.', ''); return long && cur ? 'ce mois-ci' : l; }
  if (long) return b.s === weekStart(t) ? 'cette semaine' : b.s === addDays(weekStart(t), -7) ? 'la semaine dernière' : 'sem. du ' + fmtDate(b.s, { day: 'numeric', month: 'short' });
  return String(new Date(b.s + 'T12:00:00').getDate());
}
const durTxt = h => h >= 1 ? `${fr(r1(h))} h` : `${r0(h * 60)} min`;
const MX = {
  n: ['Séances', v => `${fr(r1(v))} séance${v >= 2 ? 's' : ''}`, o => o.n],
  vol: ['Volume', v => kgShort(v), o => o.vol],
  sets: ['Séries', v => `${r0(v)} série${v >= 2 ? 's' : ''}`, o => o.sets],
  reps: ['Réps', v => `${r0(v)} réps`, o => o.reps],
  dur: ['Durée', v => durTxt(v), o => o.dur / 3600000]
};
function pctTag(a, b) {
  if (!b) return '';
  const d = Math.round((a - b) / b * 100); if (!d) return '<small class="stx-d">=</small>';
  return `<small class="stx-d ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)} %</small>`;
}

// ---------- Graphique à barres touchables ----------
const ST_CH = {};
function barsHTML(id, B, m, g, sel) {
  const vals = B.map(b => MX[m][2](b.o)); const mx = Math.max(0.001, ...vals);
  const step = B.length > 14 ? Math.ceil(B.length / 7) : 1;
  ST_CH[id] = { B, m, g };
  return `<div class="stx-bars${B.length > 14 ? ' dense' : ''}" id="stb-${id}">${B.map((b, i) => `<button class="stx-bar${i === sel ? ' sel' : ''}" data-act="stBar" data-c="${id}" data-i="${i}" aria-label="${esc(bLabel(b, true))} : ${esc(MX[m][1](vals[i]))}"><i style="height:${vals[i] / mx * 100}%"></i><span>${(B.length - 1 - i) % step ? '' : esc(bLabel(b))}</span></button>`).join('')}</div>`;
}
function barInfo(id, i) {
  const C = ST_CH[id]; const b = C.B[i]; const v = MX[C.m][2](b.o);
  const prev = i ? MX[C.m][2](C.B[i - 1].o) : 0;
  return `<div class="stx-sel" id="sts-${id}"><div class="grow"><b>${esc(MX[C.m][1](v))}</b> <span class="muted">${esc(bLabel(b, true))}</span> ${i ? pctTag(v, prev) : ''}
    <div class="small muted">${b.o.n} séance${b.o.n > 1 ? 's' : ''}${b.o.n ? ` · ${kgShort(b.o.vol)} · ${b.o.sets} séries` : ''}</div></div>
    ${b.o.n ? `<button class="btn sm" data-act="stList" data-from="${b.s}" data-to="${b.e}" data-g="${esc(C.g)}">Séances ›</button>` : ''}</div>`;
}
ACTIONS.stBar = el => {
  const id = el.dataset.c, i = +el.dataset.i; const C = ST_CH[id]; if (!C) return;
  const wrap = $('#stb-' + id); if (!wrap) return;
  if (el.classList.contains('sel') && C.B[i].o.n) { ACTIONS.stList({ dataset: { from: C.B[i].s, to: C.B[i].e, g: C.g }, closest: () => null }); return; }
  wrap.querySelectorAll('.stx-bar.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel');
  const inf = $('#sts-' + id); if (inf) { inf.outerHTML = barInfo(id, i); const n = $('#sts-' + id); n.classList.add('stx-fade'); }
  haptic([6]);
};

// ---------- Vue Progrès : carte hebdo enrichie (périodes, barres touchables) ----------
function mainChartCard() {
  const rg = S.ui.tRange || '12', m = MX[S.ui.tMetric] ? S.ui.tMetric : 'dur'; const t = todayStr();
  const monthly = rg === '52';
  const from = monthly ? monthKey(addDays(t, -334)) : addDays(weekStart(), -7 * (+rg - 1));
  const B = buckets(from, t, monthly).map(b => ({ ...b, o: agg(inRange(b.s, b.e)) }));
  const vals = B.map(b => MX[m][2](b.o)); const done = vals.slice(0, -1).filter((v, i) => B[i].o.n || i > 0);
  const avg = done.length ? done.reduce((a, v) => a + v, 0) / done.length : 0;
  return `<div class="card stx-main"><div class="row between" style="align-items:center;gap:10px"><h2 style="margin:0">Activité</h2>
      <div class="stx-seg">${[['12', '12 sem'], ['26', '6 mois'], ['52', '1 an']].map(([k, l]) => `<button class="${rg === k ? 'on' : ''}" data-act="stRange" data-v="${k}">${l}</button>`).join('')}</div></div>
    ${(() => { const bars = barsHTML('main', B, m, 'all', B.length - 1); return barInfo('main', B.length - 1) + bars; })()}
    <div class="small muted stx-avg">Moyenne : ${esc(MX[m][1](avg))} par ${monthly ? 'mois' : 'semaine'} · touche une barre pour le détail</div>
    <div class="chipsrow">${Object.entries(MX).map(([k, [l]]) => `<button class="chip ${m === k ? 'on' : ''}" data-act="tMetric" data-v="${k}">${l}</button>`).join('')}</div></div>`;
}
ACTIONS.stRange = el => { S.ui.tRange = el.dataset.v; save(); render(); };

VIEWS.t_stats = (orig => function () {
  let h = orig.apply(this, arguments);
  // tuiles du haut : touchables → bilan détaillé
  const g0 = h.indexOf('<div class="grid2" style="margin-bottom:14px">');
  if (g0 >= 0) {
    const g1 = h.indexOf('</div></div>\n', g0); const ms = ['n', 'n', 'vol', 'dur']; let k = 0;
    if (g1 > 0) h = h.slice(0, g0) + h.slice(g0, g1).replace(/<div class="stat">/g, () => `<div class="stat tap" role="button" data-act="stBilan" data-m="${ms[k++] || 'n'}">`) + h.slice(g1);
  }
  // carte hebdomadaire remplacée par la version interactive
  const c0 = h.indexOf('<div class="card"><div class="row between" style="align-items:baseline"><h2 style="margin:0"><b>');
  const cm = h.indexOf('data-act="tMetric" data-v="n"', c0);
  if (c0 >= 0 && cm > 0) { const c1 = h.indexOf('</div></div>', cm) + 12; h = h.slice(0, c0) + mainChartCard() + h.slice(c1); }
  // principaux exercices : « Tout voir »
  h = h.replace('<div class="card"><h2>Mes principaux exercices</h2>', '<div class="card"><div class="row between"><h2 style="margin:0 0 8px">Mes principaux exercices</h2><button class="btn sm ghost" data-act="stLifts">Tout voir ›</button></div>');
  // bilan détaillé accessible aussi depuis un bouton clair
  h = h.replace('<div class="grid2" style="margin-bottom:14px">', '<button class="btn block stx-open" data-act="stBilan" data-m="vol">📊 Bilan détaillé et filtres ›</button><div class="grid2" style="margin-bottom:14px">');
  return h;
})(VIEWS.t_stats);
vTStats = VIEWS.t_stats;

// ---------- Bilan détaillé (période + muscle + indicateur) ----------
const SB = { p: '90', g: 'all', m: 'vol' };
function usedMuscles() { const s = new Set(); for (const w of TS.workouts) for (const e of w.exercises) if (workSets(e).length) s.add(exById(e.exId).muscle); return MUSCLES.filter(m => s.has(m)); }
function bilanHTML() {
  const [from, to] = spRange(SB.p); const o = agg(inRange(from, to), SB.g);
  const days = SB.p === 'all' ? 0 : SP[SB.p][1]; const pv = days ? agg(inRange(addDays(from, -days), addDays(from, -1)), SB.g) : null;
  const dd = (a, b) => pv ? pctTag(a, b) : '';
  const nWeeks = Math.max(1, (new Date(to) - new Date(from)) / 864e5 / 7);
  const rpe = o.rpe.length ? o.rpe.reduce((a, b) => a + b, 0) / o.rpe.length : 0;
  const tiles = [
    [o.n, 'séances', dd(o.n, pv && pv.n)], [fr(r1(o.n / nWeeks)), 'par semaine', ''],
    [kgShort(o.vol), 'volume', dd(o.vol, pv && pv.vol)], [o.sets, 'séries', dd(o.sets, pv && pv.sets)],
    [o.reps.toLocaleString('fr-FR'), 'répétitions', dd(o.reps, pv && pv.reps)], [o.n && o.dur ? dur(o.dur / o.n) : '—', 'durée moyenne', ''],
    [o.prs, 'records 🏆', dd(o.prs, pv && pv.prs)], [rpe ? fr(r1(rpe)) : '—', 'RPE moyen', '']
  ];
  const monthly = !days || days > 120;
  const B = buckets(from, to, monthly).slice(-24).map(b => ({ ...b, o: agg(inRange(b.s, b.e), SB.g) }));
  const ex = Object.entries(o.ex).sort((a, b) => b[1][SB.m === 'sets' || SB.m === 'n' ? 'sets' : 'vol'] - a[1][SB.m === 'sets' || SB.m === 'n' ? 'sets' : 'vol'] || b[1].sets - a[1].sets);
  const exMx = Math.max(1, ...ex.map(([, x]) => SB.m === 'sets' || SB.m === 'n' ? x.sets : x.vol));
  const dmx = Math.max(1, ...o.dow);
  const mus = usedMuscles();
  return `<div class="chipsrow">${Object.entries(SP).map(([k, [l]]) => `<button class="chip ${SB.p === k ? 'on' : ''}" data-act="stBF" data-k="p" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="chipsrow" style="padding-top:0">${[['all', 'Tous les muscles'], ...mus.map(x => [x, x])].map(([k, l]) => `<button class="chip ${SB.g === k ? 'on' : ''}" data-act="stBF" data-k="g" data-v="${esc(k)}">${esc(l)}</button>`).join('')}</div>
    <div class="small muted" style="margin:0 2px 10px">${esc(fmtDate(from, { day: 'numeric', month: 'short', year: 'numeric' }))} → aujourd’hui${pv ? ' · comparé à la période précédente' : ''}</div>
    ${o.n ? `<div class="stx-tiles stx-fade">${tiles.map(([v, l, d]) => `<div class="stat"><div class="v">${v}</div><div class="l">${l} ${d}</div></div>`).join('')}</div>
    <div class="card stx-fade" style="background:var(--surface)"><div class="row between" style="align-items:center"><b>Évolution</b><span class="small muted">par ${monthly ? 'mois' : 'semaine'}</span></div>
      ${(() => { const bars = barsHTML('bil', B, SB.m, SB.g, B.length - 1); return barInfo('bil', B.length - 1) + bars; })()}
      <div class="chipsrow" style="margin-top:26px">${Object.entries(MX).map(([k, [l]]) => `<button class="chip ${SB.m === k ? 'on' : ''}" data-act="stBF" data-k="m" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div class="card stx-fade" style="background:var(--surface)"><b>Jours d’entraînement</b>
      <div class="stx-dow">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => `<div><i style="height:${o.dow[i] / dmx * 100}%"></i><b>${o.dow[i] || ''}</b><span>${l}</span></div>`).join('')}</div></div>
    <h3 style="margin:16px 2px 6px">Exercices <span class="small muted">(${ex.length})</span></h3>
    <div class="stx-fade">${ex.slice(0, SB.all ? 999 : 8).map(([id, x]) => { const v = SB.m === 'sets' || SB.m === 'n' ? x.sets : x.vol;
      return `<button class="mvrow" data-act="tExInfo" data-id="${id}"><span class="mvname">${esc(exById(id).name)}</span><span class="bar"><i style="width:${v / exMx * 100}%"></i></span><span class="mvval"><b>${SB.m === 'sets' || SB.m === 'n' ? x.sets + ' sér.' : kgShort(x.vol)}</b><small>${x.n} séance${x.n > 1 ? 's' : ''}</small></span></button>`; }).join('')}
      ${ex.length > 8 && !SB.all ? `<button class="btn sm ghost block" data-act="stBF" data-k="all" data-v="1">Voir les ${ex.length} exercices</button>` : ''}</div>
    <h3 style="margin:16px 2px 6px">Séances <span class="small muted">(${o.n})</span></h3>
    <div class="stx-fade">${o.ws.sort((a, b) => b.start - a.start).slice(0, 30).map(histCardHTML).join('')}
      ${o.n > 30 ? `<button class="btn sm ghost block" data-act="stList" data-from="${from}" data-to="${to}" data-g="${esc(SB.g)}">Voir les ${o.n} séances ›</button>` : ''}</div>`
    : '<div class="card empty stx-fade"><div style="font-size:34px">🗓️</div><p class="muted">Aucune séance sur cette période' + (SB.g !== 'all' ? ' pour ce muscle' : '') + '.</p></div>'}`;
}
function openBilan() { openSheet('Bilan détaillé', bilanHTML()); stxMark(() => openSheet('Bilan détaillé', bilanHTML())); }
ACTIONS.stBilan = el => { SB.m = el.dataset.m || SB.m; SB.all = false; openBilan(); };
ACTIONS.stBF = el => { const k = el.dataset.k; SB[k] = k === 'all' ? true : el.dataset.v; if (k !== 'all') SB.all = false; haptic([6]); stxRefresh(() => openSheet('Bilan détaillé', bilanHTML())); };

// ---------- Liste des séances d’une période ----------
ACTIONS.stList = el => {
  const { from, to } = el.dataset; const g = el.dataset.g || 'all';
  const o = agg(inRange(from, to), g);
  const t = from === to ? fmtDate(from, { weekday: 'long', day: 'numeric', month: 'long' }) : `${fmtDate(from, { day: 'numeric', month: 'short' })} → ${fmtDate(to, { day: 'numeric', month: 'short' })}`;
  openSheet(t.charAt(0).toUpperCase() + t.slice(1), `${g !== 'all' ? `<div class="chip on" style="margin-bottom:10px">${esc(g)}</div>` : ''}
    <div class="stx-tiles three"><div class="stat"><div class="v">${o.n}</div><div class="l">séances</div></div><div class="stat"><div class="v">${kgShort(o.vol)}</div><div class="l">volume</div></div><div class="stat"><div class="v">${o.dur ? durTxt(o.dur / 3600000) : '—'}</div><div class="l">au total</div></div></div>
    ${o.ws.sort((a, b) => b.start - a.start).map(histCardHTML).join('') || '<p class="muted">Aucune séance.</p>'}`);
  if (!ST_STACK.length) stxMark(() => ACTIONS.stList(el));
};

// ---------- Tous les exercices : recherche, tri, filtre muscle ----------
const SLF = { q: '', s: 'e1', g: 'all' };
function liftsData() {
  const ago = Date.now() - 90 * 864e5; const seen = {};
  for (const w of TS.workouts) for (const e of w.exercises) if (workSets(e).length) { const x = seen[e.exId] || (seen[e.exId] = { n: 0, last: 0 }); x.n++; x.last = Math.max(x.last, w.start); }
  return Object.entries(seen).map(([id, x]) => {
    const X = exById(id); const best = exBest(id); const old = exBest(id, ago);
    const pts = X.kind === 'wr' ? exHistory(id).slice(0, 12).reverse().map(h => Math.max(0, ...h.sets.filter(s => s.type !== 'w').map(s => e1rm(num(s.w), num(s.r))))) : [];
    return { id, X, n: x.n, last: x.last, e1: best.e1, gain: old.e1 && best.e1 ? best.e1 - old.e1 : null, pts };
  });
}
function liftRows() {
  const q = norm(SLF.q.trim());
  let L = liftsData().filter(x => (SLF.g === 'all' || x.X.muscle === SLF.g) && (!q || q.split(/\s+/).every(t => norm(x.X.name).includes(t))));
  const by = { e1: (a, b) => b.e1 - a.e1, gain: (a, b) => (b.gain ?? -1e9) - (a.gain ?? -1e9), n: (a, b) => b.n - a.n, last: (a, b) => b.last - a.last };
  L.sort(by[SLF.s] || by.e1);
  return L.length ? L.map(x => `<div class="item liftrow" data-act="tExInfo" data-id="${x.id}"><div class="grow"><div class="name">${esc(x.X.name)}</div>
      <div class="meta">${esc(x.X.muscle)} · ${x.n} séance${x.n > 1 ? 's' : ''} · ${esc(fmtDate(dstr(new Date(x.last)), { day: 'numeric', month: 'short' }))}</div></div>
      ${spark(x.pts)}<div class="liftv">${x.e1 ? `<b>${kg(x.e1)}</b>` : '<b class="muted">—</b>'}${x.gain != null ? `<small class="${x.gain >= 0 ? 'up' : 'down'}">${x.gain >= 0 ? '+' : '−'}${fr(r1(Math.abs(x.gain)))} kg</small>` : ''}</div></div>`).join('')
    : '<p class="muted" style="text-align:center;margin:24px 0">Aucun exercice ne correspond.</p>';
}
function liftsHTML() {
  return `<input class="stx-q" id="stxQ" type="search" placeholder="Rechercher un exercice" value="${esc(SLF.q)}" autocomplete="off">
    <div class="chipsrow">${[['e1', '1RM'], ['gain', 'Progression 3 mois'], ['n', 'Plus faits'], ['last', 'Récents']].map(([k, l]) => `<button class="chip ${SLF.s === k ? 'on' : ''}" data-act="stLF" data-k="s" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="chipsrow" style="padding-top:0">${[['all', 'Tous'], ...usedMuscles().map(x => [x, x])].map(([k, l]) => `<button class="chip ${SLF.g === k ? 'on' : ''}" data-act="stLF" data-k="g" data-v="${esc(k)}">${esc(l)}</button>`).join('')}</div>
    <div id="stxLifts" class="stx-fade">${liftRows()}</div>`;
}
ACTIONS.stLifts = () => { openSheet('Mes exercices', liftsHTML()); stxMark(() => openSheet('Mes exercices', liftsHTML())); };
ACTIONS.stLF = el => {
  SLF[el.dataset.k] = el.dataset.v; haptic([6]);
  const row = el.parentElement; row.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === el));
  const L = $('#stxLifts'); if (L) { L.innerHTML = liftRows(); L.classList.remove('stx-fade'); void L.offsetWidth; L.classList.add('stx-fade'); }
};
document.addEventListener('input', e => { if (e.target.id === 'stxQ') { SLF.q = e.target.value; const L = $('#stxLifts'); if (L) L.innerHTML = liftRows(); } });

// ---------- Détail d’un muscle : période modifiable sur place ----------
openMuscleDetail = (orig => function (g, p = '30') {
  orig(g, p); const b = $('#sheetBody'); if (!b) return;
  b.insertAdjacentHTML('afterbegin', `<div class="chipsrow" style="padding-top:0">${Object.entries(PERIODS).map(([k, [l]]) => `<button class="chip ${p === k ? 'on' : ''}" data-act="stMusP" data-g="${esc(g)}" data-p="${k}">${l}</button>`).join('')}</div>`);
  if (!ST_STACK.length && !b.dataset.stx) stxMark(() => openMuscleDetail(g, p)); else ST_CUR = () => openMuscleDetail(g, p);
})(openMuscleDetail);
ACTIONS.stMusP = el => { haptic([6]); stxRefresh(() => openMuscleDetail(el.dataset.g, el.dataset.p)); ST_CUR = () => openMuscleDetail(el.dataset.g, el.dataset.p); };

// ---------- Régularité : jours touchables ----------
calendarHTML = function () {
  const by = {}; for (const w of TS.workouts) (by[wDate(w)] || (by[wDate(w)] = [])).push(w);
  const ws = weekStart(); const start = addDays(ws, -7 * 15); const t = todayStr();
  let cols = '';
  for (let c = 0; c < 16; c++) { let col = ''; for (let r = 0; r < 7; r++) { const d = addDays(start, c * 7 + r); const n = (by[d] || []).length; col += `<i class="${n ? 'on' : ''}${n > 1 ? ' on2' : ''}${d > t ? ' fut' : ''}${d === t ? ' today' : ''}" ${d <= t ? `data-act="stDay" data-d="${d}"` : ''}></i>`; } cols += `<div>${col}</div>`; }
  const nd = Object.keys(by).filter(d => d >= start).length;
  return `<div class="cal stx-cal">${cols}</div><div class="row between small muted" style="margin-top:6px"><span>${fmtDate(start, { day: 'numeric', month: 'short' })}</span><span>${nd} jours actifs · aujourd’hui</span></div>
    <div id="stxDay" class="stx-day small muted">Touche un jour pour voir ce que tu as fait.</div>`;
};
ACTIONS.stDay = el => {
  const d = el.dataset.d; const L = TS.workouts.filter(w => wDate(w) === d).sort((a, b) => a.start - b.start);
  document.querySelectorAll('.stx-cal i.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); haptic([6]);
  const box = $('#stxDay'); if (!box) return;
  const t = fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
  box.innerHTML = `<div class="stx-dayh">${esc(t)}</div>` + (L.length ? L.map(w => `<button class="stx-dw" data-act="tWOpen" data-id="${w.id}"><b>${esc(w.name)}</b><span>${w.end ? dur(w.end - w.start) + ' · ' : ''}${kgShort(wVolume(w))} · ${wSets(w)} séries${w.prs && w.prs.length ? ' · 🏆 ' + w.prs.length : ''}</span><i>›</i></button>`).join('') : '<div class="muted">Jour de repos 😴</div>');
  box.classList.remove('stx-fade'); void box.offsetWidth; box.classList.add('stx-fade');
};

// ---------- Intensité : chaque barre ouvre sa séance ----------
intensityCard = (orig => function () {
  const L = sortedW().map(w => ({ w, I: w.intensity ? { avg: w.intensity } : wIntensity(w) })).filter(x => x.I).slice(0, 12).reverse();
  let i = 0;
  return orig.apply(this, arguments).replace(/<div title="[^"]*"><i style/g, m => { const x = L[i++]; return x ? `<div class="tapbar" data-act="tWOpen" data-id="${x.w.id}" title="${esc(x.w.name)}"><i style` : m; });
})(intensityCard);
