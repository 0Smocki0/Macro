// Service worker : l'appli fonctionne hors-ligne (sauf recherche Open Food Facts / scan).
const CACHE = 'macro-v73';
const ASSETS = ['./', 'index.html', 'js/app.js', 'js/foods.js', 'js/extras.js', 'js/train.js', 'js/anim.js', 'js/ux.js', 'js/progress.js', 'js/supps.js', 'js/slide.js', 'js/popmenu.js', 'js/variants.js', 'js/prefs.js', 'js/coach.js', 'js/plan.js', 'js/rtedit.js', 'js/home.js', 'js/polish.js', 'js/launch.js', 'js/look.js', 'js/homecfg.js', 'js/sheetdrag.js', 'js/feel.js', 'js/guide.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Fichiers de l'appli : réseau d'abord (pour recevoir les mises à jour), cache si hors-ligne.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'GET' && /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }))));
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
