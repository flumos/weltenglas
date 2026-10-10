// Hebel-Analyse: node tools/levers.ts start days lever [seeds]
// Druckt Kennzahlen (Mittel über Seeds) nach Vorlauf + Vorbereitung mit einem Hebel.
import { createWorld, seedLife, cloneWorld } from '../src/sim/world.ts';
import { step, applyCmd } from '../src/sim/sim.ts';
import { climateDaily } from '../src/sim/climate.ts';
import { metrics } from '../src/sim/metrics.ts';
import { P, B_FOREST, B_RAIN, B_TAIGA } from '../src/sim/params.ts';
import type { World } from '../src/sim/types.ts';
if (process.env.PX) Object.assign(P, JSON.parse(process.env.PX));

const [start, days] = [+process.argv[2], +process.argv[3]], lever = process.argv[4], nS = +(process.argv[5] ?? 8);
const day = (W: World) => W.tick / P.TPD;

export function landRain(W: World) { let r = 0; for (let c = 0; c < W.n; c++) if (!W.seaMask[c]) r += W.Wsoil[c]; return r; }
/** „Regenmesser-Spieler“: probiert jede Windrichtung kurz aus und nimmt die mit dem meisten Regen an Land */
export function bestWind(W: World) {
  let best = 0, bv = -1;
  for (let d = 0; d < 8; d++) { const C = cloneWorld(W); C.ctl.wind = d; C.ctl.windOn = true; C.ctl.windStr = 0.9; for (let i = 0; i < 6; i++) climateDaily(C); const v = landRain(C); if (v > bv) { bv = v; best = d; } }
  return best;
}
function doseGreen(W: World, k: number, amount: number) {
  const cand: [number, number][] = [];
  for (let c = 0; c < W.n; c += 5) {
    let b = 0; for (let s = 0; s < W.S; s++) if (W.alive[s] && W.role[s] === 0) b += W.B[s * W.n + c];
    if (b > 0.3 && W.N[c] < 1.2) cand.push([b * W.L[c] / (W.N[c] + 0.2), c]);
  }
  cand.sort((a, b) => b[0] - a[0]);
  const used: number[] = [];
  for (const [, c] of cand) {
    const x = c % W.w, y = (c / W.w) | 0;
    if (used.some(u => Math.abs((u % W.w) - x) + Math.abs(((u / W.w) | 0) - y) < 12)) continue;
    applyCmd(W, { type: 'dose', x, y, amount }); used.push(c);
    if (used.length >= k) break;
  }
}
const LEVERS: Record<string, (W: World, d: number) => void> = {
  none: () => {},
  dose60: (W, d) => { if (d % 3 === 0) doseGreen(W, 1, 60); },
  dose150: (W, d) => { if (d % 2 === 0) doseGreen(W, 2, 150); },
  overdose: (W) => { for (let i = 0; i < 3; i++) applyCmd(W, { type: 'dose', x: W.w / 2, y: W.h / 2, amount: 200 }); },
  lamp1: (W, d) => { if (d === 0) applyCmd(W, { type: 'sun', I: 1 }); },
  sunEdge: (W, d) => { if (d === 0) applyCmd(W, { type: 'sun', x: 0.25, y: 0.5 }); },
  sunEdgeBright: (W, d) => { if (d === 0) applyCmd(W, { type: 'sun', x: 0.25, y: 0.5, I: 1 }); },
  sunWander: (W, d) => { if (d % 6 === 0) applyCmd(W, { type: 'sun', x: [0.3, 0.7, 0.5][(d / 6) % 3], y: 0.5 }); },
  windBest: (W, d) => { if (d === 0) { const b = bestWind(W); applyCmd(W, { type: 'wind', dir: b, on: true, str: 0.9 }); } },
  windBestLamp: (W, d) => { if (d === 0) { const b = bestWind(W); applyCmd(W, { type: 'wind', dir: b, on: true, str: 0.9 }); applyCmd(W, { type: 'sun', I: 1 }); } },
  waterDown: (W, d) => { if (d === 0) applyCmd(W, { type: 'water', delta: -0.02 }); },
  waterUp: (W, d) => { if (d === 0) applyCmd(W, { type: 'water', delta: 0.02 }); },
  uv2: (W, d) => { if (d === 0) applyCmd(W, { type: 'uv', factor: 2 }); },
  uv3: (W, d) => { if (d === 0) applyCmd(W, { type: 'uv', factor: 3 }); },
  lid: (W, d) => { if (d === 0) applyCmd(W, { type: 'lid', open: true }); },
  mountain: (W, d) => { if (d === 0) { let b = 0, bc = 0; for (let c = 0; c < W.n; c++) if (W.hgt[c] > b && !W.seaMask[c]) { b = W.hgt[c]; bc = c; } applyCmd(W, { type: 'terrain', x: bc % W.w, y: (bc / W.w) | 0, r: 5, delta: 0.12 }); } },
  volcano: (W, d) => { if (d === 0) applyCmd(W, { type: 'hotspot', x: W.w * 0.3, y: W.h * 0.5 }); },
  thermo: (W, d) => { if (d === 0) applyCmd(W, { type: 'thermo', on: true, set: 16, max: 10 }); },
  lidShort: (W, d) => { if (d === 0) applyCmd(W, { type: 'lid', open: true }); if (d === 4) applyCmd(W, { type: 'lid', open: false }); },
  uvDose: (W, d) => { if (d === 0) applyCmd(W, { type: 'uv', factor: 2 }); if (d % 2 === 0) doseGreen(W, 2, 150); },
  edgeDose: (W, d) => { if (d === 0) applyCmd(W, { type: 'sun', x: 0.3, y: 0.5 }); if (d % 2 === 0) doseGreen(W, 2, 150); },
  waterDownWind: (W, d) => { if (d === 0) { applyCmd(W, { type: 'water', delta: -0.02 }); const b = bestWind(W); applyCmd(W, { type: 'wind', dir: b, on: true, str: 0.9 }); } },
  landscape: (W, d) => { if (d === 0) { applyCmd(W, { type: 'sun', I: 1, x: 0.35, y: 0.5 }); const b = bestWind(W); applyCmd(W, { type: 'wind', dir: b, on: true, str: 0.9 }); } },
  sunCorner: (W, d) => { if (d === 0) applyCmd(W, { type: 'sun', x: 0.15, y: 0.2 }); },
  sunCornerBright: (W, d) => { if (d === 0) applyCmd(W, { type: 'sun', x: 0.15, y: 0.2, I: 1 }); },
  coldSide: (W, d) => { if (d === 0) { applyCmd(W, { type: 'sun', x: 0.2, y: 0.5, I: 0.9 }); let b = 0, bc = 0; for (let c = 0; c < W.n; c++) { const x = c % W.w; if (x > W.w * 0.55 && W.hgt[c] > b && !W.seaMask[c]) { b = W.hgt[c]; bc = c; } } applyCmd(W, { type: 'terrain', x: bc % W.w, y: (bc / W.w) | 0, r: 6, delta: 0.15 }); } },
  combo: (W, d) => { if (d === 0) { const b = bestWind(W); applyCmd(W, { type: 'wind', dir: b, on: true, str: 0.9 }); applyCmd(W, { type: 'sun', I: 1 }); } if (d % 2 === 0) doseGreen(W, 2, 150); },
};

