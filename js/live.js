// ============================================================
//  SÉANCE EN DIRECT : minuteur fiable (même écran verrouillé), cloche plus forte,
//  minuteur réduit, couronnes de record, intensité RPE, renommer / remplacer un exercice…
// ============================================================

// ---------- 1. Cloche : piste audio programmée (silence puis cloche) ----------
// Une piste <audio> joue même en mode silencieux (c’est un son de l’appli, pas une sonnerie),
// suit le volume (muette au minimum) et continue écran verrouillé : la cloche tombe pile à 0.
const RA = { el: null, url: null, end: 0, bellAt: 0, rang: false, bell: null };
const RA_SR = 16000;
function bellPCM() {
  if (RA.bell) return RA.bell;
  const sr = RA_SR, len = Math.round(sr * 2.6), d = new Float32Array(len), f0 = 640;
  const parts = [[1, 1, 1.8], [2.76, .55, 1.2], [5.4, .32, .7], [8.93, .18, .45], [1.5, .25, 1.1]];
  for (const t0 of [0, 0.32, 0.64]) {
    const i0 = Math.round(t0 * sr);
    for (const [ratio, amp, dec] of parts) {
      const w = 2 * Math.PI * f0 * ratio / sr, k = Math.log(1000) / (dec * sr);
      for (let i = 0; i + i0 < len; i++) { const e = Math.exp(-k * i); if (e < 0.001) break; d[i0 + i] += amp * e * Math.min(1, i / 60) * Math.sin(w * i); }
    }
    for (let i = 0; i < sr * 0.03 && i0 + i < len; i++) d[i0 + i] += (Math.random() * 2 - 1) * 0.3 * (1 - i / (sr * 0.03)); // « clac » du marteau
  }
  let pk = 0; for (const v of d) pk = Math.max(pk, Math.abs(v));
  for (let i = 0; i < len; i++) d[i] = Math.tanh(d[i] / pk * 1.8) / Math.tanh(1.8); // plus fort, sans saturer
  return (RA.bell = d);
}
function wavURL(silence) {
  const bell = bellPCM(), ns = Math.max(0, Math.round(silence * RA_SR)), n = ns + bell.length;
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RA_SR, true); v.setUint32(28, RA_SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < bell.length; i++) v.setInt16(44 + (ns + i) * 2, bell[i] * 32000, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
function raEl() {
  if (RA.el) return RA.el;
  const el = RA.el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', '');
  el.addEventListener('timeupdate', () => { if (!RA.rang && RA.bellAt && el.currentTime >= RA.bellAt - 0.05) { RA.rang = true; restNotify(); } });
  el.addEventListener('ended', () => { RA.end = 0; RA.bellAt = 0; });
  return el;
}
function raSession() { try { if (navigator.audioSession) navigator.audioSession.type = TS.settings.bellLoud ? 'playback' : 'ambient'; } catch (e) { } }
function raPlay(silence) {
  const el = raEl(); raSession();
  if (RA.url) URL.revokeObjectURL(RA.url);
  RA.url = wavURL(silence); el.src = RA.url; RA.bellAt = silence; RA.rang = false;
  const p = el.play(); if (p && p.catch) p.catch(() => { RA.end = 0; RA.bellAt = 0; });
  if (TS.settings.bellLoud) try { if ('mediaSession' in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: 'Repos en cours', artist: 'Macro', artwork: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }); } catch (e) { }
}
// à appeler après chaque geste : la piste suit le minuteur (démarrage, ±15 s, passer…)
function raSync() {
  try { ntSync(); } catch (e) { }
  if (TS.rest && TS.settings.restSound !== false) {
    if (TS.rest.end !== RA.end) { const left = (TS.rest.end - Date.now()) / 1000; if (left > 0.4) { RA.end = TS.rest.end; raPlay(left); } }
  } else if (RA.end && !RA.rang && Date.now() < RA.end - 400) { RA.end = 0; RA.bellAt = 0; if (RA.el) RA.el.pause(); }
}
addEventListener('click', () => setTimeout(raSync, 0), true);
// premier toucher : débloque la piste (iOS n’autorise le son qu’après un geste)
addEventListener('pointerdown', function unlock() {
  const el = raEl(); if (el.src) return; el.muted = true; el.src = wavURL(0.05);
  const p = el.play(); const done = () => { el.pause(); el.muted = false; };
  if (p && p.then) p.then(done, done); else done();
}, { capture: true, once: true });
// notification si l’appli est en arrière-plan quand le repos se termine
function restNotify() {
  try {
    if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
    navigator.serviceWorker.ready.then(r => r.showNotification('Repos terminé', { body: 'Série suivante !', tag: 'macro-rest', renotify: true, icon: 'icons/icon-192.png' }));
  } catch (e) { }
}
function askNotif() {
  try {
    if (!('Notification' in window) || Notification.permission !== 'default' || S.ui.notifAsked) return;
    S.ui.notifAsked = 1; save(); Notification.requestPermission();
  } catch (e) { }
}
// fin du repos : vibration + cloche (si la piste ne l’a pas déjà jouée)
beep = function () {
  haptic([200, 100, 200, 100, 300]);
  if (RA.el && !RA.el.paused && RA.bellAt && RA.end && Math.abs(RA.end - Date.now()) < 2500) return; // la piste sonne déjà
  if (TS.settings.restSound === false) return;
  try { raPlay(0); } catch (e) { ringBell(); }
};
startRest = (orig => function (sec) { const r = orig.apply(this, arguments); raSync(); askNotif(); return r; })(startRest);

