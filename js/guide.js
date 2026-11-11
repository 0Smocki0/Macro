'use strict';
/* ============================================================
   Guide de démarrage + aide contextuelle
   ============================================================ */

let W = null; // état du guide
const W_STEPS = ['welcome', 'body', 'activity', 'goal', 'result', 'tour'];

const ACT_CARDS = [
  [1.2, '🪑', 'Sédentaire', 'Travail de bureau, peu de marche, pas de sport.'],
  [1.375, '🚶', 'Légèrement actif', '5 000 à 7 500 pas par jour, ou 1 à 3 séances de sport par semaine.'],
  [1.55, '🏃', 'Actif', '7 500 à 10 000 pas par jour, ou 3 à 5 séances par semaine.'],
  [1.725, '🏋️', 'Très actif', 'Plus de 10 000 pas et du sport intense presque tous les jours.'],
  [1.9, '⚒️', 'Extrêmement actif', 'Métier physique + entraînement quotidien.']
];
const GOAL_CARDS = [
  ['perte', '🔥', 'Perdre du gras', 'Maigrir en gardant ton muscle.'],
  ['maintien', '⚖️', 'Rester à mon poids', 'Manger équilibré, sans changer de poids.'],
  ['recompo', '🔄', 'Recomposition', 'Perdre du gras et gagner du muscle en même temps (idéal si tu débutes ou reprends la musculation).'],
  ['prise', '💪', 'Prendre du muscle', 'Léger surplus pour construire du muscle, avec de la musculation.']
];
const RATE_LABELS = {
  perte: { 0.25: 'Doux', 0.5: 'Recommandé', 0.75: 'Rapide', 1: 'Très rapide' },
  prise: { 0.1: 'Très progressif', 0.25: 'Recommandé', 0.4: 'Rapide', 0.5: 'Très rapide' }
};

function startGuide() {
  const p = S.profile;
  W = { step: 0, err: '', d: { sex: p.sex || 'h', age: p.age, height: p.height, weight: p.weight, bf: p.bf, act: num(p.act) || 1.375, goal: p.goal || 'perte', rate: num(p.rate) || 0.5 } };
  closeSheet();
  renderWiz();
}
function endGuide(gotoTab = 'journal') {
  W = null; S.ui.onboarded = true; S.ui.tab = gotoTab; save();
  const el = $('#wiz'); if (el) el.remove();
  render(); window.scrollTo(0, 0);
}
function applyGuideProfile() {
  const d = W.d;
  Object.assign(S.profile, { sex: d.sex, age: String(d.age), height: String(d.height), weight: String(d.weight), bf: d.bf ? String(d.bf) : '', act: d.act, goal: d.goal, rate: d.rate, useCustom: false });
  if (num(d.weight) > 0 && !S.weights.some(w => w.d === todayStr())) S.weights.push({ d: todayStr(), kg: num(d.weight) });
  save();
}

