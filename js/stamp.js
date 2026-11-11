// ============================================================
//  VERSION : discret, en bas de l’accueil — depuis quand la mise à jour est en ligne
// ============================================================
(function stamp() {
  const ago = t => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); if (m < 1) return 'à l’instant'; if (m < 60) return `il y a ${m} min`; const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`; const d = Math.floor(h / 24); return `il y a ${d} j`; };
  const put = () => {
    const box = document.querySelector('#launch .launch-in'); if (!box || typeof BUILD === 'undefined') return;
    let el = box.querySelector('.lstamp'); if (!el) { el = document.createElement('div'); el.className = 'lstamp'; box.appendChild(el); }
    el.textContent = `Version ${BUILD.v} · mise à jour ${ago(BUILD.t)}`;
  };
  showLauncher = (orig => function () { const r = orig.apply(this, arguments); put(); return r; })(showLauncher);
  put(); setInterval(() => { if (!document.hidden) put(); }, 30000);
})();
