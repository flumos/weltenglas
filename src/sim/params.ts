// Parameter-Tabelle (Konzept 5.10) — Daten statt Code. Alle Raten pro Glastag.
export const SIM_VERSION = '1.0.0';

export const P = {
  TPD: 4,                      // Ticks pro Glastag (Biologie alle 6 h, Klima täglich)
  // ---- Klima
  roomBase: 8,                 // Zimmertemperatur unter der Schale (°C)
  sunHeat: 24,                 // °C Sonnenwärme am Zenit bei voller Lampe
  sunSigma: 0.45,              // Breite des Sonnenflecks relativ zur Schalenbreite
  lapse: 32,                   // °C Abkühlung je Höheneinheit über dem Meer
  oceanMod: 0.5, oceanSteps: 4,
  evap: 0.6, transp: 0.08, rainBase: 0.035, rainOro: 4.0, moistKeep: 0.99, climIters: 70,
  soilRelax: 0.15,
  uplift: 0.004, hotspotR: 5, eroK: 0.01,
  volcanoHeat: 5,              // °C lokale Wärme am Hotspot
  // ---- Nährstoffe
  N0: 0.8, nu: 0.15, KN: 0.3, weather: 0.04, runoff: 0.02, diffN: 0.05, volcanoN: 0.05,
  decay: 0.4, burial: 0.07,
  nBloom: 2.5, kTurb: 0.25, bloomO2: 0.9, nTox: 3.0, mNH3: 0.6,
  // ---- Licht
  KL0: 0.25, affGain: 0.6, affCost: 0.35, canopyK: 0.35,
  // ---- Produzenten [Meer, Land]
  muP: [2.2, 1.4], respP: 0.10, mortP: 0.06, crowdP: 20,
  waterCostZ: 0.7, dryGain: 0.6, dryCost: 0.35,
  // ---- Konsumenten [_, Weidegänger, Räuber]
  Imax: [0, 3.0, 3.2], KF: [0, 0.6, 0.25], eps: [0, 0.45, 0.6], respC: [0, 0.15, 0.13],
  mortC: [0, 0.04, 0.03], CI: [0, 1.5, 1.0], sizeOpt: [0, 0.05, 0.3], sizeW: [0, 0.35, 0.25],
  mobGain: 0.4, defVuln: 0.75, defCost: 0.4, mobCost: 0.5, kCost: 0.08, brainCost: 0.5,
  // ---- Kill-the-Winner (Seuchen) [Produzent, Weidegänger, Räuber]
  KW: [0.05, 0.08, 0.06],
  // ---- Thermik
  STRESS_F: 0.2, STRESS_M: 1.2,
  // ---- Sauerstoff & Stufen
  o2Conv: 0.0018,               // Atmosphären-% je (Netto-BE / (n/1000))
  o2Fire: 18, o2FireK: 0.12,
  lidRate: 0.2,                // Deckel lüften: O2 → 21 % mit Rate/Tag
  kThr: [0, 0, 1.0, 3.0, 5.0, 6.0, 7.0],      // lokales O2 (mg/L) für Stufe k
  kHalf: [0, 0, 0.15, 0.6, 1.5, 2.0, 2.5],
  zMax: [0, 0.3, 0.55, 0.8, 1.0, 1.0, 1.0],
  effK: [0, 0.85, 1.05, 1.25, 1.4, 1.5, 1.6],
  muK: [0, 1.0, 1.35, 1.6, 1.8, 1.9, 1.95],
  o2Tox: 5.5, o2ToxM: 0.35, hypoxM: 1.0,
  // ---- Bewegung
  D0: 0.15, Dm: 1.5, seedDisp: 0.35, chi: 2.0, maxOut: 0.45,
  // ---- Evolution
  MU: 0.06, pRole: 0.1, pPred: 0.15, pK: 0.06,
  pLand: 0.3, O2_LAND: 2.0, pWood: 0.25, O2_WOOD: 8.0, pLandAnimal: 0.12,
  sd: { topt: 1.5, sig: 0.4, z: 0.05, dry: 0.07, mob: 0.06, def: 0.06, aff: 0.06, hue: 10, brain: 0.05, social: 0.05 },
  D_SPEC: 0.65, D_REJOIN: 0.35, D_MERGE: 0.25, OVERLAP: 0.6, MERGE_AGE_D: 2,
  B_EXT: 0.02, B_CELL_MIN: 1e-6, VIS_ABS: 1.0, VIS_REL: 0.0015,
  mutStartFrac: 0.15, jumpStartFrac: 0.4,
  // ---- Akt 2/3
  nerveMob: 0.0, nerveTaxis: 3,
  brainMin: 0.55, socialMin: 0.4, sizeMinMind: 0.25,
  pLeap: 0.04, pLeapHigh: 0.08, pBrainLeap: 0.1, leapFrac: 0.25, consMutBoost: 8, pKcons: 0.12, brainFromK: 3, brainBias: 0.03, socialBias: 0.02,
};

export const ROLE_NAMES = ['Produzent', 'Weidegänger', 'Räuber'] as const;

export const BIOMES = [
  { id: 'deep', name: 'Tiefsee', color: [18, 44, 82] },
  { id: 'shelf', name: 'Flachmeer', color: [36, 102, 128] },
  { id: 'reef', name: 'Riff/Algenwiese', color: [58, 168, 160] },
  { id: 'ice', name: 'Eis', color: [236, 242, 246] },
  { id: 'rock', name: 'Fels', color: [160, 150, 138] },
  { id: 'desert', name: 'Wüste', color: [233, 210, 150] },
  { id: 'steppe', name: 'Steppe', color: [204, 186, 112] },
  { id: 'grass', name: 'Grasland', color: [142, 196, 96] },
  { id: 'forest', name: 'Wald', color: [52, 124, 66] },
  { id: 'rain', name: 'Regenwald', color: [28, 96, 52] },
  { id: 'taiga', name: 'Nadelwald', color: [48, 92, 74] },
  { id: 'tundra', name: 'Tundra', color: [170, 182, 160] },
] as const;
export const B_DEEP = 0, B_SHELF = 1, B_REEF = 2, B_ICE = 3, B_ROCK = 4, B_DESERT = 5, B_STEPPE = 6,
  B_GRASS = 7, B_FOREST = 8, B_RAIN = 9, B_TAIGA = 10, B_TUNDRA = 11;

// Glasgrößen (Konzept 5.2)
export const GLASSES = {
  S: { w: 96, h: 64, S: 48, name: 'Starterschale' },
  M: { w: 128, h: 80, S: 64, name: 'Schale M' },
  L: { w: 160, h: 100, S: 64, name: 'Panorama-Schale' },
  XL: { w: 192, h: 120, S: 96, name: 'Biosphären-Schale' },
} as const;
export type GlassSize = keyof typeof GLASSES;

// Verlust-Ursachen (Diagnose 5.8)
export const CAUSES = ['Licht', 'Nährstoff', 'zu warm', 'zu kalt', 'Sauerstoff', 'Gift', 'gefressen', 'Hunger', 'Seuche', 'Trockenheit', 'falscher Ort'] as const;
export const C_LIGHT = 0, C_NUTR = 1, C_HOT = 2, C_COLD = 3, C_O2 = 4, C_POISON = 5, C_EATEN = 6, C_HUNGER = 7, C_PLAGUE = 8, C_DRY = 9, C_PLACE = 10;
export const NC = CAUSES.length;
