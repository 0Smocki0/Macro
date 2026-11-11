// ============================================================
//  FINITIONS : fenêtres qui bloquent le fond, cloche de fin de repos, menus cohérents,
//  recettes, pas de zoom, animation en glissant entre les onglets
// ============================================================

// ---------- 1. Une fenêtre ouverte bloque le défilement de l’arrière-plan ----------
(function lockBackground() {
  let y = 0, locked = false;
  const isOpen = () => { const m = $('#modal'); return !!(m && m.firstElementChild) || !!document.querySelector('.dlg-bg'); };
  const apply = () => {
    const o = isOpen(); const b = document.body;
    if (o && !locked) { y = window.scrollY; Object.assign(b.style, { position: 'fixed', top: `-${y}px`, left: '0', right: '0', width: '100%' }); locked = true; }
    else if (!o && locked) { Object.assign(b.style, { position: '', top: '', left: '', right: '', width: '' }); window.scrollTo(0, y); locked = false; }
  };
  const m = $('#modal'); if (m) new MutationObserver(apply).observe(m, { childList: true });
  new MutationObserver(apply).observe(document.body, { childList: true });
  // si l’appli veut remonter en haut pendant qu’une fenêtre est ouverte, on le fera à la fermeture
  const _scrollTo = window.scrollTo.bind(window);
  window.scrollTo = function (a, b) { if (locked && (typeof a === 'number' ? b : (a && a.top)) === 0) { y = 0; return; } return _scrollTo(a, b); };
})();

// ---------- 2. Fin du minuteur : cloche de ring de boxe + vibration ----------
// Son synthétisé (pas d’enregistrement) : 3 coups de cloche métallique, partiels inharmoniques d’une cloche.
function ensureAudio() { try { ACTX = ACTX || new (window.AudioContext || window.webkitAudioContext)(); if (ACTX.state === 'suspended') ACTX.resume(); } catch (e) { } return ACTX; }
document.addEventListener('pointerdown', ensureAudio, { once: true, capture: true }); // iOS : le son doit être « débloqué » par un premier toucher
function ringBell() {
  const ctx = ensureAudio(); if (!ctx) return;
  const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
  const strike = t0 => {
    const f0 = 640; // fondamentale ; partiels typiques d’une cloche
    [[1, 1, 1.8], [2.76, .55, 1.2], [5.4, .32, .7], [8.93, .18, .45], [1.5, .25, 1.1]].forEach(([ratio, amp, dec]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f0 * ratio;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.32 * amp, ctx.currentTime + t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dec);
      o.connect(g); g.connect(out); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dec + 0.05);
    });
    // petit « clac » du marteau
    const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const ng = ctx.createGain(); ng.gain.value = 0.25; n.buffer = buf; n.connect(ng); ng.connect(out); n.start(ctx.currentTime + t0);
  };
  [0, 0.32, 0.64].forEach(strike); // ding-ding-ding
}
// vibration : Android via l’API standard ; iPhone (iOS 18 et +) via le retour haptique d’un interrupteur
let HAPTIC = null;
function haptic(pattern = [250, 120, 250, 120, 400]) {
  try { if (navigator.vibrate && navigator.vibrate(pattern)) return; } catch (e) { }
  try {
    if (!HAPTIC) { HAPTIC = document.createElement('label'); HAPTIC.style.cssText = 'position:fixed;left:-99px;top:0;opacity:0;pointer-events:none'; HAPTIC.innerHTML = '<input type="checkbox" switch>'; document.body.appendChild(HAPTIC); }
    const n = pattern.filter((_, i) => i % 2 === 0).length; for (let i = 0; i < n; i++) setTimeout(() => HAPTIC.click(), i * 160);
  } catch (e) { }
}
beep = function () { ringBell(); haptic(); };
if (navigator.vibrate) { const _v = navigator.vibrate.bind(navigator); navigator.vibrate = p => { try { return _v(p); } catch (e) { return false; } }; }

