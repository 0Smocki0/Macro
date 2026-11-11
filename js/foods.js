// Base d'aliments génériques intégrée (valeurs pour 100 g, d'après les tables CIQUAL / USDA, arrondies).
// Féculents, viandes et poissons : poids CRU (c'est ce qu'on pèse et ce qu'on achète).
// Champs : id, nom, rayon, kcal, protéines, glucides, lipides, fibres, rôles (menus), régime, unité [g, nom], bornes menu {min,max,round}
// Régime : m = viande, p = poisson/fruits de mer, a = produit animal (œuf, laitier, miel), '' = végétalien
const CATS = [
  'Viandes & poissons', 'Œufs & laitiers', 'Protéines végétales', 'Féculents & céréales',
  'Pain & petit-déj', 'Légumes', 'Fruits', 'Matières grasses & oléagineux', 'Épicerie & divers', 'Boissons'
];

const RAW_FOODS = [
  // Viandes & poissons
  ['poulet', 'Blanc de poulet (cru)', 0, 110, 23, 0, 1.8, 0, 'prot', 'm'],
  ['dinde', 'Escalope de dinde (crue)', 0, 107, 24, 0, 1.2, 0, 'prot', 'm'],
  ['boeuf5', 'Bœuf haché 5 % MG (cru)', 0, 125, 21, 0, 5, 0, 'prot', 'm', [125, 'steak']],
  ['boeuf15', 'Bœuf haché 15 % MG (cru)', 0, 210, 18, 0, 15, 0, '', 'm', [125, 'steak']],
  ['rumsteck', 'Rumsteck de bœuf (cru)', 0, 130, 22, 0, 4.5, 0, 'prot', 'm'],
  ['porc', 'Filet mignon de porc (cru)', 0, 120, 22, 0, 3.5, 0, 'prot', 'm'],
  ['jambon', 'Jambon blanc découenné', 0, 110, 20, 1, 3, 0, '', 'm', [40, 'tranche']],
  ['saumon', 'Saumon (cru)', 0, 200, 20, 0, 13, 0, 'prot', 'p'],
  ['cabillaud', 'Cabillaud (cru)', 0, 80, 18, 0, 0.7, 0, 'prot', 'p'],
  ['thon', 'Thon au naturel (égoutté)', 0, 115, 26, 0, 1, 0, 'prot', 'p', [112, 'boîte']],
  ['crevettes', 'Crevettes cuites décortiquées', 0, 95, 21, 0, 1.2, 0, 'prot', 'p'],
  ['sardines', "Sardines à l'huile (égouttées)", 0, 210, 24, 0, 13, 0, '', 'p', [90, 'boîte']],
  // Œufs & laitiers
  ['oeuf', 'Œuf entier', 1, 140, 12.5, 0.7, 9.8, 0, 'prot egg', 'a', [60, 'œuf'], { min: 120, max: 240, round: 60 }],
  ['blancoeuf', "Blanc d'œuf", 1, 48, 10.5, 0.7, 0.2, 0, '', 'a'],
  ['fb0', 'Fromage blanc 0 %', 1, 47, 7.5, 4, 0.1, 0, 'pdjp', 'a'],
  ['fb3', 'Fromage blanc 3 %', 1, 75, 7, 4, 3.2, 0, 'pdjp', 'a'],
  ['skyr', 'Skyr nature', 1, 60, 10.5, 4, 0.2, 0, 'pdjp', 'a', [150, 'pot']],
  ['yaourt', 'Yaourt nature', 1, 52, 4.3, 5.5, 1.3, 0, '', 'a', [125, 'pot']],
  ['grec', 'Yaourt à la grecque', 1, 120, 5, 4, 10, 0, 'pdjp', 'a'],
  ['cottage', 'Cottage cheese', 1, 98, 11, 3.4, 4.3, 0, 'pdjp', 'a'],
  ['lait', 'Lait demi-écrémé', 1, 46, 3.3, 4.8, 1.6, 0, 'lait', 'a', [250, 'verre (ml)']],
  ['emmental', 'Emmental', 1, 380, 28, 0, 29.5, 0, '', 'a', [30, 'portion']],
  ['mozza', 'Mozzarella', 1, 250, 18, 1, 19, 0, '', 'a', [125, 'boule']],
  ['feta', 'Feta', 1, 265, 15, 1, 22, 0, 'mg', 'a', null, { min: 0, max: 50 }],
  ['parmesan', 'Parmesan', 1, 400, 33, 0, 29, 0, 'mg', 'a', null, { min: 0, max: 20 }],
  // Protéines végétales
  ['tofu', 'Tofu ferme nature', 2, 130, 13.5, 1.5, 7.5, 1, 'prot', '', null, { min: 100, max: 300 }],
  ['tempeh', 'Tempeh', 2, 190, 19, 9, 11, 5, 'prot', '', null, { min: 80, max: 250 }],
  ['lentilles', 'Lentilles vertes (crues)', 2, 330, 25, 48, 1.6, 11, 'prot', '', null, { min: 40, max: 130 }],
  ['poischiches', 'Pois chiches (conserve, égouttés)', 2, 140, 7.5, 17, 2.5, 6, 'prot', '', null, { min: 100, max: 300 }],
  ['pst', 'Protéines de soja texturées (sèches)', 2, 340, 50, 15, 1, 17, 'prot', '', null, { min: 30, max: 100 }],
  ['seitan', 'Seitan nature', 2, 125, 22, 5, 2, 1, 'prot', '', null, { min: 100, max: 250 }],
  ['haricotsrouges', 'Haricots rouges (conserve, égouttés)', 2, 115, 8, 15, 0.5, 6.5, '', ''],
  ['yaourtsoja', 'Yaourt au soja nature', 2, 45, 4, 2, 2.3, 0.5, 'pdjp', '', [100, 'pot']],
  ['soja', 'Boisson au soja nature', 2, 33, 3.3, 0.5, 1.9, 0.5, 'lait', '', [250, 'verre (ml)']],
  // Féculents & céréales
  ['riz', 'Riz basmati (cru)', 3, 355, 8, 78, 0.8, 1.5, 'fec', ''],
  ['rizcomplet', 'Riz complet (cru)', 3, 355, 7.5, 74, 2.7, 3.5, 'fec', ''],
  ['pates', 'Pâtes (crues)', 3, 355, 12.5, 71, 1.5, 3, 'fec', ''],
  ['patescompletes', 'Pâtes complètes (crues)', 3, 345, 13, 64, 2.5, 8, 'fec', ''],
  ['quinoa', 'Quinoa (cru)', 3, 370, 14, 64, 6, 7, 'fec', ''],
  ['semoule', 'Semoule de couscous (crue)', 3, 360, 12.5, 72, 1.5, 3.5, 'fec', ''],
  ['boulgour', 'Boulgour (cru)', 3, 345, 12, 64, 1.5, 9, 'fec', ''],
  ['pdt', 'Pomme de terre (crue)', 3, 80, 2, 17, 0.1, 1.8, 'fec', '', null, { min: 150, max: 550 }],
  ['patatedouce', 'Patate douce (crue)', 3, 86, 1.6, 20, 0.1, 3, 'fec', '', null, { min: 150, max: 500 }],
  // Pain & petit-déj
  ['avoine', "Flocons d'avoine", 4, 375, 13.5, 59, 7, 10, 'pdjc', '', null, { min: 30, max: 120 }],
  ['muesli', 'Muesli sans sucres ajoutés', 4, 365, 10, 60, 7, 9, 'pdjc', '', null, { min: 30, max: 120 }],
  ['paincomplet', 'Pain complet', 4, 245, 9, 44, 3, 7, 'pdjb', '', [35, 'tranche'], { min: 50, max: 160 }],
  ['baguette', 'Baguette', 4, 275, 9.5, 56, 1.3, 3, '', '', [60, '¼ baguette']],
  ['paindemie', 'Pain de mie complet', 4, 255, 9, 44, 4.5, 6, 'pdjb', '', [27, 'tranche'], { min: 50, max: 160 }],
  ['galettes', 'Galettes de riz soufflé', 4, 385, 8, 81, 3, 3, 'snackc', '', [8, 'galette'], { min: 16, max: 48, round: 8 }],
  ['croissant', 'Croissant au beurre', 4, 410, 8, 45, 21, 2, '', 'a', [55, 'croissant']],
  ['confiture', 'Confiture', 4, 250, 0.4, 60, 0, 1, 'cond', '', [15, 'c. à soupe'], { def: 20 }],
  ['miel', 'Miel', 4, 320, 0.4, 80, 0, 0, 'cond', 'a', [7, 'c. à café'], { def: 10 }],
  // Légumes (crus)
  ['brocoli', 'Brocoli', 5, 34, 2.8, 4.5, 0.4, 2.6, 'leg', ''],
  ['haricotsverts', 'Haricots verts', 5, 31, 1.8, 4.5, 0.2, 3, 'leg', ''],
  ['courgette', 'Courgette', 5, 17, 1.2, 2, 0.3, 1, 'leg', ''],
  ['carotte', 'Carotte', 5, 36, 0.8, 7, 0.2, 2.6, 'leg', ''],
  ['tomate', 'Tomate', 5, 19, 0.9, 2.9, 0.2, 1.2, 'leg', ''],
  ['epinards', 'Épinards', 5, 23, 2.9, 1.4, 0.4, 2.2, 'leg', ''],
  ['poivron', 'Poivron', 5, 28, 1, 5, 0.3, 1.9, 'leg', ''],
  ['champignons', 'Champignons de Paris', 5, 22, 3, 1.5, 0.3, 1, 'leg', ''],
  ['chou-fleur', 'Chou-fleur', 5, 25, 2, 3, 0.3, 2.4, 'leg', ''],
  ['petitspois', 'Petits pois (surgelés)', 5, 80, 5.4, 10, 0.4, 5.5, 'leg', ''],
  ['concombre', 'Concombre', 5, 13, 0.6, 2, 0.1, 0.6, '', ''],
  ['salade', 'Salade verte', 5, 15, 1.3, 1.5, 0.2, 1.3, '', ''],
  ['oignon', 'Oignon', 5, 40, 1.1, 8, 0.1, 1.7, '', '', [100, 'oignon']],
  ['avocat', 'Avocat', 5, 160, 2, 1.5, 15, 6.5, 'mg', '', [150, 'avocat'], { min: 0, max: 150 }],
  // Fruits
  ['banane', 'Banane', 6, 90, 1.1, 20, 0.3, 2, 'fruit', '', [120, 'banane']],
  ['pomme', 'Pomme', 6, 54, 0.3, 12, 0.2, 2, 'fruit', '', [150, 'pomme']],
  ['orange', 'Orange', 6, 47, 0.9, 9, 0.2, 2, 'fruit', '', [150, 'orange']],
  ['kiwi', 'Kiwi', 6, 60, 1, 11, 0.6, 3, 'fruit', '', [75, 'kiwi']],
  ['fraises', 'Fraises', 6, 33, 0.7, 6, 0.3, 1.6, 'fruit', '', [250, 'barquette']],
  ['myrtilles', 'Myrtilles', 6, 57, 0.7, 12, 0.3, 2.4, 'fruit', '', [125, 'barquette']],
  ['fruitsrouges', 'Fruits rouges (surgelés)', 6, 40, 1, 7, 0.3, 4, 'fruit', ''],
  // Matières grasses & oléagineux
  ['huileolive', "Huile d'olive", 7, 900, 0, 0, 100, 0, 'mg', '', [10, 'c. à soupe'], { min: 0, max: 25, round: 5 }],
  ['huilecolza', 'Huile de colza', 7, 900, 0, 0, 100, 0, 'mg', '', [10, 'c. à soupe'], { min: 0, max: 25, round: 5 }],
  ['beurre', 'Beurre', 7, 745, 0.7, 0.6, 82, 0, '', 'a', [10, 'noisette']],
  ['amandes', 'Amandes', 7, 610, 25, 7, 53, 12, 'noix', ''],
  ['noix', 'Cerneaux de noix', 7, 675, 15, 7, 65, 6.7, 'noix', ''],
  ['cajou', 'Noix de cajou', 7, 590, 18, 27, 46, 3.3, '', ''],
  ['cacahuete', 'Beurre de cacahuète', 7, 620, 25, 14, 50, 6, 'noix spread', '', [15, 'c. à soupe']],
  ['chia', 'Graines de chia', 7, 450, 17, 8, 31, 34, 'noix', '', [10, 'c. à soupe']],
  // Épicerie & divers
  ['whey', 'Protéine whey (poudre)', 8, 380, 78, 7, 5, 0, '', 'a', [30, 'dose']],
  ['chocolat', 'Chocolat noir 70 %', 8, 580, 8, 33, 43, 11, '', '', [10, 'carré']],
  ['sucre', 'Sucre blanc', 8, 400, 0, 100, 0, 0, '', '', [5, 'morceau']],
  ['saucetomate', 'Sauce tomate nature', 8, 40, 1.5, 6, 1, 1.5, 'cond', '', null, { def: 100 }],
  ['houmous', 'Houmous', 8, 285, 7.5, 14, 21, 6, 'cond', '', null, { def: 30 }],
  // Sauces & condiments (portion type par repas dans « def »)
  ['cremelegere', 'Crème fraîche légère 15 %', 1, 165, 2.7, 4, 15, 0, 'cond', 'a', [15, 'c. à soupe'], { def: 30 }],
  ['cremecuisine', 'Crème légère à cuisiner 4 %', 1, 70, 3, 6, 4, 0, 'cond', 'a', [15, 'c. à soupe'], { def: 50 }],
  ['fromagerape', 'Fromage râpé (emmental)', 1, 380, 28, 0, 29, 0, 'cond', 'a', [10, 'c. à soupe'], { def: 15 }],
  ['saucesoja', 'Sauce soja', 8, 60, 8, 6, 0.1, 0.8, 'cond', '', [15, 'c. à soupe'], { def: 15 }],
  ['pesto', 'Pesto vert', 8, 450, 5, 6, 45, 2, 'cond', 'a', [15, 'c. à soupe'], { def: 15 }],
  ['moutarde', 'Moutarde', 8, 150, 7, 5, 11, 3, 'cond', '', [5, 'c. à café'], { def: 10 }],
  ['ketchup', 'Ketchup', 8, 110, 1.2, 25, 0.2, 0.3, 'cond', '', [15, 'c. à soupe'], { def: 20 }],
  ['saucebbq', 'Sauce barbecue', 8, 170, 1, 40, 0.5, 0.5, 'cond', '', [15, 'c. à soupe'], { def: 20 }],
  ['mayolegere', 'Mayonnaise allégée', 8, 300, 1, 7, 30, 0, 'cond', 'a', [15, 'c. à soupe'], { def: 15 }],
  ['sriracha', 'Sauce piquante (sriracha)', 8, 100, 2, 20, 1, 1, 'cond', '', [5, 'c. à café'], { def: 5 }],
  ['laitcoco', 'Lait de coco léger', 8, 110, 1, 2.5, 10, 0, 'cond', '', null, { def: 60 }],
  ['sirop', "Sirop d'érable", 8, 260, 0, 67, 0, 0, 'cond', '', [15, 'c. à soupe'], { def: 10 }],
  ['pizza', 'Pizza margherita', 8, 240, 10, 30, 8.5, 2, '', 'a'],
  // Boissons
  ['cafe', 'Café noir', 9, 2, 0.1, 0, 0, 0, '', '', [150, 'tasse (ml)']],
  ['jusorange', "Jus d'orange 100 %", 9, 45, 0.7, 10, 0.1, 0.3, '', '', [200, 'verre (ml)']],
  ['soda', 'Soda type cola', 9, 42, 0, 10.6, 0, 0, '', '', [330, 'canette (ml)']],
  ['biere', 'Bière blonde 5 %', 9, 43, 0.4, 3.5, 0, 0, '', '', [250, 'demi (ml)']],
  ['vin', 'Vin rouge', 9, 85, 0.1, 0.5, 0, 0, '', '', [125, 'verre (ml)']]
];

const BASE_FOODS = RAW_FOODS.map(r => ({
  id: r[0], name: r[1], cat: CATS[r[2]],
  kcal: r[3], p: r[4], c: r[5], f: r[6], fib: r[7],
  roles: r[8] ? r[8].split(' ') : [], diet: r[9],
  unit: r[10] ? { g: r[10][0], name: r[10][1] } : null,
  b: r[11] || null, src: 'base'
}));
