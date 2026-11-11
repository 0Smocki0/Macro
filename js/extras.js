'use strict';
/* ============================================================
   Extras : recettes, repas favoris, batch cooking, frigo,
   budget, statistiques, photos de progression, alertes douces
   ============================================================ */

// ---------- Données complémentaires ----------
for (const [k, v] of Object.entries({ recipes: {}, favs: [], fridge: {}, prices: {}, alertsOff: {}, settings: { alerts: true } })) if (S[k] == null) S[k] = v;
for (const [k, v] of Object.entries({ batch: 0, batchMeals: 'dej', eco: false })) if (S.menuPrefs[k] == null) S.menuPrefs[k] = v;
if (S.ui.statP == null) { S.ui.statP = 'week'; S.ui.statOff = 0; }

// Sucres et sel (g / 100 g) des aliments de la base, pour les alertes
const BASE_SUG = { sucre: 100, miel: 80, confiture: 55, soda: 10.6, jusorange: 9, chocolat: 28, croissant: 10, muesli: 15, yaourt: 5, lait: 4.8, grec: 4, fb0: 4, fb3: 4, skyr: 4, banane: 17, pomme: 11, orange: 9, kiwi: 9, fraises: 5, myrtilles: 10, fruitsrouges: 5, baguette: 2, paincomplet: 3, paindemie: 5, pizza: 3, saucetomate: 5, cacahuete: 6, avoine: 1, whey: 5, carotte: 5, tomate: 2.6, poivron: 4, oignon: 5, petitspois: 5, cottage: 3, yaourtsoja: 1, soja: 0.5, vin: 0.5 };
const BASE_SALT = { jambon: 2, emmental: 0.7, feta: 2.7, parmesan: 1.6, mozza: 0.5, cottage: 0.9, paincomplet: 1.1, baguette: 1.3, paindemie: 1.1, sardines: 0.8, thon: 0.8, crevettes: 1.5, pizza: 1.3, houmous: 1, saucetomate: 0.6, galettes: 0.3, croissant: 0.9, seitan: 1, poischiches: 0.6, haricotsrouges: 0.6, cacahuete: 0.4, muesli: 0.1, pst: 0.1 };
for (const f of BASE_FOODS) { f.sug = BASE_SUG[f.id] || 0; f.salt = BASE_SALT[f.id] || 0; }

// Prix indicatifs en supermarché (€ par kg, ou par litre), modifiables dans la liste de courses
const PRICES = {
  poulet: 11, dinde: 12, boeuf5: 13, boeuf15: 9, rumsteck: 25, porc: 14, jambon: 15, saumon: 24, cabillaud: 20, thon: 13, crevettes: 20, sardines: 12,
  oeuf: 5, blancoeuf: 6, fb0: 2.5, fb3: 2.8, skyr: 4.5, yaourt: 2.5, grec: 4, cottage: 7, lait: 1, emmental: 10, mozza: 9, feta: 14, parmesan: 20,
  tofu: 9, tempeh: 18, lentilles: 3, poischiches: 2.5, haricotsrouges: 2.5, pst: 9, seitan: 16, yaourtsoja: 3.5, soja: 1.7,
  riz: 2.5, rizcomplet: 3, pates: 1.8, patescompletes: 2.5, quinoa: 7, semoule: 2, boulgour: 3, pdt: 1.5, patatedouce: 3,
  avoine: 2, muesli: 5, paincomplet: 5, baguette: 4, paindemie: 4, galettes: 12, croissant: 9, confiture: 5, miel: 12,
  brocoli: 3.5, haricotsverts: 3.5, courgette: 2.5, carotte: 1.5, tomate: 3, epinards: 3, poivron: 4, champignons: 5, 'chou-fleur': 2.5, petitspois: 3,
  concombre: 2, salade: 4, oignon: 1.8, avocat: 6, banane: 2, pomme: 2.5, orange: 2.5, kiwi: 4, fraises: 8, myrtilles: 15, fruitsrouges: 6,
  huileolive: 9, huilecolza: 3, beurre: 10, amandes: 15, noix: 15, cajou: 15, cacahuete: 8, chia: 12, whey: 25, chocolat: 10, sucre: 1.2,
  saucetomate: 3, houmous: 10, pizza: 7, cafe: 0.3, jusorange: 2, soda: 1.2, biere: 3, vin: 6
};
const priceOf = id => S.prices[id] ?? PRICES[id] ?? null;
const costOf = (id, g) => { const p = priceOf(id); return p == null ? 0 : p * g / 1000; };
const eur = v => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

// ============================================================
//  RECETTES
// ============================================================
function recipeTotals(r) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, sug: 0, salt: 0, g: 0 };
  for (const it of r.items) { const k = it.g / 100; for (const x of ['kcal', 'p', 'c', 'f', 'fib', 'sug', 'salt']) t[x] += (it[x] || 0) * k; t.g += it.g; }
  return t;
}
function recipeFood(id) {
  const r = S.recipes[id]; if (!r || !r.items.length) return undefined;
  const t = recipeTotals(r);
  const W = num(r.cooked) > 0 ? num(r.cooked) : t.g;
  if (!(W > 0)) return undefined;
  const k = 100 / W;
  const portions = Math.max(1, num(r.portions) || 1);
  return { id, name: r.name, cat: 'Mes recettes', src: 'recipe', roles: [], diet: '', kcal: t.kcal * k, p: t.p * k, c: t.c * k, f: t.f * k, fib: t.fib * k, sug: t.sug * k, salt: t.salt * k, unit: { g: Math.round(W / portions), name: 'portion' }, serving: null };
}
const snapItem = (f, g) => ({ fid: f.id, name: f.brand ? `${f.name} (${f.brand})` : f.name, g, kcal: f.kcal, p: f.p, c: f.c, f: f.f, fib: f.fib || 0, sug: f.sug || 0, salt: f.salt || 0 });

