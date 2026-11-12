// ============================================================
//  ANIMATIONS D’EXERCICES : photos libres de droits (free-exercise-db, domaine public)
//  deux images (départ / arrivée) qui alternent en boucle, trouvées d’après le nom de l’exercice
// ============================================================
const FEDB_URL = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';
// traduction des noms français (et des noms Hevy) vers les mots de la base anglaise
const FR_EN = [
  ['souleve de terre roumain', 'romanian deadlift'], ['souleve de terre jambes tendues', 'stiff legged deadlift'], ['souleve de terre sumo', 'sumo deadlift'], ['souleve de terre', 'deadlift'],
  ['developpe couche prise serree', 'close grip bench press'], ['developpe couche incline', 'incline bench press'], ['developpe couche decline', 'decline bench press'], ['developpe couche', 'bench press'],
  ['developpe incline', 'incline press'], ['developpe decline', 'decline press'], ['developpe militaire', 'military press'], ['developpe epaules', 'shoulder press'], ['developpe arnold', 'arnold press'], ['developpe nuque', 'behind the neck press'], ['developpe', 'press'],
  ['tirage poitrine', 'lat pulldown'], ['tirage vertical', 'lat pulldown'], ['tirage vers le visage', 'face pull'], ['tirage menton', 'upright row'], ['tirage horizontal', 'seated cable row'], ['tirage', 'pulldown'],
  ['rowing poulie assis', 'seated cable rows'], ['rowing assis', 'seated cable rows'], ['rowing barre t', 't-bar row'], ['rowing t-bar', 't-bar row'], ['rowing un bras', 'one arm row'], ['rowing', 'row'],
  ['elevations laterales', 'lateral raise'], ['elevation laterale', 'lateral raise'], ['elevations frontales', 'front raise'], ['elevation frontale', 'front raise'],
  ['arriere d epaule', 'rear delt'], ['oiseau', 'rear delt fly'], ['ecarte', 'fly'], ['pec deck', 'butterfly'], ['butterfly', 'butterfly'], ['cable crossover', 'cable crossover'],
  ['curl marteau', 'hammer curl'], ['curl pupitre', 'preacher curl'], ['curl incline', 'incline curl'], ['curl concentre', 'concentration curl'], ['curl derriere le dos', 'behind the back curl'], ['curl biceps', 'curl'],
  ['extension triceps', 'triceps extension'], ['extension nuque', 'overhead triceps extension'], ['barre au front', 'skullcrusher'], ['kickback triceps', 'tricep kickback'], ['pushdown', 'pushdown'],
  ['extension jambes', 'leg extensions'], ['leg extension', 'leg extensions'], ['leg curl assis', 'seated leg curl'], ['leg curl allonge', 'lying leg curls'], ['leg curl', 'leg curl'],
  ['presse a cuisses', 'leg press'], ['squat bulgare', 'split squat'], ['goblet squat', 'goblet squat'], ['front squat', 'front squat'], ['hack squat', 'hack squat'], ['squat a la ceinture', 'belt squat'],
  ['fentes', 'lunge'], ['fente', 'lunge'], ['hip thrust', 'hip thrust'], ['pont fessier', 'glute bridge'], ['kickback fessier', 'glute kickback'], ['abduction', 'thigh abductor'], ['adduction', 'thigh adductor'],
  ['mollets debout', 'standing calf raises'], ['mollets assis', 'seated calf raise'], ['mollets', 'calf raise'], ['extensions lombaires', 'hyperextensions'], ['good morning', 'good morning'],
  ['tractions supination', 'chin-up'], ['tractions', 'pullups'], ['traction', 'pullups'], ['pompes', 'pushups'], ['dips', 'dips'], ['pull-over', 'pullover'], ['pull over', 'pullover'], ['shrugs', 'shrug'], ['haussement', 'shrug'],
  ['releve de jambes', 'leg raise'], ['roue abdominale', 'ab roller'], ['russian twist', 'russian twist'], ['gainage', 'plank'], ['crunch', 'crunch'], ['abdominaux', 'crunch'], ['abdos', 'crunch'],
  ['kettlebell swing', 'kettlebell swing'], ['burpees', 'burpee'], ['velo', 'bicycling'], ['rameur', 'rowing stationary'], ['corde a sauter', 'rope jumping'], ['course', 'running'],
  // matériel et positions
  ['halteres', 'dumbbell'], ['haltere', 'dumbbell'], ['barre ez', 'ez-bar'], ['barre', 'barbell'], ['poulis', 'cable'], ['poulie', 'cable'], ['machine', 'machine'], ['smith', 'smith machine'], ['elastique', 'band'],
  ['assis', 'seated'], ['debout', 'standing'], ['allonge', 'lying'], ['incline', 'incline'], ['decline', 'decline'], ['un bras', 'one arm'], ['unilateral', 'one arm'], ['prise serree', 'close grip'], ['prise large', 'wide grip'], ['inverse', 'reverse'], ['leste', 'weighted']
];
const EQ_OF = { dumbbell: 'd', barbell: 'b', cable: 'c', machine: 'm', 'smith machine': 'm', band: 'n', 'ez-bar': 'z' };
const ewords = s => norm(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(w => w.length > 1).map(w => w.replace(/s$/, ''));
// correspondances vérifiées à la main (mots du nom français → fiche) ; testées dans l’ordre, la plus précise d’abord
const FEDB_FIX = [
  ['squat a la ceinture', null], ['abdominaux talons', 'Alternate_Heel_Touchers'],
  ['developpe couche incline halter', 'Incline_Dumbbell_Press'], ['developpe incline halter', 'Incline_Dumbbell_Press'], ['developpe couche prise serree', 'Close-Grip_Barbell_Bench_Press'],
  ['developpe couche halter', 'Dumbbell_Bench_Press'], ['developpe couche machine', 'Machine_Bench_Press'], ['developpe couche', 'Barbell_Bench_Press_-_Medium_Grip'],
  ['developpe militaire halter', 'Dumbbell_Shoulder_Press'], ['developpe epaules halter', 'Dumbbell_Shoulder_Press'],
  ['ecarte poulie', 'Cable_Crossover'], ['ecarte', 'Dumbbell_Flyes'], ['dips', 'Dips_-_Triceps_Version'],
  ['tirage poitrine', 'Wide-Grip_Lat_Pulldown'], ['tirage vertical', 'Wide-Grip_Lat_Pulldown'],
  ['rowing halter', 'One-Arm_Dumbbell_Row'], ['rowing barre t', 'T-Bar_Row_with_Handle'], ['rowing t bar', 'T-Bar_Row_with_Handle'], ['rowing barre', 'Bent_Over_Barbell_Row'],
  ['pull over', 'Rope_Straight-Arm_Pulldown'], ['extensions lombaires', 'Hyperextensions_Back_Extensions'],
  ['elevation laterale un bras', 'One-Arm_Side_Laterals'], ['elevations laterales poulie', 'Cable_Seated_Lateral_Raise'], ['elevation laterale poulie', 'Cable_Seated_Lateral_Raise'],
  ['elevations laterales', 'Side_Lateral_Raise'], ['elevation laterale', 'Side_Lateral_Raise'], ['elevations frontales', 'Front_Dumbbell_Raise'], ['elevation frontale', 'Front_Dumbbell_Raise'],
  ['oiseau', 'Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench'], ['curl marteau', 'Hammer_Curls'], ['curl derriere le dos', 'Standing_Biceps_Cable_Curl'], ['curl a la poulie', 'Standing_Biceps_Cable_Curl'],
  ['extension triceps poulie', 'Triceps_Pushdown'], ['extension nuque', 'Standing_Dumbbell_Triceps_Extension'], ['squat bulgare', 'Split_Squat_with_Dumbbells'],
  ['crunch a la poulie', 'Cable_Crunch'], ['crunch', 'Crunches']
];
let FEDB_IDX = null;
function fedbMatch(X) {
  if (typeof FEDB === 'undefined' || !X) return null;
  const nn = (' ' + norm(X.name).replace(/[^a-z0-9]+/g, ' ') + ' ').replace(/ halteres? /g, ' halter ');
  for (const [k, id] of FEDB_FIX) if (k.split(' ').every(w => nn.includes(' ' + w + ' ') || (w === 'halter' && / halter /.test(nn)))) return id;
  if (!FEDB_IDX) FEDB_IDX = FEDB.map(([id, name, eq]) => ({ id, eq, w: new Set(ewords(name)), n: ewords(name).length }));
  const src = ' ' + norm(X.name + ' ' + (X.equip || '')).replace(/[^a-z0-9]+/g, ' ') + ' ';
  let q = src; let eq = null;
  for (const [fr_, en] of FR_EN) { const k = ' ' + fr_ + ' '; if (q.includes(k)) { q = q.replace(k, ' ' + en + ' '); if (EQ_OF[en] && !eq) eq = EQ_OF[en]; } }
  const qw = ewords(q).filter(w => !['de', 'la', 'le', 'du', 'des', 'en', 'au', 'et', 'avec', 'the', 'prise', 'version'].includes(w));
  if (!qw.length) return null;
  let best = null, bs = 0;
  for (const e of FEDB_IDX) {
    let hit = 0; for (const w of qw) if (e.w.has(w)) hit++;
    if (!hit) continue;
    let sc = hit / qw.length + hit / e.n * 0.6 - (e.n - hit) * 0.04;
    if (eq) sc += e.eq === eq ? 0.35 : -0.15;
    if (sc > bs) { bs = sc; best = e; }
  }
  return bs >= 0.75 ? best.id : null;
}
function exAnimHTML(X) {
  const id = (X && X.fedb) || fedbMatch(X); if (!id) return '';
  const u = FEDB_URL + encodeURI(id) + '/';
  return `<div class="exanim" aria-label="Animation du mouvement"><img src="${u}0.jpg" alt="" loading="lazy" onerror="this.parentElement.remove()"><img src="${u}1.jpg" alt="" loading="lazy"></div>`;
}
if (typeof exVisualHTML === 'function') exVisualHTML = (orig => function (X) { return exAnimHTML(X) + orig.apply(this, arguments); })(exVisualHTML);
