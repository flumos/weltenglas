// Kennzahlen, Biome, Diagnose (Konzept 5.8)
import { P, NC, BIOMES, B_DEEP, B_SHELF, B_REEF, B_ICE, B_ROCK, B_DESERT, B_STEPPE, B_GRASS, B_FOREST, B_RAIN, B_TAIGA, B_TUNDRA, CAUSES } from './params.ts';
import { dlog, tpcRaw, dexp } from './math.ts';
import { dist, visThreshold, totalBiomass } from './world.ts';
import type { World, Traits, DayStat } from './types.ts';

export function classifyBiomes(W: World) {
  const { n, S } = W, B = W.B;
  for (let c = 0; c < n; c++) {
    const T = W.T[c];
    if (W.seaMask[c]) {
      if (T < -1) { W.biome[c] = B_ICE; continue; }
      let b = 0; for (let s = 0; s < S; s++) if (W.alive[s] && W.role[s] === 0 && !W.land[s]) b += B[s * n + c];
      const depth = W.sea - W.hgt[c];
      W.biome[c] = depth < 0.06 && b > 1.5 ? B_REEF : depth < 0.08 ? B_SHELF : B_DEEP;
      continue;
    }
    if (T < -2) { W.biome[c] = B_ICE; continue; }
    let bio = 0, zz = 0;
    for (let s = 0; s < S; s++) if (W.alive[s] && W.role[s] === 0 && W.land[s]) { const v = B[s * n + c]; bio += v; zz += v * W.z[s]; }
    const z = bio > 0 ? zz / bio : 0, elev = W.hgt[c] - W.sea, ws = W.Wsoil[c];
    let b: number;
    if (bio < 0.15) b = elev > 0.25 ? B_ROCK : ws < 0.2 ? B_DESERT : B_ROCK;
    else if (T < 6) b = z > 0.45 && bio > 1.5 ? B_TAIGA : B_TUNDRA;
    else if (z > 0.45 && bio > 1.5) b = T > 22 && ws > 0.6 ? B_RAIN : B_FOREST;
    else b = ws < 0.3 ? B_STEPPE : B_GRASS;
    W.biome[c] = b;
  }
}

export interface Metrics {
  day: number; o2: number; total: number; perCell: number; green: number; clarity: number;
  species: number; hill: number; levels: number; prod: number; graz: number; pred: number;
  kMax: number; zMax: number; landZMax: number;
  biomes: number[]; biomeFrac: number[]; biomeKinds: number; biomeHill: number; landFrac: number;
  landBio: number; landSpecies: number; landAnimals: number; seaSpecies: number;
  extreme: number; extremeHot: number; extremeCold: number; exotic: number; links: number;
  deep: number; avgT: number; minT: number; maxT: number; avgN: number;
  predCV: number; strains: number; speciesEver: number; extinct: number;
  settlements: number; pop: number; era: number; awe: number; fear: number; conflict: number; knowledge: number;
  continents: number; tallest: number;
}

function islands(W: World) {
  // Anzahl Landmassen ≥ 30 Zellen (Flutfüllung)
  const { w, h, n } = W, seen = new Uint8Array(n); let count = 0;
  const stack: number[] = [];
  for (let c0 = 0; c0 < n; c0++) {
    if (seen[c0] || W.seaMask[c0]) continue;
    let size = 0; stack.length = 0; stack.push(c0); seen[c0] = 1;
    while (stack.length) {
      const c = stack.pop()!; size++;
      const x = c % w, y = (c / w) | 0;
      if (x > 0 && !seen[c - 1] && !W.seaMask[c - 1]) { seen[c - 1] = 1; stack.push(c - 1); }
      if (x < w - 1 && !seen[c + 1] && !W.seaMask[c + 1]) { seen[c + 1] = 1; stack.push(c + 1); }
      if (y > 0 && !seen[c - w] && !W.seaMask[c - w]) { seen[c - w] = 1; stack.push(c - w); }
      if (y < h - 1 && !seen[c + w] && !W.seaMask[c + w]) { seen[c + w] = 1; stack.push(c + w); }
    }
    if (size >= 30) count++;
  }
  return count;
}

