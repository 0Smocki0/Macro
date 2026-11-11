// ============================================================
//  COMPLÉMENTS : à cocher chaque jour ; ceux qui ont des macros (whey…) comptent dans la journée
// ============================================================
// Un complément coché = une entrée du journal (repas « compl ») : les totaux, conseils et stats le prennent en compte
const SUPP_PRESETS = [
  { name: 'Whey', ic: '🥛', dose: '30 g', kcal: 120, p: 24, c: 2.5, f: 1.5 },
  { name: 'Caséine', ic: '🥛', dose: '30 g', kcal: 110, p: 24, c: 3, f: 0.5 },
  { name: 'Créatine', ic: '⚡', dose: '5 g', kcal: 0, p: 0, c: 0, f: 0 },
  { name: 'Gainer', ic: '🍫', dose: '100 g', kcal: 380, p: 20, c: 70, f: 3 },
  { name: 'Collagène', ic: '🦴', dose: '10 g', kcal: 36, p: 9, c: 0, f: 0 },
  { name: 'Barre protéinée', ic: '🍫', dose: '1 barre', kcal: 200, p: 20, c: 18, f: 7 },
  { name: 'Oméga-3', ic: '🐟', dose: '2 gélules', kcal: 18, p: 0, c: 0, f: 2 },
  { name: 'Vitamine D', ic: '☀️', dose: '1 gélule', kcal: 0, p: 0, c: 0, f: 0 },
  { name: 'Magnésium', ic: '💊', dose: '1 gélule', kcal: 0, p: 0, c: 0, f: 0 },
  { name: 'Multivitamines', ic: '💊', dose: '1 comprimé', kcal: 0, p: 0, c: 0, f: 0 },
  { name: 'Électrolytes', ic: '💧', dose: '1 dose', kcal: 10, p: 0, c: 2, f: 0 }
];
// dans l’état par défaut : présent aussi après « Tout effacer » ou l’import d’une ancienne sauvegarde
DEFAULT.supps = []; DEFAULT.menuPrefs.likes = {};
if (!Array.isArray(S.supps)) S.supps = [];
if (!S.menuPrefs.likes) S.menuPrefs.likes = {};
const hasMacros = s => num(s.kcal) || num(s.p) || num(s.c) || num(s.f);
const suppEntry = (d, id) => (S.journal[d] || []).find(e => e.meal === 'compl' && e.supId === id);
function suppMacroTxt(s) {
  if (!hasMacros(s)) return '';
  return [num(s.p) ? `${fr(r1(num(s.p)))} g prot.` : '', num(s.c) ? `${fr(r1(num(s.c)))} g gluc.` : '', num(s.f) ? `${fr(r1(num(s.f)))} g lip.` : '', `${r0(num(s.kcal))} kcal`].filter(Boolean).join(' · ');
}
function toggleSupp(id, d = S.ui.date || todayStr()) {
  const s = S.supps.find(x => x.id === id); if (!s) return;
  const cur = suppEntry(d, id);
  if (cur) { S.journal[d] = S.journal[d].filter(e => e !== cur); if (!S.journal[d].length) delete S.journal[d]; }
  else {
    S.journal[d] = S.journal[d] || [];
    // valeurs « pour 100 » avec g = 100 → entryN donne exactement les valeurs d’une dose
    S.journal[d].push({ id: uid(), meal: 'compl', supId: id, name: s.name, g: 100, u: '', kcal: num(s.kcal), p: num(s.p), c: num(s.c), f: num(s.f), fib: 0, sug: 0, salt: 0 });
  }
  save();
}
function suppCardHTML(d) {
  if (!Array.isArray(S.supps)) S.supps = [];
  const L = S.supps;
  const taken = L.filter(s => suppEntry(d, s.id));
  const tk = sum(taken.map(s => entryN(suppEntry(d, s.id))));
  if (!L.length) return `<section class="card meal suppcard"><div class="mealhead"><div><h2>💊 Compléments</h2><div class="small muted">Whey, créatine, vitamines… coche-les chaque jour.</div></div>
    <button class="addbtn" data-act="suppManage" aria-label="Ajouter un complément">＋</button></div></section>`;
  return `<section class="card meal suppcard"><div class="mealhead"><div><h2>💊 Compléments</h2>
      <div class="small muted">${taken.length}/${L.length} pris${tk.kcal || tk.p ? ` · ${r0(tk.kcal)} kcal · P ${r0(tk.p)}` : ''}</div></div>
      <button class="iconbtn" data-act="suppManage" aria-label="Gérer mes compléments">⋯</button></div>
    <div class="supplist">${L.map(s => { const on = !!suppEntry(d, s.id); const mt = suppMacroTxt(s);
      return `<button class="supp ${on ? 'on' : ''}" data-act="suppToggle" data-id="${s.id}" aria-pressed="${on}"><span class="sic">${esc(s.ic || '💊')}</span>
        <span class="grow"><span class="sname">${esc(s.name)}</span><span class="smeta">${esc(s.dose || '')}${mt ? ` · <b>${esc(mt)}</b>` : ''}</span></span><span class="scheck">${on ? '✓' : ''}</span></button>`; }).join('')}</div>
    ${L.some(hasMacros) ? '<div class="small muted" style="margin-top:8px">Les compléments avec des macros (whey, gainer…) sont comptés dans ta journée quand tu les coches.</div>' : ''}</section>`;
}
vJournal = (orig => function () { return orig() + suppCardHTML(S.ui.date || todayStr()); })(vJournal);
VIEWS.journal = vJournal;

