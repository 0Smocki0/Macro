'use strict';
/* ============================================================
   Animations des exercices : mannequin articulé (vue de profil,
   ombrage en relief) + carte des muscles face / dos.
   Dessins originaux générés en SVG, fonctionnent hors-ligne.
   ============================================================ */

// ---------- Squelette ----------
const BONE = { torso: 48, ua: 27, fa: 25, th: 40, sh: 40, foot: 13 };
const rad = d => d * Math.PI / 180;
const vec = (deg, len) => [Math.sin(rad(deg)) * len, Math.cos(rad(deg)) * len]; // 0° = vers le bas, + = vers l’avant (droite)
// Pose : t = buste (0 = vertical, + = penché en avant), a/b = bras et coude (relatifs au buste / au bras),
// th/sh = cuisse et tibia (absolus), f = pied, up = haussement d’épaules, lift = saut. a2… = membres côté opposé.
function poseSolve(p, anchor, at) {
  const H = [0, 0];
  const tu = [Math.sin(rad(p.t)), -Math.cos(rad(p.t))];
  const S = [H[0] + tu[0] * (BONE.torso + (p.up || 0)), H[1] + tu[1] * (BONE.torso + (p.up || 0))];
  const head = [S[0] + tu[0] * 13, S[1] + tu[1] * 13];
  const arm = (a, b) => { const aa = p.t + a, bb = aa + b; const e = vec(aa, BONE.ua), w = vec(bb, BONE.fa); const E = [S[0] + e[0], S[1] + e[1]]; return [E, [E[0] + w[0], E[1] + w[1]]]; };
  const leg = (th, sh, f) => { const k = vec(th, BONE.th), s = vec(sh, BONE.sh); const K = [H[0] + k[0], H[1] + k[1]]; const A = [K[0] + s[0], K[1] + s[1]]; const fr = rad(f || 0); return [K, A, [A[0] + Math.cos(fr) * BONE.foot, A[1] + Math.sin(fr) * BONE.foot]]; };
  const [E, W] = arm(p.a, p.b), [E2, W2] = arm(p.a2 ?? p.a, p.b2 ?? p.b);
  const [K, An, T] = leg(p.th, p.sh, p.f), [K2, An2, T2] = leg(p.th2 ?? p.th, p.sh2 ?? p.sh, p.f2 ?? p.f);
  const P = { H, S, head, E, W, E2, W2, K, An, T, K2, An2, T2, tu };
  // ancrage : le point choisi reste fixe à l’écran
  const ref = { foot: An, toe: T, hip: H, hand: W, knee: K }[anchor] || H;
  const dx = at[0] - ref[0], dy = at[1] - ref[1] - (p.lift || 0);
  for (const k of Object.keys(P)) if (k !== 'tu') P[k] = [P[k][0] + dx, P[k][1] + dy];
  return P;
}
const lerp = (A, B, k) => { const o = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) { const a = A[key] ?? B[key], b = B[key] ?? A[key]; o[key] = typeof a === 'number' ? a + (b - a) * k : a; } return o; };