// pendant la séance : pas de glissement vers un autre onglet
swipeTab = (orig => function () { if (S.ui.tab === 't_live') { const v = $('#view'); v.style.transform = ''; return; } return orig.apply(this, arguments); })(swipeTab);
// vibration iPhone : interrupteur natif (iOS 18+), créé et touché pendant le geste ; une impulsion par appel
haptic = function (pattern = [30]) {
  try { if (navigator.vibrate && navigator.vibrate(pattern)) return; } catch (e) { }
  try { const l = document.createElement('label'); l.ariaHidden = 'true'; l.style.display = 'none'; const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); l.appendChild(i); document.head.appendChild(l); l.click(); l.remove(); } catch (e) { }
};

// ---------- 2. Minuteur réductible, couleurs inversées, rappel partout ----------
ACTIONS.tRestMini = () => { S.ui.rbMini = !S.ui.rbMini; save(); restDecor(); };
function restDecor() {
  const bar = $('#restbar'); document.body.classList.toggle('has-livebar', !!$('#livebar'));
  if (!bar) return;
  if (!bar.querySelector('.rb-min')) {
    bar.insertAdjacentHTML('afterbegin', '<button class="rb-min" data-act="tRestMini" aria-label="Réduire ou agrandir le minuteur"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>');
    const t = bar.querySelector('.rb-time'); if (t) t.dataset.act = 'tRestMini';
  }
  bar.classList.toggle('mini', !!S.ui.rbMini || S.ui.tab !== 't_live');
  const c = TS.settings.ntfy; let nt = bar.querySelector('.rb-nt');
  const st = !c || !c.on || !TS.rest || (TS.rest.end - Date.now() < 11000 && NT.ok !== TS.rest.end) ? '' : NT.ok === TS.rest.end ? 'ok' : NT.ok === -1 ? 'err' : 'wait';
  if (st && !nt) { bar.insertAdjacentHTML('beforeend', '<div class="rb-nt"></div>'); nt = bar.querySelector('.rb-nt'); }
  if (nt && nt.dataset.s !== st) { nt.dataset.s = st; nt.textContent = st === 'ok' ? 'Alerte programmée sur ntfy' : st === 'err' ? 'Alerte non envoyée (pas de réseau ?)' : st === 'wait' ? 'Envoi de l’alerte…' : ''; }
  document.body.classList.toggle('in-live', S.ui.tab === 't_live');
}
setInterval(restDecor, 250);
render = (orig => function () { const r = orig.apply(this, arguments); try { restDecor(); crowns(); } catch (e) { } return r; })(render);