const acc: Record<string, number[]> = {};
for (let seed = 1; seed <= nS; seed++) {
  const W = createWorld({ seed }); W.ctl.lamp = 0.6; seedLife(W);
  while (day(W) < start) { if (day(W) === 60) W.ctl.lamp = 0.8; step(W); }
  for (let d = 0; d < days; d++) { LEVERS[lever](W, d); for (let i = 0; i < P.TPD; i++) step(W); }
  const m = metrics(W);
  const forest = (m.biomeFrac[B_FOREST] + m.biomeFrac[B_TAIGA] + m.biomeFrac[B_RAIN]) * 100;
  const v: Record<string, number> = { green: m.green, clar: m.clarity, sp: m.species, hill: m.hill, kinds: m.biomeKinds, bhill: m.biomeHill, forest, rainF: m.biomeFrac[B_RAIN] * 100,
    graz: m.graz, pred: m.pred, lev: m.levels, k: m.kMax, landA: m.landAnimals, zMax: m.zMax, landZ: m.landZMax, total: m.total, o2: m.o2, links: m.links, exotic: m.exotic };
  const lf = m.landFrac || 1;
  let lk = 0, lh = 0; for (let i = 3; i < 12; i++) { const f = m.biomeFrac[i] / lf; if (f >= 0.04) lk++; if (f > 0) lh -= f * Math.log(f); }
  v.landKinds = lk; v.landHill = Math.exp(lh);
  for (let i = 3; i < 12; i++) v['b' + i] = m.biomeFrac[i] / lf * 100;
  for (const [k, x] of Object.entries(v)) (acc[k] ??= []).push(x);
}
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(lever.padEnd(13), Object.entries(acc).map(([k, a]) => `${k}=${mean(a).toFixed(k === 'green' || k === 'clar' || k === 'zMax' || k === 'landZ' ? 2 : 1)}`).join(' '));
if (process.env.RAW) for (const [k, a] of Object.entries(acc)) if (process.env.RAW.split(',').includes(k)) console.log('   ', k, a.map(x => x.toFixed(2)).join(' '));
