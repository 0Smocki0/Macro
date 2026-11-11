// ============================================================
//  LOOK : fond vivant dans toute l’appli, icônes des repas, arrivée sur Séance / Journal
// ============================================================
// ---------- Arrivée : Séance pour l’entraînement, Journal (aujourd’hui) pour la nutrition ----------
ACTIONS.launchGo = (orig => el => {
  if (el.dataset.v === 'train') S.ui.lastTrainTab = 't_home';
  else { S.ui.lastNutriTab = 'journal'; S.ui.date = null; if (!S.ui.tab.startsWith('t_')) S.ui.tab = 'journal'; }
  orig(el);
  // sécurité : on arrive toujours sur Journal (nutrition) ou Séance (entraînement)
  const want = el.dataset.v === 'train' ? (TS.active ? 't_live' : 't_home') : 'journal';
  if (S.ui.tab !== want) { S.ui.tab = want; save(); render(); window.scrollTo(0, 0); }
})(ACTIONS.launchGo);

// ---------- Fond vivant (halos qui dérivent lentement, couleurs selon la partie) ----------
(function appBackground() {
  if ($('.appbg')) return;
  const bg = document.createElement('div'); bg.className = 'appbg'; bg.setAttribute('aria-hidden', 'true'); bg.innerHTML = '<i></i><i></i><i></i>';
  document.body.prepend(bg);
})();

// ---------- Icônes colorées devant les repas (Journal et Menus) ----------
const MEAL_ICONS = {
  'Petit-déjeuner': ['#ff9f0a', '<path d="M12 3v2M5.6 7.6l1.4 1.4M18.4 7.6 17 9M3 15h2M19 15h2M7 15a5 5 0 0 1 10 0M3 19h18"/>'],
  'Déjeuner': ['#34c27a', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
  'Dîner': ['#5e5ce6', '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'],
  'Collations': ['#ff375f', '<path d="M12 7c-1.5-2-5-2.2-6.3.6C4.4 10.5 6 17 9 19c1.2.8 2 .4 3 0 1 .4 1.8.8 3 0 3-2 4.6-8.5 3.3-11.4C17 4.8 13.5 5 12 7z"/><path d="M12 7c0-2 1-3.5 2.5-4"/>'],
  'Collation': ['#ff375f', '<path d="M12 7c-1.5-2-5-2.2-6.3.6C4.4 10.5 6 17 9 19c1.2.8 2 .4 3 0 1 .4 1.8.8 3 0 3-2 4.6-8.5 3.3-11.4C17 4.8 13.5 5 12 7z"/><path d="M12 7c0-2 1-3.5 2.5-4"/>']
};
function decorateMeals() {
  if (S.ui.tab !== 'journal' && S.ui.tab !== 'menus') return;
  for (const h of document.querySelectorAll('#view section.card.meal .mealhead h2')) {
    if (h.querySelector('.mic')) continue;
    const name = h.textContent.trim(); const ic = MEAL_ICONS[name]; if (!ic) continue;
    h.insertAdjacentHTML('afterbegin', `<span class="mic" style="background:${ic[0]}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ic[1]}</svg></span>`);
    h.classList.add('withic');
  }
}
render = (orig => function () { const r = orig.apply(this, arguments); try { decorateMeals(); } catch (e) { } return r; })(render);
render();