// ---------- Mouvements ----------
const STAND = { t: 0, a: 0, b: 0, th: 0, sh: 0, f: 0 };
const st = o => ({ ...STAND, ...o });
const MOVES = {
  squat:    { anchor: 'foot', at: [104, 178], eq: 'barbell', A: st({ t: 6, a: -60, b: 190, th: 3, sh: -2 }), B: st({ t: 42, a: -60, b: 190, th: 88, sh: -30 }) },
  frontsq:  { anchor: 'foot', at: [104, 178], eq: 'barbell', A: st({ t: 2, a: 60, b: 173, th: 3, sh: -2 }), B: st({ t: 20, a: 60, b: 173, th: 95, sh: -34 }) },
  goblet:   { anchor: 'foot', at: [104, 178], eq: 'kbchest', A: st({ t: 4, a: 25, b: 140, th: 3, sh: -2 }), B: st({ t: 22, a: 25, b: 140, th: 95, sh: -34 }) },
  hack:     { anchor: 'foot', at: [112, 178], eq: 'none', fix: 'backpad', A: st({ t: -12, a: 20, b: 60, th: 8, sh: 2 }), B: st({ t: -12, a: 20, b: 60, th: 92, sh: -18 }) },
  press:    { anchor: 'hip', at: [78, 136], fix: 'legpress', A: st({ t: -60, a: 40, b: 30, th: 160, sh: 70, f: -60 }), B: st({ t: -60, a: 40, b: 30, th: 125, sh: 125, f: -55 }) },
  split:    { anchor: 'foot', at: [120, 178], eq: 'dumbbell', fix: 'rearbench', A: st({ t: 4, th: 12, sh: 0, th2: -55, sh2: -100, f2: 20 }), B: st({ t: 10, th: 80, sh: -12, th2: -15, sh2: -100, f2: 20 }) },
  lunge:    { anchor: 'foot', at: [128, 178], eq: 'dumbbell', A: st({ t: 3, th: 18, sh: 0, th2: -18, sh2: -10, f2: 30 }), B: st({ t: 4, th: 85, sh: -8, th2: -40, sh2: -95, f2: 40 }) },
  legext:   { anchor: 'hip', at: [92, 128], fix: 'seat', A: st({ t: -5, a: 20, b: 0, th: 90, sh: 15 }), B: st({ t: -5, a: 20, b: 0, th: 88, sh: 88 }) },
  legcurl:  { anchor: 'hip', at: [104, 120], fix: 'flatbench', A: st({ t: -92, a: 92, b: -20, th: 91, sh: 91 }), B: st({ t: -92, a: 92, b: -20, th: 91, sh: 205 }) },
  legcurla: { anchor: 'hip', at: [92, 128], fix: 'seat', A: st({ t: -5, a: 20, b: 0, th: 90, sh: 85 }), B: st({ t: -5, a: 20, b: 0, th: 90, sh: -40 }) },
  deadlift: { anchor: 'foot', at: [104, 178], eq: 'barbell', A: st({ t: 62, a: -62, b: 0, th: 62, sh: -16 }), B: st({ t: 0, a: 0, b: 0, th: 0, sh: 0 }) },
  rdl:      { anchor: 'foot', at: [104, 178], eq: 'barbell', A: st({ t: 2, a: -2, b: 0, th: 2, sh: 0 }), B: st({ t: 78, a: -78, b: 0, th: 14, sh: -6 }) },
  goodmorn: { anchor: 'foot', at: [104, 178], eq: 'barbell', A: st({ t: 4, a: -60, b: 190, th: 2, sh: 0 }), B: st({ t: 78, a: -60, b: 190, th: 12, sh: -6 }) },
  hyper:    { anchor: 'hip', at: [112, 110], fix: 'hyperpad', A: st({ t: 155, a: 150, b: 150, th: -58, sh: -58, f: 60 }), B: st({ t: 62, a: 150, b: 150, th: -58, sh: -58, f: 60 }) },
  hipthrust:{ anchor: 'foot', at: [138, 178], eq: 'barhip', fix: 'thrustbench', A: st({ t: -70, a: 70, b: 0, th: 40, sh: -5 }), B: st({ t: -92, a: 92, b: 0, th: 92, sh: 5 }) },
  glutekb:  { anchor: 'foot', at: [100, 178], eq: 'cableankle', A: st({ t: 22, a: 50, b: 0, th2: 2, sh2: 0, th: 6, sh: -4 }), B: st({ t: 22, a: 50, b: 0, th2: 2, sh2: 0, th: -55, sh: -70 }) },
  abduc:    { anchor: 'hip', at: [92, 128], fix: 'seat', A: st({ t: -5, a: 20, b: 0, th: 90, sh: 5 }), B: st({ t: -5, a: 20, b: 0, th: 70, sh: 5 }) },
  calf:     { anchor: 'toe', at: [117, 178], eq: 'dumbbell', fix: 'step', A: st({ f: 8 }), B: st({ f: 48 }) },
  bench:    { anchor: 'hip', at: [118, 126], eq: 'barbell', fix: 'flatbench', A: st({ t: -90, a: 270, b: 0, th: 62, sh: 4 }), B: st({ t: -90, a: 130, b: 130, th: 62, sh: 4 }) },
  incline:  { anchor: 'hip', at: [118, 128], eq: 'barbell', fix: 'inclinebench', A: st({ t: -58, a: 238, b: 0, th: 70, sh: 4 }), B: st({ t: -58, a: 105, b: 135, th: 70, sh: 4 }) },
  decline:  { anchor: 'hip', at: [112, 118], eq: 'barbell', fix: 'declinebench', A: st({ t: -108, a: 288, b: 0, th: 70, sh: 140 }), B: st({ t: -108, a: 150, b: 130, th: 70, sh: 140 }) },
  fly:      { anchor: 'hip', at: [118, 126], eq: 'dumbbell', fix: 'flatbench', A: st({ t: -90, a: 270, b: -8 }), B: st({ t: -90, a: 160, b: -18, th: 62, sh: 4 }) },
  cablefly: { anchor: 'foot', at: [104, 178], eq: 'cable', cable: [196, 40], A: st({ t: 12, a: -55, b: 15 }), B: st({ t: 12, a: 75, b: 10 }) },
  pecdeck:  { anchor: 'hip', at: [96, 128], fix: 'seat', eq: 'handle', A: st({ t: -4, a: -60, b: 85, th: 90, sh: 0 }), B: st({ t: -4, a: 70, b: 85, th: 90, sh: 0 }) },
  pushup:   { anchor: 'foot', at: [170, 177], A: st({ t: -65.5, a: 65.5, b: 0, th: 65.5, sh: 65.5, f: 60 }), B: st({ t: -79, a: 139, b: -127, th: 79, sh: 79, f: 70 }) },
  dips:     { anchor: 'hand', at: [112, 92], fix: 'dipbars', A: st({ t: 6, a: -4, b: 0, th: 12, sh: -55 }), B: st({ t: 22, a: -96, b: 118, th: 20, sh: -50 }) },
  ohp:      { anchor: 'foot', at: [104, 178], eq: 'barbell', A: st({ t: -2, a: 30, b: 140 }), B: st({ t: -4, a: 178, b: 0 }) },
  ohpdb:    { anchor: 'foot', at: [104, 178], eq: 'dumbbell', A: st({ t: -2, a: 30, b: 140 }), B: st({ t: -4, a: 178, b: 0 }) },
  ohpseat:  { anchor: 'hip', at: [96, 128], fix: 'seat', eq: 'handle', A: st({ t: -4, a: 30, b: 140, th: 90, sh: 0 }), B: st({ t: -4, a: 178, b: 0, th: 90, sh: 0 }) },
  raise:    { anchor: 'foot', at: [104, 178], eq: 'dumbbell', A: st({ t: 0, a: 8, b: -10 }), B: st({ t: 0, a: 92, b: -10 }) },
  raisec:   { anchor: 'foot', at: [104, 178], eq: 'cable', cable: [140, 176], A: st({ t: 0, a: 8, b: -10 }), B: st({ t: 0, a: 92, b: -10 }) },
  revfly:   { anchor: 'foot', at: [104, 178], eq: 'dumbbell', A: st({ t: 70, a: -70, b: -10, th: 14, sh: -6 }), B: st({ t: 70, a: -150, b: -10, th: 14, sh: -6 }) },
  facepull: { anchor: 'foot', at: [96, 178], eq: 'cable', cable: [196, 62], A: st({ t: -4, a: 96, b: 0 }), B: st({ t: -6, a: -98, b: 220 }) },
  row:      { anchor: 'foot', at: [104, 178], eq: 'barbell', A: st({ t: 65, a: -65, b: 0, th: 22, sh: -12 }), B: st({ t: 65, a: -128, b: 62, th: 22, sh: -12 }) },
  rowdb:    { anchor: 'foot', at: [104, 178], eq: 'dumbbell', A: st({ t: 65, a: -65, b: 0, th: 22, sh: -12 }), B: st({ t: 65, a: -128, b: 62, th: 22, sh: -12 }) },
  cablerow: { anchor: 'hip', at: [78, 150], eq: 'cable', cable: [196, 140], fix: 'floorbench', A: st({ t: 12, a: 80, b: 0, th: 78, sh: 92, f: -90 }), B: st({ t: -6, a: -28, b: 125, th: 78, sh: 92, f: -90 }) },
  pulldown: { anchor: 'hip', at: [96, 128], eq: 'cable', cable: [118, 6], fix: 'seat', A: st({ t: -10, a: 190, b: 0, th: 90, sh: 0 }), B: st({ t: -14, a: 32, b: 140, th: 90, sh: 0 }) },
  pullover: { anchor: 'foot', at: [96, 178], eq: 'cable', cable: [196, 30], A: st({ t: 32, a: 118, b: 0, th: 10, sh: -4 }), B: st({ t: 32, a: -22, b: 0, th: 10, sh: -4 }) },
  pullup:   { anchor: 'hand', at: [112, 24], fix: 'bar', A: st({ t: 0, a: 180, b: 0, th: 8, sh: -40 }), B: st({ t: -4, a: 34, b: 130, th: 14, sh: -42 }) },
  shrug:    { anchor: 'foot', at: [104, 178], eq: 'dumbbell', A: st({ up: 0 }), B: st({ up: 6 }) },
  curl:     { anchor: 'foot', at: [104, 178], eq: 'barbell', A: st({ a: 0, b: -4 }), B: st({ a: 12, b: 138 }) },
  curldb:   { anchor: 'foot', at: [104, 178], eq: 'dumbbell', A: st({ a: 0, b: -4 }), B: st({ a: 12, b: 138 }) },
  curlc:    { anchor: 'foot', at: [100, 178], eq: 'cable', cable: [150, 176], A: st({ a: 0, b: -4 }), B: st({ a: 12, b: 138 }) },
  preacher: { anchor: 'hip', at: [92, 128], eq: 'barbell', fix: 'preacher', A: st({ t: 12, a: 44, b: 0, th: 90, sh: 0 }), B: st({ t: 12, a: 44, b: 115, th: 90, sh: 0 }) },
  curlinc:  { anchor: 'hip', at: [104, 128], eq: 'dumbbell', fix: 'inclineback', A: st({ t: -35, a: 15, b: 0, th: 82, sh: 0 }), B: st({ t: -35, a: 15, b: 135, th: 82, sh: 0 }) },
  wrist:    { anchor: 'hip', at: [92, 128], eq: 'dumbbell', fix: 'seat', A: st({ t: 24, a: 40, b: 40, th: 90, sh: 0 }), B: st({ t: 24, a: 40, b: 62, th: 90, sh: 0 }) },
  pushdown: { anchor: 'foot', at: [96, 178], eq: 'cable', cable: [150, 10], A: st({ t: 10, a: -8, b: 105 }), B: st({ t: 10, a: -8, b: 4 }) },
  kickback: { anchor: 'foot', at: [104, 178], eq: 'dumbbell', A: st({ t: 70, a: -158, b: -90, th: 18, sh: -8 }), B: st({ t: 70, a: -158, b: 0, th: 18, sh: -8 }) },
  ohext:    { anchor: 'foot', at: [104, 178], eq: 'dumbbell', A: st({ t: -2, a: 172, b: 145 }), B: st({ t: -2, a: 172, b: 0 }) },
  skull:    { anchor: 'hip', at: [118, 126], eq: 'barbell', fix: 'flatbench', A: st({ t: -90, a: 250, b: 0, th: 62, sh: 4 }), B: st({ t: -90, a: 250, b: 115, th: 62, sh: 4 }) },
  crunch:   { anchor: 'hip', at: [104, 170], fix: 'mat', A: st({ t: -90, a: 210, b: 150, th: 140, sh: 60, f: 0 }), B: st({ t: -52, a: 210, b: 150, th: 140, sh: 60, f: 0 }) },
  cablecr:  { anchor: 'knee', at: [100, 174], eq: 'cable', cable: [104, 6], fix: 'mat', A: st({ t: 18, a: 165, b: 150, th: 0, sh: -90, f: 0 }), B: st({ t: 82, a: 165, b: 150, th: -10, sh: -90, f: 0 }) },
  legraise: { anchor: 'hand', at: [104, 24], fix: 'bar', A: st({ t: 0, a: 180, b: 0, th: 4, sh: 4 }), B: st({ t: -14, a: 180, b: 0, th: 98, sh: 98 }) },
  abwheel:  { anchor: 'knee', at: [80, 174], eq: 'wheel', fix: 'mat', A: st({ t: 42, a: -36, b: 0, th: 4, sh: -90, f: 0 }), B: st({ t: 82, a: 6, b: 0, th: -48, sh: -90, f: 0 }) },
  russian:  { anchor: 'hip', at: [104, 166], fix: 'mat', eq: 'kbchest', A: st({ t: -38, a: 40, b: 70, th: 132, sh: 64 }), B: st({ t: -44, a: 80, b: 50, th: 128, sh: 62 }) },
  plank:    { anchor: 'foot', at: [166, 176], fix: 'mat', A: st({ t: -77.6, a: 77.6, b: -90, th: 77.6, sh: 77.6, f: 70 }), B: st({ t: -76.8, a: 76.8, b: -90, th: 76.8, sh: 76.8, f: 70 }) },
  swing:    { anchor: 'foot', at: [104, 178], eq: 'kb', A: st({ t: 62, a: -84, b: 0, th: 32, sh: -16 }), B: st({ t: -2, a: 96, b: 0 }) },
  thruster: { anchor: 'foot', at: [104, 178], eq: 'barbell', A: st({ t: 20, a: 60, b: 173, th: 95, sh: -34 }), B: st({ t: -3, a: 178, b: 0 }) },
  burpee:   { anchor: 'foot', at: [104, 178], A: st({ t: 40, a: -40 + 10, b: 0, th: 100, sh: -40 }), B: st({ t: -2, a: 172, b: 0, lift: 14, f: 20 }) },
  farmer:   { anchor: 'hip', at: [104, 101], eq: 'dumbbell', alt: true, A: st({ t: 2, th: 22, sh: 2, a: -6 }), B: st({ t: 2, th: -18, sh: -28, a: 6 }) },
  run:      { anchor: 'hip', at: [104, 104], alt: true, A: st({ t: 12, a: 40, b: 85, th: 45, sh: -10 }), B: st({ t: 12, a: -45, b: 95, th: -25, sh: -85 }) },
  walk:     { anchor: 'hip', at: [104, 101], alt: true, A: st({ t: 3, a: 18, b: 15, th: 20, sh: 4 }), B: st({ t: 3, a: -18, b: 15, th: -18, sh: -30 }) },
  bike:     { anchor: 'hip', at: [92, 104], fix: 'bike', alt: true, A: st({ t: 42, a: 28, b: 10, th: 30, sh: -15 }), B: st({ t: 42, a: 28, b: 10, th: 95, sh: 30 }) },
  rower:    { anchor: 'foot', at: [168, 156], eq: 'cable', cable: [196, 140], fix: 'rower', A: st({ t: 32, a: 58, b: 0, th: 142, sh: 40, f: -80 }), B: st({ t: -22, a: -30, b: 128, th: 92, sh: 92, f: -85 }) },
  rope:     { anchor: 'foot', at: [104, 178], eq: 'rope', A: st({ a: 22, b: 55, f: 15 }), B: st({ a: 22, b: 55, lift: 10, f: 35 }) },
  stand:    { anchor: 'foot', at: [104, 178], A: st({}), B: st({ a: 10, b: 20 }) }
};
const EX_MOVE = {
  dc: 'bench', dch: 'bench', dcm: 'bench', dib: 'incline', dih: 'incline', dd: 'decline', ecarte: 'fly', ecartep: 'cablefly', pecdeck: 'pecdeck', pompes: 'pushup', dips: 'dips',
  sdt: 'deadlift', tractions: 'pullup', chinup: 'pullup', tirage: 'pulldown', rowing: 'row', rowh: 'rowdb', rowpoulie: 'cablerow', tbar: 'row', pullover: 'pullover', shrug: 'shrug', hyper: 'hyper',
  dm: 'ohp', dmh: 'ohpdb', dmm: 'ohpseat', arnold: 'ohpdb', elev: 'raise', elevp: 'raisec', front: 'raise', oiseau: 'revfly', facepull: 'facepull',
  curlb: 'curl', curlh: 'curldb', marteau: 'curldb', curlp: 'curlc', pupitre: 'preacher', curlinc: 'curlinc',
  pushdown: 'pushdown', barfront: 'skull', extoh: 'ohext', dcs: 'bench', kickback: 'kickback',
  squat: 'squat', frontsq: 'frontsq', presse: 'press', hack: 'hack', legext: 'legext', fentes: 'lunge', bulgare: 'split', gobelet: 'goblet',
  sdtjt: 'rdl', legcurl: 'legcurl', legcurla: 'legcurla', goodmorning: 'goodmorn', hipthrust: 'hipthrust', abduc: 'abduc', adduc: 'abduc', glutekb: 'glutekb',
  mollets: 'calf', molletsa: 'calf', crunch: 'crunch', crunchp: 'cablecr', releve: 'legraise', abwheel: 'abwheel', russian: 'russian', gainage: 'plank',
  wristcurl: 'wrist', kbswing: 'swing', thruster: 'thruster', burpees: 'burpee', farmer: 'farmer',
  course: 'run', velo: 'bike', rameur: 'rower', elliptique: 'walk', marche: 'walk', corde: 'rope'
};
const EQ_OVERRIDE = { dch: 'dumbbell', dcm: 'handle', dih: 'dumbbell', tbar: 'barbell', dcs: 'barbell', arnold: 'dumbbell', marteau: 'dumbbell', front: 'dumbbell', molletsa: 'dumbbell' };
const MOVE_BY_MUSCLE = { 'Pectoraux': 'bench', 'Dos': 'row', 'Épaules': 'ohpdb', 'Biceps': 'curldb', 'Triceps': 'pushdown', 'Quadriceps': 'squat', 'Ischios': 'rdl', 'Fessiers': 'hipthrust', 'Adducteurs': 'abduc', 'Mollets': 'calf', 'Abdos': 'crunch', 'Avant-bras': 'wrist', 'Corps entier': 'thruster', 'Cardio': 'run' };