// ---------- 3. Couronne sur les séries record pendant la séance ----------
function crowns() {
  if (S.ui.tab !== 't_live' || !TS.active) return;
  const A_ = TS.active, cards = qa('#view section.card.exo');
  A_.exercises.forEach((ex, ei) => {
    const card = cards[ei]; const X = exById(ex.exId); if (!card || !(X.kind === 'wr' || X.kind === 'bw')) return;
    if (!exHistory(ex.exId, A_.start).length) return;
    const b = exBest(ex.exId, A_.start); const rows = card.querySelectorAll('.srow:not(.shead)');
    ex.sets.forEach((s, si) => {
      const el = rows[si] && rows[si].querySelector('.stype'); if (!el) return;
      const w = num(s.w), r = num(s.r);
      const pr = s.done && s.type !== 'w' && r > 0 && ((w > 0 && w > b.w) || (w > 0 && e1rm(w, r) > b.e1 + 0.01) || (r > b.r && (X.kind === 'bw' || w >= b.w)));
      el.classList.toggle('prc', !!pr);
    });
  });
}

// ---------- 4. Vibration en validant une série ----------
let REST_SRC = null; // série qui a lancé le repos en cours
ACTIONS.tSetDone = (orig => function (el) {
  const key = el.dataset.ei + '-' + el.dataset.si; let was = false;
  try { const ex = curEx(el); const s = ex && ex.sets[+el.dataset.si]; was = !!(s && s.done); if (s && !s.done) haptic([20]); } catch (e) { }
  const r = orig.apply(this, arguments);
  try {
    const s = curEx(el).sets[+el.dataset.si];
    if (!was && s.done && TS.rest) REST_SRC = key;
    // série dé-validée : le minuteur qu’elle avait lancé disparaît
    else if (was && !s.done && TS.rest && (REST_SRC === key || REST_SRC === null)) { TS.rest = null; REST_SRC = null; tsave(); tick(); }
  } catch (e) { }
  return r;
})(ACTIONS.tSetDone);

// ---------- 5. Filtre par muscle : la barre reste où elle est ----------
ACTIONS.tPickM = el => {
  PICK.m = el.dataset.m;
  qa('#sheetBody .chipsrow .chip').forEach(c => c.classList.toggle('on', c.dataset.m === PICK.m));
  renderPickList();
};
// pas de doublon dans la liste (même nom et même matériel : on garde celui qui a un historique)
renderPickList = (orig => function () {
  orig.apply(this, arguments);
  const uses = {}; for (const w of TS.workouts) for (const e of w.exercises) uses[e.exId] = (uses[e.exId] || 0) + 1;
  const seen = {};
  qa('#plist .item[data-id]').forEach(it => {
    const X = exById(it.dataset.id); const k = norm(X.name).replace(/[^a-z0-9]/g, '') + '|' + norm(X.equip || '');
    const o = seen[k]; if (!o) { seen[k] = it; return; }
    const keepNew = (uses[X.id] || 0) > (uses[o.dataset.id] || 0) && !PICK.sel.includes(o.dataset.id);
    (keepNew ? o : it).remove(); if (keepNew) seen[k] = it;
  });
})(renderPickList);