// ---------- Gestion ----------
function openSuppManage() {
  const mine = new Set(S.supps.map(s => norm(s.name)));
  openSheet('Mes compléments', `${S.supps.length ? `<div class="card" style="background:var(--surface);padding-top:6px;padding-bottom:6px">${S.supps.map((s, i) => `<div class="item" data-act="suppEdit" data-id="${s.id}"><span style="font-size:22px">${esc(s.ic || '💊')}</span>
      <div class="grow"><div class="name">${esc(s.name)}</div><div class="meta">${esc(s.dose || '')}${hasMacros(s) ? ' · ' + esc(suppMacroTxt(s)) : ' · sans macros'}</div></div>
      <div class="row" style="gap:4px">${i ? `<button class="iconbtn" data-act="suppUp" data-id="${s.id}" aria-label="Monter">↑</button>` : ''}<span class="muted">›</span></div></div>`).join('')}</div>` : ''}
    <h3 style="margin:16px 0 8px">Ajouter rapidement</h3>
    <div class="chipsrow wrap">${SUPP_PRESETS.filter(p => !mine.has(norm(p.name))).map((p, i) => `<span class="chip" data-act="suppPreset" data-i="${SUPP_PRESETS.indexOf(p)}">${p.ic} ${esc(p.name)}</span>`).join('') || '<span class="muted small">Tous les classiques sont déjà ajoutés.</span>'}</div>
    <p class="small muted">Les valeurs proposées sont des moyennes : ajuste-les avec l’étiquette de ton produit.</p>
    <button class="btn primary block" data-act="suppEdit" data-id="">＋ Créer un complément</button>`);
}
function openSuppEdit(id) {
  const s = S.supps.find(x => x.id === id) || { id: '', name: '', ic: '💊', dose: '', kcal: '', p: '', c: '', f: '' };
  openSheet(s.id ? s.name : 'Nouveau complément', `<div class="grid2"><label class="f">Nom<input type="text" id="sp_name" value="${esc(s.name)}" placeholder="ex. Whey"></label>
      <label class="f">Icône<input type="text" id="sp_ic" value="${esc(s.ic || '💊')}" maxlength="4"></label></div>
    <label class="f">Dose<input type="text" id="sp_dose" value="${esc(s.dose || '')}" placeholder="ex. 30 g, 1 gélule"></label>
    <div class="msec"><div class="msec-h"><span class="msec-ic">📊</span><div><b>Macros pour une dose</b><div class="small muted">Laisse à 0 pour la créatine, les vitamines… Elles seront juste cochées.</div></div></div>
      <div class="grid2"><label class="f">Protéines (g)<input type="number" inputmode="decimal" id="sp_p" value="${esc(s.p)}"></label><label class="f">Glucides (g)<input type="number" inputmode="decimal" id="sp_c" value="${esc(s.c)}"></label>
      <label class="f">Lipides (g)<input type="number" inputmode="decimal" id="sp_f" value="${esc(s.f)}"></label><label class="f">Calories (kcal)<input type="number" inputmode="decimal" id="sp_k" value="${esc(s.kcal)}" placeholder="auto"></label></div>
      <div class="small muted" id="sp_hint"></div></div>
    <button class="btn primary block" data-act="suppSave" data-id="${s.id}">Enregistrer</button>
    ${s.id ? `<button class="btn ghost danger block" style="margin-top:8px" data-act="suppDel" data-id="${s.id}">Supprimer</button>` : ''}`);
  suppHint();
}
function suppHint() {
  const h = $('#sp_hint'); if (!h) return;
  const auto = num($('#sp_p').value) * 4 + num($('#sp_c').value) * 4 + num($('#sp_f').value) * 9;
  h.textContent = auto ? `Calculé depuis les macros : ${r0(auto)} kcal${$('#sp_k').value ? '' : ' (utilisé si tu laisses Calories vide)'}` : '';
}
document.addEventListener('input', e => { if (['sp_p', 'sp_c', 'sp_f', 'sp_k'].includes(e.target.id)) suppHint(); });
// met à jour les entrées déjà cochées d’aujourd’hui quand on modifie un complément
function syncSuppToday(s) { const d = todayStr(); const e = suppEntry(d, s.id); if (e) Object.assign(e, { name: s.name, kcal: num(s.kcal), p: num(s.p), c: num(s.c), f: num(s.f) }); }

