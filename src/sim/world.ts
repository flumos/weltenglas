// Welt & Raster: Gelände, Stamm-Tabelle, Arten-Register.
import { P, SIM_VERSION, GLASSES, NC, type GlassSize } from './params.ts';
import { clamp, rngNext, seedState } from './math.ts';
import { makeName } from './names.ts';
import { TRAIT_KEYS, type Traits, type World, type Species, type ChronicleEntry, type Controls } from './types.ts';

export const START_TRAITS: Traits = { role: 0, land: 0, k: 1, topt: 20, sig: 6, z: 0.1, mob: 0.2, def: 0, aff: 0.3, dry: 0, hue: 120, brain: 0, social: 0 };

export function defaultControls(): Controls {
  return {
    lamp: 0.6, lampX: 0.5, lampY: 0.5, photo: 12,
    wind: 0, windOn: true, windStr: 0.6,
    uv: 1, lid: false,
    thermo: false, thermoSet: 12, thermoMax: 8, cool: 0,
    tectonics: 1, seasons: false, maxK: 4, cultures: false, drift: false,
    roomBase: P.roomBase,
  };
}

function noise2(st: Uint32Array, w: number, h: number, oct: number) {
  const out = new Float32Array(w * h);
  let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const gw = 3 * (1 << o) + 1, gh = Math.ceil(gw * h / w) + 1;
    const g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = rngNext(st);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = x / (w - 1) * (gw - 1), fy = y / (h - 1) * (gh - 1);
      const ix = Math.min(gw - 2, fx | 0), iy = Math.min(gh - 2, fy | 0), tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
      out[y * w + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
    }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

export interface WorldOpts { size?: GlassSize; seed?: number; landFrac?: number; hotspots?: number; o2?: number }

export function createWorld(opts: WorldOpts = {}): World {
  const g = GLASSES[opts.size ?? 'S'];
  const { w, h, S } = g, n = w * h, seed = (opts.seed ?? 1) >>> 0;
  const rng = seedState(seed);
  const hgt = noise2(rng, w, h, 5);
  const aspect = h / w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
    const r2 = dx * dx + dy * dy;
    hgt[y * w + x] = clamp(hgt[y * w + x] * 1.12 - 0.36 * r2 + 0.02, 0, 1);
  }
  void aspect;
  const sorted = Float32Array.from(hgt).sort();
  const sea = sorted[Math.floor(n * (1 - (opts.landFrac ?? 0.34)))];
  const hs = [];
  const nh = opts.hotspots ?? 3;
  for (let i = 0; i < nh; i++) {
    // Hotspots bevorzugt an Land oder knapp darunter
    let best = { x: w / 2, y: h / 2 }, bv = -1;
    for (let k = 0; k < 12; k++) {
      const x = (0.18 + 0.64 * rngNext(rng)) * w, y = (0.2 + 0.6 * rngNext(rng)) * h;
      const v = hgt[(y | 0) * w + (x | 0)] + 0.3 * rngNext(rng);
      if (v > bv) { bv = v; best = { x, y }; }
    }
    hs.push({ x: best.x, y: best.y, vx: 0, vy: 0 });
  }
  const W: World = {
    v: 1, simVersion: SIM_VERSION, w, h, n, S, seed, tick: 0, rng,
    hgt, sea, seaMask: new Uint8Array(n),
    T: new Float32Array(n).fill(P.roomBase), L: new Float32Array(n), M: new Float32Array(n), Rain: new Float32Array(n),
    Wsoil: new Float32Array(n).fill(0.2), veg: new Float32Array(n),
    N: new Float32Array(n).fill(P.N0), D: new Float32Array(n), O: new Float32Array(n), q: new Float32Array(n).fill(1),
    biome: new Uint8Array(n), tmp: new Float32Array(n), tmp2: new Float32Array(n),
    hotspots: hs, o2: opts.o2 ?? 0,
    ctl: defaultControls(), effects: [],
    B: new Float32Array(S * n), G: new Float32Array(S * n),
    alive: new Uint8Array(S), role: new Uint8Array(S), land: new Uint8Array(S), k: new Uint8Array(S),
    topt: new Float32Array(S), sig: new Float32Array(S), z: new Float32Array(S), mob: new Float32Array(S),
    def: new Float32Array(S), aff: new Float32Array(S), dry: new Float32Array(S), hue: new Float32Array(S),
    brain: new Float32Array(S), social: new Float32Array(S),
    sp: new Int32Array(S).fill(-1), novel: new Uint8Array(S), tot: new Float32Array(S), prod: new Float32Array(S),
    born: new Int32Array(S), jump: new Uint8Array(S), loss: new Float32Array(S * NC),
    species: [], chronicle: [], flags: {}, mutants: 0, buried: 0, hist: [], settlements: [], wonderLog: [],
    startTraits: { ...START_TRAITS },
  };
  updateSeaMask(W);
  return W;
}

export function updateSeaMask(W: World) {
  for (let c = 0; c < W.n; c++) W.seaMask[c] = W.hgt[c] < W.sea ? 1 : 0;
}