// ---------- 6. Menu ⋯ en séance : historique et remplacer ----------
ACTIONS.tExMenu = (orig => function (el, e) {
  const ei = +el.dataset.ei; const o = openSheet;
  const extra = `<button class="menuopt" data-act="tExHist" data-ei="${ei}"><span>🕘</span>Historique des séances</button><button class="menuopt" data-act="tExSwap" data-ei="${ei}"><span>⇄</span>Remplacer</button>`;
  openSheet = (t, b) => o(t, String(b).replace('<button class="menuopt" data-act="tExRemove"', extra + '<button class="menuopt" data-act="tExRemove"'));
  try { return orig.apply(this, arguments); } finally { openSheet = o; }
})(ACTIONS.tExMenu);
ACTIONS.tExHist = el => {
  const ex = TS.active.exercises[+el.dataset.ei]; const X = exById(ex.exId); const H_ = exHistory(ex.exId, TS.active.start).slice(0, 12);
  openSheet(X.name, H_.length ? `<div class="exhist">${H_.map(h => `<div class="exh"><div class="row between"><b>${esc(fmtDate(wDate(h.w), { weekday: 'short', day: 'numeric', month: 'short' }))}</b><span class="small muted">${esc(h.w.name)}</span></div>
      <div class="exh-sets">${h.sets.map((s, i) => `<span class="${s.type === 'w' ? 'w' : ''}">${s.type === 'w' ? 'É' : i + 1 - h.sets.slice(0, i).filter(x => x.type === 'w').length} · ${esc(setText(s, X.kind))}${s.rpe ? ` <i>@${fr(s.rpe)}</i>` : ''}</span>`).join('')}</div></div>`).join('')}</div>`
    : '<p class="muted" style="text-align:center">Pas encore de séance précédente pour cet exercice.</p>');
};
ACTIONS.tExSwap = el => { const ei = +el.dataset.ei; openPicker('swap'); PICK.ei = ei; $('#sheetTitle').textContent = 'Remplacer par…'; };
ACTIONS.tPickToggle = (orig => function (el) {
  if (!PICK || PICK.target !== 'swap') return orig.apply(this, arguments);
  const ex = TS.active && TS.active.exercises[PICK.ei]; if (!ex) return;
  const from = exById(ex.exId).name, id = el.dataset.id; const h = exHistory(id)[0];
  const n = Math.max(ex.sets.length, 1); ex.exId = id; ex.rest = undefined;
  ex.sets = ex.sets.map(s => ({ ...s, w: '', r: '', t: '', km: '', rpe: '', done: false })); if (!ex.sets.length) ex.sets = newSets(h ? Math.min(6, h.sets.length) : n);
  PICK = null; tsave(); closeSheet(); render(); toast(`${from} → ${exById(id).name}`);
})(ACTIONS.tPickToggle);
const _renderPicker = renderPicker;
renderPicker = function () { _renderPicker.apply(this, arguments); if (PICK && PICK.target === 'swap') { $('#sheetTitle').textContent = 'Remplacer par…'; const f = $('#sheetBody .pickfoot'); if (f) f.remove(); } };

// ---------- 7. Renommer un exercice (et revenir au nom d’origine) ----------
const EX_ORIG = {};
TS.exNames = TS.exNames || {};
for (const [id, n] of Object.entries(TS.exNames)) if (EXLIB[id]) { EX_ORIG[id] = EXLIB[id].name; EXLIB[id].name = n; }
const exOrigName = id => EXLIB[id] ? (EX_ORIG[id] || EXLIB[id].name) : (TS.exercises[id] && (TS.exercises[id].origName || TS.exercises[id].name));
function setExName(id, v) {
  if (EXLIB[id]) { if (!EX_ORIG[id]) EX_ORIG[id] = EXLIB[id].name; EXLIB[id].name = v; if (v === EX_ORIG[id]) delete TS.exNames[id]; else TS.exNames[id] = v; }
  else { const x = TS.exercises[id]; if (!x) return; if (!x.origName) x.origName = x.name; x.name = v; if (v === x.origName) delete x.origName; }
  tsave();
}
openExInfo = (orig => function (id) {
  const r = orig.apply(this, arguments);
  const b = $('#sheetBody'); const X = exById(id);
  if (b && X && (EXLIB[id] || TS.exercises[id])) {
    const renamed = exOrigName(id) !== X.name;
    b.insertAdjacentHTML('beforeend', `<div class="exren"><button class="btn sm" data-act="exRename" data-id="${esc(id)}">Renommer</button>${renamed ? `<button class="btn sm ghost" data-act="exRenameReset" data-id="${esc(id)}">Nom d’origine : ${esc(exOrigName(id))}</button>` : ''}</div>`);
  }
  return r;
})(openExInfo);
ACTIONS.exRename = el => {
  const id = el.dataset.id; const X = exById(id);
  openSheet('Renommer l’exercice', `<input type="text" id="exrn" value="${esc(X.name)}" style="width:100%" autocomplete="off">
    <p class="small muted" style="margin:8px 0 14px">Nom d’origine : ${esc(exOrigName(id))}. L’historique est conservé.</p>
    <button class="btn primary block" data-act="exRenameOk" data-id="${esc(id)}">Enregistrer</button>`);
  setTimeout(() => { const i = $('#exrn'); if (i) { i.focus(); i.select(); } }, 80);
};
ACTIONS.exRenameOk = el => { const v = ($('#exrn').value || '').trim(); if (!v) { toast('Donne un nom'); return; } setExName(el.dataset.id, v); closeSheet(); render(); toast('Exercice renommé'); };
ACTIONS.exRenameReset = el => { const id = el.dataset.id; setExName(id, exOrigName(id)); closeSheet(); render(); toast('Nom d’origine rétabli'); };