Object.assign(ACTIONS, {
  suppToggle: el => { toggleSupp(el.dataset.id); if (navigator.vibrate) navigator.vibrate(12); render(); },
  suppManage: () => openSuppManage(),
  suppEdit: (el, e) => { if (e && e.target.closest('[data-act=suppUp]')) return; openSuppEdit(el.dataset.id); },
  suppUp: (el, e) => { if (e) e.stopPropagation(); const i = S.supps.findIndex(x => x.id === el.dataset.id); if (i > 0) { [S.supps[i - 1], S.supps[i]] = [S.supps[i], S.supps[i - 1]]; save(); openSuppManage(); render(); } },
  suppPreset: el => { const p = SUPP_PRESETS[+el.dataset.i]; S.supps.push({ id: 'sp_' + uid(), ...p }); save(); openSuppManage(); render(); toast(`${p.name} ajouté`); },
  suppSave: el => {
    const name = $('#sp_name').value.trim(); if (!name) { toast('Donne un nom'); return; }
    const p = num($('#sp_p').value), c = num($('#sp_c').value), f = num($('#sp_f').value);
    const kcal = $('#sp_k').value.trim() ? num($('#sp_k').value) : r0(p * 4 + c * 4 + f * 9);
    const o = { name, ic: $('#sp_ic').value.trim() || '💊', dose: $('#sp_dose').value.trim(), kcal, p, c, f };
    let s = S.supps.find(x => x.id === el.dataset.id);
    if (s) Object.assign(s, o); else { s = { id: 'sp_' + uid(), ...o }; S.supps.push(s); }
    syncSuppToday(s); save(); openSuppManage(); render();
  },
  suppDel: async el => {
    if (!(await askConfirm('Supprimer ce complément ?', { msg: 'Les jours où tu l’as déjà coché restent comptés.', ok: 'Supprimer', danger: true }))) return;
    S.supps = S.supps.filter(x => x.id !== el.dataset.id); save(); openSuppManage(); render();
  }
});