function renderWiz() {
  let el = $('#wiz');
  if (!el) { el = document.createElement('div'); el.id = 'wiz'; document.body.appendChild(el); }
  const st = W_STEPS[W.step];
  const d = W.d;
  let body = '', next = 'Continuer';
  if (st === 'welcome') {
    body = `<div style="text-align:center;margin-top:8vh">
      <img src="icons/icon-192.png" alt="" width="88" height="88" style="border-radius:22px">
      <h1 style="font-size:28px;margin:18px 0 6px">Bienvenue dans Macro</h1>
      <p class="muted" style="margin:0 0 26px">Ton coach nutrition de poche. 2 minutes pour tout régler.</p></div>
      <div class="wiz-feat"><span>🎯</span><div><b>Calcule tes besoins</b><br><span class="muted small">Calories et macros adaptées à ton corps et ton objectif.</span></div></div>
      <div class="wiz-feat"><span>📷</span><div><b>Note tes repas</b><br><span class="muted small">Recherche ou scan du code-barres, des millions de produits.</span></div></div>
      <div class="wiz-feat"><span>🍽️</span><div><b>Menus + liste de courses</b><br><span class="muted small">Générés automatiquement selon tes macros.</span></div></div>`;
    next = 'Commencer';
  } else if (st === 'body') {
    body = `<h1 class="wiz-h">Parle-moi de toi</h1><p class="muted wiz-sub">Ces infos servent à estimer ce que ton corps dépense chaque jour.</p>
      <div class="seg" style="margin-bottom:14px">${[['h', 'Homme'], ['f', 'Femme']].map(([k, l]) => `<button data-act="wSet" data-k="sex" data-v="${k}" class="${d.sex === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="grid2" style="grid-template-columns:1fr 1fr 1fr">
        <label class="f">Âge<input type="number" inputmode="numeric" data-w="age" value="${esc(d.age)}" placeholder="ans"></label>
        <label class="f">Taille<input type="number" inputmode="numeric" data-w="height" value="${esc(d.height)}" placeholder="cm"></label>
        <label class="f">Poids<input type="number" inputmode="decimal" data-w="weight" value="${esc(d.weight)}" placeholder="kg"></label>
      </div>
      <details style="margin-top:4px"><summary class="small" style="color:var(--accent)">Je connais mon taux de masse grasse (facultatif)</summary>
        <label class="f" style="margin-top:8px">Masse grasse (%)<input type="number" inputmode="decimal" data-w="bf" value="${esc(d.bf)}" placeholder="ex : 18"></label>
        <p class="small muted" style="margin:0">Mesuré par balance à impédance, pince ou DEXA. Rend le calcul plus précis. Sinon, laisse vide.</p></details>
      ${W.err ? `<div class="warnbox">${esc(W.err)}</div>` : ''}`;
  } else if (st === 'activity') {
    body = `<h1 class="wiz-h">Ton activité au quotidien</h1><p class="muted wiz-sub">Choisis ce qui ressemble le plus à ta semaine type. Dans le doute, prends le niveau en dessous.</p>
      ${ACT_CARDS.map(([v, ic, l, t]) => `<button class="opt ${d.act === v ? 'on' : ''}" data-act="wSet" data-k="act" data-v="${v}"><span class="opt-ic">${ic}</span><span><b>${l}</b><br><span class="small muted">${t}</span></span></button>`).join('')}`;
  } else if (st === 'goal') {
    const rates = RATES[d.goal];
    body = `<h1 class="wiz-h">Ton objectif</h1><p class="muted wiz-sub">Tu pourras en changer à tout moment.</p>
      ${GOAL_CARDS.map(([k, ic, l, t]) => `<button class="opt ${d.goal === k ? 'on' : ''}" data-act="wSet" data-k="goal" data-v="${k}"><span class="opt-ic">${ic}</span><span><b>${l}</b><br><span class="small muted">${t}</span></span></button>`).join('')}
      ${rates ? `<h3 style="margin:16px 0 8px">À quel rythme ?</h3><div class="row wrap" style="gap:6px">${rates.map(v => `<button class="chip ${d.rate === v ? 'on' : ''}" data-act="wSet" data-k="rate" data-v="${v}">${d.goal === 'perte' ? '−' : '+'}${fr(v)} kg/sem · ${RATE_LABELS[d.goal][v]}</button>`).join('')}</div>
        <p class="small muted">${d.goal === 'perte' ? 'Un rythme modéré préserve le muscle et l’énergie, et se tient sur la durée.' : 'Au-delà, on stocke surtout du gras.'}</p>` : ''}`;
  } else if (st === 'result') {
    const T = targets();
    const words = { perte: 'Pour perdre', prise: 'Pour prendre' };
    body = `<h1 class="wiz-h">Tes objectifs du jour</h1>
      <div class="card" style="text-align:center;margin-top:12px"><div class="muted small">Calories à manger par jour</div>
        <div class="big" style="font-size:46px;color:var(--accent)">${r0(T.kcal)}</div>
        <div class="small muted">Ton corps dépense environ ${r0(T.tdee)} kcal/jour.${words[d.goal] ? ` ${words[d.goal]} ${fr(d.rate)} kg/semaine, on ${d.goal === 'perte' ? 'retire' : 'ajoute'} ${r0(Math.abs(T.delta))} kcal/jour.` : d.goal === 'recompo' ? ' On retire 10 % pour perdre du gras doucement.' : ''}</div></div>
      <div class="wiz-feat"><span class="dot" style="background:var(--prot);width:14px;height:14px;margin-top:4px"></span><div><b>${r0(T.p)} g de protéines</b><br><span class="small muted">Construisent et protègent tes muscles, calent bien. Viande, poisson, œufs, laitiers, légumineuses.</span></div></div>
      <div class="wiz-feat"><span class="dot" style="background:var(--carb);width:14px;height:14px;margin-top:4px"></span><div><b>${r0(T.c)} g de glucides</b><br><span class="small muted">Ton carburant principal. Féculents, pain, fruits.</span></div></div>
      <div class="wiz-feat"><span class="dot" style="background:var(--fat);width:14px;height:14px;margin-top:4px"></span><div><b>${r0(T.f)} g de lipides</b><br><span class="small muted">Indispensables aux hormones. Huiles, oléagineux, poisson gras.</span></div></div>
      ${T.warn.map(w => `<div class="warnbox">${esc(w)}</div>`).join('')}
      <p class="small muted">C’est une estimation de départ. Pèse-toi régulièrement : après 2 semaines, l’appli l’ajuste à ta vraie dépense.</p>`;
  } else if (st === 'tour') {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    body = `<h1 class="wiz-h">Comment ça marche</h1><p class="muted wiz-sub">5 onglets en bas de l’écran :</p>
      <div class="wiz-feat"><span>📒</span><div><b>Journal</b><br><span class="small muted">Touche <b>＋</b>, cherche un aliment ou scanne son code-barres, indique la quantité. Les barres se remplissent vers ton objectif.</span></div></div>
      <div class="wiz-feat"><span>🍽️</span><div><b>Menus</b><br><span class="small muted">Génère ta semaine de repas calée sur tes macros. Touche un aliment pour l’échanger.</span></div></div>
      <div class="wiz-feat"><span>🛒</span><div><b>Courses</b><br><span class="small muted">La liste se remplit toute seule depuis le menu. Coche au fil du magasin.</span></div></div>
      <div class="wiz-feat"><span>📊</span><div><b>Progrès</b><br><span class="small muted">Tes statistiques de la semaine et du mois, et tes photos avant/après.</span></div></div>
      <div class="wiz-feat"><span>⚙️</span><div><b>Besoins</b><br><span class="small muted">Ton profil, ton poids et tes objectifs. Pèse-toi le matin à jeun.</span></div></div>
      <p class="small muted">Le bouton <b>?</b> en haut de chaque écran rappelle ces conseils.</p>
      ${standalone ? '' : `<div class="banner small"><b>📲 Installe l’appli</b> pour l’ouvrir comme une vraie application (et protéger tes données) :<br>${ios ? 'Safari → bouton <b>Partager</b> → <b>Sur l’écran d’accueil</b>.' : 'Menu <b>⋮</b> du navigateur → <b>Installer l’application</b>.'}</div>`}`;
    next = 'C’est parti !';
  }
  el.innerHTML = `<div class="wiz"><div class="wiz-in">
    <div class="wiz-top">
      ${W.step > 0 ? `<button class="iconbtn" data-act="wBack" aria-label="Retour" style="font-size:22px">‹</button>` : '<span style="width:36px"></span>'}
      <div class="wiz-dots">${W_STEPS.map((_, i) => `<i class="${i === W.step ? 'on' : i < W.step ? 'done' : ''}"></i>`).join('')}</div>
      ${st !== 'tour' ? `<button class="btn ghost sm" data-act="wSkip">Passer</button>` : '<span style="width:36px"></span>'}
    </div>
    <div class="wiz-body">${body}</div>
    <div class="wiz-foot"><button class="btn primary block" style="padding:13px;font-size:16px" data-act="wNext">${next}</button></div>
  </div></div>`;
  el.querySelector('.wiz-body').scrollTop = 0;
}

function wizValidate() {
  const d = W.d; W.err = '';
  if (W_STEPS[W.step] === 'body') {
    const a = num(d.age), h = num(d.height), w = num(d.weight), bf = num(d.bf);
    if (!(a >= 14 && a <= 100)) W.err = 'Indique ton âge (entre 14 et 100 ans).';
    else if (!(h >= 120 && h <= 230)) W.err = 'Indique ta taille en centimètres (ex : 175).';
    else if (!(w >= 30 && w <= 300)) W.err = 'Indique ton poids en kilos (ex : 72).';
    else if (d.bf && !(bf >= 3 && bf <= 60)) W.err = 'Le taux de masse grasse doit être entre 3 et 60 %.';
  }
  return !W.err;
}

Object.assign(ACTIONS, {
  wNext: () => {
    if (!wizValidate()) { renderWiz(); return; }
    if (W_STEPS[W.step] === 'goal') applyGuideProfile();
    if (W.step === W_STEPS.length - 1) { endGuide('journal'); return; }
    W.step++; renderWiz();
  },
  wBack: () => { W.err = ''; W.step = Math.max(0, W.step - 1); renderWiz(); },
  wSkip: () => {
    // on garde ce qui a déjà été saisi s’il est valide
    if (W.step >= 2 && wizValidate()) applyGuideProfile();
    endGuide(targets() ? 'journal' : 'profil');
  },
  wSet: el => {
    const k = el.dataset.k; let v = el.dataset.v;
    if (k === 'act' || k === 'rate') v = num(v);
    W.d[k] = v;
    if (k === 'goal' && RATES[v]) W.d.rate = v === 'perte' ? 0.5 : 0.25;
    renderWiz();
  },
  startGuide: () => startGuide(),
  help: el => openHelp(el.dataset.tab),
  quickAdd: () => openAdd(defaultMeal())
});
document.addEventListener('input', e => { if (W && e.target.dataset.w) W.d[e.target.dataset.w] = e.target.value; });

// Repas proposé selon l’heure
function defaultMeal() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h < 10.5 ? 'pdj' : h < 14.5 ? 'dej' : h < 18 ? 'snack' : 'diner';
}

// ---------- Aide contextuelle ----------
const HELP = {
  journal: ['Journal', [
    ['＋', 'Touche le <b>＋</b> rond d’un repas pour y ajouter un aliment. Le <b>⋯</b> à côté propose : copier le repas d’hier, l’enregistrer en favori, le vider.'],
    ['🔎', 'Tape le nom d’un aliment. Les aliments courants sont dans la base intégrée ; pour un produit de marque, touche <b>Chercher sur Open Food Facts</b>.'],
    ['📷', 'Pour un produit emballé, le plus rapide est de <b>scanner le code-barres</b>.'],
    ['⚖️', 'Pèse au maximum, surtout les huiles, féculents et fromages : ce sont eux qui faussent le compte.'],
    ['✏️', 'Touche un aliment déjà noté pour changer la quantité ou le supprimer.'],
    ['‹ ›', 'Les flèches en haut changent de jour. Touche le résumé (l’anneau) pour voir le détail en kcal et en %.'],
    ['★', 'Sous un repas déjà rempli, <b>★ Favori</b> l’enregistre : tu le retrouves en haut de la recherche pour le remettre en un geste.'],
    ['🍲', '<b>Nouvelle recette</b> (dans la recherche) : ajoute les ingrédients et le nombre de portions, l’appli calcule les macros par portion.'],
    ['💡', 'Touche un <b>conseil du jour</b> pour voir la solution : les aliments exacts avec leur quantité, à ajouter en un geste, ou ce qui pèse le plus dans ta journée. ✕ le masque.']
  ]],
  menus: ['Menus', [
    ['⚙️', 'Choisis le nombre de jours, de repas, ton régime et les aliments que tu ne veux pas, puis <b>Générer</b>.'],
    ['⇄', 'Touche un aliment pour le remplacer par un équivalent : les quantités se recalculent pour garder tes macros.'],
    ['↻', 'Change un repas entier.'],
    ['🍳', '<b>Batch cooking</b> : le même déjeuner et/ou dîner sur 2 à 4 jours, avec les quantités totales à cuisiner en une fois.'],
    ['🧊', '<b>Mon frigo</b> : coche ce que tu as déjà, le menu l’utilise en priorité et la liste de courses le déduit.'],
    ['💶', '<b>Menu économique</b> : privilégie les aliments les moins chers. Le coût estimé de chaque journée est affiché.'],
    ['→', '<b>→ Journal</b> copie la journée dans ton journal ; dans le Journal, chaque repas propose aussi « Ajouter le menu prévu ».'],
    ['🥩', 'Les poids des viandes, poissons et féculents sont <b>crus</b> : pèse-les avant cuisson.']
  ]],
  courses: ['Courses', [
    ['🛒', 'La liste additionne tout le menu, rangée par rayon.'],
    ['☑️', 'Coche ce que tu as déjà ou ce que tu as mis dans le caddie.'],
    ['➕', 'Ajoute tes articles à toi en bas (épices, produits ménagers…).'],
    ['💶', 'Le budget est estimé avec des prix moyens de supermarché. Touche un prix pour mettre le tien : il sera retenu.'],
    ['📤', '<b>Partager</b> pour l’envoyer par message ou la copier dans tes notes.']
  ]],
  progres: ['Progrès', [
    ['📊', 'Choisis <b>Semaine</b> ou <b>Mois</b> et navigue avec les flèches : moyenne de calories et de macros, jours dans l’objectif, série de jours notés.'],
    ['🟩', 'Dans le graphique, une barre verte = journée à ±10 % de ton objectif, orange = au-dessus, grise = en dessous.'],
    ['📸', 'Ajoute une photo par semaine, dans les mêmes conditions. <b>⇆ Comparer</b> puis touche 2 photos pour un avant/après avec l’écart de poids.'],
    ['🔒', 'Les photos restent sur ce téléphone et ne sont pas incluses dans la sauvegarde.']
  ]],
  profil: ['Besoins', [
    ['🎯', 'Tes calories et macros sont recalculées dès que tu modifies un champ.'],
    ['⚖️', 'Pèse-toi le matin à jeun, après les toilettes, idéalement chaque jour. Regarde la <b>tendance</b>, pas la pesée du jour.'],
    ['📈', 'Après 14 jours de journal complet et quelques pesées, <b>Ajustement sur tes données réelles</b> calcule ta vraie dépense : c’est le réglage le plus précis.'],
    ['💾', 'Exporte une sauvegarde de temps en temps : tes données ne sont que sur ce téléphone.']
  ]]
};
function openHelp(tab) {
  const [title, tips] = HELP[tab] || HELP.journal;
  openSheet('Aide · ' + title, tips.map(([ic, t]) => `<div class="wiz-feat"><span>${ic}</span><div class="small">${t}</div></div>`).join('') +
    `<button class="btn block" style="margin-top:12px" data-act="startGuide">Revoir le guide de démarrage</button>`);
}
const helpBtn = tab => `<button class="help" data-act="help" data-tab="${tab}" aria-label="Aide">?</button>`;

// ---------- Lancement ----------
render(); // re-rendu avec les boutons d’aide
if (!document.querySelector('#launch') && !S.ui.tab.startsWith('t_') && !S.ui.onboarded && !targets()) startGuide();
