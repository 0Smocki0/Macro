// ============================================================
//  MENUS : choisir une variante dans une liste (au lieu d’un tirage au hasard)
//  · toucher un aliment → liste des remplaçants, avec la quantité et les kcal qu’ils auraient
//  · ↻ sur un repas → plusieurs repas complets proposés côte à côte
// ============================================================
let VAR = null;
const shape = f => { const k = Math.max(1, f.kcal); return [f.p * 4 / k, f.c * 4 / k, f.f * 9 / k]; };
const shapeDist = (a, b) => { const x = shape(a), y = shape(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
function fullPool(role) { const P = S.menuPrefs; return BASE_FOODS.filter(f => f.roles.includes(role) && dietOk(f, P.diet) && !P.exclude.includes(f.id)); }
function planFoodIds() { const s = new Set(); if (S.plan) for (const d of S.plan.days) for (const m of d.meals) for (const it of m.items) s.add(it.id); return s; }
const mealSum = items => sum(items.map(it => nutr(food(it.id), it.g)));
const varMacroLine = t => `${r0(t.kcal)} kcal · P ${r0(t.p)} · G ${r0(t.c)} · L ${r0(t.f)}`;

// ---------- Remplacer un aliment ----------
function openSwapList(di, mi, ii) {
  const T = targets(); const day = S.plan.days[di]; const m = day.meals[mi]; const it = m.items[ii]; const cur = food(it.id);
  const inPlan = planFoodIds();
  const alts = fullPool(it.role).filter(f => f.id !== it.id && !m.items.some(x => x.id === f.id));
  const tgt = residualTarget(day, mi, T);
  const rows = alts.map(f => {
    const items = m.items.map((x, j) => j === ii ? mkItem(f, it.role) : { ...x });
    solve(items, tgt);
    return { f, g: items[ii].g, tot: mealSum(items), d: shapeDist(f, cur), have: inPlan.has(f.id), eq: !!famOf(f.id) && famOf(f.id) === famOf(it.id) };
  }).sort((a, b) => (b.eq - a.eq) || (b.have - a.have) || a.d - b.d);
  VAR = { di, mi, ii, rows, q: '' };
  const u = f => uLabel(f);
  const cap = (S.menuPrefs.maxG || {})[it.id];
  const step = u(cur) === 'ml' || it.g >= 60 ? 10 : 5;
  openSheet(cur.name, `<div class="qtyedit">
      <div class="row between" style="align-items:baseline"><b>Quantité</b><span class="small muted" id="vqk">${r0(nutr(cur, it.g).kcal)} kcal · P ${r0(nutr(cur, it.g).p)} g</span></div>
      <div class="qtyrow"><button class="qbtn" data-act="vqStep" data-n="-${step}" aria-label="Moins">−</button>
        <label class="qval"><input type="number" inputmode="numeric" id="vq" value="${r0(it.g)}" min="0"><span>${u(cur)}</span></label>
        <button class="qbtn" data-act="vqStep" data-n="${step}" aria-label="Plus">＋</button></div>
      <label class="check" style="border:0;padding:6px 0 0"><input type="checkbox" id="vqcap" ${cap ? 'checked' : ''}><div class="grow small">Ne jamais dépasser cette quantité de ${esc(cur.name.toLowerCase())} dans mes menus${cap ? ` (actuellement ${cap} ${u(cur)})` : ''}</div></label>
      <button class="btn primary block" data-act="vqApply" style="margin-top:8px">Valider la quantité</button>
      <p class="small muted" style="margin:8px 0 0">Les autres aliments du repas s’ajustent pour rester sur ton objectif.</p>
      <button class="btn ghost danger block" data-act="vqDel" style="margin-top:6px">🗑 Retirer du repas</button></div>
    ${rows.length ? `<h3 style="margin:18px 0 6px">Ou le remplacer par</h3>
    ${rows.length > 10 ? '<input type="search" id="varq" placeholder="Rechercher un aliment" autocomplete="off" style="width:100%;margin-bottom:10px">' : ''}
    <div id="varlist">${swapRowsHTML(rows)}</div>` : it.role === 'extra' ? '' : '<p class="small muted" style="margin-top:14px">Pas d’autre aliment de ce type (vérifie tes exclusions).</p>'}`);
}
// plafond de quantité choisi par l’utilisateur (ex. skyr 150 g max), appliqué à toutes les générations
mkItem = (orig => function (f, role) {
  const it = orig(f, role); const cap = (S.menuPrefs.maxG || {})[f.id];
  if (cap > 0) { it.g = Math.min(it.g, cap); if (it.max != null) it.max = Math.min(it.max, cap); if (it.min != null) it.min = Math.min(it.min, cap); }
  return it;
})(mkItem);
function vqUpdate() {
  const v = VAR; if (!v || !$('#vq')) return; const it = S.plan.days[v.di].meals[v.mi].items[v.ii]; const f = food(it.id); const g = Math.max(0, num($('#vq').value));
  const n = nutr(f, g); $('#vqk').textContent = `${r0(n.kcal)} kcal · P ${r0(n.p)} g`;
}
document.addEventListener('input', e => { if (e.target.id === 'vq') vqUpdate(); });
function swapRowsHTML(rows) {
  const q = norm((VAR && VAR.q) || '').trim();
  const L = rows.map((r, i) => [r, i]).filter(([r]) => !q || norm(r.f.name).includes(q));
  return L.map(([r, i]) => `<button class="varrow" data-act="varPickItem" data-i="${i}"><span class="grow"><span class="vn">${esc(r.f.name)}${r.eq ? ' <span class="vtag eq">équivalent</span>' : ''}${r.have ? ' <span class="vtag">déjà dans tes courses</span>' : ''}</span>
      <span class="vm">${r0(r.g)} ${uLabel(r.f)} · ${r0(nutr(r.f, r.g).kcal)} kcal · P ${r0(nutr(r.f, r.g).p)} g</span></span><span class="vgo">›</span></button>`).join('') || '<p class="muted">Aucun aliment ne correspond.</p>';
}
document.addEventListener('input', e => { if (e.target.id === 'varq' && VAR) { VAR.q = e.target.value; const b = $('#varlist'); if (b) b.innerHTML = swapRowsHTML(VAR.rows); } });

// ---------- Changer le repas entier ----------
function openMealVariants(di, mi) {
  const T = targets(); const day = S.plan.days[di]; const m = day.meals[mi]; const tgt = residualTarget(day, mi, T);
  const seen = new Set([m.items.map(i => i.id).sort().join()]); const opts = [];
  for (let t = 0; t < 40 && opts.length < 6; t++) {
    const items = buildMeal(m.key, mealTarget(T, m.share), {}); const k = items.map(i => i.id).sort().join();
    if (seen.has(k)) continue; seen.add(k); solve(items, tgt); opts.push(items);
  }
  if (!opts.length) { toast('Pas d’autre combinaison possible (vérifie les exclusions)'); return; }
  VAR = { di, mi, opts };
  const cur = mealSum(m.items);
  openSheet(`Autre ${(MEALS.find(x => x[0] === m.key) || [, 'repas'])[1].toLowerCase()}`, `<p class="small muted" style="margin:-4px 0 10px">Choisis le repas qui te tente. Actuel : ${varMacroLine(cur)}.</p>
    ${opts.map((items, i) => { const t = mealSum(items); return `<button class="varmeal" data-act="varPickMeal" data-i="${i}">
      <div class="row between"><b>Idée ${i + 1}</b><span class="small muted">${r0(t.kcal)} kcal</span></div>
      ${items.filter(x => x.g > 0).map(x => { const f = food(x.id); return `<div class="vmi"><span>${esc(f.name)}</span><span class="muted">${r0(x.g)} ${uLabel(f)}</span></div>`; }).join('')}
      <div class="small muted" style="margin-top:6px">P ${r0(t.p)} · G ${r0(t.c)} · L ${r0(t.f)}</div></button>`; }).join('')}
    <button class="btn block" data-act="varMore">↻ Proposer d’autres idées</button>`);
}

Object.assign(ACTIONS, {
  swapItem: el => openSwapList(+el.dataset.day, +el.dataset.meal, +el.dataset.item),
  regenMeal: el => openMealVariants(+el.dataset.day, +el.dataset.meal),
  varPickItem: async el => {
    const v = VAR; const r = v.rows[+el.dataset.i]; const T = targets(); const day = S.plan.days[v.di]; const m = day.meals[v.mi];
    const oldId = m.items[v.ii].id; const oldName = food(oldId).name;
    // autres repas du menu qui contiennent le même aliment (et où le remplaçant peut prendre sa place)
    const others = [];
    S.plan.days.forEach((d, di) => d.meals.forEach((mm, mi) => mm.items.forEach((x, ii) => {
      if (x.id === oldId && !(di === v.di && mi === v.mi && ii === v.ii) && r.f.roles.includes(x.role) && !mm.items.some(y => y.id === r.f.id)) others.push([di, mi, ii]);
    })));
    let all = false;
    if (others.length) all = await askDialog({ title: `Remplacer partout ?`, msg: `${oldName} apparaît aussi dans ${others.length} autre${others.length > 1 ? 's' : ''} repas du menu. Le remplacer par ${r.f.name} partout ?`, ok: `Partout (${others.length + 1})`, cancel: 'Seulement ici' });
    const role = m.items[v.ii].role; m.items[v.ii] = mkItem(r.f, role);
    solve(m.items, residualTarget(day, v.mi, T)); afterMealEdit(v.di, v.mi);
    if (all) {
      for (const [di, mi, ii] of others) { const mm = S.plan.days[di].meals[mi]; mm.items[ii] = mkItem(r.f, mm.items[ii].role); }
      // on recalcule les quantités de chaque repas touché, jour par jour
      const touched = [...new Set(others.map(([di, mi]) => di + ':' + mi))].map(k => k.split(':').map(Number));
      for (const [di, mi] of touched) solve(S.plan.days[di].meals[mi].items, residualTarget(S.plan.days[di], mi, T));
    }
    save(); VAR = null; closeSheet(); render(); toast(all ? `${oldName} → ${r.f.name} dans ${others.length + 1} repas` : '→ ' + r.f.name);
  },
  varPickMeal: el => {
    const v = VAR; const T = targets(); const day = S.plan.days[v.di]; const m = day.meals[v.mi];
    m.items = v.opts[+el.dataset.i]; solve(m.items, residualTarget(day, v.mi, T)); afterMealEdit(v.di, v.mi); save(); VAR = null; closeSheet(); render(); toast('Repas changé');
  },
  varMore: () => { const v = VAR; if (v) openMealVariants(v.di, v.mi); },
  vqStep: el => { const i = $('#vq'); if (!i) return; i.value = Math.max(0, num(i.value) + +el.dataset.n); vqUpdate(); if (navigator.vibrate) try { navigator.vibrate(6); } catch (e) { } },
  vqApply: () => {
    const v = VAR; const T = targets(); const day = S.plan.days[v.di]; const m = day.meals[v.mi]; const it = m.items[v.ii]; const f = food(it.id);
    const g = Math.max(0, Math.round(num($('#vq').value))); const capOn = $('#vqcap') && $('#vqcap').checked;
    // quantité choisie : figée dans ce repas, le reste du repas s’adapte
    it.g = g; it.fixed = 1; it.user = 1;
    solve(m.items, residualTarget(day, v.mi, T)); afterMealEdit(v.di, v.mi);
    S.menuPrefs.maxG = S.menuPrefs.maxG || {};
    let n = 0;
    if (capOn) {
      S.menuPrefs.maxG[it.id] = g;
      // applique le plafond aux autres repas du menu qui en avaient plus
      S.plan.days.forEach((d, di) => d.meals.forEach((mm, mi) => {
        let ch = false;
        for (const x of mm.items) if (x.id === it.id && x !== it) { if (x.max != null) x.max = Math.min(x.max, g); if (x.min != null) x.min = Math.min(x.min, g); if (x.g > g) { x.g = g; ch = true; n++; } }
        if (ch) solve(mm.items, residualTarget(d, mi, T));
      }));
    } else delete S.menuPrefs.maxG[it.id];
    save(); VAR = null; closeSheet(); render();
    toast(capOn ? `${f.name} : ${g} ${uLabel(f)} max${n ? ` (${n} autre${n > 1 ? 's' : ''} repas ajusté${n > 1 ? 's' : ''})` : ''}` : `${f.name} : ${g} ${uLabel(f)}`);
  }
});

// ============================================================
//  FAMILLES D’ALIMENTS QUASI IDENTIQUES : une seule par menu / liste de courses
//  (les autres restent proposées dans les remplaçants, en tête de liste)
// ============================================================
const FOOD_FAMILY = {};
[['laitier-maigre', 'fb0 fb3 skyr'], ['volaille', 'poulet dinde'], ['boeuf', 'boeuf5 rumsteck'], ['riz', 'riz rizcomplet'], ['pates', 'pates patescompletes'],
 ['ble', 'semoule boulgour'], ['pain', 'paincomplet paindemie'], ['cereales', 'avoine muesli'], ['huile', 'huileolive huilecolza'], ['fruits-rouges', 'fraises myrtilles fruitsrouges']]
  .forEach(([fam, ids]) => ids.split(' ').forEach(id => FOOD_FAMILY[id] = fam));
const famOf = id => FOOD_FAMILY[id] || null;
function dedupeBasket(R) {
  const used = {}; // famille → aliment retenu
  const keep = id => { const f = famOf(id); if (!f) return true; if (!used[f]) { used[f] = id; return true; } return used[f] === id; };
  for (const role in R) {
    const list = R[role]; if (!Array.isArray(list)) continue;
    const out = [];
    for (const id of list) {
      if (keep(id)) { if (!out.includes(id)) out.push(id); continue; }
      // remplace par un aliment du même rôle d’une autre famille (ou sans famille), sinon on retire
      const alt = pool(role).find(f => !out.includes(f.id) && !list.includes(f.id) && keep(f.id) && (!famOf(f.id) || used[famOf(f.id)] === f.id));
      if (alt) out.push(alt.id);
    }
    R[role] = out.length ? out : list.slice(0, 1);
  }
  return R;
}
makeBasket = (orig => function () { return dedupeBasket(orig.apply(this, arguments)); })(makeBasket);

// ============================================================
//  AJOUTER / RETIRER UN ALIMENT DANS UN REPAS DU MENU
// ============================================================
ROLE_B.extra = { fixed: 1, def: 100 };
function refreshMeal(di, mi) { const T = targets(); const day = S.plan.days[di]; solve(day.meals[mi].items, residualTarget(day, mi, T)); afterMealEdit(di, mi); }
Object.assign(ACTIONS, {
  planAdd: el => {
    const di = +el.dataset.day, mi = +el.dataset.meal; const m = S.plan.days[di].meals[mi];
    A = { date: todayStr(), meal: m.key, q: '', view: 'search', off: null, offErr: '', sel: null, g: 100, title: 'Ajouter au menu',
      onPick: (f, g) => {
        const mm = S.plan.days[di].meals[mi]; const ex = mm.items.find(x => x.id === f.id);
        if (ex) { ex.g = g; ex.fixed = 1; ex.user = 1; } else mm.items.push({ id: f.id, role: 'extra', g, fixed: 1, user: 1 });
        refreshMeal(di, mi); save(); closeSheet(); render(); toast(`${f.name} ajouté · le reste du repas s’ajuste`);
      } };
    openSheet('Ajouter au menu', ''); renderAdd();
  },
  vqDel: () => {
    const v = VAR; const m = S.plan.days[v.di].meals[v.mi]; const f = food(m.items[v.ii].id);
    m.items.splice(v.ii, 1); refreshMeal(v.di, v.mi); save(); VAR = null; closeSheet(); render(); toast(`${f.name} retiré · le reste du repas s’ajuste`);
  }
});