// ---------- 8. Indice d’intensité (RPE) en fin de séance + suivi ----------
function wIntensity(w) {
  const v = []; for (const e of w.exercises) for (const s of e.sets) if ((s.done || w.end) && s.type !== 'w' && num(s.rpe) > 0) v.push(num(s.rpe));
  return v.length ? { avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length } : null;
}
const intLabel = a => a >= 9.3 ? ['Maximale', '#ff453a'] : a >= 8.5 ? ['Très élevée', '#ff9f0a'] : a >= 7.5 ? ['Élevée', '#ffd60a'] : a >= 6.5 ? ['Modérée', '#30d158'] : ['Légère', '#64d2ff'];
prDetails = (orig => function (w) { const I = wIntensity(w); if (I) w.intensity = Math.round(I.avg * 10) / 10; return orig.apply(this, arguments); })(prDetails);
summaryHTML = (orig => function (w, det) {
  const h = orig.apply(this, arguments); const I = wIntensity(w);
  const card = I ? (() => { const [l, c] = intLabel(I.avg); return `<div class="intcard"><div class="grow"><div class="small muted">Intensité de la séance</div><b style="color:${c}">${l}</b><div class="small muted">RPE moyen sur ${I.n} série${I.n > 1 ? 's' : ''}</div></div><div class="intval" style="--c:${c}"><b>${fr(Math.round(I.avg * 10) / 10)}</b><span>/10</span></div></div>`; })()
    : '<p class="small muted" style="text-align:center;margin:0 0 12px">Note le RPE de tes séries pour obtenir l’indice d’intensité.</p>';
  return h.replace('<div class="l">volume</div></div></div>', '<div class="l">volume</div></div></div>' + card);
})(summaryHTML);
function intensityCard() {
  const L = sortedW().map(w => ({ w, I: w.intensity ? { avg: w.intensity } : wIntensity(w) })).filter(x => x.I).slice(0, 12).reverse();
  if (!L.length) return `<section class="card"><h2 style="margin:0 0 6px">Intensité des séances</h2><p class="small muted" style="margin:0">Renseigne le RPE de tes séries (bouton jauge) : chaque séance recevra un indice d’intensité, suivi ici.</p></section>`;
  const avg = a => a.length ? a.reduce((s, x) => s + x.I.avg, 0) / a.length : 0;
  const last = L.slice(-4), prev = L.slice(-8, -4); const d = prev.length ? avg(last) - avg(prev) : 0; const [lab, col] = intLabel(avg(last));
  return `<section class="card"><div class="row between"><h2 style="margin:0">Intensité des séances</h2><span class="small muted">RPE moyen</span></div>
    <div class="row" style="gap:10px;align-items:baseline;margin:8px 0 2px"><b style="font-size:26px;color:${col}">${fr(Math.round(avg(last) * 10) / 10)}</b><span class="small muted">${lab} · 4 dernières séances${prev.length ? ` · ${d >= 0 ? '+' : ''}${fr(Math.round(d * 10) / 10)} vs avant` : ''}</span></div>
    <div class="intchart">${L.map(x => { const [, c] = intLabel(x.I.avg); return `<div title="${esc(x.w.name)}"><i style="height:${Math.max(6, (x.I.avg - 5) / 5 * 100)}%;background:${c}"></i><span>${new Date(x.w.start).getDate()}</span></div>`; }).join('')}</div>
    <p class="small muted" style="margin:10px 0 0">6–7 : marge confortable · 8 : 2 réps en réserve · 9–10 : proche de l’échec. Rester trop souvent au-dessus de 9 fatigue sans faire plus progresser.</p></section>`;
}
VIEWS.t_stats = (orig => function () { return orig.apply(this, arguments) + intensityCard(); })(VIEWS.t_stats);

