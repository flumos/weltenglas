// Datenmodell des Sim-Kerns (Konzept 6.3). Structure of Arrays, structuredClone-fähig.

export interface Traits {
  role: number;   // 0 Produzent, 1 Weidegänger, 2 Räuber
  land: number;   // 0 Meer, 1 Land
  k: number;      // Stufe 1–6
  topt: number; sig: number; z: number; mob: number; def: number; aff: number; dry: number; hue: number;
  brain: number; social: number;
}
export const TRAIT_KEYS = ['role', 'land', 'k', 'topt', 'sig', 'z', 'mob', 'def', 'aff', 'dry', 'hue', 'brain', 'social'] as const;
export type TraitKey = typeof TRAIT_KEYS[number];

export interface Species {
  id: number; parent: number; typus: Traits;
  born: number; died: number; est: boolean; alive: boolean; peak: number;
  name: string; latin: string; reason: string; cause: string; evolvedTo: number;
  hist: number[];       // Tagesbestand (letzte 60 Tage)
  firstX: number; firstY: number;
  seen: boolean;        // dem Spieler einmal gemeldet
  frozen?: boolean;
  cv: number[];         // Verluste nach Ursache (geglättet, für Nachruf und Gründe)
  maxArea: number;
}

export interface ChronicleEntry {
  tick: number; kind: 'species' | 'extinct' | 'breakthrough' | 'anagenesis' | 'o2' | 'biome' | 'event' | 'plague' | 'culture' | 'warn' | 'player';
  text: string; species?: number; x?: number; y?: number; big?: boolean;
}

export interface Effect { kind: string; until: number; room?: number; lampOff?: boolean }

export interface Controls {
  lamp: number; lampX: number; lampY: number; photo: number;
  wind: number; windOn: boolean; windStr: number;
  uv: number; lid: boolean;
  thermo: boolean; thermoSet: number; thermoMax: number; cool: number;
  tectonics: number; seasons: boolean; maxK: number; cultures: boolean; drift: boolean;
  roomBase: number;
}

export interface Settlement {
  id: number; species: number; x: number; y: number; pop: number; K: number; era: number;
  R: number; F: number; S: number; conflict: number; founded: number; name: string;
  wonders: number; fears: number; sawFace: boolean; temple: boolean; paint: boolean; alive: boolean;
}

export interface World {
  v: number; simVersion: string;
  w: number; h: number; n: number; S: number; seed: number;
  tick: number; rng: Uint32Array;
  hgt: Float32Array; sea: number; seaMask: Uint8Array;
  T: Float32Array; L: Float32Array; M: Float32Array; Rain: Float32Array; Wsoil: Float32Array; veg: Float32Array;
  N: Float32Array; D: Float32Array; O: Float32Array; q: Float32Array; biome: Uint8Array; tmp: Float32Array; tmp2: Float32Array;
  hotspots: { x: number; y: number; vx: number; vy: number }[];
  o2: number;                         // Atmosphären-O2 in %
  ctl: Controls; effects: Effect[];
  B: Float32Array; G: Float32Array;   // [slot*n + cell]
  // Stamm-Tabelle
  alive: Uint8Array; role: Uint8Array; land: Uint8Array; k: Uint8Array;
  topt: Float32Array; sig: Float32Array; z: Float32Array; mob: Float32Array; def: Float32Array; aff: Float32Array;
  dry: Float32Array; hue: Float32Array; brain: Float32Array; social: Float32Array;
  sp: Int32Array; novel: Uint8Array; tot: Float32Array; prod: Float32Array; born: Int32Array; jump: Uint8Array;
  loss: Float32Array;                 // [slot*NC + Ursache]
  species: Species[]; chronicle: ChronicleEntry[];
  flags: Record<string, number>;
  mutants: number; buried: number;
  hist: DayStat[];
  settlements: Settlement[];
  wonderLog: { tick: number; x: number; y: number; good: number; kind: string }[];
  startTraits: Traits;
}

export interface DayStat {
  day: number; o2: number; bio: number; sea: number; land: number; graz: number; pred: number;
  species: number; hill: number; T: number; forest: number;
}

export type Cmd =
  | { type: 'sun'; x?: number; y?: number; I?: number }
  | { type: 'photo'; hours: number }
  | { type: 'wind'; dir: number; on: boolean; str?: number }
  | { type: 'water'; delta: number }
  | { type: 'hotspot'; x: number; y: number }
  | { type: 'terrain'; x: number; y: number; r: number; delta: number }
  | { type: 'dose'; x: number; y: number; amount: number }
  | { type: 'lid'; open: boolean }
  | { type: 'uv'; factor: number }
  | { type: 'thermo'; on: boolean; set: number; max: number }
  | { type: 'cool'; delta: number }
  | { type: 'net'; x: number; y: number; r: number }
  | { type: 'inoculate'; traits: Traits; x: number; y: number; name?: string; amount?: number }
  | { type: 'rename'; species: number; name: string }
  | { type: 'event'; id: string; x?: number; y?: number }
  | { type: 'meteor'; x: number; y: number }
  | { type: 'ctl'; patch: Partial<Controls> }
  | { type: 'seedLife' }
  | { type: 'tuempel'; x: number; y: number };