export function exoticDist(a: Traits, b: Traits) {
  const q = (v: number, s: number) => (v / s) * (v / s);
  return Math.sqrt(q(a.topt - b.topt, 6) + q(a.z - b.z, 0.25) + q(a.mob - b.mob, 0.5) + q(a.def - b.def, 0.5) + q(a.aff - b.aff, 0.5)
    + q(a.dry - b.dry, 0.4) + (a.role !== b.role ? 1 : 0) + (a.land !== b.land ? 1 : 0) + 0.5 * Math.abs(a.k - b.k)
    + q(Math.min(Math.abs(a.hue - b.hue), 360 - Math.abs(a.hue - b.hue)), 90));
}

export function metrics(W: World): Metrics {
  const { n, S } = W;
  const vis = visThreshold(W);
  const spTot = new Map<number, number>();
  const byRole = [0, 0, 0];
  let total = 0, landBio = 0, landAnimals = 0, prodSea = 0;
  for (let s = 0; s < S; s++) if (W.alive[s]) {
    const t = W.tot[s]; total += t; byRole[W.role[s]] += t;
    spTot.set(W.sp[s], (spTot.get(W.sp[s]) || 0) + t);
    if (W.land[s]) { landBio += t; if (W.role[s] > 0) landAnimals += t; }
    else if (W.role[s] === 0) prodSea += t;
  }
  const est: [number, number][] = [];
  for (const [id, t] of spTot) if (t >= vis) est.push([id, t]);
  const tEst = est.reduce((a, e) => a + e[1], 0);
  let H = 0;
  for (const [, t] of est) { const p = t / tEst; H -= p * dlog(p); }
  let kMax = 0, zMax = 0, landZMax = 0, extreme = 0, exHot = 0, exCold = 0, exotic = 0, landSpecies = 0, seaSpecies = 0;
  for (const [id] of est) {
    const sp = W.species[id], t = sp.typus;
    kMax = Math.max(kMax, t.k);
    if (t.role > 0) zMax = Math.max(zMax, t.z);
    if (t.land && t.role === 0) landZMax = Math.max(landZMax, t.z);
    extreme = Math.max(extreme, Math.abs(t.topt - 22));
    exHot = Math.max(exHot, t.topt); exCold = Math.max(exCold, 22 - t.topt);
    exotic = Math.max(exotic, exoticDist(t, W.startTraits));
    if (t.land) landSpecies++; else seaSpecies++;
  }
  // Fraßbeziehungen zwischen etablierten Arten (gleicher Lebensraum, Größe passt, räumliche Überlappung)
  let links = 0;
  const estIds = est.map(e => e[0]);
  const where = new Map<number, Float32Array>();
  const area = (id: number) => {
    let a = where.get(id); if (a) return a;
    a = new Float32Array(n);
    for (let s = 0; s < S; s++) if (W.alive[s] && W.sp[s] === id) for (let c = 0; c < n; c++) a[c] += W.B[s * n + c];
    where.set(id, a); return a;
  };
  for (const a of estIds) {
    const ta = W.species[a].typus; if (ta.role === 0) continue;
    for (const b of estIds) {
      if (a === b) continue;
      const tb = W.species[b].typus;
      if (tb.land !== ta.land) continue;
      if (ta.role === 1 && tb.role !== 0) continue;
      if (ta.role === 2 && tb.role === 0) continue;
      const u = (ta.z - tb.z - P.sizeOpt[ta.role]) / P.sizeW[ta.role];
      if (dexp(-u * u) < 0.25) continue;
      const A = area(a), Bb = area(b);
      let both = 0, cnt = 0;
      for (let c = 0; c < n; c++) if (A[c] > 0.01) { cnt++; if (Bb[c] > 0.01) both++; }
      if (cnt && both / cnt > 0.1) links++;
    }
  }
  const bc = new Array(BIOMES.length).fill(0); let landCells = 0;
  let O = 0, T = 0, Nn = 0, bloom = 0, minT = 99, maxT = -99, deep = 0;
  for (let c = 0; c < n; c++) {
    bc[W.biome[c]]++;
    if (!W.seaMask[c]) landCells++;
    T += W.T[c]; Nn += W.N[c]; O += W.O[c];
    if (W.T[c] < minT) minT = W.T[c]; if (W.T[c] > maxT) maxT = W.T[c];
    if (W.seaMask[c] && W.N[c] > P.nBloom) bloom += W.N[c] - P.nBloom;
  }
  for (let s = 0; s < S; s++) if (W.alive[s] && !W.land[s]) for (let c = 0; c < n; c++) if (W.L[c] < 0.1 && W.seaMask[c]) deep += W.B[s * n + c];
  const seaCells = n - landCells || 1;
  const clarity = Math.max(0, 1 - (bloom / seaCells) / 0.5);
  const biomeFrac = bc.map(v => v / n);
  let bh = 0, kinds = 0;
  const landBiomeTot = bc.reduce((a, v, i) => a + v, 0);
  for (let i = 0; i < bc.length; i++) { const f = bc[i] / landBiomeTot; if (f >= 0.03) kinds++; if (f > 0) bh -= f * dlog(f); }
  // Räuber-Beute-Schwankung über 10 Tage
  const hs = W.hist.slice(-10);
  let predCV = 1;
  if (hs.length >= 5) {
    const m = hs.reduce((a, d) => a + d.pred, 0) / hs.length;
    if (m > 0.5) { const v = hs.reduce((a, d) => a + (d.pred - m) * (d.pred - m), 0) / hs.length; predCV = Math.sqrt(v) / m; }
  }
  const sts = W.settlements.filter(s => s.alive);
  const prodLand = byRole[0] - prodSea;
  const green = ((prodSea + prodLand) / n) * clarity;
  return {
    day: W.tick / P.TPD, o2: W.o2, total, perCell: total / n, green, clarity,
    species: est.length, hill: est.length ? dexp(H) : 0,
    levels: byRole.filter(v => v > Math.max(1, 0.002 * total)).length,
    prod: byRole[0], graz: byRole[1], pred: byRole[2], kMax, zMax, landZMax,
    biomes: bc, biomeFrac, biomeKinds: kinds, biomeHill: dexp(bh), landFrac: landCells / n,
    landBio, landSpecies, landAnimals, seaSpecies, extreme, extremeHot: exHot, extremeCold: exCold, exotic, links,
    deep, avgT: T / n, minT, maxT, avgN: Nn / n, predCV,
    strains: Array.from(W.alive).reduce((a, b) => a + b, 0), speciesEver: W.species.filter(s => s.est).length,
    extinct: W.species.filter(s => s.est && !s.alive && s.evolvedTo < 0).length,
    settlements: sts.length, pop: sts.reduce((a, s) => a + s.pop, 0), era: sts.reduce((a, s) => Math.max(a, s.era), 0),
    awe: sts.length ? sts.reduce((a, s) => a + s.R * s.pop, 0) / Math.max(1, sts.reduce((a, s) => a + s.pop, 0)) : 0,
    fear: sts.length ? sts.reduce((a, s) => a + s.F * s.pop, 0) / Math.max(1, sts.reduce((a, s) => a + s.pop, 0)) : 0,
    conflict: sts.reduce((a, s) => Math.max(a, s.conflict), 0), knowledge: sts.reduce((a, s) => Math.max(a, s.K), 0),
    continents: islands(W), tallest: landZMax,
  };
}

