// ============================================================
//  PRÉFÉRENCES EN TOUTES LETTRES pour le menu
//  « Au petit-déj j’aime le miel dans le skyr et sur le pain de mie » · « Dans mes plats je mets de la crème légère »
//  → aliments préférés favorisés, condiments ajoutés aux bons repas (et comptés), aliments refusés écartés
// ============================================================
ROLE_B.cond = { fixed: 1, def: 15 };
mkItem = (orig => function (f, role) { return role === 'cond' ? { id: f.id, role: 'cond', g: (f.b && f.b.def) || 15, fixed: 1 } : orig(f, role); })(mkItem);

const PREF_SECTIONS = [
  ['pdj', '☀️', 'Petit-déjeuner', 'ex. J’aime le miel dans le skyr et sur le pain de mie. Pas de muesli.', ['pdj']],
  ['plats', '🍲', 'Déjeuner et dîner', 'ex. Dans mes plats je mets de la crème légère ou de la sauce soja. Je n’aime pas le brocoli.', ['dej', 'diner']],
  ['snack', '🍎', 'Collations', 'ex. Fromage blanc avec un peu de confiture.', ['snack']]
];
// mots-clés → aliment (le premier motif trouvé gagne ; les plus précis d’abord)
const PREF_WORDS = [
  [/pain de mie/, 'paindemie'], [/pain complet|pain aux cereales/, 'paincomplet'], [/flocons?|avoine|porridge/, 'avoine'], [/muesli|granola/, 'muesli'],
  [/skyr/, 'skyr'], [/fromage blanc 0|fromage blanc maigre/, 'fb0'], [/fromage blanc/, 'fb3'], [/yaourt (a la )?grec|yaourt grec/, 'grec'], [/cottage/, 'cottage'], [/yaourt (au )?soja/, 'yaourtsoja'],
  [/lait (de )?soja|boisson (au )?soja/, 'soja'], [/\blait\b(?! de coco)/, 'lait'], [/\boeufs?\b/, 'oeuf'],
  [/beurre de cacahuete|cacahuete|peanut/, 'cacahuete'], [/amandes?/, 'amandes'], [/\bnoix\b(?! de (coco|cajou))/, 'noix'], [/chia/, 'chia'], [/galettes? de riz/, 'galettes'],
  [/bananes?/, 'banane'], [/pommes? de terre|patates?\b(?! douce)/, 'pdt'], [/patates? douces?/, 'patatedouce'], [/\bpommes?\b/, 'pomme'], [/oranges?/, 'orange'], [/kiwis?/, 'kiwi'],
  [/fraises?/, 'fraises'], [/myrtilles?/, 'myrtilles'], [/fruits rouges/, 'fruitsrouges'],
  [/poulet/, 'poulet'], [/dinde/, 'dinde'], [/steak|boeuf hache|viande hachee/, 'boeuf5'], [/rumsteck|boeuf/, 'rumsteck'], [/porc/, 'porc'], [/saumon/, 'saumon'], [/cabillaud|poisson blanc/, 'cabillaud'],
  [/\bthon\b/, 'thon'], [/crevettes?/, 'crevettes'], [/tofu/, 'tofu'], [/tempeh/, 'tempeh'], [/lentilles?/, 'lentilles'], [/pois chiches?/, 'poischiches'], [/seitan/, 'seitan'], [/soja texture|pst\b/, 'pst'],
  [/riz complet/, 'rizcomplet'], [/\briz\b/, 'riz'], [/pates completes/, 'patescompletes'], [/\bpates\b/, 'pates'], [/quinoa/, 'quinoa'], [/semoule|couscous/, 'semoule'], [/boulgour/, 'boulgour'],
  [/brocolis?/, 'brocoli'], [/haricots? verts?/, 'haricotsverts'], [/courgettes?/, 'courgette'], [/carottes?/, 'carotte'], [/epinards?/, 'epinards'], [/poivrons?/, 'poivron'], [/champignons?/, 'champignons'],
  [/chou-?fleur/, 'chou-fleur'], [/petits? pois/, 'petitspois'], [/avocats?/, 'avocat'], [/feta/, 'feta'], [/parmesan/, 'parmesan'], [/huile d.olive/, 'huileolive'], [/huile de colza/, 'huilecolza'],
  // condiments
  [/miel/, 'miel'], [/confiture/, 'confiture'], [/sirop d.erable|erable/, 'sirop'],
  [/creme (legere )?(a |pour )?cuisiner|creme liquide/, 'cremecuisine'], [/creme/, 'cremelegere'], [/fromage rape|emmental|gruyere|\brape\b/, 'fromagerape'],
  [/sauce soja|soja sucree/, 'saucesoja'], [/pesto/, 'pesto'], [/moutarde/, 'moutarde'], [/ketchup/, 'ketchup'], [/barbecue|bbq/, 'saucebbq'], [/mayo/, 'mayolegere'],
  [/sriracha|piquante?|harissa|tabasco|pimente/, 'sriracha'], [/lait de coco|curry|coco/, 'laitcoco'], [/sauce tomate|coulis|bolognaise/, 'saucetomate'], [/houmous|hummus/, 'houmous']
];
const GENERIC_SAUCES = ['saucetomate', 'saucesoja', 'pesto', 'moutarde', 'cremelegere'];
const NEG_RE = /(n.?aime pas|n.?aime plus|n.?aime vraiment pas|deteste|horreur|allergi|intoleran|pas de |pas d.|pas trop|jamais|evite|sans |je ne mange pas|je mange pas|supporte pas|plus de )/;
// lecture d’un texte → { like: [ids], cond: [{id, anchors:[ids]}], dislike: [ids], generic: bool }
function readPrefs(text) {
  const out = { like: [], cond: [], alt: [], dislike: [], generic: false };
  const clauses = norm(text || '').replace(/[’']/g, "'").split(/[.;!?\n]+|\bmais\b|,/).map(s => s.trim()).filter(Boolean);
  for (const cl of clauses) {
    const neg = NEG_RE.test(cl);
    let rest = cl; const found = [];
    for (const [re, id] of PREF_WORDS) { const m = rest.match(re); if (m && food(id)) { found.push(id); rest = rest.replace(re, ' · '); } }
    const conds = found.filter(id => (food(id).roles || []).includes('cond')), foods = found.filter(id => !conds.includes(id));
    if (neg) { for (const id of found) if (!out.dislike.includes(id)) out.dislike.push(id); continue; }
    for (const id of foods) if (!out.like.includes(id)) out.like.push(id);
    const sauceWord = /\bsauces?\b/.test(rest);
    // « crème légère OU certaines sauces » : un seul ajout par repas, qui alterne
    if (/\bou\b/.test(cl) && (conds.length > 1 || (conds.length && sauceWord))) { out.alt.push({ ids: conds, generic: sauceWord, anchors: foods }); continue; }
    for (const id of conds) out.cond.push({ id, anchors: foods });
    if (sauceWord) out.generic = true; // « certaines sauces » : une sauce qui varie
  }
  return out;
}
let PREF_CACHE = { key: null, val: null };
const prefsAll = () => { const P = S.menuPrefs.likes || {}; const key = JSON.stringify(P) + S.menuPrefs.diet; if (PREF_CACHE.key !== key) PREF_CACHE = { key, val: PREF_SECTIONS.map(([k, , , , meals]) => ({ k, meals, ...readPrefs(P[k]) })) }; return PREF_CACHE.val; };
function prefsReadHTML(k) {
  const r = readPrefs((S.menuPrefs.likes || {})[k]); const n = id => esc(food(id).name);
  const parts = [];
  if (r.like.length) parts.push(`⭐ Favorisés : ${r.like.map(n).join(', ')}`);
  for (const c of r.cond) parts.push(`➕ ${n(c.id)} (${(food(c.id).b || {}).def || 15} g)${c.anchors.length ? ` avec ${c.anchors.map(n).join(' / ')}` : ' à chaque repas'}`);
  for (const a of r.alt) parts.push(`🔄 Selon le repas : ${[...a.ids.map(n), ...(a.generic ? ['une sauce (tomate, soja, pesto, moutarde)'] : [])].join(' ou ')}`);
  if (r.generic) parts.push('➕ Une sauce qui varie : tomate, soja, pesto, moutarde, crème légère');
  if (r.dislike.length) parts.push(`🚫 Écartés : ${r.dislike.map(n).join(', ')}`);
  return parts.length ? `<div class="prefread"><span class="small muted">J’ai compris :</span>${parts.map(p => `<div>${p}</div>`).join('')}</div>` : '';
}
function prefsSectionHTML() {
  const L = S.menuPrefs.likes || {};
  return msec('💬', 'Mes goûts', 'Écris comme tu parles : ce que tu aimes, ce que tu ajoutes (miel, crème, sauces…) et ce que tu ne veux pas. Les ajouts sont comptés dans tes macros.',
    PREF_SECTIONS.filter(([k]) => k !== 'snack' || S.menuPrefs.meals > 3).map(([k, ic, label, ph]) => `<label class="f">${ic} ${label}<textarea id="mp_like_${k}" rows="2" placeholder="${esc(ph)}">${esc(L[k] || '')}</textarea></label>
      <div id="mp_read_${k}">${prefsReadHTML(k)}</div>`).join(''));
}
menuSettingsHTML = (orig => function () {
  const h = orig(); const i = h.indexOf('<button class="btn primary block" style="margin-top:8px" data-act="genPlan">');
  return i < 0 ? h + prefsSectionHTML() : h.slice(0, i) + prefsSectionHTML() + h.slice(i);
})(menuSettingsHTML);
document.addEventListener('input', e => {
  const m = e.target.id && e.target.id.match(/^mp_like_(\w+)$/); if (!m) return;
  S.menuPrefs.likes = S.menuPrefs.likes || {}; S.menuPrefs.likes[m[1]] = e.target.value; save();
  const b = $('#mp_read_' + m[1]); if (b) b.innerHTML = prefsReadHTML(m[1]);
});

// ---------- Application pendant la génération ----------
const prefDislikes = () => { const a = prefsAll(); return a._d || (a._d = new Set(a.flatMap(s => s.dislike))); };
const prefLikes = () => { const a = prefsAll(); return a._l || (a._l = new Set(a.flatMap(s => s.like))); };
// aliments refusés : retirés des propositions
pool = (orig => function (role) { const D = prefDislikes(); const L = orig(role); const r = L.filter(f => !D.has(f.id)); return r.length ? r : L; })(pool);
// aliments aimés : présents dans le panier de la semaine…
makeBasket = (orig => function () {
  const R = orig.apply(this, arguments); const L = prefLikes();
  for (const id of L) { const f = food(id); if (!f) continue;
    for (const role of f.roles) { const list = R[role]; if (!Array.isArray(list) || list.includes(id) || !pool(role).some(x => x.id === id)) continue;
      const fam = typeof famOf === 'function' ? famOf(id) : null;
      const j = list.findIndex(x => (fam && famOf(x) === fam) || !L.has(x)); if (j >= 0) list[j] = id; else list.push(id); }
  }
  return R;
})(makeBasket);
// … et tirés plus souvent
weightedPick = (orig => function (list, usage, avoid) {
  const L = prefLikes(); if (!L.size || !list.some(f => L.has(f.id))) return orig(list, usage, avoid);
  const boosted = list.flatMap(f => L.has(f.id) ? [f, f, f] : [f]); // ×3 de chances
  return orig(boosted, usage, avoid);
})(weightedPick);
// condiments : ajoutés aux repas concernés (et comptés)
let SAUCE_TURN = 0;
buildMeal = (orig => function (key, t, usage = {}, avoid = []) {
  const items = orig(key, t, usage, avoid); if (!items.length) return items;
  const add = [];
  for (const s of prefsAll()) {
    if (!s.meals.includes(key)) continue;
    for (const c of s.cond) {
      if (add.includes(c.id) || items.some(x => x.id === c.id)) continue;
      // « miel dans le skyr » : seulement si le repas contient un des aliments cités (ou un équivalent)
      if (c.anchors.length && !items.some(x => c.anchors.includes(x.id) || (typeof famOf === 'function' && famOf(x.id) && c.anchors.some(a => famOf(a) === famOf(x.id))))) continue;
      const f = food(c.id); if (!f || !dietOk(f, S.menuPrefs.diet) || prefDislikes().has(c.id)) continue;
      add.push(c.id);
    }
    for (const a of s.alt) {
      if (a.anchors.length && !items.some(x => a.anchors.includes(x.id))) continue;
      const okF = id => food(id) && dietOk(food(id), S.menuPrefs.diet) && !prefDislikes().has(id);
      const named = a.ids.filter(okF), sauces = a.generic ? GENERIC_SAUCES.filter(id => !a.ids.includes(id) && okF(id)) : [];
      const t = SAUCE_TURN++;
      // un repas sur deux ce que tu as cité (crème…), l’autre une sauce qui tourne
      const id = named.length && sauces.length ? (t % 2 === 0 ? named[(t >> 1) % named.length] : sauces[(t >> 1) % sauces.length]) : (named.length ? named[t % named.length] : sauces[t % sauces.length]);
      if (id && !add.includes(id) && !items.some(x => x.id === id)) add.push(id);
    }
    if (s.generic && ['dej', 'diner'].includes(key)) { const ok = GENERIC_SAUCES.filter(id => food(id) && dietOk(food(id), S.menuPrefs.diet) && !prefDislikes().has(id)); if (ok.length) { const id = ok[SAUCE_TURN++ % ok.length]; if (!add.includes(id)) add.push(id); } }
  }
  if (!add.length) return items;
  return solve([...items, ...add.map(id => mkItem(food(id), 'cond'))], t);
})(buildMeal);