let RD = null; // brouillon de recette
function openRecipeEditor(id) {
  const r = id && S.recipes[id];
  RD = r ? structuredClone(r) : { id: 'r_' + uid(), name: '', portions: 4, cooked: '', items: [] };
  RD.isNew = !r;
  openSheet(r ? 'Modifier la recette' : 'Nouvelle recette', '');
  renderRecipeEditor();
}
function renderRecipeEditor() {
  A = null;
  $('#sheetTitle').textContent = RD.isNew ? 'Nouvelle recette' : 'Modifier la recette';
  $('#sheetBody').innerHTML = `<label class="f">Nom de la recette<input type="text" data-rd="name" value="${esc(RD.name)}" placeholder="ex : Lasagnes maison"></label>
    <div class="grid2"><label class="f">Nombre de portions<input type="number" inputmode="numeric" data-rd="portions" value="${esc(RD.portions)}"></label>
    <label class="f">Poids total cuit (g) <span class="muted">facult.</span><input type="number" inputmode="numeric" data-rd="cooked" value="${esc(RD.cooked)}" placeholder="auto"></label></div>
    <p class="small muted" style="margin:-4px 0 10px">Poids cuit = casserole pleine − casserole vide. Il permet de peser ta part exacte ; sinon on utilise le poids des ingrédients.</p>
    <h3 style="margin:6px 0 4px">Ingrédients</h3>
    <div>${RD.items.length ? RD.items.map((it, i) => `<div class="item" style="cursor:default"><div class="grow"><div class="name">${esc(it.name)}</div><div class="meta">${r0(it.kcal * it.g / 100)} kcal</div></div>
      <input type="number" inputmode="decimal" data-ri="${i}" value="${r0(it.g)}" style="width:76px;text-align:right"><span class="small muted">g</span>
      <button class="iconbtn" data-act="rdDel" data-i="${i}" aria-label="Retirer">✕</button></div>`).join('') : '<p class="small muted">Aucun ingrédient pour l’instant.</p>'}</div>
    <button class="btn block" style="margin-top:8px" data-act="rdAddIng">+ Ajouter un ingrédient</button>
    <div class="card" id="rdTot" style="margin-top:12px"></div>
    <div class="row">${RD.isNew ? '' : `<button class="btn danger" data-act="rdRemove">Supprimer</button>`}<button class="btn primary grow" data-act="rdSave">Enregistrer la recette</button></div>`;
  renderRecipeTotals();
}
function renderRecipeTotals() {
  const box = $('#rdTot'); if (!box) return;
  const t = recipeTotals(RD); const n = Math.max(1, num(RD.portions) || 1);
  const W = num(RD.cooked) > 0 ? num(RD.cooked) : t.g;
  const per = x => t[x] / n;
  const pk = per('kcal');
  box.innerHTML = `<div class="row between"><b>Par portion</b><span class="small muted">${r0(W / n)} g · total ${r0(t.kcal)} kcal</span></div>
    <div class="big" style="font-size:26px;margin:4px 0">${r0(pk)} <span class="small muted">kcal</span></div>
    <div class="grid2" style="grid-template-columns:repeat(3,1fr)">
      ${[['p', 'Prot.', 'prot', 4], ['c', 'Gluc.', 'carb', 4], ['f', 'Lip.', 'fat', 9]].map(([m, l, col, k]) => `<div class="stat"><div class="v" style="color:var(--${col})">${fr(r1(per(m)))} g</div><div class="l">${l} · ${r0(per(m) * k)} kcal · ${pk > 0 ? r0(per(m) * k / pk * 100) : 0} %</div></div>`).join('')}
    </div>`;
}

// ============================================================
//  REPAS FAVORIS (+ sections de la feuille d’ajout)
// ============================================================
function addSheetExtras() {
  if (A && A.onPick) return '';
  let h = `<div class="row" style="margin:10px 0 0"><button class="btn sm ghost" data-act="rdNew">🍲 Nouvelle recette</button></div>`;
  if (S.favs.length) h += `<h3 class="muted" style="margin:12px 0 2px">★ Repas favoris</h3><div>${S.favs.map(fv => {
    const t = sum(fv.items.map(entryN));
    return `<div class="item" data-act="addFav" data-id="${fv.id}"><div class="grow"><div class="name">★ ${esc(fv.name)}</div><div class="meta">${fv.items.length} aliment${fv.items.length > 1 ? 's' : ''} · ${r0(t.kcal)} kcal · Prot. ${r0(t.p)} g</div></div>
      <button class="iconbtn" data-act="delFav" data-id="${fv.id}" aria-label="Supprimer ce favori">✕</button></div>`;
  }).join('')}</div>`;
  const recs = Object.keys(S.recipes).map(recipeFood).filter(Boolean);
  if (recs.length) h += `<h3 class="muted" style="margin:12px 0 2px">🍲 Mes recettes</h3><div>${recs.map(f => `<div class="item" data-act="pickFood" data-id="${f.id}"><div class="grow"><div class="name">${esc(f.name)}</div>
    <div class="meta">${r0(f.kcal * f.unit.g / 100)} kcal / portion (${f.unit.g} g) · Prot. ${r0(f.p * f.unit.g / 100)} g</div></div></div>`).join('')}</div>`;
  return h;
}
function qtyExtras(f) {
  return f.src === 'recipe' ? `<button class="btn sm ghost" style="margin-top:12px" data-act="rdEdit" data-id="${esc(f.id)}">✏️ Modifier la recette</button>` : '';
}