// ---------- Muscles sollicités ----------
// régions de la carte : pecs delts biceps forearms abs obliques quads adductors tibialis | traps reardelts lats triceps lowback glutes hams calves
const MUS = {
  dc: ['pecs', 'triceps delts'], dch: ['pecs', 'triceps delts'], dcm: ['pecs', 'triceps delts'], dib: ['pecs', 'delts triceps'], dih: ['pecs', 'delts triceps'], dd: ['pecs', 'triceps'],
  ecarte: ['pecs', 'delts'], ecartep: ['pecs', 'delts'], pecdeck: ['pecs', 'delts'], pompes: ['pecs', 'triceps delts abs'], dips: ['pecs triceps', 'delts'],
  sdt: ['hams glutes lowback', 'quads traps forearms lats'], tractions: ['lats', 'biceps reardelts forearms'], chinup: ['lats biceps', 'forearms'], tirage: ['lats', 'biceps reardelts'],
  rowing: ['traps', 'lats reardelts biceps lowback'], rowh: ['traps', 'lats reardelts biceps'], rowpoulie: ['traps', 'lats biceps reardelts'], tbar: ['traps', 'lats reardelts biceps'],
  pullover: ['lats', 'pecs triceps'], shrug: ['traps', 'forearms'], hyper: ['lowback', 'glutes hams'],
  dm: ['delts', 'triceps traps'], dmh: ['delts', 'triceps'], dmm: ['delts', 'triceps'], arnold: ['delts', 'triceps'], elev: ['delts', 'traps'], elevp: ['delts', 'traps'], front: ['delts', 'pecs'],
  oiseau: ['reardelts', 'traps'], facepull: ['reardelts', 'traps biceps'],
  curlb: ['biceps', 'forearms'], curlh: ['biceps', 'forearms'], marteau: ['biceps', 'forearms'], curlp: ['biceps', 'forearms'], pupitre: ['biceps', 'forearms'], curlinc: ['biceps', 'forearms'],
  pushdown: ['triceps', ''], barfront: ['triceps', ''], extoh: ['triceps', ''], dcs: ['triceps pecs', 'delts'], kickback: ['triceps', ''],
  squat: ['quads glutes', 'hams lowback adductors'], frontsq: ['quads', 'glutes abs'], presse: ['quads glutes', 'hams adductors'], hack: ['quads', 'glutes'], legext: ['quads', ''],
  fentes: ['quads glutes', 'hams adductors'], bulgare: ['quads glutes', 'hams'], gobelet: ['quads glutes', 'abs adductors'],
  sdtjt: ['hams glutes', 'lowback'], legcurl: ['hams', 'calves'], legcurla: ['hams', 'calves'], goodmorning: ['hams lowback', 'glutes'], hipthrust: ['glutes', 'hams'], abduc: ['glutes', ''], adduc: ['adductors', ''], glutekb: ['glutes', 'hams'],
  mollets: ['calves', ''], molletsa: ['calves', ''], crunch: ['abs', 'obliques'], crunchp: ['abs', 'obliques'], releve: ['abs', 'obliques'], abwheel: ['abs', 'lats obliques'], russian: ['obliques', 'abs'], gainage: ['abs', 'obliques delts'],
  wristcurl: ['forearms', ''], kbswing: ['glutes hams', 'lowback delts'], thruster: ['quads delts', 'glutes triceps'], burpees: ['quads pecs', 'delts abs glutes'], farmer: ['forearms', 'traps abs'],
  course: ['quads calves', 'hams glutes'], velo: ['quads', 'calves hams glutes'], rameur: ['lats quads', 'hams biceps'], elliptique: ['quads glutes', 'calves'], marche: ['calves quads', 'glutes'], corde: ['calves', 'quads delts']
};
const MUS_BY_GROUP = { 'Pectoraux': 'pecs', 'Dos': 'lats traps', 'Épaules': 'delts', 'Biceps': 'biceps', 'Triceps': 'triceps', 'Quadriceps': 'quads', 'Ischios': 'hams', 'Fessiers': 'glutes', 'Adducteurs': 'adductors', 'Mollets': 'calves', 'Abdos': 'abs', 'Avant-bras': 'forearms', 'Corps entier': 'quads glutes delts', 'Cardio': 'quads calves' };
const MUS_NAME = { pecs: 'Pectoraux', delts: 'Épaules', biceps: 'Biceps', forearms: 'Avant-bras', abs: 'Abdominaux', obliques: 'Obliques', quads: 'Quadriceps', adductors: 'Adducteurs', tibialis: 'Tibias', traps: 'Trapèzes', reardelts: 'Arrière d’épaule', lats: 'Grand dorsal', triceps: 'Triceps', lowback: 'Lombaires', glutes: 'Fessiers', hams: 'Ischio-jambiers', calves: 'Mollets' };
function musclesOf(X) {
  const m = MUS[X.id]; if (m) return { p: m[0].split(' ').filter(Boolean), s: (m[1] || '').split(' ').filter(Boolean) };
  return { p: (MUS_BY_GROUP[X.muscle] || '').split(' ').filter(Boolean), s: [] };
}
// partie du mannequin à faire briller pour chaque région
const SEG_OF = { pecs: 'chest', delts: 'shoulder', reardelts: 'shoulder', biceps: 'ua', triceps: 'ua', forearms: 'fa', abs: 'abs', obliques: 'abs', lowback: 'lowback', lats: 'back', traps: 'back', quads: 'thigh', adductors: 'thigh', hams: 'thigh', glutes: 'glute', calves: 'shin', tibialis: 'shin' };

