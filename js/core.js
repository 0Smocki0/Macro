// ============================================================
//  SOCLE DES DONNÉES : version du format, copie de sécurité avant chaque mise à niveau,
//  restauration, export complet (JSON + CSV), import avec photos
// ============================================================
const SCHEMA = 2;
const BAK_PREFIX = 'macro.bak.';
function bakSave(tag) {
  try {
    const o = { t: Date.now(), tag, v1: localStorage.getItem('macro.v1'), train: localStorage.getItem('macro.train.v1') };
    localStorage.setItem(BAK_PREFIX + tag, JSON.stringify(o));
    // on garde au plus 4 copies (les plus récentes)
    const keys = Object.keys(localStorage).filter(k => k.startsWith(BAK_PREFIX)).map(k => [k, (() => { try { return JSON.parse(localStorage.getItem(k)).t; } catch (e) { return 0; } })()]).sort((a, b) => b[1] - a[1]);
    keys.slice(4).forEach(([k]) => localStorage.removeItem(k));
    return true;
  } catch (e) { return false; }
}
// complète les champs nouveaux sans rien effacer (toutes les versions de sauvegarde restent lisibles)
function ensureS(st) {
  for (const [k, v] of Object.entries({ dayFlags: {}, checkins: {}, tdee: { v: null, d: null, log: [] }, goals: [], badges: {}, coachOff: {} })) if (st[k] == null || typeof st[k] !== typeof v) st[k] = structuredClone(v);
  if (!Array.isArray(st.tdee.log)) st.tdee.log = [];
  if (!Array.isArray(st.goals)) st.goals = [];
  if (st.profile && st.profile.tdeeAuto == null) st.profile.tdeeAuto = false;
  st.schema = SCHEMA; return st;
}
(function upgrade() {
  const old = S.schema || 1;
  if (old < SCHEMA && localStorage.getItem('macro.v1')) bakSave('avant-v' + SCHEMA);
  ensureS(S); TS.schema = SCHEMA; save(); tsave();
})();
migrate = (orig => function (st) { return ensureS(orig(st)); })(migrate);

// ---------- Copies de sécurité ----------
function bakList() {
  return Object.keys(localStorage).filter(k => k.startsWith(BAK_PREFIX)).map(k => { try { const o = JSON.parse(localStorage.getItem(k)); return { k, ...o }; } catch (e) { return null; } }).filter(Boolean).sort((a, b) => b.t - a.t);
}
ACTIONS.bakRestore = async el => {
  const o = bakList().find(x => x.k === el.dataset.k); if (!o) return;
  if (!(await askConfirm('Restaurer cette copie ?', { msg: `Copie du ${new Date(o.t).toLocaleString('fr-FR')}. Les données actuelles seront d’abord copiées à leur tour.`, ok: 'Restaurer', danger: true }))) return;
  bakSave('avant-restauration');
  if (o.v1) localStorage.setItem('macro.v1', o.v1); if (o.train) localStorage.setItem('macro.train.v1', o.train);
  location.reload();
};