// ============================================================
//  MENUS : batch cooking, frigo, budget
// ============================================================
function batchBaseDay(d, key, days) {
  const n = +S.menuPrefs.batch; if (!(n >= 2)) return -1;
  const keys = batchKeys();
  if (!keys.includes(key)) return -1;
  const base = d - d % n;
  return base < d && days[base] ? base : -1;
}
// Ordre de préférence quand on choisit le « panier » d’un menu
function basketOrder(list, role) {
  let L = [...list].sort(() => Math.random() - 0.5);
  if (S.menuPrefs.eco) {
    const metric = f => { const p = priceOf(f.id) ?? 8; return role === 'prot' ? p / Math.max(1, f.p) : p / Math.max(10, f.kcal); };
    L.sort((a, b) => metric(a) - metric(b));
    L = L.slice(0, Math.max(2, Math.ceil(L.length * 0.45))).sort(() => Math.random() - 0.5);
  }
  return L.sort((a, b) => (S.fridge[b.id] != null) - (S.fridge[a.id] != null)); // le frigo d’abord
}
// Après modification d’un repas : propager au batch, ou détacher une copie
function afterMealEdit(di, mi) {
  const T = targets(); const m = S.plan.days[di].meals[mi];
  if (m.batchOf != null) { delete m.batchOf; return; }
  S.plan.days.forEach(day => {
    const c = day.meals[mi];
    if (c && c.batchOf === di) { c.items = m.items.map(x => ({ ...x })); solve(c.items, residualTarget(day, mi, T)); }
  });
}
function batchBadge(di, mi, m) {
  if (m.batchOf != null) return `<div class="badge">♻️ Restes du ${esc(fmtDate(addDays(S.plan.start, m.batchOf), { weekday: 'long', day: 'numeric' }))}</div>`;
  const copies = S.plan.days.filter(d => d.meals[mi] && d.meals[mi].batchOf === di);
  if (!copies.length) return '';
  const agg = {};
  for (const mm of [m, ...copies.map(d => d.meals[mi])]) for (const it of mm.items) if (it.g > 0) agg[it.id] = (agg[it.id] || 0) + it.g;
  return `<details class="badge"><summary>🍳 À cuisiner pour ${copies.length + 1} jours — voir les quantités</summary>
    <div class="small" style="margin-top:6px">${Object.entries(agg).map(([id, g]) => `${r0(g)} ${uLabel(food(id))} ${esc(food(id).name)}`).join(' · ')}</div>
    <div class="small muted" style="margin-top:4px">Cuisine tout en une fois, puis répartis en ${copies.length + 1} boîtes.</div></details>`;
}
function dayCostTxt(day) {
  let c = 0; for (const m of day.meals) for (const it of m.items) c += costOf(it.id, it.g);
  return c > 0 ? ` · ≈ ${eur(c)}` : '';
}
function batchKeys() { const b = S.menuPrefs.batchMeals; return Array.isArray(b) ? b : b === 'both' ? ['dej', 'diner'] : [b || 'dej']; }
function menuExtrasHTML() {
  const P = S.menuPrefs; const keys = batchKeys();
  const fr_ = Object.keys(S.fridge);
  return msec('🍳', 'Batch cooking', 'Cuisine une seule fois et mange la même chose plusieurs jours de suite.', `
      <label class="f">Cuisiner pour<select id="mp_batch">${[[0, 'Non : un repas différent chaque jour'], [2, '2 jours'], [3, '3 jours'], [4, '4 jours']].map(([v, l]) => `<option value="${v}" ${+P.batch === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div id="batchMealsBox" style="${+P.batch ? '' : 'opacity:.45;pointer-events:none'}"><div class="small muted" style="margin:-4px 0 8px">Repas à préparer à l’avance :</div>
      <div class="row wrap" style="gap:8px">${[['pdj', '☕ Petit-déjeuner'], ['dej', '🥗 Déjeuner'], ['diner', '🍲 Dîner']].map(([k, l]) => `<span class="chip ${keys.includes(k) ? 'on' : ''}" data-act="batchToggle" data-k="${k}">${l}</span>`).join('')}</div></div>`)
    + msec('💶', 'Budget', '', `<label class="check" style="border:0;padding:0"><input type="checkbox" id="mp_eco" ${P.eco ? 'checked' : ''}><div class="grow">Privilégier les aliments les moins chers</div></label>`)
    + msec('🧊', 'Mon frigo & placard', 'Ce que tu as déjà passe en priorité dans le menu et est retiré de la liste de courses.', `
      <details><summary class="small" style="color:var(--accent)" id="fridgeSum">Choisir ce que j’ai déjà (${fr_.length})</summary>
      <div id="fridgeSel" style="margin-top:8px">${fridgeSelHTML()}</div>
      <div class="row wrap" style="gap:6px;margin-top:8px">${menuFoods().filter(f => dietOk(f, P.diet)).map(f => `<span class="chip ${S.fridge[f.id] != null ? 'on' : ''}" data-act="toggleFridge" data-id="${f.id}">${esc(f.name.replace(/ \(.*\)/, ''))}</span>`).join('')}</div></details>`);
}

function fridgeSelHTML() {
  const ids = Object.keys(S.fridge); if (!ids.length) return '';
  return ids.map(id => { const f = food(id); if (!f) return ''; return `<div class="item" style="cursor:default;padding:6px 0"><div class="grow small">${esc(f.name)}</div>
    <input type="number" inputmode="numeric" data-fr="${id}" value="${S.fridge[id] || ''}" placeholder="quantité" style="width:96px;text-align:right"><span class="small muted">${uLabel(f)}</span>
    <button class="iconbtn" data-act="toggleFridge" data-id="${id}" aria-label="Retirer">✕</button></div>`; }).join('');
}

// ============================================================
//  COURSES (frigo déduit + budget)
// ============================================================
function shopRows() {
  return shopList().map(x => {
    const have = S.fridge[x.id];
    const need = have > 0 ? Math.max(0, x.g - have) : x.g;
    const atHome = have != null && (!(have > 0) || need === 0);
    return { ...x, have, need, atHome, cost: atHome ? 0 : costOf(x.id, need) };
  });
}
function vCoursesX() {
  let h = title('Courses', 'courses');
  const rows = shopRows();
  const buy = rows.filter(x => !x.atHome), home = rows.filter(x => x.atHome);
  if (!S.plan) h += `<div class="banner">Génère d’abord un menu : la liste se remplit automatiquement. <div style="margin-top:8px"><button class="btn primary sm" data-act="goto" data-tab="menus">Aller aux menus</button></div></div>`;
  else h += `<p class="small muted" style="margin-top:-6px">Pour ${S.plan.days.length} jour${S.plan.days.length > 1 ? 's' : ''} à partir du ${esc(fmtDate(S.plan.start, { day: 'numeric', month: 'long' }))}. Quantités crues, arrondies.</p>`;
  if (buy.length) {
    const done = buy.filter(x => S.shop.checked[x.id]).length;
    const total = buy.reduce((a, x) => a + x.cost, 0), left = buy.filter(x => !S.shop.checked[x.id]).reduce((a, x) => a + x.cost, 0);
    const unknown = buy.filter(x => priceOf(x.id) == null).length;
    h += `<div class="card" style="padding:10px 14px"><div class="row between small"><span>${done === buy.length ? '✅ Tout est dans le panier !' : `${done} / ${buy.length} articles cochés`}</span>
      <span><b>≈ ${eur(total)}</b>${left !== total ? ` <span class="muted">(reste ${eur(left)})</span>` : ''}</span></div>
      <div class="bar" style="margin-top:6px"><i style="width:${done / buy.length * 100}%;background:var(--accent)"></i></div>
      <div class="small muted" style="margin-top:6px">Budget estimé${S.plan ? ` · ≈ ${eur(total / S.plan.days.length)} / jour` : ''}. Touche un prix pour le corriger${unknown ? ` · ${unknown} sans prix` : ''}.</div></div>`;
  }
  const byCat = {};
  for (const x of buy) (byCat[x.f.cat] = byCat[x.f.cat] || []).push(x);
  for (const cat of [...CATS, 'Mes recettes']) {
    const xs = byCat[cat]; if (!xs) continue;
    xs.sort((a, b) => a.f.name.localeCompare(b.f.name, 'fr'));
    h += `<div class="card"><h2>${esc(cat)}</h2>${xs.map(x => { const on = !!S.shop.checked[x.id]; const pr = priceOf(x.id); return `<label class="check ${on ? 'done' : ''}"><input type="checkbox" data-act="shopCheck" data-id="${x.id}" ${on ? 'checked' : ''}>
      <div class="grow">${esc(x.f.name)}${x.have > 0 ? `<div class="small muted">tu en as déjà ${r0(x.have)} ${uLabel(x.f)}</div>` : ''}</div>
      <span class="small muted num" style="text-align:right">${qtyText(x.f, x.need)}<br><button class="pricebtn" data-act="editPrice" data-id="${x.id}">${pr == null ? 'prix ?' : eur(x.cost)}</button></span></label>`; }).join('')}</div>`;
  }
  if (home.length) h += `<div class="card"><h2>🧊 Déjà chez toi</h2><p class="small muted" style="margin-top:-4px">Pris dans ton frigo/placard (onglet Menus).</p>${home.map(x => `<div class="check"><div class="grow">${esc(x.f.name)}</div>
    <span class="small muted num" style="text-align:right">${x.have > 0 ? `assez : ${r0(x.have)} pour ${qtyText(x.f, x.g)}` : `il en faut ${qtyText(x.f, x.g)} — vérifie`}</span></div>`).join('')}</div>`;
  h += `<div class="card"><h2>Autres articles</h2>
    ${S.shop.extra.map((x, i) => `<label class="check ${x.done ? 'done' : ''}"><input type="checkbox" data-act="extraCheck" data-i="${i}" ${x.done ? 'checked' : ''}><div class="grow">${esc(x.t)}</div><button class="iconbtn" data-act="extraDel" data-i="${i}" aria-label="Supprimer">✕</button></label>`).join('')}
    <div class="row" style="margin-top:8px"><input type="text" id="extraIn" class="grow" placeholder="Ajouter (ex : épices, éponges…)"><button class="btn" data-act="extraAdd">Ajouter</button></div></div>`;
  if (buy.length || S.shop.extra.length) h += `<div class="row"><button class="btn grow" data-act="shareShop">Partager / copier</button><button class="btn ghost" data-act="uncheckAll">Tout décocher</button></div>`;
  return h;
}
function shopTextX() {
  const rows = shopRows().filter(x => !x.atHome && !S.shop.checked[x.id]); const byCat = {};
  for (const x of rows) (byCat[x.f.cat] = byCat[x.f.cat] || []).push(x);
  let t = 'Liste de courses\n';
  for (const cat of [...CATS, 'Mes recettes']) if (byCat[cat]) t += `\n${cat}\n` + byCat[cat].map(x => `- ${x.f.name} : ${qtyText(x.f, x.need).replace(/&[a-z]+;/g, '')}`).join('\n') + '\n';
  const ex = S.shop.extra.filter(x => !x.done);
  if (ex.length) t += '\nAutres\n' + ex.map(x => '- ' + x.t).join('\n') + '\n';
  const tot = rows.reduce((a, x) => a + x.cost, 0);
  if (tot > 0) t += `\nBudget estimé : ${eur(tot)}\n`;
  return t;
}
VIEWS.courses = vCoursesX;

// ============================================================
//  ALERTES DOUCES
// ============================================================
function dayStats(list) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, sug: 0, salt: 0 };
  for (const e of list) { const k = e.g / 100; for (const x in t) t[x] += (e[x] || 0) * k; }
  return t;
}
function alertsList(d, list, T) {
  const t = dayStats(list);
  const isToday = d === todayStr(); const hr = new Date().getHours();
  const eod = !isToday || hr >= 20;
  const A_ = [];
  if (t.kcal > T.kcal * 1.1) A_.push(['kcal', '🍽️', `${r0(t.kcal - T.kcal)} kcal au-dessus de ton objectif`]);
  else if (eod && t.kcal > 300 && t.kcal < T.kcal * 0.7) A_.push(['low', '🔋', `Journée légère : il te manque ${r0(T.kcal - t.kcal)} kcal`]);
  if (eod && t.p < T.p * 0.8) A_.push(['prot', '💪', `Il te manque ${r0(T.p - t.p)} g de protéines`]);
  else if (isToday && hr >= 16 && hr < 20 && t.p < T.p * 0.5) A_.push(['prot', '💪', `Encore ${r0(T.p - t.p)} g de protéines à caser ce soir`]);
  if (eod && t.fib < T.fib * 0.6) A_.push(['fib', '🥦', `Il te manque ${r0(T.fib - t.fib)} g de fibres`]);
  if (t.sug > 100) A_.push(['sug', '🍬', `Sucres élevés : ${r0(t.sug)} g (repère < 100 g)`]);
  if (t.salt > 6) A_.push(['salt', '🧂', `Sel élevé : ${fr(r1(t.salt))} g (repère 5–6 g)`]);
  if (eod && t.kcal > 800 && t.f * 9 / t.kcal > 0.42) A_.push(['fat', '🫒', `Journée riche en lipides : ${r0(t.f * 9 / t.kcal * 100)} % des calories`]);
  if (isToday) {
    const low = [1, 2, 3].every(i => { const l = S.journal[addDays(d, -i)]; if (!l || !l.length) return false; const k = sum(l.map(entryN)).kcal; return k > 300 && k < T.bmr; });
    if (low) A_.push(['trend', '📉', '3 jours d’affilée sous ton métabolisme de base']);
  }
  return { t, list: A_.filter(a => !S.alertsOff[d + '|' + a[0]]) };
}
function alertsHTML(d, list, T) {
  if (!S.settings.alerts || !T || !list.length) return '';
  const shown = alertsList(d, list, T).list;
  if (!shown.length) return '';
  const tip = ([k, ic, txt]) => `<div class="tip" data-act="tipOpen" data-k="${k}" role="button"><span>${ic}</span>
    <div class="grow"><div class="tiptitle">${esc(txt)}</div><div class="tipcta">Voir la solution ›</div></div>
    <button class="iconbtn" data-act="alertOff" data-k="${d}|${k}" aria-label="Masquer ce conseil">✕</button></div>`;
  const rest = shown.slice(1);
  return `<div class="tips">${tip(shown[0])}${rest.length ? `<details><summary class="muted">+ ${rest.length} autre${rest.length > 1 ? 's' : ''} conseil${rest.length > 1 ? 's' : ''}</summary>${rest.map(tip).join('')}
    <a href="#" class="small muted" data-act="alertsToggle" style="display:inline-block;margin:4px 0 6px 38px">Ne plus afficher de conseils</a></details>` : ''}</div>`;
}

// ---------- Solutions détaillées ----------
const NO_SUGGEST = ['sucre', 'miel', 'confiture', 'soda', 'chocolat', 'croissant', 'pizza', 'biere', 'vin', 'cafe', 'jusorange', 'beurre', 'boeuf15'];
const UNIT_RX = /œuf|pot|tranche|banane|pomme|orange|kiwi|boîte|galette|dose|steak/;
function capFor(f) {
  const byId = { whey: 60, lentilles: 100, pst: 80, chia: 20, emmental: 60, parmesan: 30, feta: 60, mozza: 125, amandes: 40, noix: 40, cajou: 40, cacahuete: 30, avoine: 100, muesli: 80, oeuf: 240, blancoeuf: 200, galettes: 48, avocat: 150, petitspois: 250 };
  if (byId[f.id]) return byId[f.id];
  return { 'Viandes & poissons': 250, 'Œufs & laitiers': 300, 'Protéines végétales': 250, 'Féculents & céréales': 150, 'Pain & petit-déj': 150, 'Légumes': 400, 'Fruits': 300, 'Matières grasses & oléagineux': 30 }[f.cat] || 150;
}
function portionFor(f, need) {
  let g = need;
  const cap = capFor(f);
  if (f.unit && UNIT_RX.test(f.unit.name)) {
    const u = f.unit.g;
    g = clamp(Math.ceil(g / u - 0.15) * u, u, Math.max(u, Math.floor(cap / u) * u));
  } else g = clamp(Math.round(g / (g < 60 ? 5 : 10)) * (g < 60 ? 5 : 10), 10, cap);
  return g;
}
// Aliments qui comblent le mieux un manque (protéines ou fibres) pour le moins de calories
function fillOptions(n, gap, remKcal) {
  const P = S.menuPrefs;
  const cands = BASE_FOODS.filter(f => f[n] > 0 && dietOk(f, P.diet) && !P.exclude.includes(f.id) && !NO_SUGGEST.includes(f.id) && f.cat !== 'Boissons');
  const dens = f => f[n] / Math.max(f.kcal, 15);
  return cands.sort((a, b) => dens(b) - dens(a)).slice(0, 14).map(f => {
    const g = portionFor(f, gap / f[n] * 100);
    const got = f[n] * g / 100, kc = f.kcal * g / 100;
    return { f, g, got, kc, cover: Math.min(1, got / gap), over: remKcal != null && kc > Math.max(0, remKcal) + 30 };
  }).sort((a, b) => (b.cover >= 0.8) - (a.cover >= 0.8) || a.kc - b.kc).slice(0, 5);
}
function unitNote(f, g) {
  if (!f.unit || !UNIT_RX.test(f.unit.name)) return '';
  const n = Math.round(g / f.unit.g * 2) / 2;
  return ` (≈ ${fr(n)} ${esc(f.unit.name)}${n >= 2 && !/[sx]$/.test(f.unit.name) ? 's' : ''})`;
}
let TIPX = null; // options affichées dans la feuille de solution
function optRow(o, i, n) {
  const lab = n === 'p' ? 'prot.' : 'fibres';
  return `<div class="sol"><div class="grow"><div class="solname">${esc(o.f.name)}</div>
    <div class="solmeta"><b>${r0(o.g)} ${uLabel(o.f)}</b>${unitNote(o.f, o.g)} · +${fr(r1(o.got))} g ${lab} · ${r0(o.kc)} kcal${o.cover < 0.8 ? ` · couvre ${r0(o.cover * 100)} %` : ''}${o.over ? ' · <span class="over">dépasse tes kcal</span>' : ''}</div></div>
    <button class="btn sm primary" data-act="tipAdd" data-i="${i}">Ajouter</button></div>`;
}
function contributors(list, n, unit, k = 1) {
  const rows = list.map(e => ({ e, v: (e[n] || 0) * e.g / 100 * k })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
  if (!rows.length) return '<p class="muted">Aucune donnée pour ce nutriment sur tes aliments du jour.</p>';
  const tot = rows.reduce((a, x) => a + x.v, 0);
  return rows.map(x => `<div class="item" data-act="editEntry" data-id="${x.e.id}"><div class="grow"><div class="name">${esc(x.e.name)}</div><div class="meta">${r0(x.e.g)} ${x.e.u || 'g'} · touche pour réduire la quantité</div></div>
    <span class="kcal">${unit === 'kcal' ? r0(x.v) : fr(r1(x.v))} ${unit}</span></div>`).join('');
}
function comboOptions(rem) {
  // gros manque : un repas + une collation ; sinon un repas ou une collation
  const keys = rem.kcal > 900 ? [['diner', 0.7], ['snack', 0.3]] : rem.kcal > 550 ? [['diner', 1]] : [['snack', 1]];
  const out = []; const seen = new Set();
  for (let i = 0; i < 24 && out.length < 3; i++) {
    let items = [];
    for (const [key, sh] of keys) items.push(...buildMeal(key, { kcal: rem.kcal * sh, p: rem.p * sh, c: rem.c * sh, f: rem.f * sh }, {}).filter(it => !items.some(x => x.id === it.id)));
    if (keys.length > 1) solve(items, rem);
    items = items.filter(it => it.g > 0);
    const sig = items.map(x => x.id).sort().join();
    if (!items.length || seen.has(sig)) continue;
    seen.add(sig);
    const t = sum(items.map(it => nutr(food(it.id), it.g)));
    out.push({ items, t, err: Math.abs(t.kcal - rem.kcal) + Math.abs(t.p - rem.p) * 4 });
  }
  return out.sort((a, b) => a.err - b.err);
}
function comboCard(c, i) {
  return `<div class="card combo"><div class="row between"><b>Option ${i + 1}</b><span class="muted small">${r0(c.t.kcal)} kcal · P ${r0(c.t.p)} · G ${r0(c.t.c)} · L ${r0(c.t.f)}</span></div>
    ${c.items.map(it => { const f = food(it.id); return `<div class="solmeta" style="margin-top:6px"><b>${r0(it.g)} ${uLabel(f)}</b> ${esc(f.name)}${unitNote(f, it.g)}</div>`; }).join('')}
    <button class="btn primary block" style="margin-top:12px" data-act="tipAddCombo" data-i="${i}">Ajouter ces aliments</button></div>`;
}
function openTip(k) {
  const d = S.ui.date || todayStr(); const list = S.journal[d] || []; const T = targets(); if (!T) return;
  const t = dayStats(list);
  const rem = { kcal: T.kcal - t.kcal, p: Math.max(0, T.p - t.p), c: Math.max(0, T.c - t.c), f: Math.max(0, T.f - t.f) };
  const w = num(S.profile.weight) || 70;
  const meal = d === todayStr() ? defaultMeal() : 'snack';
  const mealName = MEALS.find(m => m[0] === meal)[1].toLowerCase();
  TIPX = { d, meal, opts: [], combos: [] };
  let title = 'Conseil', h = '';
  const remLine = `<div class="solhead">Il te reste <b>${r0(Math.max(0, rem.kcal))} kcal</b> pour aujourd’hui · ajout dans : ${esc(mealName)}</div>`;
  if (k === 'prot') {
    title = 'Compléter tes protéines';
    TIPX.opts = fillOptions('p', rem.p, rem.kcal); TIPX.n = 'p';
    h = `<p class="lead">Il te manque <b>${r0(rem.p)} g de protéines</b>. Une seule de ces portions suffit :</p>${remLine}${TIPX.opts.map((o, i) => optRow(o, i, 'p')).join('')}
      <p class="small muted">Classées de la moins calorique à la plus calorique. Les poids des viandes et poissons sont crus.</p>`;
  } else if (k === 'fib') {
    title = 'Compléter tes fibres';
    TIPX.opts = fillOptions('fib', T.fib - t.fib, rem.kcal); TIPX.n = 'fib';
    h = `<p class="lead">Il te manque <b>${r0(T.fib - t.fib)} g de fibres</b>. Choisis une de ces portions (ou combine-en deux) :</p>${remLine}${TIPX.opts.map((o, i) => optRow(o, i, 'fib')).join('')}
      <p class="small muted">Augmente les fibres progressivement et bois davantage d’eau.</p>`;
  } else if (k === 'low' || k === 'trend') {
    title = k === 'low' ? 'Compléter ta journée' : 'Remonter tes apports';
    const r2 = k === 'low' ? rem : { kcal: Math.max(250, T.bmr - t.kcal), p: Math.max(15, rem.p), c: Math.max(20, rem.c), f: Math.max(8, rem.f) };
    TIPX.combos = comboOptions(r2);
    h = `<p class="lead">${k === 'low' ? `Il te manque <b>${r0(rem.kcal)} kcal</b> (P ${r0(rem.p)} · G ${r0(rem.c)} · L ${r0(rem.f)} g). Voici ${TIPX.combos.length} façons de compléter, calculées sur ce qu’il te reste :` : `Tu es sous ton métabolisme de base (${r0(T.bmr)} kcal) depuis 3 jours. Un déficit trop fort fait perdre du muscle et augmente les fringales. Voici de quoi remonter aujourd’hui :`}</p>
      ${TIPX.combos.map(comboCard).join('')}
      <p class="small muted">Si tu as simplement oublié de noter un repas, ajoute-le plutôt dans le journal.</p>`;
  } else if (k === 'kcal') {
    const x = t.kcal - T.kcal;
    const perMin = 4.3 * 3.5 * w / 200; // marche rapide ≈ 4,3 MET
    title = 'Calories au-dessus';
    h = `<p class="lead">Tu es à <b>+${r0(x)} kcal</b>. Une journée ne change rien sur la durée : c’est la moyenne qui compte. 3 façons de rééquilibrer :</p>
      <div class="solbox"><b>📅 Lisser sur 3 jours</b><br>Vise <b>${r0(T.kcal - x / 3)} kcal</b> par jour les 3 prochains jours (−${r0(x / 3)} kcal/jour).</div>
      <div class="solbox"><b>🚶 Bouger un peu plus</b><br>≈ <b>${r0(x / perMin)} minutes</b> de marche rapide compensent cet écart.</div>
      <div class="solbox"><b>🔎 Ce qui pèse le plus aujourd’hui</b></div>${contributors(list, 'kcal', 'kcal')}`;
  } else if (k === 'salt' || k === 'sug' || k === 'fat') {
    const cfg = {
      salt: ['Réduire le sel', 'salt', 'g de sel', 1, `Tu es à <b>${fr(r1(t.salt))} g</b> de sel, il faudrait retirer <b>${fr(r1(t.salt - 5))} g</b> pour revenir à 5 g.`,
        ['Charcuterie → blanc de poulet, œufs ou thon au naturel', 'Fromage → 30 g suffisent, ou fromage blanc / skyr', 'Pain : une tranche en moins ≈ −0,4 g de sel', 'Plats préparés, sauces, soupes en brique : ce sont les plus salés', 'Cuisine : sale en fin de cuisson, pense aux herbes, épices et citron']],
      sug: ['Réduire les sucres', 'sug', 'g de sucres', 1, `Tu es à <b>${r0(t.sug)} g</b> de sucres, soit <b>${r0(t.sug - 100)} g</b> au-dessus du repère.`,
        ['Boissons sucrées et jus → eau pétillante, thé, café, eau aromatisée maison', 'Yaourts aromatisés → nature + fruits frais', 'Céréales sucrées → flocons d’avoine + fruits', 'Biscuits, viennoiseries → fruit + poignée d’amandes', 'Les fruits comptent ici, mais garde 2 portions/jour : fibres et vitamines']],
      fat: ['Équilibrer les lipides', 'f', 'g de lipides', 1, `Les lipides font <b>${r0(t.f * 9 / t.kcal * 100)} %</b> de tes calories (repère ≤ 35–40 %).`,
        ['Huile : mesure à la cuillère (1 c. à soupe = 10 g = 90 kcal)', 'Bœuf haché 15 % → 5 % : −10 g de lipides par steak', 'Fromage, oléagineux, beurre de cacahuète : en petite quantité', 'Pour la suite de la journée, privilégie protéines maigres + féculents']]
    }[k];
    title = cfg[0];
    h = `<p class="lead">${cfg[4]}</p><div class="solbox"><b>🔎 Ce qui en apporte le plus aujourd’hui</b></div>${contributors(list, cfg[1], cfg[2].split(' ').slice(1).join(' ') === 'de sel' ? 'g' : 'g')}
      <div class="solbox"><b>🔁 Remplacements simples</b><ul>${cfg[5].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    if (k === 'fat' && rem.p > 10) {
      TIPX.opts = fillOptions('p', rem.p, rem.kcal).filter(o => o.f.f * 9 / o.f.kcal < 0.25); TIPX.n = 'p';
      if (TIPX.opts.length) h += `<div class="solbox"><b>💪 Protéines maigres pour finir la journée</b></div>${remLine}${TIPX.opts.map((o, i) => optRow(o, i, 'p')).join('')}`;
    }
  }
  h += `<button class="btn ghost block" style="margin-top:8px" data-act="alertOff" data-k="${d}|${k}">Masquer ce conseil pour aujourd’hui</button>`;
  openSheet(title, h);
}

// ============================================================
//  PROGRÈS : statistiques + photos
// ============================================================
function periodRange() {
  const t = new Date(todayStr() + 'T12:00:00'); const off = S.ui.statOff || 0;
  if (S.ui.statP === 'month') {
    const s = new Date(t.getFullYear(), t.getMonth() + off, 1, 12), e = new Date(s.getFullYear(), s.getMonth() + 1, 0, 12);
    return [dstr(s), dstr(e)];
  }
  const s = addDays(todayStr(), -((t.getDay() + 6) % 7) + 7 * off);
  return [s, addDays(s, 6)];
}
function dayTotals(d) { const l = S.journal[d]; return l && l.length ? sum(l.map(entryN)) : null; }
function streak() {
  let d = todayStr(); if (!dayTotals(d)) d = addDays(d, -1);
  let n = 0; while (dayTotals(d) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}
function vProgres() {
  const T = targets();
  let h = title('Progrès', 'progres');
  h += `<div class="seg" style="margin-bottom:10px">${[['week', 'Semaine'], ['month', 'Mois']].map(([k, l]) => `<button data-act="statP" data-v="${k}" class="${S.ui.statP === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const [s, e] = periodRange(); const today = todayStr();
  const label = S.ui.statP === 'month' ? fmtDate(s, { month: 'long', year: 'numeric' }) : `du ${fmtDate(s, { day: 'numeric', month: 'short' })} au ${fmtDate(e, { day: 'numeric', month: 'short' })}`;
  h += `<div class="row between datenav" style="margin-bottom:12px"><button class="iconbtn" data-act="statNav" data-n="-1" aria-label="Période précédente">‹</button>
    <b style="${S.ui.statP === 'month' ? 'text-transform:capitalize' : ''}">${esc(S.ui.statP === 'month' ? label : 'Semaine ' + label)}</b><button class="iconbtn" data-act="statNav" data-n="1" aria-label="Période suivante" ${S.ui.statOff >= 0 ? 'disabled style="opacity:.3"' : ''}>›</button></div>`;
  const all = []; for (let d = s; d <= e; d = addDays(d, 1)) all.push(d);
  // la journée en cours n’est pas finie : on la garde dans le graphique mais pas dans les moyennes
  let past = all.filter(d => d < today);
  if (!past.length) past = all.filter(d => d <= today);
  const logged = past.map(d => [d, dayTotals(d)]).filter(x => x[1] && x[1].kcal > 300);
  const avg = sum(logged.map(x => x[1])); const n = logged.length;
  for (const k in avg) avg[k] = n ? avg[k] / n : 0;
  const inT = T ? logged.filter(([, t]) => Math.abs(t.kcal - T.kcal) <= T.kcal * 0.1).length : 0;
  const protOk = T ? logged.filter(([, t]) => t.p >= T.p * 0.9).length : 0;
  h += `<div class="grid2" style="margin-bottom:12px">
    <div class="stat"><div class="v">${n} / ${past.length}</div><div class="l">jours notés${past.length && past[past.length - 1] < today && all.includes(today) ? ' (hors aujourd’hui)' : ''}</div></div>
    <div class="stat"><div class="v">${n ? r0(avg.kcal) : '—'}</div><div class="l">kcal / jour en moyenne${T && n ? ` (${avg.kcal >= T.kcal ? '+' : ''}${r0(avg.kcal - T.kcal)})` : ''}</div></div>
    <div class="stat"><div class="v">${n ? r0(inT / n * 100) + ' %' : '—'}</div><div class="l">jours dans l’objectif (±10 %)</div></div>
    <div class="stat"><div class="v">🔥 ${streak()}</div><div class="l">jours notés d’affilée</div></div></div>`;
  if (!n) h += `<div class="banner small">Pas encore de données sur cette période. Note tes repas dans le Journal : les statistiques se construisent toutes seules.</div>`;
  else {
    h += `<div class="card"><h2>Calories par jour</h2>${kcalChart(all, T)}
      <div class="row small muted" style="gap:12px;margin-top:6px"><span class="row" style="gap:4px"><span class="dot" style="background:var(--accent)"></span>dans l’objectif</span><span class="row" style="gap:4px"><span class="dot" style="background:var(--warn)"></span>au-dessus</span><span class="row" style="gap:4px"><span class="dot" style="background:var(--muted)"></span>en dessous</span></div></div>`;
    h += `<div class="card"><h2>Macros en moyenne</h2>
      <div class="stackbar">${MACROS.map(([m, , col]) => `<i style="width:${avg.kcal ? avg[m] * KF[m] / (avg.p * 4 + avg.c * 4 + avg.f * 9) * 100 : 0}%;background:${col}"></i>`).join('')}</div>
      <div class="mtable" style="margin-top:10px"><div class="mrow mhead"><span></span><span>g / jour</span><span>% kcal</span><span>objectif</span></div>
      ${MACROS.map(([m, l, col]) => `<div class="mrow"><span class="row" style="gap:6px;flex-direction:row"><span class="dot" style="background:${col}"></span><b>${l}</b></span>
        <span class="mval">${r0(avg[m])}</span><span class="mval">${avg.kcal ? r0(avg[m] * KF[m] / avg.kcal * 100) : 0}</span><span class="mval ${T && avg[m] < T[m] * 0.85 ? 'over' : ''}">${T ? r0(T[m]) : '—'}</span></div>`).join('')}</div>
      <p class="small muted" style="margin:8px 0 0">Protéines atteintes (≥ 90 %) : ${protOk} jour${protOk > 1 ? 's' : ''} sur ${n} · fibres : ${r0(avg.fib)} g/jour${T ? ` (obj. ${r0(T.fib)})` : ''}</p></div>`;
  }
  // Poids sur la période
  const ws = S.weights.filter(w => w.d >= s && w.d <= e).sort((a, b) => a.d.localeCompare(b.d));
  if (ws.length >= 2) {
    const dk = ws[ws.length - 1].kg - ws[0].kg;
    h += `<div class="card"><h2>Poids</h2><div class="small" style="margin-bottom:4px">${dk <= 0 ? '−' : '+'}${fr(r1(Math.abs(dk)))} kg sur la période (${fr(ws[0].kg)} → ${fr(ws[ws.length - 1].kg)} kg)</div>${weightChart(ws)}</div>`;
  }
  // Photos
  h += `<div class="card"><div class="row between"><h2 style="margin:0">📸 Photos de progression</h2></div>
    <p class="small muted" style="margin:4px 0 10px">Prends-les dans les mêmes conditions (lumière, tenue, pose, heure). Elles restent uniquement sur ce téléphone.</p>
    <div class="row wrap"><label class="btn primary sm">＋ Ajouter une photo<input type="file" id="photoIn" accept="image/*" hidden></label>
    <button class="btn sm ${CMP ? 'primary' : ''}" data-act="cmpToggle">${CMP ? 'Choisis 2 photos… (annuler)' : '⇆ Comparer'}</button></div>
    <div id="photos" class="pgrid" style="margin-top:12px"></div></div>`;
  return h;
}
function kcalChart(days, T) {
  const W = 320, H = 130, pad = 18;
  const vals = days.map(d => dayTotals(d)?.kcal || 0);
  const max = Math.max(T ? T.kcal * 1.3 : 0, ...vals, 1);
  const bw = (W - 4) / days.length;
  const Y = v => H - pad - v / max * (H - pad - 6);
  const wk = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const bars = days.map((d, i) => {
    const v = vals[i]; const x = 2 + i * bw;
    const col = !T ? 'var(--accent)' : Math.abs(v - T.kcal) <= T.kcal * 0.1 ? 'var(--accent)' : v > T.kcal ? 'var(--warn)' : 'var(--muted)';
    const lab = S.ui.statP === 'week' ? wk[i] : ((i + 1) % 5 === 0 || i === 0 ? String(i + 1) : '');
    return `${v ? `<rect x="${(x + bw * 0.15).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${(H - pad - Y(v)).toFixed(1)}" rx="2" fill="${col}" opacity="${d === todayStr() ? .55 : .9}"><title>${fmtDate(d, { day: 'numeric', month: 'short' })} : ${r0(v)} kcal</title></rect>` : ''}
      <text x="${(x + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="var(--muted)">${lab}</text>`;
  }).join('');
  const tl = T ? `<line x1="0" x2="${W}" y1="${Y(T.kcal).toFixed(1)}" y2="${Y(T.kcal).toFixed(1)}" stroke="var(--text)" stroke-dasharray="4 3" opacity=".5"/><text x="${W - 2}" y="${(Y(T.kcal) - 3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--muted)">objectif ${r0(T.kcal)}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Calories par jour">${bars}${tl}</svg>`;
}

// ----- Photos (IndexedDB) -----
const PDB = {
  _db: null,
  open() { return this._db || (this._db = new Promise((res, rej) => { const r = indexedDB.open('macro-photos', 2); r.onupgradeneeded = () => { const db = r.result; for (const st of ['photos', 'exmedia']) if (!db.objectStoreNames.contains(st)) db.createObjectStore(st, { keyPath: 'id' }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async run(mode, fn, store = 'photos') { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction(store, mode); const rq = fn(t.objectStore(store)); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }); },
  all() { return this.run('readonly', s => s.getAll()); },
  put(o) { return this.run('readwrite', s => s.put(o)); },
  del(id) { return this.run('readwrite', s => s.delete(id)); },
  mget(id) { return this.run('readonly', s => s.get(id), 'exmedia'); },
  mput(o) { return this.run('readwrite', s => s.put(o), 'exmedia'); },
  mdel(id) { return this.run('readwrite', s => s.delete(id), 'exmedia'); }
};
let PHOTOS = []; const PURL = {}; let CMP = null;
const purl = p => PURL[p.id] || (PURL[p.id] = URL.createObjectURL(p.blob));
async function renderPhotos() {
  const box = $('#photos'); if (!box) return;
  try { PHOTOS = (await PDB.all()).sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id)); }
  catch (e) { box.innerHTML = '<p class="small muted">Photos indisponibles dans ce navigateur (mode privé ?).</p>'; return; }
  if (!$('#photos')) return;
  box.innerHTML = PHOTOS.length ? PHOTOS.map(p => `<button class="pthumb ${CMP && CMP.includes(p.id) ? 'sel' : ''}" data-act="photoOpen" data-id="${p.id}"><img src="${purl(p)}" alt="Photo du ${esc(p.d)}" loading="lazy"><span>${esc(fmtDate(p.d, { day: 'numeric', month: 'short' }))}</span></button>`).join('')
    : '<p class="small muted" style="grid-column:1/-1">Aucune photo pour l’instant.</p>';
}
async function compressImage(file) {
  let src;
  try { src = await createImageBitmap(file); }
  catch (e) { src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const k = Math.min(1, 1280 / Math.max(src.width, src.height));
  const c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.82));
}
function weightNear(d) {
  let best = null;
  for (const w of S.weights) { const dd = Math.abs(daysBetween(w.d, d)); if (dd <= 3 && (!best || dd < best.dd)) best = { ...w, dd }; }
  return best;
}
function openPhoto(id) {
  const p = PHOTOS.find(x => x.id === id); if (!p) return;
  const w = weightNear(p.d);
  openSheet(fmtDate(p.d, { day: 'numeric', month: 'long', year: 'numeric' }), `<img src="${purl(p)}" alt="" style="width:100%;border-radius:12px;display:block">
    <div class="row between" style="margin-top:10px"><label class="f" style="margin:0">Date<input type="date" data-pdate="${p.id}" value="${p.d}"></label>${w ? `<span class="small muted">Poids : ${fr(w.kg)} kg</span>` : ''}</div>
    <button class="btn danger block" style="margin-top:12px" data-act="photoDel" data-id="${p.id}">Supprimer la photo</button>`);
}
function openCompare(a, b) {
  const [p1, p2] = [PHOTOS.find(x => x.id === a), PHOTOS.find(x => x.id === b)].sort((x, y) => x.d.localeCompare(y.d));
  const w1 = weightNear(p1.d), w2 = weightNear(p2.d);
  const days = daysBetween(p1.d, p2.d);
  const col = (p, w) => `<div><img src="${purl(p)}" alt="" style="width:100%;border-radius:10px;display:block"><div class="small" style="margin-top:4px"><b>${esc(fmtDate(p.d, { day: 'numeric', month: 'short', year: '2-digit' }))}</b>${w ? ` · ${fr(w.kg)} kg` : ''}</div></div>`;
  openSheet('Avant / après', `<div class="grid2">${col(p1, w1)}${col(p2, w2)}</div>
    <p class="small muted">${days} jour${days > 1 ? 's' : ''} d’écart (${fr(r1(days / 7))} semaines)${w1 && w2 ? ` · ${w2.kg - w1.kg <= 0 ? '−' : '+'}${fr(r1(Math.abs(w2.kg - w1.kg)))} kg` : ''}.</p>`);
}

// ============================================================
//  ACTIONS & ÉVÉNEMENTS
// ============================================================
Object.assign(ACTIONS, {
  // Recettes
  rdNew: () => openRecipeEditor(null),
  rdEdit: el => openRecipeEditor(el.dataset.id),
  rdDel: el => { RD.items.splice(+el.dataset.i, 1); renderRecipeEditor(); },
  rdAddIng: () => {
    A = { date: todayStr(), meal: 'dej', q: '', view: 'search', off: null, offErr: '', sel: null, g: 100, title: 'Ingrédient', onPick: (f, g) => { RD.items.push(snapItem(f, g)); renderRecipeEditor(); } };
    renderAdd();
  },
  backRecipe: () => renderRecipeEditor(),
  rdSave: () => {
    if (!RD.name.trim()) { toast('Donne un nom à ta recette'); return; }
    if (!RD.items.length) { toast('Ajoute au moins un ingrédient'); return; }
    const { isNew, ...r } = RD; S.recipes[r.id] = r; save();
    closeSheet(); render(); toast(`Recette « ${r.name} » enregistrée`);
  },
  rdRemove: async () => {
    if (!(await askConfirm(`Supprimer la recette « ${RD.name} » ?`, { ok: 'Supprimer', danger: true }))) return;
    delete S.recipes[RD.id]; S.recents = S.recents.filter(x => x !== RD.id); save(); closeSheet(); render();
  },
  // Favoris
  saveFav: async el => {
    const d = S.ui.date || todayStr(); const k = el.dataset.meal;
    const items = (S.journal[d] || []).filter(e => e.meal === k);
    const name = await askText('Nom de ce repas favori', MEALS.find(m => m[0] === k)[1] + ' habituel', { ok: 'Enregistrer' });
    if (!name) return;
    S.favs.unshift({ id: uid(), name: name.trim(), items: items.map(({ id, meal, ...rest }) => rest) });
    save(); closeSheet(); render(); toast('★ Repas enregistré dans tes favoris');
  },
  addFav: el => {
    const fv = S.favs.find(x => x.id === el.dataset.id); if (!fv || !A) return;
    const d = A.date, meal = A.meal;
    if (!S.journal[d]) S.journal[d] = [];
    for (const it of fv.items) S.journal[d].push({ ...it, id: uid(), meal });
    save(); closeSheet(); render(); toast(`★ ${fv.name} ajouté`);
  },
  delFav: async (el, e) => {
    e.stopPropagation();
    const fv = S.favs.find(x => x.id === el.dataset.id);
    if (fv && await askConfirm(`Supprimer le favori « ${fv.name} » ?`, { ok: 'Supprimer', danger: true })) { S.favs = S.favs.filter(x => x !== fv); save(); renderAddResults(); }
  },
  // Menus
  batchToggle: el => {
    const k = el.dataset.k; let keys = batchKeys();
    keys = keys.includes(k) ? keys.filter(x => x !== k) : [...keys, k];
    if (!keys.length) { toast('Garde au moins un repas'); return; }
    S.menuPrefs.batchMeals = keys; save(); el.classList.toggle('on', keys.includes(k));
  },
  toggleFridge: el => {
    const id = el.dataset.id;
    if (S.fridge[id] != null) delete S.fridge[id]; else S.fridge[id] = 0;
    save();
    document.querySelectorAll(`[data-act=toggleFridge][data-id="${id}"].chip`).forEach(c => c.classList.toggle('on', S.fridge[id] != null));
    const sel = $('#fridgeSel'); if (sel) sel.innerHTML = fridgeSelHTML();
    const s = $('#fridgeSum'); if (s) s.textContent = `🧊 Mon frigo & placard (${Object.keys(S.fridge).length}) — utilisé en priorité`;
  },
  // Courses
  editPrice: async (el, e) => {
    e.preventDefault();
    const f = food(el.dataset.id); const cur = priceOf(el.dataset.id);
    const v = await askText(`Prix de « ${f.name} »`, cur == null ? '' : String(cur).replace('.', ','), { msg: `En € par ${isLiquid(f) ? 'litre' : 'kilo'}. Laisse vide pour revenir au prix moyen.` });
    if (v === null) return;
    if (v.trim() === '') delete S.prices[el.dataset.id]; else S.prices[el.dataset.id] = num(v);
    save(); render();
  },
  shareShop: async () => {
    const t = shopTextX();
    try { if (navigator.share) { await navigator.share({ title: 'Liste de courses', text: t }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(t); toast('Liste copiée'); } catch (e) { toast('Copie impossible'); }
  },
  // Alertes
  alertOff: el => { S.alertsOff[el.dataset.k] = 1; save(); closeSheet(); render(); },
  tipOpen: el => openTip(el.dataset.k),
  tipAdd: el => {
    const o = TIPX && TIPX.opts[+el.dataset.i]; if (!o) return;
    addEntry(TIPX.d, TIPX.meal, o.f, o.g); save(); closeSheet(); render();
    toast(`${r0(o.g)} ${uLabel(o.f)} de ${o.f.name} ajouté`);
  },
  tipAddCombo: el => {
    const c = TIPX && TIPX.combos[+el.dataset.i]; if (!c) return;
    for (const it of c.items) addEntry(TIPX.d, TIPX.meal, food(it.id), it.g);
    save(); closeSheet(); render(); toast(`${c.items.length} aliments ajoutés (${r0(c.t.kcal)} kcal)`);
  },
  alertsToggle: (el, e) => { if (e) e.preventDefault(); S.settings.alerts = !S.settings.alerts; save(); render(); toast(S.settings.alerts ? 'Conseils réactivés' : 'Conseils désactivés (réactivables dans Besoins)'); },
  // Progrès
  statP: el => { S.ui.statP = el.dataset.v; S.ui.statOff = 0; save(); render(); },
  statNav: el => { S.ui.statOff = Math.min(0, (S.ui.statOff || 0) + +el.dataset.n); save(); render(); },
  cmpToggle: () => { CMP = CMP ? null : []; render(); },
  photoOpen: el => {
    const id = el.dataset.id;
    if (CMP) {
      CMP = CMP.includes(id) ? CMP.filter(x => x !== id) : [...CMP, id];
      if (CMP.length === 2) { const [a, b] = CMP; CMP = null; render(); openCompare(a, b); } else renderPhotos();
      return;
    }
    openPhoto(id);
  },
  photoDel: async el => {
    if (!(await askConfirm('Supprimer définitivement cette photo ?', { ok: 'Supprimer', danger: true }))) return;
    await PDB.del(el.dataset.id); if (PURL[el.dataset.id]) { URL.revokeObjectURL(PURL[el.dataset.id]); delete PURL[el.dataset.id]; }
    closeSheet(); render(); toast('Photo supprimée');
  }
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.rd && RD) { RD[el.dataset.rd] = el.value; renderRecipeTotals(); }
  if (el.dataset.ri != null && RD) { const it = RD.items[+el.dataset.ri]; if (it) { it.g = num(el.value); renderRecipeTotals(); } }
  if (el.dataset.fr) { S.fridge[el.dataset.fr] = num(el.value); save(); }
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.id === 'mp_batch') { S.menuPrefs.batch = +el.value; save(); const b = $('#batchMealsBox'); if (b) b.style.cssText = S.menuPrefs.batch ? '' : 'opacity:.45;pointer-events:none'; }
  if (el.id === 'mp_eco') { S.menuPrefs.eco = el.checked; save(); }
  if (el.dataset.pdate) {
    const p = PHOTOS.find(x => x.id === el.dataset.pdate);
    if (p && el.value) { p.d = el.value; await PDB.put(p); toast('Date modifiée'); }
  }
  if (el.id === 'photoIn' && el.files[0]) {
    try {
      const blob = await compressImage(el.files[0]);
      await PDB.put({ id: uid(), d: todayStr(), blob });
      try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (x) { }
      toast('Photo ajoutée'); renderPhotos();
    } catch (err) { toast('Impossible d’enregistrer la photo'); }
    el.value = '';
  }
});

VIEWS.progres = vProgres;
function afterRender() { if (S.ui.tab === 'progres') renderPhotos(); }