// ---------- Dessin du mannequin ----------
const C = { near: '#e3e5e9', nearHi: '#ffffff', line: '#9aa0aa', far: '#c4c8cf', farHi: '#d9dce1', farLine: '#a7adb6', skin: '#e3e5e9', hair: '#7d838d', eq: '#3b3f47', eqDark: '#17191d', fix: '#c3c7ce', fixHi: '#2a2d33', muscle: '#ee5a3c', muscleHi: '#ff9a7c', muscleLine: '#b8391f' };
const seg = (P1, P2, w, col, hi, cls = '') => `<line x1="${P1[0].toFixed(1)}" y1="${P1[1].toFixed(1)}" x2="${P2[0].toFixed(1)}" y2="${P2[1].toFixed(1)}" stroke="${col === C.near ? C.line : C.farLine}" stroke-width="${w + 2.2}" stroke-linecap="round"/>
  <line x1="${P1[0].toFixed(1)}" y1="${P1[1].toFixed(1)}" x2="${P2[0].toFixed(1)}" y2="${P2[1].toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" class="${cls}"/>
  <line x1="${P1[0].toFixed(1)}" y1="${(P1[1] - w * .18).toFixed(1)}" x2="${P2[0].toFixed(1)}" y2="${(P2[1] - w * .18).toFixed(1)}" stroke="${hi}" stroke-width="${(w * .32).toFixed(1)}" stroke-linecap="round" opacity=".55" class="${cls}"/>`;
