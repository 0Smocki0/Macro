'use strict';
/* ============================================================
   Macro — suivi calories / macros, menus et liste de courses
   Données 100 % locales (localStorage du téléphone)
   ============================================================ */

// ---------- Utilitaires ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r0 = n => Math.round(n || 0);
const r1 = n => Math.round((n || 0) * 10) / 10;
const fr = n => String(n).replace('.', ',');
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const z2 = n => String(n).padStart(2, '0');
const dstr = d => d.getFullYear() + '-' + z2(d.getMonth() + 1) + '-' + z2(d.getDate());
const todayStr = () => dstr(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return dstr(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
const fmtDate = (s, o = { weekday: 'long', day: 'numeric', month: 'long' }) => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', o);
const norm = s => String(s).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];


// Boîte de dialogue intégrée (remplace confirm/prompt, bloqués dans certaines applis)
function askDialog({ title, msg = '', ok = 'OK', cancel = 'Annuler', danger = false, input = null }) {
  return new Promise(res => {
    const d = document.createElement('div'); d.className = 'dlg-bg';
    d.innerHTML = `<div class="dlg" role="alertdialog" aria-label="${esc(title)}"><div class="dlg-t">${esc(title)}</div>${msg ? `<div class="dlg-m">${esc(msg)}</div>` : ''}
      ${input !== null ? `<input type="text" class="dlg-in" value="${esc(input)}">` : ''}
      <div class="dlg-b"><button class="btn" data-r="0">${esc(cancel)}</button><button class="btn ${danger ? 'dangerbtn' : 'primary'}" data-r="1">${esc(ok)}</button></div></div>`;
    document.body.appendChild(d);
    const inp = d.querySelector('.dlg-in');
    const done = v => { d.classList.add('out'); setTimeout(() => d.remove(), 160); res(v); };
    d.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('[data-r]');
      if (b) done(input !== null ? (b.dataset.r === '1' ? inp.value : null) : b.dataset.r === '1');
      else if (e.target === d) done(input !== null ? null : false);
    });
    if (inp) { setTimeout(() => { inp.focus(); inp.select(); }, 60); inp.addEventListener('keydown', e => { if (e.key === 'Enter') d.querySelector('[data-r="1"]').click(); }); }
  });
}
const askConfirm = (title, o = {}) => askDialog({ title, ok: 'Confirmer', ...o });
const askText = (title, value = '', o = {}) => askDialog({ title, input: value, ok: 'Valider', ...o });

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ---------- État ----------
const KEY = 'macro.v1';
const DEFAULT = {
  profile: { sex: 'h', age: '', height: '', weight: '', bf: '', act: 1.375, goal: 'perte', rate: 0.5, protKg: '', fatPct: 30, tdeeOverride: null, useCustom: false, custom: null },
  journal: {}, custom: {}, recents: [], weights: [], plan: null,
  recipes: {}, favs: [], fridge: {}, prices: {}, alertsOff: {}, settings: { alerts: true },
  menuPrefs: { days: 7, meals: 4, diet: 'omni', exclude: [], batch: 0, batchMeals: 'dej', eco: false },
  shop: { checked: {}, extra: [] },
  ui: { tab: 'journal', date: null, statP: 'week', statOff: 0 }
};
function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function deepMerge(a, b) {
  for (const k in b) { if (isObj(b[k]) && isObj(a[k])) deepMerge(a[k], b[k]); else a[k] = b[k]; }
  return a;
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return migrate(deepMerge(structuredClone(DEFAULT), s)); } catch (e) { }
  return structuredClone(DEFAULT);
}
function migrate(st) {
  const m = st.profile.manual; // ancien format « objectifs à la main »
  if (m && ['kcal', 'p', 'c', 'f'].every(k => num(m[k]) > 0)) { st.profile.custom = { kcal: num(m.kcal), p: num(m.p), c: num(m.c), f: num(m.f), fib: 0 }; st.profile.useCustom = true; }
  delete st.profile.manual;
  return st;
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Impossible d’enregistrer (stockage plein ?)'); }
}
// Demande au navigateur de ne pas effacer les données
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }

// ---------- Aliments ----------
const BASE = Object.fromEntries(BASE_FOODS.map(f => [f.id, f]));
let TEMP = {}; // produits Open Food Facts pas encore enregistrés
const food = id => BASE[id] || S.custom[id] || TEMP[id] || (String(id).startsWith('r_') && typeof recipeFood === 'function' ? recipeFood(id) : undefined);
const nutr = (f, g) => { const k = g / 100; return { kcal: f.kcal * k, p: f.p * k, c: f.c * k, f: f.f * k, fib: (f.fib || 0) * k }; };
function sum(list) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0 };
  for (const x of list) for (const k in t) t[k] += x[k] || 0;
  return t;
}
const entryN = e => nutr(e, e.g);
const isLiquid = f => f && (f.cat === 'Boissons' || (f.roles || []).includes('lait') || /\(ml\)/.test(f.unit?.name || ''));
const uLabel = f => isLiquid(f) ? 'ml' : 'g';
function allFoodsList() { return [...BASE_FOODS, ...Object.values(S.custom), ...Object.keys(S.recipes || {}).map(food).filter(Boolean)]; }
function pushRecent(id) {
  S.recents = [id, ...S.recents.filter(x => x !== id)].slice(0, 40);
}

// ---------- Calcul des besoins ----------
const ACT = [
  [1.2, 'Sédentaire', 'Travail assis, < 5 000 pas/jour, pas de sport'],
  [1.375, 'Légèrement actif', '5 000–7 500 pas/jour ou 1–3 séances/semaine'],
  [1.55, 'Actif', '7 500–10 000 pas/jour ou 3–5 séances/semaine'],
  [1.725, 'Très actif', '> 10 000 pas/jour + sport intense 6–7×/semaine'],
  [1.9, 'Extrêmement actif', 'Travail physique + entraînement quotidien']
];
const GOALS = { perte: 'Perte de gras', maintien: 'Maintien', recompo: 'Recompo', prise: 'Prise de muscle' };
const PROT_DEF = { perte: 2.0, maintien: 1.6, recompo: 2.2, prise: 1.8 };
const RATES = { perte: [0.25, 0.5, 0.75, 1], prise: [0.1, 0.25, 0.4, 0.5] };

function targets(p = S.profile) {
  const w = num(p.weight), h = num(p.height), a = num(p.age), bf = num(p.bf);
  if (!(w > 0 && h > 0 && a > 0)) return null;
  const mif = 10 * w + 6.25 * h - 5 * a + (p.sex === 'h' ? 5 : -161);
  const lbm = bf > 3 && bf < 60 ? w * (1 - bf / 100) : null;
  const katch = lbm ? 370 + 21.6 * lbm : null;
  const bmr = katch ?? mif;
  const tdeeCalc = bmr * num(p.act);
  const tdee = p.tdeeOverride || tdeeCalc;
  let delta = 0;
  if (p.goal === 'perte') delta = -num(p.rate) * 7700 / 7;
  else if (p.goal === 'prise') delta = num(p.rate) * 7700 / 7;
  else if (p.goal === 'recompo') delta = -0.1 * tdee;
  let kcal = tdee + delta;
  const protKg = num(p.protKg) || PROT_DEF[p.goal];
  let P = protKg * w;
  let F = Math.max(num(p.fatPct) / 100 * kcal / 9, 0.6 * w);
  let C = (kcal - P * 4 - F * 9) / 4;
  const auto = { kcal, p: P, c: C, f: F, fib: 14 * kcal / 1000 };
  const manual = !!(p.useCustom && p.custom && num(p.custom.kcal) > 0);
  let fib = auto.fib;
  if (manual) { kcal = num(p.custom.kcal); P = num(p.custom.p); C = num(p.custom.c); F = num(p.custom.f); fib = num(p.custom.fib) || 14 * kcal / 1000; }
  const warn = [];
  if (kcal < bmr) warn.push(`Ton objectif (${r0(kcal)} kcal) est sous ton métabolisme de base (${r0(bmr)} kcal) : difficile à tenir, risque de perte musculaire et de fatigue.`);
  if (kcal < (p.sex === 'h' ? 1500 : 1200)) warn.push('Apport très bas : un suivi médical est conseillé en dessous de ce seuil.');
  if (!manual && p.goal === 'perte' && num(p.rate) / w * 100 > 1) warn.push('Rythme > 1 % du poids par semaine : agressif, privilégie 0,5 à 1 %.');
  if (C < 80) warn.push('Glucides très bas (< 80 g) : baisse les lipides ou les protéines si tu veux plus d’énergie à l’entraînement.');
  return { mif, katch, lbm, bmr, tdeeCalc, tdee, delta, kcal, p: P, c: C, f: F, fib, water: w * 35, protKg, manual, auto, warn };
}

// ---------- Rendu général ----------
const view = $('#view');
const VIEWS = { journal: vJournal, menus: vMenus, courses: vCourses, profil: vProfil };
function render() {
  if (!VIEWS[S.ui.tab]) S.ui.tab = 'journal';
  view.innerHTML = VIEWS[S.ui.tab]();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.ui.tab));
  if (S.ui.tab === 'profil') renderProfilResults();
  if (S.ui.tab === 'menus') { const on = document.querySelector('.daystrip .on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' }); }
  if (typeof afterRender === 'function') afterRender();
}
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.ui.tab = b.dataset.tab; save(); render(); window.scrollTo(0, 0);
});

// k = kcal par gramme (4 ou 9) ; eaten / goalKcal = calories mangées / objectif, pour les %
function macroBar(label, color, val, target, unit = 'g', k = 0, eaten = 0, goalKcal = 0) {
  const pct = target > 0 ? clamp(val / target * 100, 0, 100) : 0;
  const over = target > 0 && val > target * 1.05;
  const sub = k ? `<div class="sub num"><span>${r0(val * k)} kcal${eaten > 0 ? ` · ${r0(val * k / eaten * 100)} %` : ''}</span>
    ${target ? `<span>obj. ${r0(target * k)} kcal · ${goalKcal > 0 ? r0(target * k / goalKcal * 100) : 0} %</span>` : ''}</div>` : '';
  return `<div class="macro"><div class="row between"><span class="row"><span class="dot" style="background:${color}"></span>${label}</span>
    <span class="num ${over ? 'over' : ''}">${r0(val)}${target ? ' / ' + r0(target) : ''} ${unit}</span></div>
    <div class="bar"><i style="width:${pct}%;background:${color}"></i></div>${sub}</div>`;
}
const H = tab => typeof helpBtn === 'function' ? helpBtn(tab) : '';
const title = (t, tab) => `<div class="row between" style="margin:6px 0 12px"><h1 style="margin:0">${t}</h1>${H(tab)}</div>`;
const macroLine = n => `${r0(n.kcal)} kcal · P ${r0(n.p)} · G ${r0(n.c)} · L ${r0(n.f)}`;

// ============================================================
//  JOURNAL
// ============================================================
const MEALS = [['pdj', 'Petit-déjeuner'], ['dej', 'Déjeuner'], ['diner', 'Dîner'], ['snack', 'Collations']];

function planDayIndex(d) {
  if (!S.plan) return -1;
  const i = daysBetween(S.plan.start, d);
  return i >= 0 && i < S.plan.days.length ? i : -1;
}

