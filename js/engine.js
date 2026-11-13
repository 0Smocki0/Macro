// ============================================================
//  MOTEUR D’ANALYSE : fonctions pures (aucun accès à l’écran ni au stockage)
//  → testables à part (tests/engine.test.js), formules expliquées en clair
// ============================================================
const ENG = (() => {
  const DAY = 864e5;
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const dDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / DAY);
  const addD = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  // régression linéaire y = a + b·x ; renvoie la pente, son erreur type et l’écart des résidus
  function linreg(xs, ys) {
    const n = xs.length; if (n < 2) return { b: 0, a: ys[0] || 0, se: Infinity, sd: 0 };
    const mx = avg(xs), my = avg(ys); let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
    const b = sxx ? sxy / sxx : 0, a = my - b * mx;
    const res = xs.map((x, i) => ys[i] - (a + b * x)); const sd = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2));
    return { a, b, sd, se: sxx && n > 2 ? sd / Math.sqrt(sxx) : Infinity };
  }
  const level = c => c >= 0.65 ? 'élevée' : c >= 0.3 ? 'moyenne' : 'faible';

  // ---------- 1. DÉPENSE RÉELLE (TDEE) ----------
  // dépense = calories mangées en moyenne − variation du poids (kg/jour) × 7 700 kcal
  // intakes : [{d, kcal}] journées COMPLÈTES ; weights : [{d, kg}] ; prior : dépense calculée par formule
  function tdeeEstimate({ intakes, weights, prior, bmr, today, window = 28 }) {
    const from = addD(today, -(window - 1));
    const I = intakes.filter(x => x.d >= from && x.d < today && x.kcal > 0);
    const W = weights.filter(x => x.d >= from && x.d <= today && x.kg > 0).sort((a, b) => a.d < b.d ? -1 : 1);
    const out = { prior, obs: null, conf: 0, level: 'faible', days: I.length, weighs: W.length, span: 0, slope: null, intake: I.length ? avg(I.map(x => x.kcal)) : null, reasons: [] };
    if (W.length >= 2) out.span = dDiff(W[0].d, W[W.length - 1].d);
    if (I.length < 7) out.reasons.push(`${I.length}/7 journées complètes au minimum (idéal : 21)`);
    if (W.length < 3) out.reasons.push(`${W.length}/3 pesées au minimum (idéal : 12, le matin à jeun)`);
    if (out.span < 10) out.reasons.push(`pesées étalées sur ${out.span}/10 jours au minimum`);
    if (I.length < 7 || W.length < 3 || out.span < 10) { out.value = prior; return out; }
    const r = linreg(W.map(x => dDiff(from, x.d)), W.map(x => x.kg));
    out.slope = r.b; out.obs = out.intake - r.b * 7700;
    // confiance : quantité de données × précision de la pente (erreur type convertie en kcal/jour)
    const fd = Math.min(1, I.length / 21), fw = Math.min(1, W.length / 12), fs = Math.min(1, out.span / 21);
    const kcalSE = isFinite(r.se) ? r.se * 7700 : 999; const fu = clampN(1 - kcalSE / 500, 0, 1);
    let c = Math.min(fd, fw, fs) * (0.4 + 0.6 * fu);
    if (bmr && (out.obs < bmr * 1.05 || out.obs > bmr * 2.6)) { c *= 0.3; out.reasons.push('valeur peu plausible : journal probablement incomplet ou pesées irrégulières'); }
    if (fd < 1) out.reasons.push(`${I.length} journées complètes sur 21 conseillées`);
    if (fw < 1) out.reasons.push(`${W.length} pesées sur 12 conseillées`);
    if (fu < 0.6) out.reasons.push(`poids très variable (± ${Math.round(kcalSE)} kcal/jour d’incertitude)`);
    out.conf = Math.round(c * 100) / 100; out.level = level(out.conf); out.kcalSE = kcalSE;
    out.value = prior * (1 - out.conf) + out.obs * out.conf; // mélange formule / mesure selon la confiance
    return out;
  }
  // lissage jour après jour : la valeur suivie avance d’au plus `maxStep` kcal par jour vers la cible
  function tdeeStep(prev, target, days = 1, maxStep = 15) {
    if (prev == null || !isFinite(prev)) return target;
    const lim = maxStep * Math.max(1, days); return prev + clampN(target - prev, -lim, lim);
  }

  // ---------- 2. PROGRESSION DES CHARGES (double progression) ----------
  function parseRange(s, compound) {
    const m = String(s || '').match(/(\d+)\s*(?:[-–à]\s*(\d+))?/);
    if (m) { const a = +m[1], b = m[2] ? +m[2] : +m[1]; if (a > 0 && a <= 50) return [Math.min(a, b), Math.max(a, b)]; }
    return compound ? [6, 10] : [10, 15];
  }
  // pas de charge selon le matériel ; plus fin pour les petites charges
  function loadStep(equip, w) {
    const e = String(equip || '').toLowerCase();
    if (/halt|dumbbell|kettle/.test(e)) return w < 12 ? 1 : 2;
    if (/barre|barbell|ez/.test(e)) return w < 30 ? 1.25 : 2.5;
    return w < 20 ? 1.25 : 2.5; // machines, poulies
  }
  const roundTo = (v, st) => Math.round(v / st) * st;
  // sessions : [{date, sets:[{w,r,rpe}]}] du plus récent au plus ancien (séries de travail seulement)
  function nextTarget({ sessions, range, equip, lvl = 'intermédiaire', targetRpe = 8.5 }) {
    const [lo, hi] = range; const S0 = sessions[0];
    if (!S0 || !S0.sets.length) return { kind: 'start', why: 'Pas encore d’historique : choisis une charge que tu peux soulever ' + lo + ' à ' + hi + ' fois en gardant 2 répétitions en réserve.', conf: 'faible' };
    const top = Math.max(...S0.sets.map(s => s.w || 0));
    const work = S0.sets.filter(s => (s.w || 0) >= top * 0.95);
    const reps = work.map(s => s.r || 0); const rpes = work.map(s => s.rpe).filter(x => x > 0);
    const minR = Math.min(...reps), rpe = rpes.length ? avg(rpes) : null;
    const st = loadStep(equip, top);
    const nSess = sessions.length; const conf = nSess >= 4 ? (rpes.length ? 'élevée' : 'moyenne') : 'faible';
    const data = `Dernière séance (${S0.date}) : ${work.map(s => `${s.w} kg × ${s.r}${s.rpe ? ' @' + s.rpe : ''}`).join(', ')}`;
    // toutes les séries au haut de la fourchette, sans être à l’échec → on monte la charge
    const easy = rpe == null ? true : rpe <= (lvl === 'débutant' ? 9.5 : targetRpe + 0.5);
    if (top > 0 && minR >= hi && easy) {
      const inc = Math.max(st, roundTo(top * (lvl === 'débutant' ? 0.05 : 0.025), st));
      return { kind: 'load', w: Math.round((top + inc) * 100) / 100, r: lo, why: `Toutes tes séries ont atteint ${hi} répétitions${rpe ? ` avec un RPE moyen de ${Math.round(rpe * 10) / 10}` : ''} : tu peux ajouter ${inc} kg et repartir à ${lo} répétitions.`, data, conf };
    }
    // séries très dures (RPE ≥ 9,5) et sous le bas de fourchette → on garde la charge, ou on allège si ça dure
    if (minR < lo) {
      const prevLow = sessions.slice(1, 3).filter(s => s.sets.length && Math.max(...s.sets.map(x => x.w || 0)) >= top * 0.95 && Math.min(...s.sets.map(x => x.r || 0)) < lo).length;
      if (prevLow >= 2) { const w = roundTo(top * 0.9, st); return { kind: 'deload', w, r: lo + 1, why: `3 séances d’affilée sous ${lo} répétitions à ${top} kg : alléger d’environ 10 % (${w} kg) permet de repartir proprement.`, data, conf }; }
      return { kind: 'hold', w: top, r: lo, why: `Tu étais sous ${lo} répétitions : garde ${top} kg et vise au moins ${lo} répétitions sur chaque série.`, data, conf };
    }
    const r = Math.min(hi, minR + 1);
    return { kind: 'reps', w: top, r, why: `Garde ${top} kg et vise ${r} répétitions sur chaque série (objectif : atteindre ${hi} partout avant de monter la charge).`, data, conf };
  }
  // niveau d’entraînement d’après l’ancienneté (mois depuis la 1re séance) et la régularité
  function trainingLevel(firstStart, now, perWeek) {
    const months = (now - firstStart) / (30.4 * DAY);
    if (months < 6 || perWeek < 1.5) return 'débutant';
    return months < 24 ? 'intermédiaire' : 'avancé';
  }

  // ---------- 3. STAGNATION / BAISSE ----------
  // points : [{t, v}] meilleure performance (1RM estimé) par séance, du plus ancien au plus récent
  function trendCheck(points, now) {
    const P = points.filter(p => p.v > 0); if (P.length < 4) return { status: 'peu', n: P.length };
    const last = P.slice(-6); const spanDays = (last[last.length - 1].t - last[0].t) / DAY;
    const r = linreg(last.map(p => (p.t - last[0].t) / DAY / 7), last.map(p => p.v));
    const pctWeek = r.b / avg(last.map(p => p.v)) * 100;
    const recent = P.slice(-3).map(p => p.v), before = P.slice(-6, -3).map(p => p.v);
    const drop = before.length ? (avg(recent) - Math.max(...before)) / Math.max(...before) * 100 : 0;
    const best = Math.max(...P.map(p => p.v)), bestRecent = Math.max(...recent);
    const daysSince = (now - P[P.length - 1].t) / DAY;
    const base = { n: last.length, spanDays: Math.round(spanDays), pctWeek: Math.round(pctWeek * 10) / 10, drop: Math.round(drop * 10) / 10, best, bestRecent };
    if (daysSince > 45) return { status: 'ancien', ...base };
    if (before.length >= 2 && drop <= -5) return { status: 'baisse', ...base };
    if (spanDays >= 21 && pctWeek < 0.25 && bestRecent <= Math.max(...(before.length ? before : [0]))) return { status: 'stagne', ...base };
    return { status: pctWeek >= 0.25 ? 'progresse' : 'stable', ...base };
  }

  // ---------- 4. VOLUME PERSONNALISÉ ----------
  // blocks : [{sets (séries/sem), gain (% d’évolution de la force sur le bloc)}] de 4 semaines chacun
  function volumeZone(blocks) {
    const B = blocks.filter(b => b.sets > 0 && b.gain != null);
    const def = { lo: 10, hi: 20, conf: 'faible', why: 'Repère général issu des études (10 à 20 séries par semaine), faute d’assez d’historique personnel.' };
    if (B.length < 3) return def;
    const sorted = B.slice().sort((a, b) => b.gain - a.gain); const good = sorted.slice(0, Math.max(2, Math.ceil(B.length / 3)));
    if (good[0].gain <= 0) return { ...def, why: 'Pas de période de progression nette dans ton historique : on garde le repère général 10–20.' };
    const vals = good.map(b => b.sets); let lo = Math.floor(Math.min(...vals)), hi = Math.ceil(Math.max(...vals));
    if (hi - lo < 3) { lo = Math.max(4, lo - 2); hi = hi + 2; }
    lo = clampN(lo, 4, 24); hi = clampN(hi, lo + 2, 28);
    return { lo, hi, conf: B.length >= 6 ? 'moyenne' : 'faible', why: `Tes meilleures périodes de progression (${good.length} blocs de 4 semaines sur ${B.length}) se situaient entre ${lo} et ${hi} séries par semaine.` };
  }

  // ---------- 5. RÉCUPÉRATION ----------
  // charge d’une séance = séries de travail × effort relatif (RPE/10, 0,75 si non noté)
  const sessionLoad = sets => sets.reduce((a, s) => a + (s.rpe > 0 ? s.rpe / 10 : 0.75), 0);
  // ratio charge aiguë (7 j) / chronique (moyenne hebdo sur 28 j)
  function acwr(dayLoads, today) {
    let a = 0, c = 0; for (const [d, v] of Object.entries(dayLoads)) { const k = dDiff(d, today); if (k >= 0 && k < 7) a += v; if (k >= 0 && k < 28) c += v; }
    const ch = c / 4; return { acute: a, chronic: ch, ratio: ch > 0 ? a / ch : null };
  }
  // composantes : [{key, label, score 0–100, weight, origin}] → score global (moyenne pondérée des composantes connues)
  function recoveryScore(parts) {
    const P = parts.filter(p => p.score != null && isFinite(p.score));
    if (!P.length) return { score: null, parts, known: 0 };
    const w = P.reduce((a, p) => a + p.weight, 0);
    return { score: Math.round(P.reduce((a, p) => a + p.score * p.weight, 0) / w), parts, known: P.length };
  }
  const sleepScore = h => h == null ? null : clampN(100 - Math.abs(8 - h) * 18 - (h < 6 ? (6 - h) * 15 : 0), 0, 100);
  const scale5 = (v, inverse) => v == null ? null : clampN(((inverse ? 6 - v : v) - 1) / 4 * 100, 0, 100);
  const loadScore = ratio => ratio == null ? null : ratio <= 1.1 ? 90 : ratio <= 1.3 ? 70 : ratio <= 1.5 ? 45 : 25;

  // ---------- 6. SUGGESTIONS ALIMENTAIRES ----------
  // rem : {kcal, p, c, f} restants ; cands : [{name, kcal, p, c, f}] pour la portion proposée
  function fitScore(rem, x) {
    if (x.kcal > Math.max(0, rem.kcal) + 60) return -1;
    const fill = k => rem[k] > 0 ? Math.min(1, x[k] / rem[k]) : (x[k] > 5 ? -0.3 : 0);
    const kc = rem.kcal > 0 ? 1 - Math.abs(rem.kcal - x.kcal) / rem.kcal : 0;
    return fill('p') * 3 + fill('c') + fill('f') * 0.6 + kc * 1.2;
  }

  // ---------- 7. SAISIE RAPIDE ----------
  // « poids 78,4 » · « 200 g riz » · « 2 oeufs » · « riz 150 » · « squat 100x5 » (séance en cours)
  function parseQuick(txt) {
    const out = [];
    for (let part of String(txt).toLowerCase().replace(/(\d),(\d)/g, '$1.$2').split(/[,;\n]+|\bet\b|\+/)) {
      part = part.trim(); if (!part) continue;
      let m;
      if ((m = part.match(/^(?:poids|pes[ée]e?|je p[eè]se)\s*:?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg)?$/)) || (m = part.match(/^(\d{2,3}(?:\.\d+)?)\s*kg$/)))
        { out.push({ type: 'weight', kg: +m[1] }); continue; }
      if ((m = part.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:kg)?\s*[x×*]\s*(\d+)(?:\s*(?:@|rpe)\s*(\d+(?:\.\d)?))?$/)))
        { out.push({ type: 'set', q: m[1].trim(), w: +m[2], r: +m[3], rpe: m[4] ? +m[4] : null }); continue; }
      if ((m = part.match(/^(\d+(?:\.\d+)?)\s*(g|gr|grammes?|ml|cl)\s+(?:de\s+|d')?(.+)$/)))
        { out.push({ type: 'food', q: m[3].trim(), g: +m[1] * (m[2] === 'cl' ? 10 : 1) }); continue; }
      if ((m = part.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(g|gr|ml)?$/)))
        { out.push({ type: 'food', q: m[1].trim(), g: +m[2] }); continue; }
      if ((m = part.match(/^(\d+(?:\.\d+)?|un|une|deux|trois|quatre)\s+(.+)$/)))
        { const n = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4 }[m[1]] || +m[1]; out.push({ type: 'food', q: m[2].trim(), units: n }); continue; }
      out.push({ type: 'food', q: part, units: 1 });
    }
    return out;
  }

  return { avg, linreg, level, tdeeEstimate, tdeeStep, parseRange, loadStep, nextTarget, trainingLevel, trendCheck, volumeZone, sessionLoad, acwr, recoveryScore, sleepScore, scale5, loadScore, fitScore, parseQuick, addD, dDiff };
})();
if (typeof module !== 'undefined') module.exports = ENG;