export function dayStat(W: World): DayStat {
  let bio = 0, sea = 0, land = 0, graz = 0, pred = 0;
  for (let s = 0; s < W.S; s++) if (W.alive[s]) {
    const t = W.tot[s]; bio += t; if (W.land[s]) land += t; else sea += t;
    if (W.role[s] === 1) graz += t; if (W.role[s] === 2) pred += t;
  }
  let T = 0, forest = 0;
  for (let c = 0; c < W.n; c++) { T += W.T[c]; const b = W.biome[c]; if (b === B_FOREST || b === B_RAIN || b === B_TAIGA) forest++; }
  const vis = visThreshold(W);
  const spTot = new Map<number, number>();
  for (let s = 0; s < W.S; s++) if (W.alive[s]) spTot.set(W.sp[s], (spTot.get(W.sp[s]) || 0) + W.tot[s]);
  const est = [...spTot.values()].filter(v => v >= vis); const te = est.reduce((a, b) => a + b, 0);
  let H = 0; for (const v of est) { const p = v / te; H -= p * dlog(p); }
  return { day: W.tick / P.TPD, o2: W.o2, bio, sea, land, graz, pred, species: est.length, hill: est.length ? dexp(H) : 0, T: T / W.n, forest };
}

/** Untersuchen einer Art: Wohlfühl-Faktoren, Ursachen, Verbreitung */
export function inspectSpecies(W: World, id: number) {
  const { n, S, w } = W;
  const sp = W.species[id]; if (!sp) return null;
  const slots: number[] = [];
  for (let s = 0; s < S; s++) if (W.alive[s] && W.sp[s] === id) slots.push(s);
  let tot = 0, fT = 0, fL = 0, fN = 0, fW = 0, Tm = 0, wsum = 0, cells = 0, O = 0, Rn = 0, better = 0, bx = 0, by = 0, cx = 0, cy = 0, eatenBy = 0;
  const t = sp.typus;
  const biomeC = new Array(BIOMES.length).fill(0);
  for (let c = 0; c < n; c++) {
    let b = 0; for (const s of slots) b += W.B[s * n + c];
    if (b <= 0) {
      if (slots.length) { const g = W.G[slots[0] * n + c]; if (g > 0.15 && (W.seaMask[c] === (t.land ? 0 : 1))) { better++; bx += c % w; by += (c / w) | 0; } }
      continue;
    }
    if (b > 0.01) cells++;
    tot += b; wsum += b;
    biomeC[W.biome[c]] += b;
    const fr = tpcRaw(W.T[c], t.topt, t.sig);
    fT += fr * b; Tm += W.T[c] * b; O += W.O[c] * b; Rn += W.Wsoil[c] * b;
    fL += (W.L[c] / (W.L[c] + P.KL0)) * b; fN += (W.N[c] / (W.N[c] + P.KN)) * b;
    fW += (W.seaMask[c] ? 1 : W.Wsoil[c] / (W.Wsoil[c] + 0.15 + 0.7 * t.z - 0.6 * t.dry)) * b;
    cx += (c % w) * b; cy += ((c / w) | 0) * b;
  }
  void eatenBy;
  const cv = new Array(NC).fill(0);
  for (const s of slots) for (let i = 0; i < NC; i++) cv[i] += W.loss[s * NC + i];
  if (!slots.length && sp.cv.length) for (let i = 0; i < NC; i++) cv[i] = sp.cv[i];
  const cvT = cv.reduce((a, b) => a + b, 0) || 1;
  let mainBiome = 0; for (let i = 1; i < biomeC.length; i++) if (biomeC[i] > biomeC[mainBiome]) mainBiome = i;
  const W1 = wsum || 1;
  return {
    id, name: sp.name, latin: sp.latin, traits: t, born: sp.born, died: sp.died, alive: sp.alive, parent: sp.parent, reason: sp.reason, cause: sp.cause,
    total: tot, cells, area: cells / n,
    fT: fT / W1, fL: fL / W1, fN: fN / W1, fW: fW / W1, T: Tm / W1, O: O / W1, soil: Rn / W1,
    losses: cv.map((v, i) => ({ cause: CAUSES[i], share: v / cvT })).sort((a, b) => b.share - a.share),
    better: better / n, betterX: better ? bx / better : -1, betterY: better ? by / better : -1,
    cx: wsum ? cx / wsum : -1, cy: wsum ? cy / wsum : -1, mainBiome, hist: sp.hist.slice(), evolvedTo: sp.evolvedTo,
  };
}
export type Inspect = NonNullable<ReturnType<typeof inspectSpecies>>;

export function estSpeciesList(W: World) {
  const vis = visThreshold(W);
  const spTot = new Map<number, number>();
  for (let s = 0; s < W.S; s++) if (W.alive[s]) spTot.set(W.sp[s], (spTot.get(W.sp[s]) || 0) + W.tot[s]);
  const tb = totalBiomass(W) || 1;
  const out = [];
  for (const [id, t] of spTot) {
    const sp = W.species[id];
    if (!sp.est && t < vis) continue;
    const h = sp.hist; const prev = h.length > 3 ? h[h.length - 4] : h[0] ?? t;
    out.push({ id, name: sp.name, latin: sp.latin, total: t, share: t / tb, trend: prev > 0 ? t / prev : 1, typus: sp.typus, born: sp.born, reason: sp.reason, est: t >= vis });
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}
export { dist };