function ring(eaten, goal) {
  const R = 52, C = 2 * Math.PI * R;
  const pct = goal > 0 ? Math.min(1, eaten / goal) : 0;
  const over = goal > 0 && eaten > goal * 1.05;
  return `<svg viewBox="0 0 128 128" class="ring" aria-hidden="true"><circle cx="64" cy="64" r="${R}" fill="none" stroke="var(--surface2)" stroke-width="11"/>
    ${pct > 0 ? `<circle cx="64" cy="64" r="${R}" fill="none" stroke="${over ? 'var(--warn)' : 'var(--accent)'}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${(pct * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 64 64)"/>` : ''}</svg>`;
}
function miniMacro(label, color, val, target) {
  const pct = target > 0 ? clamp(val / target * 100, 0, 100) : 0;
  return `<div class="mini"><div class="row between"><span>${label}</span><span class="num muted"><b class="${target && val > target * 1.05 ? 'over' : ''}" style="color:var(--text)">${r0(val)}</b> / ${r0(target)} g</span></div>
    <div class="bar thin"><i style="width:${pct}%;background:${color}"></i></div></div>`;
}

function vJournal() {
  const d = S.ui.date || todayStr();
  const list = S.journal[d] || [];
  const tot = sum(list.map(entryN));
  const T = targets();
  const isToday = d === todayStr();
  const pi = planDayIndex(d);
  let h = `<div class="jhead">
    <button class="navbtn" data-act="day" data-n="-1" aria-label="Jour précédent">‹</button>
    <div class="grow" style="text-align:center"><div class="jtitle">${isToday ? 'Aujourd’hui' : esc(fmtDate(d, { weekday: 'long' }))}</div>
      <div class="small muted">${isToday ? esc(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })) : `${esc(fmtDate(d, { day: 'numeric', month: 'long' }))} · <a href="#" data-act="today">aujourd’hui</a>`}</div></div>
    <button class="navbtn" data-act="day" data-n="1" aria-label="Jour suivant">›</button>
    ${H('journal')}</div>`;

  if (!T) {
    h += `<div class="banner"><b>Commence par calculer tes besoins.</b><br><span class="small">2 minutes : quelques questions et l’appli fixe tes calories et tes macros.</span>
      <div style="margin-top:10px"><button class="btn primary sm" data-act="startGuide">Lancer le guide</button></div></div>`;
  } else {
    const left = T.kcal - tot.kcal;
    h += `<div class="card summary" data-act="toggleDetails">
      <div class="sumrow">
        <div class="ringwrap">${ring(tot.kcal, T.kcal)}<div class="ringtxt"><div class="ringnum ${left < 0 ? 'over' : ''}">${r0(Math.abs(left))}</div><div class="small muted">${left < 0 ? 'en trop' : 'restantes'}</div></div></div>
        <div class="grow">
          ${miniMacro('Protéines', 'var(--prot)', tot.p, T.p)}
          ${miniMacro('Glucides', 'var(--carb)', tot.c, T.c)}
          ${miniMacro('Lipides', 'var(--fat)', tot.f, T.f)}
        </div>
      </div>
      <div class="row between small muted" style="margin-top:12px"><span>${r0(tot.kcal)} mangées · objectif ${r0(T.kcal)} kcal</span><span>${S.ui.jDetails ? 'Moins ▴' : 'Détails ▾'}</span></div>
      ${S.ui.jDetails ? `<div class="details">
        <div class="sub muted" style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px"><span>mangé · % de tes kcal</span><span>objectif · % visé</span></div>
        ${macroBar('Protéines', 'var(--prot)', tot.p, T.p, 'g', 4, tot.kcal, T.kcal)}
        ${macroBar('Glucides', 'var(--carb)', tot.c, T.c, 'g', 4, tot.kcal, T.kcal)}
        ${macroBar('Lipides', 'var(--fat)', tot.f, T.f, 'g', 9, tot.kcal, T.kcal)}
        ${macroBar('Fibres', 'var(--fib)', tot.fib, T.fib)}</div>` : ''}
    </div>`;
    if (typeof alertsHTML === 'function') h += alertsHTML(d, list, T);
  }
  if (typeof trainBadge === 'function') h += trainBadge(d);
  if (!list.some(e => e.meal !== 'compl') && T) {
    const hasY = (S.journal[addDays(d, -1)] || []).some(e => e.meal !== 'compl');
    h += `<div class="hint">Touche <b>＋</b> sur un repas pour noter ce que tu manges.${hasY ? ` <a href="#" data-act="copyYesterday">Copier la veille</a>` : ''}</div>`;
  }

  for (const [k, label] of MEALS) {
    const items = list.filter(e => e.meal === k);
    const mt = sum(items.map(entryN));
    const planMeals = pi >= 0 ? S.plan.days[pi].meals.filter(m => m.key === k) : [];
    const planK = planMeals.length ? sum(planMeals.flatMap(m => m.items.map(it => nutr(food(it.id), it.g)))).kcal : 0;
    h += `<section class="card meal"><div class="mealhead">
        <div><h2>${label}</h2>${items.length ? `<div class="small muted">${r0(mt.kcal)} kcal · P ${r0(mt.p)} · G ${r0(mt.c)} · L ${r0(mt.f)}</div>` : ''}</div>
        <div class="row" style="gap:4px"><button class="iconbtn" data-act="mealMenu" data-meal="${k}" aria-label="Plus d’options">⋯</button>
        <button class="addbtn" data-act="openAdd" data-meal="${k}" aria-label="Ajouter au ${label}">＋</button></div></div>
      ${items.map(e => { const n = entryN(e); return `<div class="item" data-act="editEntry" data-id="${e.id}">
        <div class="grow"><div class="name">${esc(e.name)}</div><div class="meta">${r0(e.g)} ${e.u || 'g'}</div></div><span class="kcal">${r0(n.kcal)}</span></div>`; }).join('')}
      ${planMeals.length && !items.length ? `<button class="planrow" data-act="addPlanMeal" data-meal="${k}" data-day="${pi}"><span>📋 Menu prévu · ${r0(planK)} kcal</span><b>Ajouter</b></button>` : ''}
    </section>`;
  }
  return h;
}

function openMealMenu(k) {
  const d = S.ui.date || todayStr();
  const items = (S.journal[d] || []).filter(e => e.meal === k);
  const y = (S.journal[addDays(d, -1)] || []).filter(e => e.meal === k);
  const label = MEALS.find(m => m[0] === k)[1];
  const opts = [];
  if (items.length) opts.push(['saveFav', '★', 'Enregistrer comme repas favori']);
  if (y.length) opts.push(['copyMealY', '↺', `Copier le ${label.toLowerCase()} d’hier (${r0(sum(y.map(entryN)).kcal)} kcal)`]);
  if (items.length) opts.push(['clearMeal', '✕', 'Vider ce repas']);
  if (!opts.length) { toast('Rien à faire ici pour l’instant'); return; }
  openSheet(label, opts.map(([a, ic, t]) => `<button class="menuopt" data-act="${a}" data-meal="${k}"><span>${ic}</span>${esc(t)}</button>`).join(''));
}

function addEntry(date, meal, f, g) {
  if (!S.journal[date]) S.journal[date] = [];
  if (f.id.startsWith('off_') && !S.custom[f.id]) { S.custom[f.id] = f; }
  S.journal[date].push({ id: uid(), meal, fid: f.id, name: f.brand ? `${f.name} (${f.brand})` : f.name, g, u: uLabel(f), kcal: f.kcal, p: f.p, c: f.c, f: f.f, fib: f.fib || 0, sug: f.sug || 0, salt: f.salt || 0 });
  pushRecent(f.id);
}

// ============================================================
//  AJOUT D’ALIMENT (recherche locale, Open Food Facts, scan)
// ============================================================
let A = null; // contexte d’ajout

function openSheet(title, body) {
  $('#modal').innerHTML = `<div class="sheet-bg" data-act="bgClose"><div class="sheet" role="dialog" aria-label="${esc(title)}">
    <div class="sheet-h"><button class="iconbtn" data-act="closeSheet" aria-label="Fermer">✕</button><h2 class="grow" style="margin:0" id="sheetTitle">${esc(title)}</h2></div>
    <div class="sheet-b" id="sheetBody">${body}</div></div></div>`;
}
function closeSheet() { stopScan(); $('#modal').innerHTML = ''; A = null; }

function openAdd(meal) {
  A = { date: S.ui.date || todayStr(), meal, q: '', view: 'search', off: null, offErr: '', sel: null, g: 100 };
  openSheet('Ajouter un aliment', '');
  renderAdd();
}

function renderAdd() {
  const body = $('#sheetBody'); if (!body || !A) return;
  stopScan();
  if (A.view === 'search') {
    $('#sheetTitle').textContent = A.title || ('Ajouter — ' + MEALS.find(m => m[0] === A.meal)[1]);
    body.innerHTML = `<input type="search" id="q" placeholder="Rechercher (ex : poulet, skyr, Barilla…)" value="${esc(A.q)}" style="width:100%" autocomplete="off">
      <div class="row" style="margin:10px 0 4px;flex-wrap:wrap;gap:8px"><button class="btn sm" data-act="scan">📷 Scanner un code-barres</button><button class="btn sm ghost" data-act="createFood">+ Créer un aliment</button>${A.onPick ? `<button class="btn sm ghost" data-act="backRecipe">← Recette</button>` : ''}</div>
      <div id="addres"></div>`;
    renderAddResults();
    const q = $('#q');
    q.addEventListener('input', () => { A.q = q.value; A.off = null; A.offErr = ''; renderAddResults(); });
    q.addEventListener('keydown', e => { if (e.key === 'Enter' && A.q.trim()) { q.blur(); offSearch(A.q.trim()); } });
    if (!('ontouchstart' in window)) q.focus();
  } else if (A.view === 'qty') {
    renderQty();
  } else if (A.view === 'scan') {
    $('#sheetTitle').textContent = 'Scanner';
    body.innerHTML = `<div id="reader"></div><p class="small muted">Vise le code-barres du produit. Ou saisis-le :</p>
      <div class="row"><input type="text" inputmode="numeric" id="ean" placeholder="Code-barres (EAN)" class="grow"><button class="btn primary" data-act="eanGo">OK</button></div>
      <button class="btn ghost block" style="margin-top:10px" data-act="backSearch">← Retour</button><div id="scanmsg" class="small muted" style="margin-top:8px"></div>`;
    startScan(code => lookupBarcode(code));
  } else if (A.view === 'create') {
    $('#sheetTitle').textContent = 'Créer un aliment';
    body.innerHTML = `${A.code ? `<div class="banner" style="margin-top:0"><b>Code-barres ${esc(A.code)} non reconnu.</b><br><span class="small">Ajoute-le avec les valeurs de l’étiquette : la prochaine fois que tu le scanneras, il sera reconnu tout de suite.</span></div>` : ''}
      <p class="small muted" style="margin-top:0">Valeurs pour 100 g (ou 100 ml), lisibles sur l’étiquette.</p>
      <label class="f">Nom<input type="text" id="cf_name" value="${esc(A.code ? '' : A.q)}" placeholder="ex. Skyr vanille Marque X"></label>
      <div class="grid2"><label class="f">Calories (kcal)<input type="number" inputmode="decimal" id="cf_kcal"></label>
      <label class="f">Protéines (g)<input type="number" inputmode="decimal" id="cf_p"></label>
      <label class="f">Glucides (g)<input type="number" inputmode="decimal" id="cf_c"></label>
      <label class="f">Lipides (g)<input type="number" inputmode="decimal" id="cf_f"></label>
      <label class="f">Fibres (g)<input type="number" inputmode="decimal" id="cf_fib"></label>
      <label class="f">Portion (g, facultatif)<input type="number" inputmode="decimal" id="cf_ug"></label></div>
      <div class="row"><button class="btn ghost" data-act="backSearch">Annuler</button><button class="btn primary grow" data-act="saveCustom">Enregistrer</button></div>`;
  }
}