const glowSeg = (P1, P2, w) => { const m = [(P1[0] * .82 + P2[0] * .18), (P1[1] * .82 + P2[1] * .18)], n = [(P1[0] * .2 + P2[0] * .8), (P1[1] * .2 + P2[1] * .8)];
  return `<line x1="${m[0].toFixed(1)}" y1="${m[1].toFixed(1)}" x2="${n[0].toFixed(1)}" y2="${n[1].toFixed(1)}" stroke="${C.muscleLine}" stroke-width="${w * .86}" stroke-linecap="round"/>
  <line x1="${m[0].toFixed(1)}" y1="${m[1].toFixed(1)}" x2="${n[0].toFixed(1)}" y2="${n[1].toFixed(1)}" stroke="${C.muscle}" stroke-width="${w * .7}" stroke-linecap="round"/>
  <line x1="${m[0].toFixed(1)}" y1="${(m[1] - w * .14).toFixed(1)}" x2="${n[0].toFixed(1)}" y2="${(n[1] - w * .14).toFixed(1)}" stroke="${C.muscleHi}" stroke-width="${(w * .22).toFixed(1)}" stroke-linecap="round" opacity=".8"/>`; };
function torsoPoly(P, part) {
  // buste trapézoïdal ; normale « avant » = perpendiculaire au buste
  const u = P.tu, n = [-u[1], u[0]]; // tourne de 90° : vers l’avant du corps
  const at = (k, off) => [P.H[0] + u[0] * k + n[0] * off, P.H[1] + u[1] * k + n[1] * off];
  const L = BONE.torso;
  const shapes = {
    body: [at(0, -8), at(0, 8), at(L * .55, 7.5), at(L, 10), at(L, -9), at(L * .5, -8)],
    chest: [at(L * .58, 0), at(L * .58, 8), at(L - 1, 10), at(L - 1, 0)],
    abs: [at(4, 0), at(4, 8), at(L * .58, 8), at(L * .58, 0)],
    back: [at(L * .45, -8), at(L * .45, 0), at(L - 1, 0), at(L - 1, -9)],
    lowback: [at(4, -8), at(4, 0), at(L * .45, 0), at(L * .45, -8)]
  };
  return shapes[part].map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
}
function drawFigure(P, hl, eq, mv) {
  const has = s => hl.includes(s);
  let g = '';
  // ombre au sol
  const gx = (P.An[0] + P.An2[0] + P.H[0]) / 3;
  g += `<ellipse cx="${gx.toFixed(1)}" cy="182" rx="38" ry="4.5" fill="#1b2330" opacity=".14"/>`;
  // membres côté opposé (plus sombres = profondeur)
  g += seg(P.H, P.K2, 11, C.far, C.farHi) + seg(P.K2, P.An2, 9, C.far, C.farHi) + seg(P.An2, P.T2, 6, C.far, C.farHi);
  g += seg(P.S, P.E2, 8, C.far, C.farHi) + seg(P.E2, P.W2, 7, C.far, C.farHi);
  if (eq === 'dumbbell') g += dumbbell(P.W2, true);
  // buste
  g += `<polygon points="${torsoPoly(P, 'body')}" fill="${C.near}" stroke="${C.line}" stroke-width="5.5" stroke-linejoin="round"/><polygon points="${torsoPoly(P, 'body')}" fill="${C.near}" stroke="${C.near}" stroke-width="3" stroke-linejoin="round"/>`;
  for (const part of ['chest', 'abs', 'back', 'lowback']) if (has(part)) g += `<polygon points="${torsoPoly(P, part)}" fill="${C.muscle}" stroke="${C.muscleLine}" stroke-width="1.2" stroke-linejoin="round"/>`;
  if (has('glute')) g += `<circle cx="${(P.H[0] - P.tu[1] * -6).toFixed(1)}" cy="${(P.H[1] + P.tu[0] * -6).toFixed(1)}" r="7.5" fill="${C.muscle}" stroke="${C.muscleLine}" stroke-width="1.2"/>`;
  // tête
  g += `<circle cx="${P.head[0].toFixed(1)}" cy="${P.head[1].toFixed(1)}" r="9" fill="${C.skin}" stroke="${C.line}" stroke-width="1.4"/><path d="M${(P.head[0] - 8.5).toFixed(1)} ${(P.head[1] - 1).toFixed(1)} a8.5 8.5 0 0 1 17 0 q-8.5 -4 -17 0z" fill="${C.hair}" transform="rotate(${(P.tu ? Math.atan2(P.tu[0], -P.tu[1]) * 180 / Math.PI : 0).toFixed(1)} ${P.head[0].toFixed(1)} ${P.head[1].toFixed(1)})"/>`;
  // jambe proche
  g += seg(P.H, P.K, 12, C.near, C.nearHi) + seg(P.K, P.An, 10, C.near, C.nearHi) + seg(P.An, P.T, 7, C.near, C.nearHi);
  if (has('thigh')) g += glowSeg(P.H, P.K, 11);
  if (has('shin')) g += glowSeg(P.K, P.An, 9);
  // bras proche
  g += seg(P.S, P.E, 9, C.near, C.nearHi) + seg(P.E, P.W, 8, C.near, C.nearHi);
  if (has('ua')) g += glowSeg(P.S, P.E, 8.5);
  if (has('fa')) g += glowSeg(P.E, P.W, 7.5);
  if (has('shoulder')) g += `<circle cx="${P.S[0].toFixed(1)}" cy="${P.S[1].toFixed(1)}" r="6.8" fill="${C.muscle}" stroke="${C.muscleLine}" stroke-width="1.2"/>`;
  // articulations

  g += equipment(P, eq, mv);
  return g;
}
function dumbbell(W, far) {
  const c = far ? '#3b3f47' : C.eqDark;
  return `<rect x="${(W[0] - 9).toFixed(1)}" y="${(W[1] - 1.8).toFixed(1)}" width="18" height="3.6" rx="1.8" fill="#8d939c"/><circle cx="${(W[0] - 9).toFixed(1)}" cy="${W[1].toFixed(1)}" r="6" fill="${c}"/><circle cx="${(W[0] + 9).toFixed(1)}" cy="${W[1].toFixed(1)}" r="6" fill="${c}"/>`;
}
function equipment(P, eq, mv) {
  const W = P.W;
  switch (eq) {
    case 'barbell': return `<circle cx="${W[0].toFixed(1)}" cy="${W[1].toFixed(1)}" r="15" fill="${C.eqDark}"/><circle cx="${W[0].toFixed(1)}" cy="${W[1].toFixed(1)}" r="11" fill="none" stroke="${C.eq}" stroke-width="1.5"/><circle cx="${W[0].toFixed(1)}" cy="${W[1].toFixed(1)}" r="3" fill="#9aa0aa"/>`;
    case 'barhip': return `<circle cx="${P.H[0].toFixed(1)}" cy="${(P.H[1] - 10).toFixed(1)}" r="13" fill="${C.eqDark}"/><circle cx="${P.H[0].toFixed(1)}" cy="${(P.H[1] - 10).toFixed(1)}" r="9" fill="${C.eq}"/>`;
    case 'dumbbell': return dumbbell(W, false);
    case 'kb': return `<circle cx="${W[0].toFixed(1)}" cy="${(W[1] + 8).toFixed(1)}" r="8" fill="${C.eq}"/><path d="M${(W[0] - 5).toFixed(1)} ${(W[1] + 2).toFixed(1)} q5 -8 10 0" stroke="${C.eq}" stroke-width="2.5" fill="none"/>`;
    case 'kbchest': return `<circle cx="${W[0].toFixed(1)}" cy="${(W[1] + 3).toFixed(1)}" r="8" fill="${C.eq}"/>`;
    case 'handle': return `<rect x="${(W[0] - 3).toFixed(1)}" y="${(W[1] - 7).toFixed(1)}" width="6" height="14" rx="3" fill="${C.eq}"/>`;
    case 'wheel': return `<circle cx="${W[0].toFixed(1)}" cy="${(W[1] + 3).toFixed(1)}" r="9" fill="none" stroke="${C.eq}" stroke-width="4"/>`;
    case 'cable': return `<line x1="${W[0].toFixed(1)}" y1="${W[1].toFixed(1)}" x2="${mv.cable[0]}" y2="${mv.cable[1]}" stroke="${C.eq}" stroke-width="1.6" opacity=".8"/><circle cx="${mv.cable[0]}" cy="${mv.cable[1]}" r="5" fill="${C.fixHi}" stroke="${C.eq}" stroke-width="1.5"/><rect x="${(W[0] - 4).toFixed(1)}" y="${(W[1] - 4).toFixed(1)}" width="8" height="8" rx="2" fill="${C.eq}"/>`;
    case 'cableankle': return `<line x1="${P.An[0].toFixed(1)}" y1="${P.An[1].toFixed(1)}" x2="20" y2="170" stroke="${C.eq}" stroke-width="1.6" opacity=".8"/><circle cx="20" cy="170" r="5" fill="${C.fixHi}" stroke="${C.eq}" stroke-width="1.5"/>`;
    case 'rope': return `<path d="M${W[0].toFixed(1)} ${W[1].toFixed(1)} Q ${P.H[0]} 196 ${(P.W2[0]).toFixed(1)} ${P.W2[1].toFixed(1)}" stroke="${C.eq}" stroke-width="1.6" fill="none" opacity=".7"/>`;
    default: return '';
  }
}
function fixture(name, P) {
  const r = (x, y, w, h, c = C.fix, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" ${extra}/>`;
  switch (name) {
    case 'flatbench': return r(P.H[0] - 82, P.H[1] + 5, 100, 7, C.fixHi) + r(P.H[0] - 70, P.H[1] + 12, 5, 182 - P.H[1] - 12) + r(P.H[0], P.H[1] + 12, 5, 182 - P.H[1] - 12);
    case 'inclinebench': return `<line x1="${P.H[0] + 10}" y1="${P.H[1] + 7}" x2="${P.H[0] - 52}" y2="${P.H[1] - 42}" stroke="${C.fixHi}" stroke-width="7" stroke-linecap="round"/>` + r(P.H[0] - 6, P.H[1] + 8, 5, 182 - P.H[1] - 8) + r(P.H[0] - 44, P.H[1] - 30, 5, 212 - P.H[1]);
    case 'declinebench': return `<line x1="${P.H[0] + 12}" y1="${P.H[1] + 5}" x2="${P.H[0] - 60}" y2="${P.H[1] + 30}" stroke="${C.fixHi}" stroke-width="7" stroke-linecap="round"/>` + r(P.H[0] - 30, P.H[1] + 22, 5, 182 - P.H[1] - 22);
    case 'inclineback': return `<line x1="${P.H[0] + 6}" y1="${P.H[1] + 7}" x2="${P.H[0] - 32}" y2="${P.H[1] - 48}" stroke="${C.fixHi}" stroke-width="7" stroke-linecap="round"/>` + r(P.H[0] - 14, P.H[1] + 8, 30, 6, C.fixHi) + r(P.H[0] - 2, P.H[1] + 14, 5, 182 - P.H[1] - 14);
    case 'seat': return r(P.H[0] - 16, P.H[1] + 6, 36, 7, C.fixHi) + r(P.H[0] - 2, P.H[1] + 13, 6, 182 - P.H[1] - 13) + `<line x1="${P.H[0] - 14}" y1="${P.H[1] + 6}" x2="${P.H[0] - 20}" y2="${P.H[1] - 44}" stroke="${C.fixHi}" stroke-width="6" stroke-linecap="round"/>`;
    case 'floorbench': return r(P.H[0] - 22, P.H[1] + 6, 110, 6, C.fixHi) + `<rect x="${P.An[0] - 2}" y="${P.An[1] - 14}" width="6" height="22" rx="2" fill="${C.fixHi}"/>`;
    case 'backpad': return `<line x1="${P.H[0] - 12}" y1="${P.H[1] + 8}" x2="${P.S[0] - 10}" y2="${P.S[1] - 6}" stroke="${C.fixHi}" stroke-width="7" stroke-linecap="round"/>` + r(70, 176, 80, 6);
    case 'legpress': return r(P.H[0] - 20, P.H[1] + 6, 40, 7, C.fixHi) + `<line x1="${P.H[0] - 18}" y1="${P.H[1] + 6}" x2="${P.H[0] - 50}" y2="${P.H[1] - 40}" stroke="${C.fixHi}" stroke-width="7" stroke-linecap="round"/>`
      + `<line x1="${(P.T[0] - 12).toFixed(1)}" y1="${(P.T[1] - 14).toFixed(1)}" x2="${(P.T[0] + 10).toFixed(1)}" y2="${(P.T[1] + 10).toFixed(1)}" stroke="${C.eq}" stroke-width="5" stroke-linecap="round"/>` + r(P.H[0] - 4, P.H[1] + 13, 6, 182 - P.H[1] - 13);
    case 'rearbench': return r(P.An2[0] - 22, P.An2[1] + 4, 40, 7, C.fixHi) + r(P.An2[0] - 6, P.An2[1] + 11, 5, 182 - P.An2[1] - 11);
    case 'thrustbench': return r(P.S[0] - 40, P.S[1] + 5, 46, 7, C.fixHi) + r(P.S[0] - 20, P.S[1] + 12, 5, 182 - P.S[1] - 12);
    case 'hyperpad': return `<line x1="${P.H[0] + 6}" y1="${P.H[1] + 6}" x2="${P.H[0] - 22}" y2="${P.H[1] + 22}" stroke="${C.fixHi}" stroke-width="8" stroke-linecap="round"/>` + r(P.H[0] - 12, P.H[1] + 18, 5, 182 - P.H[1] - 18) + `<line x1="${(P.An[0] - 6).toFixed(1)}" y1="${(P.An[1] + 4).toFixed(1)}" x2="${(P.An[0] + 6).toFixed(1)}" y2="${(P.An[1] + 10).toFixed(1)}" stroke="${C.fixHi}" stroke-width="7" stroke-linecap="round"/>`;
    case 'preacher': return r(P.H[0] - 16, P.H[1] + 6, 36, 7, C.fixHi) + `<line x1="${P.S[0] + 4}" y1="${P.S[1] + 6}" x2="${P.E[0] + 4}" y2="${P.E[1] + 6}" stroke="${C.fixHi}" stroke-width="9" stroke-linecap="round"/>` + r(P.H[0] - 2, P.H[1] + 13, 6, 182 - P.H[1] - 13);
    case 'dipbars': return `<line x1="${P.W[0] - 30}" y1="${P.W[1] + 4}" x2="${P.W[0] + 30}" y2="${P.W[1] + 4}" stroke="${C.eq}" stroke-width="4" stroke-linecap="round"/>` + r(P.W[0] + 22, P.W[1] + 4, 4, 182 - P.W[1] - 4) + r(P.W[0] - 26, P.W[1] + 4, 4, 182 - P.W[1] - 4);
    case 'bar': return `<line x1="40" y1="${P.W[1] - 3}" x2="180" y2="${P.W[1] - 3}" stroke="${C.eq}" stroke-width="4" stroke-linecap="round"/><line x1="44" y1="${P.W[1] - 3}" x2="44" y2="182" stroke="${C.fixHi}" stroke-width="4"/><line x1="176" y1="${P.W[1] - 3}" x2="176" y2="182" stroke="${C.fixHi}" stroke-width="4"/>`;
    case 'step': return r(P.T[0] - 26, P.T[1] + 1, 34, 9, C.fixHi);
    case 'mat': return r(20, 179, 170, 4, C.fixHi);
    case 'bike': return `<circle cx="${P.H[0] - 26}" cy="166" r="14" fill="none" stroke="${C.fixHi}" stroke-width="4"/><circle cx="${P.H[0] + 66}" cy="166" r="14" fill="none" stroke="${C.fixHi}" stroke-width="4"/>`
      + `<path d="M${P.H[0] - 26} 166 L${P.H[0]} ${P.H[1] + 6} L${P.H[0] + 50} ${P.H[1] + 4} L${P.H[0] + 66} 166 M${P.H[0] + 8} 152 L${P.H[0]} ${P.H[1] + 6} M${P.H[0] + 50} ${P.H[1] + 4} l6 -14" stroke="${C.fixHi}" stroke-width="4" fill="none" stroke-linejoin="round"/><circle cx="${P.H[0] + 8}" cy="152" r="5" fill="${C.fixHi}"/>`;
    case 'rower': return r(20, 158, 176, 6, C.fixHi) + r(P.H[0] - 12, P.H[1] + 5, 24, 6, C.eqDark);
    default: return '';
  }
}
const SVG_DEFS = `<defs><filter id="mglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="stagebg" cx="50%" cy="38%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6e9ee"/></radialGradient></defs>`;
function moveFor(X) {
  const key = EX_MOVE[X.id] || MOVE_BY_MUSCLE[X.muscle] || 'stand';
  const mv = MOVES[key];
  return { ...mv, eq: EQ_OVERRIDE[X.id] || mv.eq || 'none', key };
}
function frameSVG(X, k) {
  const mv = moveFor(X); const hl = [...new Set(musclesOf(X).p.map(m => SEG_OF[m]).filter(Boolean))];
  let pose = lerp(mv.A, mv.B, k);
  if (mv.alt) { const o = lerp(mv.B, mv.A, k); pose = { ...pose, th2: o.th, sh2: o.sh, a2: o.a, b2: o.b, f2: o.f }; }
  const P = poseSolve(pose, mv.anchor, mv.at);
  return fixture(mv.fix, P) + drawFigure(P, hl, mv.eq, mv);
}

// ---------- Carte des muscles (face / dos) ----------
const MAP_FRONT = {
  pecs: '<ellipse cx="41" cy="54" rx="9.5" ry="7"/><ellipse cx="59" cy="54" rx="9.5" ry="7"/>',
  delts: '<ellipse cx="27.5" cy="47" rx="6.5" ry="7.5"/><ellipse cx="72.5" cy="47" rx="6.5" ry="7.5"/><ellipse cx="137.5" cy="47" rx="6.5" ry="7.5"/><ellipse cx="182.5" cy="47" rx="6.5" ry="7.5"/>',
  biceps: '<ellipse cx="24" cy="67" rx="4.8" ry="10"/><ellipse cx="76" cy="67" rx="4.8" ry="10"/>',
  forearms: '<ellipse cx="20.5" cy="89" rx="4.2" ry="11"/><ellipse cx="79.5" cy="89" rx="4.2" ry="11"/><ellipse cx="130.5" cy="89" rx="4.2" ry="11"/><ellipse cx="189.5" cy="89" rx="4.2" ry="11"/>',
  abs: '<rect x="44" y="63" width="12" height="30" rx="5"/>',
  obliques: '<ellipse cx="38" cy="78" rx="3.8" ry="11"/><ellipse cx="62" cy="78" rx="3.8" ry="11"/>',
  quads: '<ellipse cx="41.5" cy="126" rx="7.5" ry="20"/><ellipse cx="58.5" cy="126" rx="7.5" ry="20"/>',
  adductors: '<ellipse cx="47.3" cy="113" rx="2.8" ry="10"/><ellipse cx="52.7" cy="113" rx="2.8" ry="10"/>',
  tibialis: '<ellipse cx="42" cy="170" rx="3.8" ry="14"/><ellipse cx="58" cy="170" rx="3.8" ry="14"/>'
};
const MAP_BACK = {
  traps: '<path d="M150 36 L160 32 L170 36 L166 58 L160 62 L154 58 Z"/>',
  reardelts: '<ellipse cx="137.5" cy="47" rx="6.5" ry="7.5"/><ellipse cx="182.5" cy="47" rx="6.5" ry="7.5"/>',
  lats: '<ellipse cx="148" cy="66" rx="8" ry="14"/><ellipse cx="172" cy="66" rx="8" ry="14"/>',
  triceps: '<ellipse cx="134" cy="67" rx="4.8" ry="10"/><ellipse cx="186" cy="67" rx="4.8" ry="10"/>',
  lowback: '<rect x="154" y="78" width="12" height="16" rx="5"/>',
  glutes: '<ellipse cx="152" cy="104" rx="8.5" ry="8"/><ellipse cx="168" cy="104" rx="8.5" ry="8"/>',
  hams: '<ellipse cx="151.5" cy="129" rx="7" ry="18"/><ellipse cx="168.5" cy="129" rx="7" ry="18"/>',
  calves: '<ellipse cx="152" cy="167" rx="5" ry="13"/><ellipse cx="168" cy="167" rx="5" ry="13"/>'
};
function silhouette(cx) {
  return `<circle cx="${cx}" cy="17" r="10.5"/><rect x="${cx - 4}" y="25" width="8" height="8" rx="3"/>
    <path d="M${cx - 21} 38 Q${cx} 32 ${cx + 21} 38 L${cx + 19} 72 Q${cx + 16} 96 ${cx + 17} 100 L${cx - 17} 100 Q${cx - 16} 96 ${cx - 19} 72 Z"/>
    <rect x="${cx - 31}" y="40" width="11" height="40" rx="5.5" transform="rotate(8 ${cx - 25} 40)"/><rect x="${cx + 20}" y="40" width="11" height="40" rx="5.5" transform="rotate(-8 ${cx + 25} 40)"/>
    <rect x="${cx - 34}" y="76" width="9" height="28" rx="4.5" transform="rotate(5 ${cx - 30} 76)"/><rect x="${cx + 25}" y="76" width="9" height="28" rx="4.5" transform="rotate(-5 ${cx + 30} 76)"/>
    <path d="M${cx - 17} 98 L${cx + 17} 98 L${cx + 16} 150 L${cx + 2} 150 L${cx} 112 L${cx - 2} 150 L${cx - 16} 150 Z"/>
    <rect x="${cx - 15}" y="148" width="11" height="42" rx="5"/><rect x="${cx + 4}" y="148" width="11" height="42" rx="5"/>`;
}
function muscleMapSVG(X, small = false) {
  const { p, s } = musclesOf(X);
  const paint = (map) => Object.entries(map).map(([k, d]) => `<g class="${p.includes(k) ? 'mm-p' : s.includes(k) ? 'mm-s' : 'mm-o'}">${d}</g>`).join('');
  return `<svg viewBox="0 0 210 198" class="${small ? 'mmini' : 'mmap'}" role="img" aria-label="Muscles sollicités">
    <g class="mm-body">${silhouette(50)}${silhouette(160)}</g>${paint(MAP_FRONT)}${paint(MAP_BACK)}
    ${small ? '' : `<text x="50" y="197" text-anchor="middle" class="mm-lab">Face</text><text x="160" y="197" text-anchor="middle" class="mm-lab">Dos</text>`}</svg>`;
}
function exVisualHTML(X) {
  const { p, s } = musclesOf(X);
  return `<div class="exvis"><svg viewBox="0 0 210 190" class="exstage" data-exanim="${esc(X.id)}" role="img" aria-label="Animation du mouvement : ${esc(X.name)}">${SVG_DEFS}<rect x="0" y="0" width="210" height="190" rx="18" fill="url(#stagebg)"/><line x1="10" y1="183" x2="200" y2="183" stroke="#d6dae0" stroke-width="1.5"/><g class="fig">${frameSVG(X, 0)}</g></svg>
    <div class="exmus">${muscleMapSVG(X)}<div class="small"><div><span class="dot" style="background:var(--accent)"></span> <b>Principal :</b> ${p.map(m => esc(MUS_NAME[m] || m)).join(', ') || '—'}</div>
    ${s.length ? `<div class="muted"><span class="dot" style="background:color-mix(in srgb, var(--accent) 40%, transparent)"></span> Secondaires : ${s.map(m => esc(MUS_NAME[m] || m)).join(', ')}</div>` : ''}</div></div></div>`;
}

// ---------- Boucle d’animation ----------
let ANIM_ON = false;
function animLoop(ts) {
  const els = document.querySelectorAll('[data-exanim]');
  if (!els.length) { ANIM_ON = false; return; }
  for (const el of els) {
    const X = exById(el.dataset.exanim); const mv = moveFor(X);
    const dur = mv.alt ? 1400 : 2600;
    const ph = (ts % dur) / dur;
    // aller-retour avec petits temps d’arrêt en haut et en bas
    const k = mv.alt ? (1 - Math.cos(ph * 2 * Math.PI)) / 2 : clamp((1 - Math.cos(ph * 2 * Math.PI)) / 2 * 1.15 - 0.075, 0, 1);
    const g = el.querySelector('.fig'); if (g) g.innerHTML = frameSVG(X, k);
  }
  requestAnimationFrame(animLoop);
}
function kickAnim() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!ANIM_ON) { ANIM_ON = true; requestAnimationFrame(animLoop); }
}