// ---------- 3. Menus : pas d’aliment « orphelin » (beurre de cacahuète sans rien où le mettre…) ----------
const SPREADS = { cacahuete: ['pdjb', 'snackc', 'pdjc', 'pdjp', 'fruit'], confiture: ['pdjb', 'snackc', 'pdjp'], miel: ['pdjp', 'pdjc', 'pdjb', 'snackc', 'lait'], beurre: ['pdjb', 'snackc'], houmous: ['snackc', 'leg', 'pdjb'] };
function orphanSpreads(items) {
  // un produit à tartiner / sucrer a besoin d’un support dans le repas (pain, galette, yaourt, flocons, fruit…)
  return items.filter(x => { const need = SPREADS[x.id]; if (!need) return false; return !items.some(y => y !== x && y.g > 0 && need.includes(y.role)); });
}
buildMeal = (orig => function (key, t, usage, avoid) {
  let items = orig(key, t, usage, avoid);
  const orphans = orphanSpreads(items);
  if (orphans.length) { items = items.filter(x => !orphans.includes(x)); solve(items, t); }
  return items;
})(buildMeal);
// texte d’association affiché sous l’aliment : « à tartiner sur le pain de mie », « dans le skyr »…
function pairText(m, it) {
  const f = food(it.id); if (!f) return '';
  const others = m.items.filter(y => y !== it && y.g > 0);
  const carrier = roles => others.find(y => roles.includes(y.role));
  const low = y => (food(y.id) || {}).name?.split(' (')[0].toLowerCase();
  if (SPREADS[it.id]) {
    const c = carrier(SPREADS[it.id]); if (!c) return '';
    if (['pdjb', 'snackc'].includes(c.role)) return `à tartiner sur ${low(c)}`;
    if (['pdjp', 'pdjc', 'lait'].includes(c.role)) return `dans ${low(c)}`;
    return `avec ${low(c)}`;
  }
  if (it.role === 'noix') { const c = carrier(['pdjp', 'pdjc']); return c ? `dans ${low(c)}` : ''; }
  if (it.role === 'cond') { const c = carrier(['prot']); if (c) return it.id === 'fromagerape' ? 'sur le plat' : `avec ${low(c)}`; const d = carrier(['pdjp', 'pdjb', 'pdjc']); return d ? `avec ${low(d)}` : ''; }
  if (it.role === 'mg' && /huile/.test(it.id)) return 'pour la cuisson ou l’assaisonnement';
  return '';
}
function decorateMenus() {
  if (S.ui.tab !== 'menus' || !S.plan) return;
  for (const el of document.querySelectorAll('#view .item[data-act=swapItem]')) {
    const m = S.plan.days[+el.dataset.day]?.meals[+el.dataset.meal]; const it = m && m.items[+el.dataset.item]; if (!it) continue;
    const t = pairText(m, it); const meta = el.querySelector('.meta');
    if (t && meta && !meta.querySelector('.pairtag')) meta.insertAdjacentHTML('beforeend', ` · <span class="pairtag">${esc(t)}</span>`);
  }
}

// ---------- 4. Recettes : un vrai écran « Mes recettes » ----------
let RC_FROM_LIST = false;
const recipePortion = id => { const f = recipeFood(id); return f ? { f, g: f.unit.g, n: nutr(f, f.unit.g) } : null; };
function openRecipes() {
  RC_FROM_LIST = true;
  const L = Object.values(S.recipes).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  openSheet('Mes recettes', `<button class="btn primary block" data-act="rcNew" style="margin-bottom:12px">＋ Nouvelle recette</button>
    ${L.length ? L.map(r => { const p = recipePortion(r.id);
      return `<button class="rccard" data-act="rcView" data-id="${r.id}"><span class="grow"><b>${esc(r.name)}</b><span class="small muted">${r.portions || 1} portion${(+r.portions || 1) > 1 ? 's' : ''}${r.time ? ` · ${esc(r.time)} min` : ''} · ${r.items.length} ingrédient${r.items.length > 1 ? 's' : ''}</span></span>
        ${p ? `<span class="rckcal"><b>${r0(p.n.kcal)}</b><small>kcal / portion</small><small>P ${r0(p.n.p)} · G ${r0(p.n.c)} · L ${r0(p.n.f)}</small></span>` : ''}</button>`; }).join('')
      : '<div class="hint" style="margin:24px 0">Crée tes plats maison (lasagnes, overnight oats, chili…) : les calories et les macros par portion sont calculées pour toi, et tu les ajoutes au journal en un geste.</div>'}`);
}
function openRecipeView(id) {
  const r = S.recipes[id]; if (!r) return; const p = recipePortion(id); const n = Math.max(1, +r.portions || 1);
  openSheet(r.name, `${p ? `<div class="rcmac"><div><b>${r0(p.n.kcal)}</b><span>kcal</span></div><div><b style="color:var(--prot)">${r0(p.n.p)} g</b><span>protéines</span></div><div><b style="color:var(--carb)">${r0(p.n.c)} g</b><span>glucides</span></div><div><b style="color:var(--fat)">${r0(p.n.f)} g</b><span>lipides</span></div></div>
      <p class="small muted" style="margin:6px 2px 12px">Pour 1 portion (${r0(p.g)} g) · ${n} portion${n > 1 ? 's' : ''}${r.time ? ` · ${esc(r.time)} min` : ''}</p>` : ''}
    <h3 style="margin:4px 0 6px">Ingrédients</h3>
    <div class="rcing">${r.items.map(it => `<div><span class="grow">${esc(it.name)}</span><span class="muted">${r0(it.g / n)} g / portion</span></div>`).join('')}</div>
    ${r.steps ? `<h3 style="margin:14px 0 6px">Préparation</h3><div class="rcsteps">${esc(r.steps).split(/\n+/).filter(Boolean).map((s, i) => `<div><span>${i + 1}</span><p>${s}</p></div>`).join('')}</div>` : ''}
    <div class="row" style="gap:8px;margin-top:14px"><button class="btn" data-act="rdEdit" data-id="${id}">Modifier</button><button class="btn primary grow" data-act="rcAdd" data-id="${id}">＋ Ajouter au journal</button></div>
    ${RC_FROM_LIST ? '<button class="btn ghost block sm" data-act="rcList" style="margin-top:6px">‹ Toutes mes recettes</button>' : ''}`);
}
// éditeur : temps et étapes de préparation en plus
renderRecipeEditor = (orig => function () {
  orig();
  const b = $('#sheetBody'); if (!b || b.querySelector('[data-rd="steps"]')) return;
  const h3 = [...b.querySelectorAll('h3')].find(x => /Ingrédients/.test(x.textContent));
  const extra = `<label class="f">Temps de préparation (min) <span class="muted">facult.</span><input type="number" inputmode="numeric" data-rd="time" value="${esc(RD.time || '')}" placeholder="ex. 30"></label>
    <label class="f">Préparation <span class="muted">facult. · une étape par ligne</span><textarea data-rd="steps" rows="4" placeholder="1. Faire revenir l’oignon&#10;2. Ajouter la viande…">${esc(RD.steps || '')}</textarea></label>`;
  if (h3) h3.insertAdjacentHTML('beforebegin', extra); else b.insertAdjacentHTML('beforeend', extra);
})(renderRecipeEditor);
ACTIONS.rdSave = (orig => () => { const id = RD && RD.id; orig(); if (RC_FROM_LIST && id && S.recipes[id]) openRecipeView(id); })(ACTIONS.rdSave);
ACTIONS.rdRemove = (orig => async () => { await orig(); if (RC_FROM_LIST && !$('#modal').firstElementChild) openRecipes(); })(ACTIONS.rdRemove);
Object.assign(ACTIONS, {
  rcOpen: () => openRecipes(),
  rcList: () => openRecipes(),
  rcNew: () => openRecipeEditor(null),
  rcView: el => openRecipeView(el.dataset.id),
  rcAdd: el => { const id = el.dataset.id; const h = new Date().getHours(); const meal = h < 11 ? 'pdj' : h < 15 ? 'dej' : h < 18 ? 'snack' : 'diner';
    RC_FROM_LIST = false; openAdd(meal); selectFood(id); }
});
vMenus = (orig => function () { return orig().replace('<div class="row" style="gap:6px">', '<div class="row" style="gap:6px"><button class="btn sm" data-act="rcOpen">📖 Recettes</button>'); })(vMenus);
VIEWS.menus = vMenus;