function renderAddResults() {
  const box = $('#addres'); if (!box) return;
  const q = norm(A.q.trim());
  let h = '';
  if (!q) {
    if (typeof addSheetExtras === 'function') h += addSheetExtras();
    const rec = S.recents.map(food).filter(Boolean).slice(0, 25);
    if (rec.length) h += `<h3 class="muted" style="margin:12px 0 2px">Récents</h3><div>${rec.map(f => foodRow(f)).join('')}</div>`;
    else h += `<p class="muted small">Tape un nom d’aliment. La base intégrée contient ${BASE_FOODS.length} aliments courants ; pour les produits de marque, lance la recherche Open Food Facts ou scanne le code-barres.</p>`;
  } else {
    const words = q.split(/\s+/);
    const loc = allFoodsList().filter(f => { const n = norm(f.name + ' ' + (f.brand || '')); return words.every(w => n.includes(w)); })
      .map(f => { const n = norm(f.name); const sp = ' ' + n.replace(/[^a-z0-9]+/g, ' '); const sc = words.reduce((t, w) => t + (n.startsWith(w) ? 0 : sp.includes(' ' + w) ? 1 : 3), 0); return [sc, f]; })
      .sort((x, y) => x[0] - y[0]).map(x => x[1]).slice(0, 30);
    h += loc.length ? `<h3 class="muted" style="margin:12px 0 2px">Base intégrée & mes aliments</h3><div>${loc.map(f => foodRow(f)).join('')}</div>` : `<p class="muted small">Rien dans la base locale.</p>`;
    h += `<div class="card" style="margin-top:12px"><div class="row between"><h3>Open Food Facts</h3><span class="small muted">produits du commerce</span></div>`;
    if (A.off === 'loading') h += `<p class="muted small">Recherche…</p>`;
    else if (Array.isArray(A.off)) h += A.off.length ? `<div>${A.off.map(f => foodRow(f)).join('')}</div>` : `<p class="muted small">Aucun produit trouvé.</p>`;
    else h += `<button class="btn sm block" style="margin-top:8px" data-act="offGo">Chercher « ${esc(A.q.trim())} »</button>`;
    if (A.offErr) h += `<div class="warnbox">${esc(A.offErr)}</div>`;
    h += `</div>`;
  }
  box.innerHTML = h;
}

function foodRow(f) {
  return `<div class="item" data-act="pickFood" data-id="${esc(f.id)}"><div class="grow"><div class="name">${esc(f.name)}</div>
    <div class="meta">${f.brand ? esc(f.brand) + ' · ' : ''}${r0(f.kcal)} kcal · P ${r1(f.p)} · G ${r1(f.c)} · L ${r1(f.f)} / 100 ${uLabel(f)}</div></div></div>`;
}