// ---------- 9. Toucher un chiffre : tout est sélectionné, on tape par-dessus ----------
document.addEventListener('focusin', e => {
  const t = e.target; if (!t.matches || !t.matches('input[type=number], input[inputmode=decimal], input[inputmode=numeric]')) return;
  const sel = () => { try { t.select(); } catch (x) { } };
  setTimeout(sel, 0); t.addEventListener('mouseup', ev => ev.preventDefault(), { once: true }); t.addEventListener('touchend', () => setTimeout(sel, 0), { once: true });
});

// ---------- 10. Réglage : laisser la musique jouer ----------
openSheet = (orig => function (t, b) {
  if (typeof b === 'string' && b.includes('id="t_restOn"') && !b.includes('id="t_mix"'))
    b = b.replace(/(<label class="check"[^>]*><input type="checkbox" id="t_restOn"[\s\S]*?<\/label>)/, `$1<label class="check" style="border:0;padding-top:0"><input type="checkbox" id="t_mix" ${TS.settings.bellLoud ? 'checked' : ''}><div class="grow">Cloche même en mode silencieux<div class="small muted">Met ta musique en pause pendant le repos (limite d’iPhone). Désactivé : la cloche sonne par-dessus la musique, mais se tait en mode silencieux.</div></div></label>`);
  return orig.call(this, t, b);
})(openSheet);
document.addEventListener('change', e => { if (e.target && e.target.id === 't_mix') { TS.settings.bellLoud = e.target.checked; tsave(); raSession(); } });

