// ============================================================
//  ACCUEIL + RÉGLAGES, suppression propre d’une séance
// ============================================================
// ---------- Bouton « Accueil » à la place du bouton ⇄ ----------
IC.home = '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/>';
for (const m of ['nutri', 'train']) { const i = TABS[m].findIndex(t => t[0] === '__switch'); if (i >= 0) TABS[m][i] = ['__home', 'Accueil', 'home']; }
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.dataset.tab !== '__home') return;
  e.stopImmediatePropagation(); e.preventDefault();
  if (typeof closeSheet === 'function') closeSheet();
  showLauncher();
}, true);
// accueil : bouton réglages + texte d’aide à jour
showLauncher = (orig => function () {
  orig();
  const el = $('#launch'); if (!el) return;
  const top = el.querySelector('.launch-in > div');
  if (top && !el.querySelector('.lset')) { top.classList.add('lhead'); top.insertAdjacentHTML('beforeend', '<button class="lset" data-act="openSettings" aria-label="Réglages"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button>'); }
  const hint = [...el.querySelectorAll('p.small.muted')].find(p => /⇄/.test(p.textContent));
  if (hint) hint.textContent = 'Le bouton « Accueil » en bas de l’écran te ramène ici.';
})(showLauncher);

// ---------- Réglages ----------
function settingsHTML() {
  return `<div class="msec"><div class="msec-h"><span class="msec-ic">💾</span><div><b>Sauvegarde</b><div class="small muted">Tes données sont uniquement dans ce téléphone. Exporte une sauvegarde de temps en temps (iCloud Drive, mail…).</div></div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm primary" data-act="export">⤓ Exporter une sauvegarde</button><label class="btn sm">⤒ Importer<input type="file" id="importIn" accept="application/json,.json" hidden></label></div></div>
    <div class="msec"><div class="msec-h"><span class="msec-ic">🏋️</span><div><b>Entraînement</b><div class="small muted">Minuteur de repos et import de ton historique Hevy.</div></div></div>
      <label class="check" style="border:0;padding-top:0"><input type="checkbox" id="t_restOn" ${TS.settings.restOn ? 'checked' : ''}><div class="grow">Minuteur de repos automatique</div></label>
      <label class="f">Temps de repos par défaut<select id="t_rest">${[30, 45, 60, 90, 120, 150, 180, 240].map(v => `<option value="${v}" ${TS.settings.rest === v ? 'selected' : ''}>${clock(v * 1000)}</option>`).join('')}</select></label>
      <label class="btn block sm">⤓ Importer mon historique Hevy (CSV)<input type="file" id="hevyIn" accept=".csv,text/csv" hidden></label></div>
    <div class="msec"><div class="msec-h"><span class="msec-ic">🥗</span><div><b>Nutrition</b><div class="small muted">Profil, objectifs de calories et de macros, poids.</div></div></div>
      <button class="btn block sm" data-act="goNutriProfile">Ouvrir mes besoins et mon profil</button></div>
    <p class="small muted" style="text-align:center;margin:6px 0 0">Macro · appli personnelle, données 100 % locales</p>`;
}
Object.assign(ACTIONS, {
  openSettings: () => openSheet('Réglages', settingsHTML()),
  goNutriProfile: () => { closeSheet(); $('#launch')?.remove(); try { sessionStorage.setItem('macro.launched', '1'); } catch (e) { } setMode('nutri'); S.ui.tab = 'profil'; save(); render(); }
});

// ---------- Supprimer une séance comme si elle n’avait jamais eu lieu ----------
// les records des séances suivantes sont recalculés sans elle
function recomputeRecordsAfter(t) {
  const later = TS.workouts.filter(w => w.start > t && (w.prDetail || w.prs)).sort((a, b) => a.start - b.start);
  for (const w of later) { const det = prDetails(w); w.prDetail = det; w.prs = det.map(p => `${p.ex} : ${p.type.toLowerCase()} ${p.nw}`); }
}
ACTIONS.tWDel = async el => {
  const w = TS.workouts.find(x => x.id === el.dataset.id); if (!w) return;
  if (!(await askConfirm(`Supprimer « ${w.name} » du ${fmtDate(wDate(w), { day: 'numeric', month: 'long' })} ?`, { msg: 'Comme si tu ne l’avais jamais faite : elle disparaît de l’historique, des statistiques et des records (ceux des séances suivantes sont recalculés). Irréversible.', ok: 'Supprimer', danger: true }))) return;
  TS.workouts = TS.workouts.filter(x => x !== w); recomputeRecordsAfter(w.start); tsave(); closeSheet(); render(); toast('Séance supprimée');
};
ACTIONS.tWMenu = el => {
  const id = el.dataset.id;
  openSheet('Séance', `<button class="menuopt" data-act="tWOpen" data-id="${id}"><span>👁</span>Voir le détail</button>
    <button class="menuopt" data-act="tWRedo" data-id="${id}"><span>↻</span>Refaire cette séance</button>
    <button class="menuopt" data-act="tWDel" data-id="${id}" style="color:var(--warn)"><span>🗑</span>Supprimer la séance</button>`);
};
if (typeof histCardHTML === 'function') {
  histCardHTML = (orig => w => orig(w).replace('<div class="wh-map">', `<button class="iconbtn whmenu" data-act="tWMenu" data-id="${w.id}" aria-label="Options de la séance">⋯</button><div class="wh-map">`))(histCardHTML);
}
