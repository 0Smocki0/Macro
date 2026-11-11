// ============================================================
//  PETITS MENUS CONTEXTUELS : un menu qui n’est qu’une liste d’options (⋯ d’une routine, d’un repas,
//  d’un exercice, type de série…) s’ouvre en petit menu collé au bouton, au lieu d’une grande fenêtre en bas
// ============================================================
(function popMenus() {
  let LAST = null, POP = null;
  document.addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('.ctxpop')) return;
    const el = e.target.closest && e.target.closest('button, [data-act]');
    LAST = el ? { el, t: Date.now() } : null;
  }, true);
  function closePop(now) {
    if (!POP) return; const { bg, box } = POP; POP = null;
    if (now) { bg.remove(); box.remove(); return; }
    box.classList.add('out'); bg.remove(); setTimeout(() => box.remove(), 160);
  }
  // une « liste d’options » : uniquement des boutons .menuopt, pas trop nombreux
  function isOptionList(html) {
    const t = document.createElement('div'); t.innerHTML = html;
    const kids = [...t.children]; if (!kids.length || kids.length > 8) return null;
    return kids.every(k => k.matches('button.menuopt[data-act]')) ? kids : null;
  }
  function openPop(title, items, anchor) {
    closePop(true);
    const bg = document.createElement('div'); bg.className = 'ctxpop-bg';
    const box = document.createElement('div'); box.className = 'ctxpop'; box.setAttribute('role', 'menu');
    box.innerHTML = `${title ? `<div class="ctxpop-t">${esc(title)}</div>` : ''}${items.map(i => { i.setAttribute('role', 'menuitem'); return i.outerHTML; }).join('')}`;
    document.body.append(bg, box);
    const r = anchor.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, m = 12;
    const w = Math.min(270, vw - 2 * m); box.style.width = w + 'px';
    const h = Math.min(box.scrollHeight, vh - 2 * m - 80); box.style.maxHeight = h + 'px';
    const right = r.left + r.width / 2 > vw / 2;
    let x = right ? r.right - w : r.left; x = Math.max(m, Math.min(x, vw - w - m));
    const below = r.bottom + 8 + h <= vh - 90 || r.top - 8 - h < m; // 90 px : la barre d’onglets
    let y = below ? r.bottom + 8 : r.top - 8 - h; y = Math.max(m, Math.min(y, vh - h - m));
    box.style.left = x + 'px'; box.style.top = y + 'px';
    box.style.transformOrigin = `${right ? 'right' : 'left'} ${below ? 'top' : 'bottom'}`;
    POP = { bg, box };
    bg.addEventListener('pointerdown', e => { e.preventDefault(); closePop(); });
    box.addEventListener('click', e => { if (e.target.closest('[data-act]')) setTimeout(() => { if (POP && POP.box === box) closePop(); }, 0); });
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) { }
  }
  const _open = openSheet;
  openSheet = function (title, body) {
    const a = LAST && Date.now() - LAST.t < 1500 && LAST.el.isConnected && !LAST.el.closest('.ctxpop') ? LAST.el : null;
    const items = a && a.offsetWidth < 120 ? isOptionList(body) : null;
    if (items) { LAST = null; openPop(title, items, a); return; }
    closePop(true);
    return _open.apply(this, arguments);
  };
  const _close = closeSheet;
  closeSheet = function () { closePop(); return _close.apply(this, arguments); };
  addEventListener('scroll', e => { if (POP && e.target instanceof Node && POP.box.contains(e.target)) return; closePop(); }, { passive: true, capture: true });
  addEventListener('resize', () => closePop());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
})();