function renderQty() {
  const f = food(A.sel);
  const u = uLabel(f);
  const quick = [100];
  if (f.unit) quick.push(f.unit.g);
  if (f.serving && !quick.includes(f.serving)) quick.push(f.serving);
  $('#sheetTitle').textContent = f.name;
  $('#sheetBody').innerHTML = `<div class="small muted">${f.brand ? esc(f.brand) + ' · ' : ''}${r0(f.kcal)} kcal / 100 ${u}${f.src === 'off' ? ' · Open Food Facts' : ''}</div>
    <label class="f" style="margin-top:12px">Quantité (${u})<input type="number" inputmode="decimal" id="qg" value="${A.g}" style="font-size:22px;font-weight:600"></label>
    <div class="row wrap" style="margin-bottom:12px">
      ${f.unit ? [1, 2, 3].map(n => `<button class="chip" data-act="setG" data-g="${f.unit.g * n}">${n} ${esc(f.unit.name.replace(/ \(ml\)/, ''))}${n > 1 && !/[sx]$/.test(f.unit.name) && !/\(/.test(f.unit.name) ? 's' : ''}</button>`).join('') : ''}
      ${f.serving ? `<button class="chip" data-act="setG" data-g="${f.serving}">1 portion (${f.serving} ${u})</button>` : ''}
      ${[50, 100, 150, 200].map(g => `<button class="chip" data-act="setG" data-g="${g}">${g} ${u}</button>`).join('')}
    </div>
    ${A.onPick ? '' : `<label class="f">Repas<select id="qmeal">${MEALS.map(([k, l]) => `<option value="${k}" ${k === A.meal ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`}
    <div class="card" id="qprev"></div>
    <div class="row"><button class="btn ghost" data-act="backSearch">← Retour</button><button class="btn primary grow" data-act="confirmAdd">Ajouter</button></div>
    ${S.custom[f.id] && f.src === 'custom' ? `<button class="btn ghost danger sm" style="margin-top:12px" data-act="delCustom" data-id="${esc(f.id)}">Supprimer cet aliment de ma liste</button>` : ''}
    ${typeof qtyExtras === 'function' && !A.onPick ? qtyExtras(f) : ''}`;
  const qg = $('#qg');
  qg.addEventListener('input', () => { A.g = num(qg.value); renderQtyPrev(); });
  if ($('#qmeal')) $('#qmeal').addEventListener('change', e => A.meal = e.target.value);
  renderQtyPrev();
}
function renderQtyPrev() {
  const f = food(A.sel); const n = nutr(f, A.g);
  const T = targets();
  $('#qprev').innerHTML = `<div class="row between"><span class="big" style="font-size:26px">${r0(n.kcal)} <span class="small muted">kcal</span></span>
    ${T ? `<span class="small muted">${r0(n.kcal / T.kcal * 100)} % de ton objectif</span>` : ''}</div>
    <div class="grid2" style="grid-template-columns:repeat(4,1fr);margin-top:8px">
      ${[['p', 'Prot.', 'prot', 4], ['c', 'Gluc.', 'carb', 4], ['f', 'Lip.', 'fat', 9]].map(([m, l, col, k]) => `<div class="stat"><div class="v" style="color:var(--${col})">${fr(r1(n[m]))}</div><div class="l">${l} g</div>
        <div class="l num">${r0(n[m] * k)} kcal · ${n.kcal > 0 ? r0(n[m] * k / n.kcal * 100) : 0} %</div></div>`).join('')}
      <div class="stat"><div class="v" style="color:var(--fib)">${fr(r1(n.fib))}</div><div class="l">Fibres g</div></div></div>`;
}

// ----- Open Food Facts -----
const OFF_FIELDS = 'code,product_name,product_name_fr,brands,nutriments,serving_quantity';
function offToFood(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n['energy_100g'] != null) kcal = n['energy_100g'] / 4.184;
  const name = (p.product_name_fr || p.product_name || '').trim();
  if (kcal == null || !name || !p.code) return null;
  const brand = Array.isArray(p.brands) ? p.brands[0] : String(p.brands || '').split(',')[0].trim();
  const sq = num(p.serving_quantity);
  return {
    id: 'off_' + p.code, name, brand, cat: 'Épicerie & divers', src: 'off', roles: [], diet: '',
    kcal: num(kcal), p: num(n.proteins_100g), c: num(n.carbohydrates_100g), f: num(n.fat_100g), fib: num(n.fiber_100g),
    sug: num(n.sugars_100g), salt: n.salt_100g != null ? num(n.salt_100g) : num(n.sodium_100g) * 2.5,
    serving: sq > 0 && sq < 2000 ? Math.round(sq) : null, unit: null
  };
}
async function fetchJSON(url, ms = 12000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function offSearch(q) {
  if (!A) return;
  A.off = 'loading'; A.offErr = ''; renderAddResults();
  let prods = null;
  // fr.openfoodfacts.org = produits vendus en France ; repli sur la base mondiale
  for (const host of ['fr', 'world']) {
    try {
      const j = await fetchJSON(`https://${host}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=40&fields=${OFF_FIELDS}`, 15000);
      prods = j.products || [];
      if (prods.length) break;
    } catch (e) { }
  }
  if (!A || A.q.trim() !== q) return;
  if (prods === null) { A.off = null; A.offErr = navigator.onLine ? 'Open Food Facts ne répond pas (limite d’environ 10 recherches par minute). Réessaie dans un instant, ou scanne le code-barres.' : 'Pas de connexion internet.'; }
  else {
    const words = norm(q).split(/\s+/);
    const score = f => { const n = norm(f.name + ' ' + f.brand); return words.filter(w => n.includes(w)).length * 2 + (norm(f.name).startsWith(words[0]) ? 1 : 0); };
    A.off = prods.map(offToFood).filter(Boolean).map((f, i) => ({ f, s: score(f), i })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.f);
    A.off.forEach(f => { if (!S.custom[f.id]) TEMP[f.id] = f; }); }
  renderAddResults();
}
async function lookupBarcode(code) {
  code = String(code).replace(/\D/g, '');
  if (!code || !A) return;
  stopScan();
  const msg = $('#scanmsg'); if (msg) msg.textContent = 'Recherche du produit ' + code + '…';
  if (S.custom['off_' + code]) { selectFood('off_' + code); return; }
  try {
    const j = await fetchJSON(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`);
    const f = j && j.status === 1 ? offToFood({ ...j.product, code }) : null;
    if (!A) return;
    if (f) { TEMP[f.id] = f; selectFood(f.id); }
    else {
      A.code = code; A.view = 'create'; renderAdd();
    }
  } catch (e) { if (msg) msg.innerHTML = `Pas de connexion pour chercher ce produit. <a href="#" data-act="createFromCode" data-code="${code}">Le créer moi-même</a>`; }
}
function selectFood(id) {
  const f = food(id); if (!f) return;
  A.sel = id; A.view = 'qty';
  A.g = f.serving || f.unit?.g || 100;
  renderAdd();
}

// ----- Scanner (BarcodeDetector natif, sinon bibliothèque html5-qrcode) -----
let SCAN = null;
async function startScan(onCode) {
  const reader = $('#reader'); const msg = $('#scanmsg');
  if (!navigator.mediaDevices?.getUserMedia) { if (msg) msg.textContent = 'Caméra indisponible ici (il faut une connexion https). Saisis le code à la main.'; return; }
  let done = false;
  const hit = code => { if (done) return; done = true; if (navigator.vibrate) navigator.vibrate(60); onCode(code); };
  try {
    if ('BarcodeDetector' in window) {
      const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = document.createElement('video'); v.setAttribute('playsinline', ''); v.muted = true; v.srcObject = stream;
      reader.appendChild(v); await v.play();
      SCAN = { stream, timer: setInterval(async () => { try { const r = await det.detect(v); if (r[0]) hit(r[0].rawValue); } catch (e) { } }, 250) };
    } else {
      if (!window.Html5Qrcode) await new Promise((res, rej) => {
        const s = document.createElement('script'); s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
      if (!$('#reader')) return;
      const q = new Html5Qrcode('reader', { formatsToSupport: [9, 10, 14, 15] /* EAN_13, EAN_8, UPC_A, UPC_E */, verbose: false });
      SCAN = { lib: q };
      await q.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 130 } }, t => hit(t), () => { });
    }
  } catch (e) { if (msg) msg.textContent = 'Impossible d’ouvrir la caméra (autorisation refusée ?). Saisis le code à la main.'; }
}
function stopScan() {
  if (!SCAN) return;
  const s = SCAN; SCAN = null;
  if (s.timer) clearInterval(s.timer);
  if (s.stream) s.stream.getTracks().forEach(t => t.stop());
  if (s.lib) { try { s.lib.stop().catch(() => { }); } catch (e) { } }
}

// ----- Édition d’une entrée du journal -----
function openEditEntry(id) {
  const d = S.ui.date || todayStr();
  const e = (S.journal[d] || []).find(x => x.id === id); if (!e) return;
  openSheet(e.name, `<label class="f">Quantité (${e.u || 'g'})<input type="number" inputmode="decimal" id="eg" value="${e.g}" style="font-size:22px;font-weight:600"></label>
    <label class="f">Repas<select id="emeal">${MEALS.map(([k, l]) => `<option value="${k}" ${k === e.meal ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="small muted" id="eprev" style="margin-bottom:12px"></div>
    <div class="row"><button class="btn danger" data-act="delEntry" data-id="${id}">Supprimer</button><button class="btn primary grow" data-act="saveEntry" data-id="${id}">Enregistrer</button></div>`);
  const upd = () => { $('#eprev').textContent = macroLine(nutr(e, num($('#eg').value))); };
  $('#eg').addEventListener('input', upd); upd();
}

// ============================================================
//  MENUS
// ============================================================
const MEAL_SPLITS = {
  3: [['pdj', .25], ['dej', .40], ['diner', .35]],
  4: [['pdj', .25], ['dej', .35], ['snack', .10], ['diner', .30]],
  5: [['pdj', .20], ['snack', .10], ['dej', .30], ['snack', .10], ['diner', .30]]
};
const MEAL_LABEL = { pdj: 'Petit-déjeuner', dej: 'Déjeuner', diner: 'Dîner', snack: 'Collation' };
const TEMPLATES = {
  pdj: [['pdjc', 'pdjp', 'fruit', 'noix'], ['pdjb', 'egg', 'fruit'], ['pdjc', 'lait', 'fruit', 'noix'], ['pdjb', 'pdjp', 'fruit', 'spread']],
  dej: [['prot', 'fec', 'leg', 'mg']],
  diner: [['prot', 'fec', 'leg', 'mg']],
  snack: [['pdjp', 'fruit'], ['pdjp', 'noix'], ['fruit', 'noix'], ['snackc', 'spread']]
};
const OPTIONAL = ['mg', 'noix', 'spread'];
const ROLE_B = {
  prot: { min: 80, max: 250, def: 150 }, egg: { min: 120, max: 240, def: 120, round: 60 },
  fec: { min: 40, max: 160, def: 80 }, leg: { fixed: 1, def: 200 }, mg: { min: 0, max: 25, def: 10 },
  pdjc: { min: 30, max: 120, def: 60 }, pdjb: { min: 50, max: 160, def: 70 }, pdjp: { min: 100, max: 350, def: 150 },
  lait: { min: 100, max: 350, def: 200 }, fruit: { fixed: 1, def: 125 },
  noix: { min: 0, max: 40, def: 15 }, spread: { min: 0, max: 40, def: 15 }, snackc: { min: 16, max: 48, def: 24, round: 8 }
};
const DIETS = { omni: 'Omnivore', pesco: 'Pesco-végétarien', vege: 'Végétarien', vegan: 'Végétalien' };
const dietOk = (f, d) => d === 'omni' || (d === 'pesco' && f.diet !== 'm') || (d === 'vege' && !['m', 'p'].includes(f.diet)) || (d === 'vegan' && !f.diet);
const menuFoods = () => BASE_FOODS.filter(f => f.roles.length);

let RESTRICT = null; // panier limité pendant la génération (liste de courses courte)
function pool(role) {
  const P = S.menuPrefs;
  const all = BASE_FOODS.filter(f => f.roles.includes(role) && dietOk(f, P.diet) && !P.exclude.includes(f.id));
  if (RESTRICT && RESTRICT[role]) { const r = all.filter(f => RESTRICT[role].includes(f.id)); if (r.length) return r; }
  return all;
}
// Nombre d’aliments différents par rôle, selon la durée du menu
const BASKET = { prot: [2, 4, 5], fec: [2, 3, 4], leg: [2, 4, 5], mg: [1, 1, 2], pdjc: [1, 1, 2], pdjb: [1, 1, 1], pdjp: [1, 2, 2], lait: [1, 1, 1], fruit: [2, 3, 4], noix: [1, 1, 2], spread: [1, 1, 1], snackc: [1, 1, 1], egg: [1, 1, 1] };
function makeBasket(days) {
  const lvl = days <= 2 ? 0 : days <= 7 ? 1 : 2;
  RESTRICT = null;
  const R = {};
  for (const role in BASKET) {
    const all = typeof basketOrder === 'function' ? basketOrder(pool(role), role) : [...pool(role)].sort(() => Math.random() - 0.5);
    R[role] = all.slice(0, BASKET[role][lvl]).map(f => f.id);
  }
  // au moins 2 sources de protéines « maigres » (≥ 39 % des kcal en protéines) si possible
  const lean = f => f.p * 4 / f.kcal >= 0.39;
  const leanPool = pool('prot').filter(lean).sort(() => Math.random() - 0.5);
  const need = Math.min(2, R.prot.length, leanPool.length);
  for (const f of leanPool) {
    if (R.prot.filter(id => lean(food(id))).length >= need) break;
    if (R.prot.includes(f.id)) continue;
    const i = R.prot.findIndex(id => !lean(food(id))); if (i < 0) break; R.prot[i] = f.id;
  }
  // matière grasse : toujours une huile (le fromage seul ne suffit pas à chaque repas)
  const oils = pool('mg').filter(f => f.cat === 'Matières grasses & oléagineux');
  if (oils.length && !R.mg.some(id => oils.some(o => o.id === id))) R.mg[0] = pick(oils).id;
  R.egg = R.egg.length ? R.egg : ['oeuf'];
  if (R.prot.includes('oeuf')) R.egg = ['oeuf'];
  return R;
}
function mkItem(f, role) {
  const rb = ROLE_B[role];
  if (rb.fixed) return { id: f.id, role, g: f.unit && role === 'fruit' ? f.unit.g : rb.def, fixed: 1 };
  const b = { ...rb, ...(f.b || {}) };
  return { id: f.id, role, g: clamp(b.def ?? (b.min + b.max) / 2, b.min, b.max), min: b.min, max: b.max, round: b.round || 0 };
}
function solve(items, t) {
  const run = n => {
    for (let it = 0; it < n; it++) for (const x of items) {
      if (x.fixed || x.lock) continue;
      const f = food(x.id);
      const cur = sum(items.map(y => nutr(food(y.id), y.g)));
      // moindres carrés pondérés (en kcal), protéines prioritaires ×2
      // + terme calories totales (×1,5) pour ne pas dépasser l’objectif en courant après les protéines
      const tk = t.kcal ?? (t.p * 4 + t.c * 4 + t.f * 9);
      const e = [(t.p - cur.p) * 8, (t.c - cur.c) * 4, (t.f - cur.f) * 9, (tk - cur.kcal) * 1.5];
      const v = [f.p * .08, f.c * .04, f.f * .09, f.kcal * .015];
      let vv = 0, ev = 0; for (let i = 0; i < 4; i++) { vv += v[i] * v[i]; ev += e[i] * v[i]; }
      if (!vv) continue;
      x.g = clamp(x.g + ev / vv, x.min, x.max);
    }
  };
  for (const x of items) delete x.lock;
  run(60);
  for (const x of items) if (x.round) { x.g = clamp(Math.round(x.g / x.round) * x.round, x.min, x.max); x.lock = 1; }
  run(40);
  for (const x of items) { delete x.lock; if (!x.fixed && !x.round) x.g = Math.round(x.g / 5) * 5; }
  return items;
}
function weightedPick(list, usage, avoid = []) {
  const cand = list.filter(f => !avoid.includes(f.id));
  const L = cand.length ? cand : list;
  const w = L.map(f => (S.fridge && S.fridge[f.id] != null ? 3 : 1) / (1 + 3 * (usage[f.id] || 0)));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < L.length; i++) { r -= w[i]; if (r <= 0) return L[i]; }
  return L[L.length - 1];
}
function buildMeal(key, t, usage = {}, avoid = []) {
  const tpls = TEMPLATES[key].filter(tp => tp.every(r => OPTIONAL.includes(r) || pool(r).length));
  if (!tpls.length) return [];
  const tp = pick(tpls);
  const items = [];
  for (const role of tp) {
    const pl = pool(role).filter(f => !items.some(i => i.id === f.id)); if (!pl.length) continue;
    const f = weightedPick(pl, usage, role === 'prot' ? avoid : []);
    usage[f.id] = (usage[f.id] || 0) + 1;
    items.push(mkItem(f, role));
  }
  return solve(items, t);
}
function mealTarget(T, share) { return { kcal: T.kcal * share, p: T.p * share, c: T.c * share, f: T.f * share }; }
// Cible d’un repas = objectif du jour − ce que les autres repas apportent déjà (garde la journée juste)
function residualTarget(day, mi, T) {
  const others = sum(day.meals.filter((_, i) => i !== mi).flatMap(m => m.items.map(it => nutr(food(it.id), it.g))));
  const share = day.meals[mi].share;
  const t = { kcal: T.kcal - others.kcal, p: T.p - others.p, c: T.c - others.c, f: T.f - others.f };
  // ne pas trop s’éloigner de la part normale du repas
  for (const k of ['kcal', 'p', 'c', 'f']) t[k] = clamp(t[k], T[k] * share * 0.6, T[k] * share * 1.6);
  return t;
}

function generatePlan() {
  const T = targets(); if (!T) { toast('Calcule d’abord tes besoins'); return; }
  const P = S.menuPrefs;
  const split = MEAL_SPLITS[P.meals];
  const usage = {}; const days = [];
  let prevProt = [];
  RESTRICT = makeBasket(P.days);
  const dayErr = meals => {
    const t = sum(meals.flatMap(m => m.items.map(it => nutr(food(it.id), it.g))));
    return Math.abs(t.p - T.p) * 8 + Math.abs(t.c - T.c) * 4 + Math.abs(t.f - T.f) * 9 + Math.abs(t.kcal - T.kcal) * 1.5;
  };
  for (let d = 0; d < P.days; d++) {
    // on tire plusieurs journées candidates et on garde la plus proche des objectifs
    let best = null;
    for (let tryN = 0; tryN < 8; tryN++) {
      const u = { ...usage }; const meals = []; const protToday = [];
      for (const [key, share] of split) {
        const bb = typeof batchBaseDay === 'function' ? batchBaseDay(d, key, days) : -1;
        let items;
        if (bb >= 0) { items = days[bb].meals[meals.length].items.map(x => ({ ...x })); solve(items, mealTarget(T, share)); }
        else items = buildMeal(key, mealTarget(T, share), u, [...prevProt, ...protToday]);
        items.filter(i => i.role === 'prot').forEach(i => protToday.push(i.id));
        meals.push(bb >= 0 ? { key, share, items, batchOf: bb } : { key, share, items });
      }
      // second passage sur la journée entière : corrige les écarts restants
      solve(meals.flatMap(m => m.items), T);
      const err = dayErr(meals);
      if (!best || err < best.err) best = { err, meals, u, protToday };
    }
    Object.assign(usage, best.u);
    prevProt = best.protToday;
    days.push({ meals: best.meals });
  }
  RESTRICT = null;
  S.plan = { start: P.start || todayStr(), days, kcal: T.kcal };
  S.shop.checked = {};
  save(); render();
  toast('Menu généré');
}
function rescalePlan() {
  const T = targets(); if (!T || !S.plan) return;
  for (const d of S.plan.days) { for (const m of d.meals) solve(m.items, mealTarget(T, m.share)); solve(d.meals.flatMap(m => m.items), T); }
  S.plan.kcal = T.kcal; save(); render(); toast('Portions recalculées');
}

// Bloc de réglage avec titre + explication
const msec = (ic, title, hint, body) => `<section class="msec"><div class="msec-h"><span class="msec-ic">${ic}</span><div><b>${title}</b>${hint ? `<div class="small muted">${hint}</div>` : ''}</div></div>${body}</section>`;
function menuSettingsHTML() {
  const P = S.menuPrefs; const T = targets();
  const startDef = (S.plan && S.plan.start) || todayStr();
  const daysOpt = [[1, '1 jour'], [2, '2 jours'], [3, '3 jours'], [4, '4 jours'], [5, '5 jours'], [6, '6 jours'], [7, '1 semaine'], [10, '10 jours'], [14, '2 semaines']];
  return `<p class="muted" style="margin:0 0 16px">L’appli compose tes repas pour tomber sur <b style="color:var(--text)">${r0(T.kcal)} kcal</b> par jour (P ${r0(T.p)} · G ${r0(T.c)} · L ${r0(T.f)} g), puis prépare la liste de courses.</p>`
    + msec('📅', 'Période', 'Quand commence le menu et combien de jours il couvre.', `<div class="grid2">
        <label class="f">À partir du<input type="date" id="mp_start" value="${esc(P.start || startDef)}"></label>
        <label class="f">Durée<select id="mp_days">${daysOpt.map(([n, l]) => `<option value="${n}" ${n === P.days ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>`)
    + msec('🍽️', 'Repas par jour', 'Les calories sont réparties entre ces repas.', `<div class="seg">${[[3, '3 repas'], [4, '+ 1 collation'], [5, '+ 2 collations']].map(([n, l]) => `<button data-act="mpMeals" data-v="${n}" class="${n === P.meals ? 'on' : ''}">${l}</button>`).join('')}</div>`)
    + msec('🥦', 'Régime alimentaire', 'Les aliments qui ne conviennent pas sont retirés automatiquement.', `<select id="mp_diet" style="width:100%">${Object.entries(DIETS).map(([k, l]) => `<option value="${k}" ${k === P.diet ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <details style="margin-top:12px"><summary class="small" style="color:var(--accent)">🚫 Aliments que je ne veux pas (${P.exclude.length})</summary>
        <p class="small muted" style="margin:8px 0">Touche un aliment pour l’exclure : allergie, goût, budget…</p>
        <div class="row wrap" style="gap:6px">${menuFoods().filter(f => dietOk(f, P.diet)).map(f => `<span class="chip ${P.exclude.includes(f.id) ? 'on' : ''}" data-act="toggleEx" data-id="${f.id}">${P.exclude.includes(f.id) ? '✕ ' : ''}${esc(f.name.replace(/ \(.*\)/, ''))}</span>`).join('')}</div></details>`)
    + (typeof menuExtrasHTML === 'function' ? menuExtrasHTML() : '')
    + `<button class="btn primary block" style="margin-top:8px" data-act="genPlan">${S.plan ? 'Créer un nouveau menu' : 'Créer mon menu'}</button>
    ${S.plan ? '<p class="small muted" style="text-align:center;margin:8px 0 0">Le menu actuel sera remplacé.</p>' : ''}`;
}

function vMenus() {
  const T = targets();
  let h = `<div class="row between" style="margin:4px 0 16px"><h1 style="margin:0">Menus</h1><div class="row" style="gap:6px">${S.plan && T ? `<button class="btn sm" data-act="menuSettings">⚙️ Réglages</button>` : ''}${H('menus')}</div></div>`;
  if (!T) return h + `<div class="banner">Les menus sont calculés sur tes besoins. <div style="margin-top:10px"><button class="btn primary sm" data-act="startGuide">Calculer mes besoins</button></div></div>`;
  if (!S.plan) return h + `<div class="card empty"><div style="font-size:42px">🍽️</div><h2>Ton menu sur mesure</h2>
    <p class="muted">Des repas simples qui tombent pile sur tes ${r0(T.kcal)} kcal et tes macros, avec la liste de courses prête.</p>
    <button class="btn primary block" data-act="menuSettings">Créer mon menu</button></div>`;
  if (Math.abs(S.plan.kcal - T.kcal) > 30) h += `<div class="banner small row between"><span>Tes besoins ont changé (${r0(S.plan.kcal)} → ${r0(T.kcal)} kcal).</span><button class="btn sm primary" data-act="rescale">Ajuster</button></div>`;
  const nDays = S.plan.days.length;
  const today = todayStr();
  if (S.ui.mDay == null || S.ui.mDay >= nDays) { const ti = daysBetween(S.plan.start, today); S.ui.mDay = ti >= 0 && ti < nDays ? ti : 0; }
  const di = S.ui.mDay; const day = S.plan.days[di]; const date = addDays(S.plan.start, di);
  h += `<div class="daystrip">${S.plan.days.map((_, i) => { const dt = addDays(S.plan.start, i); return `<button class="${i === di ? 'on' : ''}" data-act="mDay" data-i="${i}"><span>${esc(fmtDate(dt, { weekday: 'short' }).replace('.', ''))}</span><b>${new Date(dt + 'T12:00:00').getDate()}</b>${dt === today ? '<i></i>' : ''}</button>`; }).join('')}</div>`;
  const dt = sum(day.meals.flatMap(m => m.items.map(it => nutr(food(it.id), it.g))));
  h += `<div class="row between" style="margin:16px 2px 12px"><div><div class="jtitle" style="text-transform:capitalize">${esc(fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
      <div class="small muted">${r0(dt.kcal)} kcal · P ${r0(dt.p)} · G ${r0(dt.c)} · L ${r0(dt.f)}</div>
      ${typeof dayCostTxt === 'function' && dayCostTxt(day) ? `<div class="small muted">Coût estimé${dayCostTxt(day).replace(' · ', ' ')}</div>` : ''}</div>
    <button class="btn sm" data-act="planToJournal" data-day="${di}">→ Journal</button></div>`;
  day.meals.forEach((m, mi) => {
    const mt = sum(m.items.map(it => nutr(food(it.id), it.g)));
    h += `<section class="card meal"><div class="mealhead"><div><h2>${MEAL_LABEL[m.key]}</h2><div class="small muted">${r0(mt.kcal)} kcal · P ${r0(mt.p)} · G ${r0(mt.c)} · L ${r0(mt.f)}</div></div>
      <div class="row" style="gap:4px"><button class="iconbtn" data-act="regenMeal" data-day="${di}" data-meal="${mi}" aria-label="Changer ce repas" title="Changer ce repas">↻</button>
      <button class="addbtn" data-act="planAdd" data-day="${di}" data-meal="${mi}" aria-label="Ajouter un aliment à ce repas">＋</button></div></div>`;
    if (typeof batchBadge === 'function') h += batchBadge(di, mi, m);
    h += m.items.filter(it => it.g > 0).map(it => {
      const f = food(it.id); const n = nutr(f, it.g);
      const nU = f.unit ? Math.round(it.g / f.unit.g * 2) / 2 : 0;
      const unitTxt = nU >= 1 && !isLiquid(f) && /œuf|tranche|galette|pot|banane|pomme|orange|kiwi|steak|boîte/.test(f.unit.name) ? ` · ≈ ${fr(nU)} ${esc(f.unit.name)}${nU >= 2 ? 's' : ''}` : '';
      return `<div class="item" data-act="swapItem" data-day="${di}" data-meal="${mi}" data-item="${m.items.indexOf(it)}">
        <div class="grow"><div class="name">${esc(f.name)}</div><div class="meta">${r0(it.g)} ${uLabel(f)}${unitTxt}</div></div><span class="kcal">${r0(n.kcal)}</span></div>`;
    }).join('');
    h += `</section>`;
  });
  h += `<p class="hint">Touche un aliment pour sa quantité, le remplacer ou le retirer · ＋ pour en ajouter · ↻ pour un autre repas</p>`;
  return h;
}

// ============================================================
//  COURSES
// ============================================================
function shopList() {
  const agg = {};
  if (S.plan) for (const d of S.plan.days) for (const m of d.meals) for (const it of m.items) if (it.g > 0) agg[it.id] = (agg[it.id] || 0) + it.g;
  return Object.entries(agg).map(([id, g]) => ({ id, g, f: food(id) })).filter(x => x.f);
}
function qtyText(f, g) {
  const liq = isLiquid(f);
  let s = g >= 1000 ? `${fr(r1(g / 1000))} ${liq ? 'L' : 'kg'}` : `${r0(Math.ceil(g / 10) * 10)} ${liq ? 'ml' : 'g'}`;
  if (f.unit && !liq && !/c\. à|noisette|dose|carré|portion|morceau/.test(f.unit.name)) {
    const n = Math.ceil(g / f.unit.g - 0.15);
    s += ` · ≈ ${n} ${esc(f.unit.name)}${n > 1 && !/[sx]$/.test(f.unit.name) && !/[½¼]/.test(f.unit.name) ? 's' : ''}`;
  }
  return s;
}
function vCourses() {
  let h = title('Courses', 'courses');
  const list = shopList();
  if (!S.plan) h += `<div class="banner">Génère d’abord un menu : la liste se remplit automatiquement. <div style="margin-top:8px"><button class="btn primary sm" data-act="goto" data-tab="menus">Aller aux menus</button></div></div>`;
  else h += `<p class="small muted" style="margin-top:-6px">Pour ${S.plan.days.length} jour${S.plan.days.length > 1 ? 's' : ''} à partir du ${esc(fmtDate(S.plan.start, { day: 'numeric', month: 'long' }))}. Quantités crues, arrondies.</p>`;
  if (list.length) {
    const done = list.filter(x => S.shop.checked[x.id]).length;
    h += `<div class="card" style="padding:10px 14px"><div class="row between small"><span>${done === list.length ? '✅ Tout est dans le panier !' : `${done} / ${list.length} articles cochés`}</span></div>
      <div class="bar" style="margin-top:6px"><i style="width:${done / list.length * 100}%;background:var(--accent)"></i></div></div>`;
  }
  const byCat = {};
  for (const x of list) (byCat[x.f.cat] = byCat[x.f.cat] || []).push(x);
  for (const cat of CATS) {
    const xs = byCat[cat]; if (!xs) continue;
    xs.sort((a, b) => a.f.name.localeCompare(b.f.name, 'fr'));
    h += `<div class="card"><h2>${esc(cat)}</h2>${xs.map(x => { const on = !!S.shop.checked[x.id]; return `<label class="check ${on ? 'done' : ''}"><input type="checkbox" data-act="shopCheck" data-id="${x.id}" ${on ? 'checked' : ''}>
      <div class="grow">${esc(x.f.name)}</div><span class="small muted num" style="text-align:right">${qtyText(x.f, x.g)}</span></label>`; }).join('')}</div>`;
  }
  h += `<div class="card"><h2>Autres articles</h2>
    ${S.shop.extra.map((x, i) => `<label class="check ${x.done ? 'done' : ''}"><input type="checkbox" data-act="extraCheck" data-i="${i}" ${x.done ? 'checked' : ''}><div class="grow">${esc(x.t)}</div><button class="iconbtn" data-act="extraDel" data-i="${i}" aria-label="Supprimer">✕</button></label>`).join('')}
    <div class="row" style="margin-top:8px"><input type="text" id="extraIn" class="grow" placeholder="Ajouter (ex : épices, éponges…)"><button class="btn" data-act="extraAdd">Ajouter</button></div></div>`;
  if (list.length || S.shop.extra.length) h += `<div class="row"><button class="btn grow" data-act="shareShop">Partager / copier</button><button class="btn ghost" data-act="uncheckAll">Tout décocher</button></div>`;
  return h;
}
function shopText() {
  const list = shopList(); const byCat = {};
  for (const x of list) (byCat[x.f.cat] = byCat[x.f.cat] || []).push(x);
  let t = 'Liste de courses\n';
  for (const cat of CATS) if (byCat[cat]) t += `\n${cat}\n` + byCat[cat].filter(x => !S.shop.checked[x.id]).map(x => `- ${x.f.name} : ${qtyText(x.f, x.g).replace(/&[a-z]+;/g, '')}`).join('\n') + '\n';
  const ex = S.shop.extra.filter(x => !x.done);
  if (ex.length) t += '\nAutres\n' + ex.map(x => '- ' + x.t).join('\n') + '\n';
  return t;
}

// ============================================================
//  BESOINS / PROFIL
// ============================================================
function vProfil() {
  const p = S.profile;
  const T = targets();
  const sub = S.ui.pSub || 'obj';
  let h = title('Besoins', 'profil') + `<div class="seg subtabs">${[['obj', 'Objectifs'], ['profil', 'Profil'], ['poids', 'Poids'], ['data', 'Réglages']].map(([k, l]) => `<button data-act="pSub" data-v="${k}" class="${sub === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  if (sub === 'obj') return h + (T ? '' : `<div class="banner">Renseigne d’abord ton <a href="#" data-act="pSub" data-v="profil">profil</a> (âge, taille, poids).</div>`) + `<div id="pres"></div>`;
  if (sub === 'profil') return h + `
  <div class="card"><h2>Profil</h2>
    <div class="seg" style="margin-bottom:10px">${[['h', 'Homme'], ['f', 'Femme']].map(([k, l]) => `<button data-act="pset" data-k="sex" data-v="${k}" class="${p.sex === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="grid2">
      <label class="f">Âge (ans)<input type="number" inputmode="numeric" data-p="age" value="${esc(p.age)}"></label>
      <label class="f">Taille (cm)<input type="number" inputmode="numeric" data-p="height" value="${esc(p.height)}"></label>
      <label class="f">Poids (kg)<input type="number" inputmode="decimal" data-p="weight" value="${esc(p.weight)}"></label>
      <label class="f">Masse grasse (%) <span class="muted">facult.</span><input type="number" inputmode="decimal" data-p="bf" value="${esc(p.bf)}" placeholder="ex : 18"></label>
    </div>
    <label class="f">Niveau d’activité (hors objectif)<select data-p="act">${ACT.map(([v, l, d]) => `<option value="${v}" ${num(p.act) === v ? 'selected' : ''}>${l} — ${d}</option>`).join('')}</select></label>
  </div>
  <div class="card"><h2>Objectif</h2>
    <div class="seg" style="margin-bottom:10px">${Object.entries(GOALS).map(([k, l]) => `<button data-act="pset" data-k="goal" data-v="${k}" class="${p.goal === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${RATES[p.goal] ? `<label class="f">Rythme visé<select data-p="rate">${RATES[p.goal].map(v => `<option value="${v}" ${num(p.rate) === v ? 'selected' : ''}>${p.goal === 'perte' ? '−' : '+'}${fr(v)} kg / semaine</option>`).join('')}</select></label>` : ''}
    ${p.goal === 'recompo' ? `<p class="small muted" style="margin-top:0">Léger déficit (−10 %) + protéines élevées + musculation : on perd du gras en conservant/gagnant du muscle.</p>` : ''}
    <div class="grid2">
      <label class="f">Protéines (g / kg)<input type="number" inputmode="decimal" step="0.1" data-p="protKg" value="${esc(p.protKg)}" placeholder="${fr(PROT_DEF[p.goal])}"></label>
      <label class="f">Lipides (% des kcal)<input type="number" inputmode="numeric" data-p="fatPct" value="${esc(p.fatPct)}"></label>
    </div>
  </div>
  <button class="btn primary block" data-act="pSub" data-v="obj">Voir mes objectifs</button>`;

  // Poids
  const ws = [...S.weights].sort((a, b) => a.d.localeCompare(b.d));
  if (sub === 'poids') {
  h += `<div class="card"><h2>Suivi du poids</h2>
    <div class="row"><input type="number" inputmode="decimal" id="wIn" class="grow" placeholder="Poids du jour (kg)" value=""><button class="btn primary" data-act="addWeight">Enregistrer</button></div>
    <p class="small muted" style="margin:6px 0 0">Pèse-toi le matin à jeun, idéalement chaque jour : la tendance lisse les variations d’eau.</p>
    ${ws.length >= 2 ? weightChart(ws) : ''}
    ${ws.length ? `<details style="margin-top:8px"><summary class="small" style="color:var(--accent)">Historique (${ws.length})</summary>${ws.slice().reverse().slice(0, 60).map(w => `<div class="item"><div class="grow">${esc(fmtDate(w.d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</div><span class="num">${fr(w.kg)} kg</span><button class="iconbtn" data-act="delWeight" data-d="${w.d}" aria-label="Supprimer">✕</button></div>`).join('')}</details>` : ''}
  </div>`;

  // Ajustement adaptatif
  const ad = adaptive();
  h += `<div class="card"><h2>Ajustement sur tes données réelles</h2>`;
  if (!ad.ok) {
    h += `<p class="small muted" style="margin:0">Les formules ont une marge d’erreur d’environ ±10 %. Après 2 à 4 semaines de journal complet + pesées, l’appli calcule ta vraie dépense à partir de ce que tu manges et de l’évolution de ton poids.</p>
      <p class="small" style="margin:8px 0 0">Progression : ${ad.days}/14 jours de journal · ${ad.ws}/4 pesées sur ${ad.span || 0}/14 jours (28 derniers jours).</p>`;
  } else {
    h += `<div class="grid2"><div class="stat"><div class="v">${r0(ad.avg)}</div><div class="l">kcal/jour mangées en moyenne (${ad.days} j)</div></div>
      <div class="stat"><div class="v">${ad.slope >= 0 ? '+' : ''}${fr(r1(ad.slope * 7))} kg</div><div class="l">par semaine (tendance)</div></div></div>
      <p style="margin:10px 0 4px">Dépense réelle estimée : <b>${r0(ad.tdee)} kcal/jour</b> <span class="small muted">(formule : ${T ? r0(T.tdeeCalc) : '—'})</span></p>
      <p class="small muted" style="margin:0 0 8px">Fiable seulement si tu as tout noté, y compris huiles, sauces et boissons.</p>
      ${p.tdeeOverride ? `<button class="btn sm" data-act="clearTdee">Revenir à la formule</button> <button class="btn sm primary" data-act="useTdee">Mettre à jour (${r0(ad.tdee)})</button>` : `<button class="btn sm primary" data-act="useTdee">Utiliser cette dépense pour mes objectifs</button>`}`;
  }
  if (p.tdeeOverride && !ad.ok) h += `<p class="small" style="margin-top:8px">Dépense personnalisée active : ${r0(p.tdeeOverride)} kcal <button class="btn sm" data-act="clearTdee">Revenir à la formule</button></p>`;
  h += `</div>`;
  return h;
  }

  // Données
  h += `<div class="card"><h2>Mes données</h2>
    <p class="small muted" style="margin-top:0">Tout est stocké sur ce téléphone uniquement. Fais une sauvegarde de temps en temps.</p>
    <div class="row between" style="margin-bottom:10px"><span class="small">💡 Conseils du jour dans le journal</span><button class="btn sm" data-act="alertsToggle">${S.settings.alerts ? 'Activés' : 'Désactivés'}</button></div>
    <p class="small muted" style="margin:0 0 8px">La sauvegarde contient tout sauf les photos de progression.</p>
    <div class="row wrap"><button class="btn sm" data-act="export">Exporter une sauvegarde</button>
    <label class="btn sm">Importer<input type="file" id="importIn" accept="application/json,.json" hidden></label>
    <button class="btn sm" data-act="startGuide">Revoir le guide</button>
    <button class="btn sm ghost danger" data-act="wipe">Tout effacer</button></div></div>
    <p class="small muted" style="text-align:center">Base intégrée : tables CIQUAL/USDA (arrondies) · Produits : Open Food Facts (ODbL)</p>`;
  return h;
}

const KF = { p: 4, c: 4, f: 9 };
const MACROS = [['p', 'Protéines', 'var(--prot)'], ['c', 'Glucides', 'var(--carb)'], ['f', 'Lipides', 'var(--fat)']];
const PRESETS = [['Équilibré', 30, 40, 30], ['Riche en protéines', 35, 40, 25], ['Endurance', 20, 55, 25], ['Pauvre en glucides', 35, 25, 40], ['Cétogène', 25, 5, 70]];
let TG_SNAP = null; // répartition en % mémorisée pendant qu’on tape les calories

function balanceText(kcal, tdee) {
  const d = kcal - tdee;
  if (Math.abs(d) < 50) return `≈ maintien (dépense ${r0(tdee)} kcal)`;
  const kgw = Math.abs(d) * 7 / 7700;
  return `${d < 0 ? 'Déficit' : 'Surplus'} de ${r0(Math.abs(d))} kcal/jour (${d < 0 ? '−' : '+'}${r0(Math.abs(d) / tdee * 100)} %) ≈ ${d < 0 ? '−' : '+'}${fr(r1(kgw))} kg/semaine`;
}
function sumText(C) {
  const tot = C.p * 4 + C.c * 4 + C.f * 9;
  const diff = C.kcal - tot;
  if (!(C.kcal > 0)) return '';
  if (Math.abs(diff) < 10) return `<div class="okbox">✓ Les macros font 100 % de tes calories (${r0(tot)} kcal).</div>`;
  return `<div class="warnbox">Les macros font <b>${r0(tot)} kcal</b> (${r0(tot / C.kcal * 100)} %) : ${diff > 0 ? `il manque <b>${r0(diff)} kcal</b>` : `<b>${r0(-diff)} kcal</b> de trop`} (${r0(Math.abs(diff) / C.kcal * 100)} %).
    <div class="row wrap" style="margin-top:8px;gap:6px">
      <button class="btn sm" data-act="tgFill" data-m="c">Ajuster les glucides</button>
      <button class="btn sm" data-act="tgFill" data-m="f">Ajuster les lipides</button>
      <button class="btn sm" data-act="tgSync">Calories = ${r0(tot)} kcal</button></div></div>`;
}
function macroTable(V, w, edit) {
  const cell = (m, u, val) => edit
    ? `<input type="number" inputmode="decimal" data-tg="${m}" data-u="${u}" value="${val}" aria-label="${u}">`
    : `<span class="mval">${val}</span>`;
  return `<div class="mtable">
    <div class="mrow mhead"><span></span><span>grammes</span><span>% kcal</span><span>kcal</span></div>
    ${MACROS.map(([m, l, col]) => `<div class="mrow"><span><span class="row" style="gap:6px"><span class="dot" style="background:${col}"></span><b>${l}</b></span>
      <span class="small muted" id="tg_gkg_${m}">${w > 0 ? fr(r1(V[m] / w)) + ' g/kg' : ''}</span></span>
      ${cell(m, 'g', r0(V[m]))}${cell(m, 'pct', V.kcal > 0 ? r0(V[m] * KF[m] / V.kcal * 100) : 0)}${cell(m, 'kcal', r0(V[m] * KF[m]))}</div>`).join('')}
  </div>`;
}

function renderProfilResults() {
  const box = $('#pres'); if (!box) return;
  TG_SNAP = null;
  const p = S.profile; const T = targets();
  if (!T) { box.innerHTML = `<div class="banner small">Renseigne âge, taille et poids pour obtenir tes besoins.</div>`; return; }
  const w = num(p.weight);
  const custom = T.manual;
  let h = `<div class="card"><h2>Ta dépense</h2>
    <div class="grid2">
      <div class="stat"><div class="v">${r0(T.bmr)}</div><div class="l">Métabolisme de base · ${T.katch ? 'Katch-McArdle' : 'Mifflin-St Jeor'}</div></div>
      <div class="stat"><div class="v">${r0(T.tdee)}</div><div class="l">Dépense totale ${p.tdeeOverride ? '(mesurée)' : '(estimée)'}</div></div>
    </div>
    <details style="margin-top:8px"><summary class="small" style="color:var(--accent)">Comment c’est calculé ?</summary>
      <p class="small muted">Métabolisme de base : Mifflin-St Jeor (${r0(T.mif)} kcal)${T.katch ? `, ou Katch-McArdle à partir de ta masse maigre (${r0(T.katch)} kcal) — plus précis quand le % de gras est connu, donc retenu` : ''}. Multiplié par ton niveau d’activité (×${fr(p.act)}) = dépense totale.
      Perte/prise : 1 kg de tissu ≈ 7 700 kcal, réparties sur la semaine. En automatique : protéines ${fr(r1(T.protKg))} g/kg, lipides ${p.fatPct} % des kcal (minimum 0,6 g/kg), glucides = le reste.
      1 g de protéines ou de glucides = 4 kcal, 1 g de lipides = 9 kcal.</p></details></div>`;

  h += `<div class="card"><h2>Mes objectifs</h2>
    <div class="seg" style="margin-bottom:12px"><button data-act="tgMode" data-v="auto" class="${custom ? '' : 'on'}">Calcul automatique</button><button data-act="tgMode" data-v="custom" class="${custom ? 'on' : ''}">Personnalisé</button></div>`;
  if (!custom) {
    h += `<div class="row between"><span>Calories · ${GOALS[p.goal]}</span><span class="big" style="font-size:28px">${r0(T.kcal)} <span class="small muted">kcal</span></span></div>
      <div class="small muted" style="margin-bottom:10px">${balanceText(T.kcal, T.tdee)}</div>
      ${macroTable(T, w, false)}
      <div class="small muted" style="margin-top:8px">Fibres : ≥ ${r0(T.fib)} g · Eau : ~${fr(r1(T.water / 1000))} L/jour${T.lbm ? ` · Masse maigre : ${fr(r1(T.lbm))} kg` : ''}</div>
      <button class="btn sm block" style="margin-top:10px" data-act="tgMode" data-v="custom">✏️ Personnaliser ces valeurs</button>`;
  } else {
    const C = p.custom;
    h += `<label class="f">Calories par jour (kcal)<input type="number" inputmode="numeric" data-tg="kcal" value="${r0(C.kcal)}" style="font-size:22px;font-weight:700"></label>
      <div class="small muted" id="tg_bal" style="margin:-4px 0 12px">${balanceText(C.kcal, T.tdee)}</div>
      <div class="small muted" style="margin-bottom:6px">Répartitions rapides (protéines / glucides / lipides en %) :</div>
      <div class="row wrap" style="gap:6px;margin-bottom:12px">${PRESETS.map(([l, a, b, c]) => `<button class="chip" data-act="tgPreset" data-p="${a}" data-c="${b}" data-f="${c}">${l} <span class="muted">${a}/${b}/${c}</span></button>`).join('')}</div>
      ${macroTable(C, w, true)}
      <p class="small muted" style="margin:6px 0 0">Modifie n’importe quelle case : grammes, % et kcal se convertissent automatiquement. Changer les calories garde ta répartition en %.</p>
      <div id="tg_sum">${sumText(C)}</div>
      <label class="f" style="margin-top:12px">Fibres (g)<input type="number" inputmode="numeric" data-tg="fib" value="${r0(C.fib)}"></label>
      <button class="btn sm ghost" data-act="tgReset">↺ Repartir du calcul automatique</button>`;
  }
  h += T.warn.map(x => `<div class="warnbox">${esc(x)}</div>`).join('') + `</div>`;
  box.innerHTML = h;
}

// Saisie dans l’éditeur : conversion g ⇄ % ⇄ kcal
function tgPcts() {
  const C = S.profile.custom; const r = {};
  for (const x of ['p', 'c', 'f']) r[x] = C.kcal > 0 ? C[x] * KF[x] / C.kcal * 100 : 0;
  return r;
}
function tgInput(el) {
  const C = S.profile.custom; const m = el.dataset.tg, u = el.dataset.u; const v = num(el.value);
  if (m === 'kcal') {
    if (!TG_SNAP) TG_SNAP = tgPcts(); // répartition figée tant qu'on tape les calories
    const snap = TG_SNAP;
    C.kcal = v;
    for (const x of ['p', 'c', 'f']) C[x] = Math.round(snap[x] / 100 * v / KF[x]);
  } else if (m === 'fib') C.fib = v;
  else if ((TG_SNAP = null), u === 'g') C[m] = v;
  else if (u === 'pct') C[m] = Math.round(v / 100 * C.kcal / KF[m]);
  else if (u === 'kcal') C[m] = Math.round(v / KF[m]);
  save(); tgSyncFields(el);
}
function tgSyncFields(active) {
  const C = S.profile.custom; const T = targets(); const w = num(S.profile.weight);
  document.querySelectorAll('[data-tg]').forEach(i => {
    if (i === active) return;
    const m = i.dataset.tg, u = i.dataset.u;
    i.value = m === 'kcal' ? r0(C.kcal) : m === 'fib' ? r0(C.fib) : u === 'g' ? r0(C[m]) : u === 'pct' ? (C.kcal > 0 ? r0(C[m] * KF[m] / C.kcal * 100) : 0) : r0(C[m] * KF[m]);
  });
  for (const x of ['p', 'c', 'f']) { const g = $('#tg_gkg_' + x); if (g && w > 0) g.textContent = fr(r1(C[x] / w)) + ' g/kg'; }
  const s = $('#tg_sum'); if (s) s.innerHTML = sumText(C);
  const b = $('#tg_bal'); if (b && T) b.textContent = balanceText(C.kcal, T.tdee);
}
document.addEventListener('focusout', e => { if (e.target.dataset && e.target.dataset.tg === 'kcal') TG_SNAP = null; });

function weightChart(ws) {
  const pts = ws.slice(-90);
  // tendance : moyenne mobile exponentielle
  let ema = pts[0].kg; const trend = pts.map(w => (ema = ema + 0.15 * (w.kg - ema)));
  const t0 = new Date(pts[0].d).getTime(), t1 = new Date(pts[pts.length - 1].d).getTime() || t0 + 1;
  const all = pts.map(w => w.kg);
  const lo = Math.min(...all) - 0.5, hi = Math.max(...all) + 0.5;
  const W = 320, H = 90;
  const X = d => ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - 10) + 5;
  const Y = v => H - 6 - (v - lo) / (hi - lo) * (H - 12);
  const line = trend.map((v, i) => `${i ? 'L' : 'M'}${X(pts[i].d).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Courbe de poids">
    ${pts.map(w => `<circle cx="${X(w.d).toFixed(1)}" cy="${Y(w.kg).toFixed(1)}" r="2.2" fill="var(--muted)" opacity=".55"/>`).join('')}
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>
    <div class="row between small muted"><span>${fr(pts[0].kg)} kg</span><span>Tendance : <b style="color:var(--text)">${fr(r1(trend[trend.length - 1]))} kg</b></span><span>${fr(pts[pts.length - 1].kg)} kg</span></div>`;
}

function adaptive() {
  const end = todayStr(); const start = addDays(end, -27);
  const intakes = [];
  for (let i = 0; i < 27; i++) { // jusqu’à hier : la journée en cours n’est pas complète
    const l = S.journal[addDays(start, i)];
    if (l && l.length) { const k = sum(l.map(entryN)).kcal; if (k > 600) intakes.push(k); }
  }
  const ws = S.weights.filter(w => w.d >= start && w.d <= end);
  const xs = ws.map(w => daysBetween(start, w.d)), ys = ws.map(w => w.kg);
  const span = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  const res = { ok: false, days: intakes.length, ws: ws.length, span };
  if (intakes.length < 14 || ws.length < 4 || span < 14) return res;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let cov = 0, vx = 0; xs.forEach((x, i) => { cov += (x - mx) * (ys[i] - my); vx += (x - mx) ** 2; });
  const slope = vx ? cov / vx : 0; // kg / jour
  const avg = intakes.reduce((a, b) => a + b, 0) / intakes.length;
  return { ...res, ok: true, slope, avg, tdee: avg - slope * 7700 };
}

// ============================================================
//  ÉVÉNEMENTS
// ============================================================
const ACTIONS = {
  goto: el => { S.ui.tab = el.dataset.tab; save(); render(); window.scrollTo(0, 0); },
  day: el => { S.ui.date = addDays(S.ui.date || todayStr(), +el.dataset.n); save(); render(); },
  today: (el, e) => { if (e) e.preventDefault(); S.ui.date = null; save(); render(); },
  openAdd: el => openAdd(el.dataset.meal),
  closeSheet: () => { closeSheet(); render(); },
  bgClose: (el, e) => { if (e.target === el) { closeSheet(); render(); } },
  pickFood: el => selectFood(el.dataset.id),
  setG: el => { A.g = +el.dataset.g; $('#qg').value = A.g; renderQtyPrev(); },
  backSearch: () => { A.code = null; A.view = 'search'; renderAdd(); },
  offGo: () => offSearch(A.q.trim()),
  scan: () => { A.view = 'scan'; renderAdd(); },
  eanGo: () => lookupBarcode($('#ean').value),
  createFood: () => { A.code = null; A.view = 'create'; renderAdd(); },
  createFromCode: (el, e) => { if (e) e.preventDefault(); A.code = el.dataset.code; A.view = 'create'; renderAdd(); },
  saveCustom: () => {
    const name = $('#cf_name').value.trim();
    const kcal = num($('#cf_kcal').value);
    if (!name || !kcal && kcal !== 0) { toast('Nom et calories obligatoires'); return; }
    const ug = num($('#cf_ug').value);
    const f = { id: A.code ? 'off_' + A.code : 'c_' + uid(), code: A.code || undefined, name, cat: 'Épicerie & divers', src: 'custom', roles: [], diet: '', kcal, p: num($('#cf_p').value), c: num($('#cf_c').value), f: num($('#cf_f').value), fib: num($('#cf_fib').value), unit: ug > 0 ? { g: ug, name: 'portion' } : null };
    S.custom[f.id] = f; save(); if (A.code) toast('Produit ajouté : il sera reconnu au prochain scan'); A.code = null; selectFood(f.id);
  },
  delCustom: el => { delete S.custom[el.dataset.id]; S.recents = S.recents.filter(x => x !== el.dataset.id); save(); A.view = 'search'; renderAdd(); },
  confirmAdd: () => {
    if (!(A.g > 0)) { toast('Indique une quantité'); return; }
    if (A.onPick) { const f = food(A.sel); if (f.id.startsWith('off_') && !S.custom[f.id]) S.custom[f.id] = f; pushRecent(f.id); save(); A.onPick(f, A.g); return; }
    addEntry(A.date, A.meal, food(A.sel), A.g); save();
    const n = food(A.sel).name; closeSheet(); render(); toast(`${n} ajouté`);
  },
  editEntry: el => openEditEntry(el.dataset.id),
  saveEntry: el => {
    const d = S.ui.date || todayStr(); const e = S.journal[d].find(x => x.id === el.dataset.id);
    const g = num($('#eg').value); if (g > 0) e.g = g; e.meal = $('#emeal').value;
    save(); closeSheet(); render();
  },
  delEntry: el => {
    const d = S.ui.date || todayStr(); S.journal[d] = S.journal[d].filter(x => x.id !== el.dataset.id);
    if (!S.journal[d].length) delete S.journal[d];
    save(); closeSheet(); render();
  },
  addPlanMeal: el => {
    const d = S.ui.date || todayStr(); const k = el.dataset.meal;
    S.plan.days[+el.dataset.day].meals.filter(m => m.key === k).forEach(m => m.items.forEach(it => { if (it.g > 0) addEntry(d, k, food(it.id), it.g); }));
    save(); render(); toast('Menu ajouté — ajuste les quantités si besoin');
  },
  toggleDetails: (el, e) => { if (e.target.closest('a,button,input')) return; S.ui.jDetails = !S.ui.jDetails; save(); render(); },
  mealMenu: el => openMealMenu(el.dataset.meal),
  copyMealY: el => {
    const d = S.ui.date || todayStr(); const k = el.dataset.meal;
    const y = (S.journal[addDays(d, -1)] || []).filter(e => e.meal === k);
    if (!S.journal[d]) S.journal[d] = [];
    y.forEach(e => S.journal[d].push({ ...e, id: uid() }));
    save(); closeSheet(); render(); toast('Repas copié');
  },
  clearMeal: async el => {
    const d = S.ui.date || todayStr(); const k = el.dataset.meal;
    if (!(await askConfirm('Vider ce repas ?', { ok: 'Vider', danger: true }))) return;
    S.journal[d] = (S.journal[d] || []).filter(e => e.meal !== k); if (!S.journal[d].length) delete S.journal[d];
    save(); closeSheet(); render();
  },
  menuSettings: () => openSheet(S.plan ? 'Réglages du menu' : 'Créer mon menu', menuSettingsHTML()),
  mpMeals: el => { S.menuPrefs.meals = +el.dataset.v; save(); el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); },
  mDay: el => { S.ui.mDay = +el.dataset.i; save(); render(); },
  pSub: (el, e) => { if (e) e.preventDefault(); S.ui.pSub = el.dataset.v; save(); render(); window.scrollTo(0, 0); },
  copyYesterday: () => {
    const d = S.ui.date || todayStr(); const y = S.journal[addDays(d, -1)];
    if (!y || !y.length) { toast('Rien la veille'); return; }
    // les compléments ne sont pas recopiés : ils se cochent chaque jour
    S.journal[d] = [...(S.journal[d] || []).filter(e => e.meal === 'compl'), ...y.filter(e => e.meal !== 'compl').map(e => ({ ...e, id: uid() }))]; save(); render();
  },
  // Menus
  toggleEx: el => {
    const id = el.dataset.id; const ex = S.menuPrefs.exclude;
    S.menuPrefs.exclude = ex.includes(id) ? ex.filter(x => x !== id) : [...ex, id];
    save(); el.classList.toggle('on'); el.textContent = (S.menuPrefs.exclude.includes(id) ? '✕ ' : '') + food(id).name.replace(/ \(.*\)/, '');
    const s = el.closest('details').querySelector('summary'); s.textContent = `Aliments exclus (${S.menuPrefs.exclude.length}) — touche pour modifier`;
  },
  genPlan: async () => {
    const start = $('#mp_start') && $('#mp_start').value;
    if (S.plan && !(await askConfirm('Remplacer le menu actuel ?', { ok: 'Remplacer' }))) return;
    if (start) S.menuPrefs.start = start;
    if (!S.menuPrefs.start) S.menuPrefs.start = todayStr();
    closeSheet(); S.ui.mDay = null;
    generatePlan();
  },
  rescale: () => rescalePlan(),
  regenMeal: el => {
    const T = targets(); const day = S.plan.days[+el.dataset.day]; const mi = +el.dataset.meal; const m = day.meals[mi];
    const old = m.items.map(i => i.id);
    let items, tries = 0;
    do { items = buildMeal(m.key, mealTarget(T, m.share), {}); tries++; } while (tries < 6 && items.map(i => i.id).join() === old.join());
    m.items = items; solve(m.items, residualTarget(day, mi, T)); afterMealEdit(+el.dataset.day, mi); save(); render();
  },
  swapItem: el => {
    const T = targets(); const day = S.plan.days[+el.dataset.day]; const mi = +el.dataset.meal; const m = day.meals[mi];
    const it = m.items[+el.dataset.item];
    const alts = pool(it.role).filter(f => !m.items.some(x => x.id === f.id));
    if (!alts.length) { toast('Pas d’alternative (vérifie les exclusions)'); return; }
    const nf = pick(alts);
    m.items[+el.dataset.item] = mkItem(nf, it.role);
    solve(m.items, residualTarget(day, mi, T)); afterMealEdit(+el.dataset.day, mi); save(); render(); toast('→ ' + nf.name);
  },
  planToJournal: async el => {
    const di = +el.dataset.day; const d = addDays(S.plan.start, di);
    if ((S.journal[d] || []).length && !(await askConfirm('Ajouter quand même le menu ?', { msg: 'Le journal de ce jour contient déjà des aliments.', ok: 'Ajouter' }))) return;
    S.plan.days[di].meals.forEach(m => m.items.forEach(it => { if (it.g > 0) addEntry(d, m.key, food(it.id), it.g); }));
    save(); toast('Ajouté au journal du ' + fmtDate(d, { day: 'numeric', month: 'short' }));
  },
  // Courses
  shopCheck: el => { if (el.checked) S.shop.checked[el.dataset.id] = 1; else delete S.shop.checked[el.dataset.id]; save(); render(); },
  extraCheck: el => { S.shop.extra[+el.dataset.i].done = el.checked; el.closest('.check').classList.toggle('done', el.checked); save(); },
  extraDel: (el, e) => { e.preventDefault(); S.shop.extra.splice(+el.dataset.i, 1); save(); render(); },
  extraAdd: () => { const v = $('#extraIn').value.trim(); if (!v) return; S.shop.extra.push({ t: v, done: false }); save(); render(); },
  uncheckAll: () => { S.shop.checked = {}; S.shop.extra.forEach(x => x.done = false); save(); render(); },
  shareShop: async () => {
    const t = shopText();
    try { if (navigator.share) { await navigator.share({ title: 'Liste de courses', text: t }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(t); toast('Liste copiée'); } catch (e) { toast('Copie impossible'); }
  },
  // Profil
  pset: el => {
    const k = el.dataset.k, v = el.dataset.v; S.profile[k] = v;
    if (k === 'goal' && RATES[v]) S.profile.rate = v === 'perte' ? 0.5 : 0.25;
    save(); render();
  },
  clearManual: () => { S.profile.useCustom = false; save(); render(); },
  tgMode: el => {
    const p = S.profile;
    if (el.dataset.v === 'custom') {
      if (!p.custom || !(num(p.custom.kcal) > 0)) { const a = targets().auto; p.custom = { kcal: r0(a.kcal), p: r0(a.p), c: r0(a.c), f: r0(a.f), fib: r0(a.fib) }; }
      p.useCustom = true;
    } else p.useCustom = false;
    save(); renderProfilResults();
  },
  tgReset: () => { const a = targets().auto; S.profile.custom = { kcal: r0(a.kcal), p: r0(a.p), c: r0(a.c), f: r0(a.f), fib: r0(a.fib) }; save(); renderProfilResults(); toast('Valeurs du calcul automatique reprises'); },
  tgPreset: el => {
    const C = S.profile.custom;
    for (const m of ['p', 'c', 'f']) C[m] = Math.round(num(el.dataset[m]) / 100 * C.kcal / KF[m]);
    save(); renderProfilResults();
  },
  tgFill: el => {
    const C = S.profile.custom; const m = el.dataset.m;
    const others = ['p', 'c', 'f'].filter(x => x !== m).reduce((a, x) => a + C[x] * KF[x], 0);
    C[m] = Math.max(0, Math.round((C.kcal - others) / KF[m]));
    save(); renderProfilResults();
  },
  tgSync: () => { const C = S.profile.custom; C.kcal = r0(C.p * 4 + C.c * 4 + C.f * 9); save(); renderProfilResults(); },
  addWeight: () => {
    const kg = num($('#wIn').value); if (!(kg > 20 && kg < 400)) { toast('Poids invalide'); return; }
    const d = todayStr(); S.weights = S.weights.filter(w => w.d !== d); S.weights.push({ d, kg });
    S.profile.weight = String(kg); save(); render(); toast('Poids enregistré');
  },
  delWeight: el => { S.weights = S.weights.filter(w => w.d !== el.dataset.d); save(); render(); },
  useTdee: () => { const ad = adaptive(); if (ad.ok) { S.profile.tdeeOverride = Math.round(ad.tdee); save(); render(); toast('Objectifs mis à jour'); } },
  clearTdee: () => { S.profile.tdeeOverride = null; save(); render(); },
  export: () => {
    const blob = new Blob([JSON.stringify(typeof TS !== 'undefined' ? { ...S, _train: TS } : S)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `macro-sauvegarde-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },
  wipe: async () => { if (await askConfirm('Effacer toutes les données nutrition ?', { msg: 'Journal, poids, menus et profil. C’est irréversible.', ok: 'Tout effacer', danger: true })) { localStorage.removeItem(KEY); S = load(); render(); startGuide(); } }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn && (el.tagName !== 'INPUT')) fn(el, e);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('input[type=checkbox][data-act]')) { ACTIONS[el.dataset.act](el, e); return; }
  if (el.id === 'mp_days') { S.menuPrefs.days = +el.value; save(); }
  if (el.id === 'mp_meals') { S.menuPrefs.meals = +el.value; save(); }
  if (el.id === 'mp_diet') { S.menuPrefs.diet = el.value; save(); if ($('#mp_days') && $('#sheetBody')) $('#sheetBody').innerHTML = menuSettingsHTML(); else render(); }
  if (el.id === 'mp_start') { S.menuPrefs.start = el.value; save(); }
  if (el.id === 'importIn' && el.files[0]) {
    const r = new FileReader();
    r.onload = async () => {
      try { const d = JSON.parse(r.result); if (!d.profile || !d.journal) throw 0; if (!(await askConfirm('Remplacer les données actuelles par cette sauvegarde ?', { ok: 'Remplacer', danger: true }))) return; S = migrate(deepMerge(structuredClone(DEFAULT), d)); if (S._train) { if (typeof importTrain === 'function') importTrain(S._train); delete S._train; } save(); render(); toast('Sauvegarde importée'); }
      catch (err) { toast('Fichier invalide'); }
    };
    r.readAsText(el.files[0]);
  }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.p) { S.profile[el.dataset.p] = el.tagName === 'SELECT' ? num(el.value) : el.value; save(); renderProfilResults(); }
  if (el.dataset.tg) tgInput(el);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'extraIn') ACTIONS.extraAdd();
  if (e.key === 'Enter' && e.target.id === 'wIn') ACTIONS.addWeight();
  if (e.key === 'Enter' && e.target.id === 'ean') ACTIONS.eanGo();
  if (e.key === 'Escape' && $('#modal').innerHTML) { closeSheet(); render(); }
});

// ---------- Démarrage ----------
if (S.ui.date && S.ui.date !== todayStr() && !sessionStorage.getItem('macro.keepdate')) S.ui.date = null;
try { sessionStorage.setItem('macro.keepdate', '1'); } catch (e) { }
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