// ---------- Export ----------
function dl(name, text, type) {
  const blob = new Blob([text], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
const csvCell = v => { if (v == null) return ''; const s = typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = rows => '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n');
const hhmm = t => t ? new Date(t).toTimeString().slice(0, 5) : '';
const CSVS = {
  journal: ['journal', () => { const R = [['date', 'repas', 'heure', 'aliment', 'quantite', 'unite', 'kcal', 'proteines_g', 'glucides_g', 'lipides_g', 'fibres_g', 'journee_complete']];
    for (const d of Object.keys(S.journal).sort()) for (const e of S.journal[d]) { const n = entryN(e); R.push([d, e.meal, e.t && dstr(new Date(e.t)) === d ? hhmm(e.t) : '', e.name, e.g, e.u || 'g', n.kcal, n.p, n.c, n.f, n.fib, typeof dayComplete === 'function' ? (dayComplete(d) ? 'oui' : 'non') : '']); }
    return R; }],
  poids: ['poids', () => [['date', 'kg'], ...S.weights.slice().sort((a, b) => a.d < b.d ? -1 : 1).map(w => [w.d, w.kg])]],
  seances: ['seances', () => [['date', 'nom', 'debut', 'fin', 'duree_min', 'volume_kg', 'series', 'records', 'rpe_moyen'], ...sortedW().reverse().map(w => [wDate(w), w.name, hhmm(w.start), hhmm(w.end), w.end ? Math.round((w.end - w.start) / 60000) : '', wVolume(w), wSets(w), (w.prs || []).length, w.intensity || ''])]],
  series: ['series', () => { const R = [['date', 'seance', 'exercice', 'muscle', 'materiel', 'n', 'type', 'kg', 'reps', 'rpe', 'secondes', 'km', 'faite']];
    for (const w of sortedW().reverse()) for (const e of w.exercises) { const X = exById(e.exId); e.sets.forEach((s, i) => R.push([wDate(w), w.name, X.name, X.muscle, X.equip, i + 1, { w: 'echauffement', d: 'drop', f: 'echec' }[s.type] || 'normale', num(s.w) || '', num(s.r) || '', num(s.rpe) || '', num(s.t) || '', num(s.km) || '', s.done ? 'oui' : 'non'])); }
    return R; }],
  bilans: ['bilans_matin', () => [['date', 'sommeil_h', 'qualite_1_5', 'energie_1_5', 'courbatures_1_5', 'stress_1_5'], ...Object.keys(S.checkins).sort().map(d => { const c = S.checkins[d]; return [d, c.sleep, c.sq, c.energy, c.sore, c.stress]; })]],
  tdee: ['depense_estimee', () => [['date', 'depense_suivie', 'depense_mesuree', 'confiance', 'formule', 'apport_moyen'], ...S.tdee.log.map(x => [x.d, x.v, x.obs, x.conf, x.prior, x.intake])]]
};
async function photosData() {
  try { const P = await PDB.all(); const rd = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.onerror = () => r(null); f.readAsDataURL(b); });
    const out = []; for (const p of P) { const { blob, ...rest } = p; out.push({ ...rest, data: blob ? await rd(blob) : null }); } return out; } catch (e) { return []; }
}
ACTIONS.exportAll = async el => {
  const withPh = el && el.dataset.ph === '1';
  const o = { ...S, _train: TS, _schema: SCHEMA, _exported: new Date().toISOString() };
  if (withPh) { toast('Préparation des photos…'); o._photos = await photosData(); }
  dl(`macro-sauvegarde-${todayStr()}${withPh ? '-photos' : ''}.json`, JSON.stringify(o), 'application/json');
};
ACTIONS.exportCsv = el => { const [n, f] = CSVS[el.dataset.k]; dl(`macro-${n}-${todayStr()}.csv`, csv(f()), 'text/csv;charset=utf-8'); };
ACTIONS.export = () => {
  const B = bakList();
  openSheet('Exporter mes données', `<p class="small muted" style="margin-top:0">Tout reste sur ce téléphone. La sauvegarde JSON se réimporte dans Macro ; les fichiers CSV s’ouvrent dans Excel, Numbers ou Google Sheets.</p>
    <button class="menuopt" data-act="exportAll"><span>💾</span>Sauvegarde complète (JSON)</button>
    <button class="menuopt" data-act="exportAll" data-ph="1"><span>🖼️</span>Sauvegarde complète + photos (plus lourde)</button>
    <h3 style="margin:14px 0 4px">Tableaux CSV</h3>
    ${[['journal', '🍽️', 'Journal alimentaire'], ['poids', '⚖️', 'Poids'], ['seances', '🏋️', 'Séances'], ['series', '📋', 'Toutes les séries'], ['bilans', '🌅', 'Bilans du matin'], ['tdee', '🔥', 'Dépense estimée (historique)']].map(([k, ic, l]) => `<button class="menuopt" data-act="exportCsv" data-k="${k}"><span>${ic}</span>${l}</button>`).join('')}
    ${B.length ? `<h3 style="margin:14px 0 4px">Copies de sécurité automatiques</h3><p class="small muted" style="margin:0 0 6px">Faites avant chaque mise à niveau des données ou restauration.</p>${B.map(b => `<div class="item"><div class="grow"><div class="name small">${esc(new Date(b.t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</div><div class="meta">${esc(b.tag)}</div></div><button class="btn sm" data-act="bakRestore" data-k="${esc(b.k)}">Restaurer</button></div>`).join('')}` : ''}`);
};

// ---------- Import (remplace l’ancien : copie de sécurité d’abord, photos comprises) ----------
document.addEventListener('change', e => {
  const el = e.target; if (el.id !== 'importIn' || !el.files[0]) return;
  e.stopImmediatePropagation();
  const r = new FileReader();
  r.onload = async () => {
    let d; try { d = JSON.parse(r.result); if (!d.profile || !d.journal) throw 0; } catch (err) { toast('Fichier invalide'); return; }
    if (!(await askConfirm('Remplacer les données actuelles par cette sauvegarde ?', { msg: 'Une copie de sécurité des données actuelles est faite avant.', ok: 'Remplacer', danger: true }))) return;
    bakSave('avant-import');
    const ph = d._photos; delete d._photos; delete d._schema; delete d._exported;
    S = migrate(deepMerge(structuredClone(DEFAULT), d));
    if (S._train) { importTrain(S._train); delete S._train; }
    TS.schema = SCHEMA; save(); tsave();
    if (Array.isArray(ph)) for (const p of ph) { try { if (p.data) { const b = await (await fetch(p.data)).blob(); const { data, ...rest } = p; await PDB.put({ ...rest, blob: b }); } } catch (err) { } }
    render(); toast('Sauvegarde importée');
  };
  r.readAsText(el.files[0]); el.value = '';
}, true);