export function traitsOf(W: World, s: number): Traits {
  return {
    role: W.role[s], land: W.land[s], k: W.k[s], topt: W.topt[s], sig: W.sig[s], z: W.z[s], mob: W.mob[s],
    def: W.def[s], aff: W.aff[s], dry: W.dry[s], hue: W.hue[s], brain: W.brain[s], social: W.social[s],
  };
}
function setTraits(W: World, s: number, t: Traits) {
  for (const k of TRAIT_KEYS) (W[k] as Float32Array | Uint8Array)[s] = t[k] ?? 0;
}

/** Artdistanz (Konzept 5.7), ∞ bei anderer Rolle, Lebensraum oder Stufe */
export function dist(a: Traits, b: Traits) {
  if (a.role !== b.role || a.land !== b.land || a.k !== b.k) return 99;
  const q = (v: number, s: number) => (v / s) * (v / s);
  return Math.sqrt(q(a.topt - b.topt, 6) + q(a.sig - b.sig, 4) + q(a.z - b.z, a.land ? 0.12 : 0.25) + q(a.mob - b.mob, 0.5)
    + q(a.def - b.def, 0.5) + q(a.aff - b.aff, 0.5) + q(a.dry - b.dry, 0.4) + q(a.brain - b.brain, 0.4) + q(a.social - b.social, 0.4));
}

export function chron(W: World, e: Omit<ChronicleEntry, 'tick'>) {
  W.chronicle.push({ tick: W.tick, ...e });
  if (W.chronicle.length > 600) W.chronicle.splice(0, W.chronicle.length - 600);
}

export function newSpecies(W: World, s: number, parent: number, reason: string): number {
  const id = W.species.length;
  const typus = traitsOf(W, s);
  const sp: Species = {
    id, parent, typus, born: W.tick, died: -1, est: false, alive: true, peak: 0,
    name: '', latin: '', reason, cause: '', evolvedTo: -1, hist: [], firstX: -1, firstY: -1, seen: false, cv: [], maxArea: 0,
  };
  W.species.push(sp);
  return id;
}

export function nameSpecies(W: World, id: number) {
  const sp = W.species[id];
  if (sp.name) return;
  const taken = new Set(W.species.map(s => s.name).filter(Boolean));
  const ref = sp.parent >= 0 ? W.species[sp.parent].typus : null;
  const { name, latin } = makeName(sp.typus, ref, W.seed, id, taken);
  sp.name = name; sp.latin = latin;
}

export function visThreshold(W: World) {
  let t = 0; for (let s = 0; s < W.S; s++) if (W.alive[s]) t += W.tot[s];
  return Math.max(P.VIS_ABS, P.VIS_REL * t);
}

function freeSlot(W: World) {
  for (let s = 0; s < W.S; s++) if (!W.alive[s]) return s;
  let v = -1, vb = Infinity; const vis = visThreshold(W);
  for (let s = 0; s < W.S; s++) {
    if (W.tot[s] >= vb || W.tot[s] >= vis) continue;
    const age = W.tick - W.born[s];
    // junge Mutanten bekommen Zeit, Neuheiten (mögliche neue Arten) länger
    if (age > (W.novel[s] === 2 ? 160 : W.novel[s] ? 40 : 12)) { vb = W.tot[s]; v = s; }
  }
  if (v >= 0) killStrain(W, v, true);
  return v;
}

export function killStrain(W: World, s: number, toDetritus: boolean) {
  const { n } = W, off = s * n;
  if (toDetritus) for (let c = 0; c < n; c++) W.D[c] += W.B[off + c];
  W.B.fill(0, off, off + n); W.G.fill(0, off, off + n);
  W.alive[s] = 0; W.tot[s] = 0;
}

export function addStrain(W: World, t: Traits, spId = -1, reason = 'Ursprung'): number {
  const s = freeSlot(W); if (s < 0) return -1;
  setTraits(W, s, t);
  W.alive[s] = 1; W.born[s] = W.tick; W.novel[s] = 0; W.jump[s] = 0; W.tot[s] = 0; W.prod[s] = 0;
  W.B.fill(0, s * W.n, (s + 1) * W.n); W.G.fill(0, s * W.n, (s + 1) * W.n);
  W.loss.fill(0, s * NC, (s + 1) * NC);
  W.sp[s] = spId < 0 ? newSpecies(W, s, -1, reason) : spId;
  return s;
}

/** Tütchen 2 „Lebenskeime“: Startkultur im ganzen Meer */
export function seedLife(W: World, t: Traits = W.startTraits, amount = 0.08) {
  const s = addStrain(W, t, -1, 'Tütchen 2');
  if (s < 0) return -1;
  for (let c = 0; c < W.n; c++) if (W.seaMask[c]) W.B[s * W.n + c] = amount;
  const sp = W.species[W.sp[s]];
  sp.est = true; nameSpecies(W, sp.id);
  if (t === W.startTraits || (t.role === 0 && t.k === 1 && !t.land)) { sp.name = 'Urflöckchen'; sp.latin = 'Planctula primordialis'; }
  sp.seen = true;
  return s;
}

export function totalBiomass(W: World) {
  let t = 0; for (let s = 0; s < W.S; s++) if (W.alive[s]) t += W.tot[s]; return t;
}

export function cloneWorld(W: World): World { return structuredClone(W); }