// ---------- 11. Alerte partout (silencieux, écran éteint, hors de l’appli) : notification ntfy ----------
// L’appli programme une notification sur ntfy.sh au début du repos (remplacée à chaque changement, annulée si on passe).
// L’appli ntfy (App Store, gratuite) la reçoit comme une notification normale : vibre en silencieux, ne coupe pas la musique.
// état mémorisé : pas de double envoi si iOS recharge l’appli pendant le repos
const NT = (() => { try { return JSON.parse(localStorage.getItem('macro.nt')) || { end: 0 }; } catch (e) { return { end: 0 }; } })();
const ntSave = () => { try { localStorage.setItem('macro.nt', JSON.stringify(NT)); } catch (e) { } };
const ntCfg = () => TS.settings.ntfy || (TS.settings.ntfy = { on: false, topic: 'macro-' + Array.from(crypto.getRandomValues(new Uint8Array(9)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('') });
const ntURL = () => 'https://ntfy.sh/' + encodeURIComponent(ntCfg().topic);
function ntSend(end, seq = 'r' + end) {
  // keepalive : la requête part même si l’écran est verrouillé juste après
  // paramètres dans l’adresse (accents corrects, pas de pré-requête CORS)
  const q = new URLSearchParams({ title: 'Repos terminé', priority: '5', tags: 'bell', at: String(Math.round(end / 1000)) });
  return fetch(ntURL() + '/' + seq + '?' + q, { method: 'POST', keepalive: true, body: 'Série suivante !' })
    .then(r => { if (seq !== 'test') { NT.ok = r.ok ? end : -1; ntSave(); } return r; })
    .catch(() => { if (seq !== 'test') { NT.ok = -1; ntSave(); } });
}
// ntfy.sh enregistre les messages par lots : une annulation trop rapide peut être ratée, on la répète
function ntCancel(seq) { const go = () => fetch(ntURL() + '/' + seq, { method: 'DELETE' }).catch(() => { }); go(); setTimeout(go, 3000); setTimeout(go, 8000); }
function ntSync() {
  const c = TS.settings.ntfy; if (!c || !c.on) return;
  // une notification par repos ; si le temps change ou si on passe, l’ancienne est annulée
  if (TS.rest) {
    if (TS.rest.end !== NT.end) { if (NT.end && Date.now() < NT.end - 1500) ntCancel('r' + NT.end); NT.end = TS.rest.end; NT.ok = 0; ntSave(); if (NT.end - Date.now() > 11000) ntSend(NT.end); }
    else if (NT.ok === -1 && NT.end - Date.now() > 11000 && !NT.retry) { NT.retry = 1; ntSend(NT.end).finally(() => { NT.retry = 0; }); } // nouvel essai si l’envoi a échoué
  }
  else if (NT.end) { if (Date.now() < NT.end - 1500) ntCancel('r' + NT.end); NT.end = 0; NT.ok = 0; ntSave(); }
}
setInterval(() => { try { ntSync(); } catch (e) { } }, 1000);
function ntSheet() {
  const c = ntCfg(); tsave();
  openSheet('Alerte écran verrouillé', `<p class="muted" style="margin:0 0 12px">Pour être prévenu à la fin du repos même en silencieux, écran éteint ou hors de l’appli, sans couper la musique.</p>
    <ol class="ntsteps"><li>Installe l’appli gratuite <b>ntfy</b> depuis l’App Store.</li><li>Dans ntfy : <b>＋</b> → nom du sujet ci-dessous → <b>Subscribe</b>, puis autorise les notifications.</li><li>Active l’alerte ici et touche « Tester ».</li></ol>
    <div class="nttopic"><code id="ntTopic">${esc(c.topic)}</code><button class="btn sm" data-act="ntCopy">Copier</button></div>
    <label class="check" style="border:0"><input type="checkbox" id="nt_on" ${c.on ? 'checked' : ''}><div class="grow">Activer l’alerte de fin de repos</div></label>
    <button class="btn block" data-act="ntTest">Tester (notification dans 10 s)</button>
    <p class="small muted" style="margin:12px 0 0">Seuls « Repos terminé » et l’heure de fin sont envoyés à ntfy.sh. Le nom du sujet est aléatoire : garde-le pour toi.</p>`);
}
ACTIONS.ntOpen = () => ntSheet();
ACTIONS.ntCopy = () => { try { navigator.clipboard.writeText(ntCfg().topic); toast('Sujet copié'); } catch (e) { toast(ntCfg().topic); } };
ACTIONS.ntTest = () => { const c = ntCfg(); if (!c.on) { c.on = true; tsave(); const cb = $('#nt_on'); if (cb) cb.checked = true; } ntSend(Date.now() + 10500, 'test'); toast('Notification de test dans 10 s : verrouille le téléphone pour voir'); };
document.addEventListener('change', e => { if (e.target && e.target.id === 'nt_on') { ntCfg().on = e.target.checked; tsave(); toast(e.target.checked ? 'Alerte activée' : 'Alerte désactivée'); } });
// lien dans les réglages du minuteur
openSheet = (orig => function (t, b) {
  const btn = `<button class="menuopt" data-act="ntOpen" style="margin:8px 0"><span>🔔</span>Alerte écran verrouillé${TS.settings.ntfy && TS.settings.ntfy.on ? ' · activée' : ''}</button>`;
  if (typeof b === 'string' && !b.includes('data-act="ntOpen"')) {
    if (b.includes('id="t_restOn"')) b = b.replace(/(<label class="check"[^>]*><input type="checkbox" id="t_restOn")/, btn + '$1');
    else if (t === 'Minuteur de repos') b += btn;
  }
  return orig.call(this, t, b);
})(openSheet);