// ---------- 5. Pas de zoom, pas de barre de défilement ----------
(function noZoom() {
  const vp = document.querySelector('meta[name=viewport]');
  if (vp) vp.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  // le double-tap pour zoomer est désactivé en CSS (touch-action: manipulation) sans gêner les taps rapides sur − / ＋
})();

// ---------- 6. Glisser entre les onglets : la page suit le doigt puis glisse ----------
(function swipeFollow() {
  let sx = 0, sy = 0, on = false, h = false, dx = 0; const v = () => $('#view');
  const blocked = t => $('#modal').firstElementChild || $('#launch') || $('#wiz') || t.closest('.daystrip, .chipsrow, .srow, input, textarea, select, .exstage, nav.tabs, .wchart, .pgchart, .wheel, .seg, .cal');
  document.addEventListener('touchstart', e => { if (e.touches.length !== 1 || blocked(e.target)) { on = false; return; } const t = e.touches[0]; sx = t.clientX; sy = t.clientY; on = true; h = false; dx = 0; }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!on) return; const t = e.touches[0]; dx = t.clientX - sx; const dy = t.clientY - sy;
    if (!h) { if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.6) h = true; else if (Math.abs(dy) > 12) { on = false; return; } else return; }
    const el = v(); el.style.transition = 'none'; el.style.transform = `translateX(${dx * 0.35}px)`; el.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 900));
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!on || !h) { on = false; return; } on = false; const el = v();
    // si l’onglet n’a pas changé, la page revient en place
    setTimeout(() => { if (el.style.transform) { el.style.transition = 'transform .32s cubic-bezier(.2,.9,.3,1.1), opacity .25s'; el.style.transform = ''; el.style.opacity = ''; } }, 0);
  }, { passive: true });
  swipeTab = (orig => function (dir) {
    const before = S.ui.tab; const el = v();
    orig(dir);
    if (S.ui.tab === before) return;
    el.style.transition = 'none'; el.style.opacity = ''; el.style.transform = '';
    el.classList.remove('swl', 'swr'); void el.offsetWidth; el.classList.add(dir > 0 ? 'swl' : 'swr');
    clearTimeout(swipeTab._t); swipeTab._t = setTimeout(() => el.classList.remove('swl', 'swr'), 450);
  })(swipeTab);
})();

// ---------- rendu : décorations après chaque affichage ----------
render = (orig => function () { const r = orig.apply(this, arguments); try { decorateMenus(); } catch (e) { } return r; })(render);
