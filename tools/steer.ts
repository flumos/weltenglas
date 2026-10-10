// Steuerbarkeits-Test (Konzept 5.13 / Säule 3): schlägt Können den Zufall?
// node tools/steer.ts [kategorie|all] [seeds=8]
// Für jede Akt-1-Kategorie: Vorlauf bis zum Karrieretag des Wettbewerbs (Standardspiel),
// dann Vorbereitung mit Strategie vs. Standard (nichts tun), Wertung über catScore.
import { createWorld, seedLife, cloneWorld } from '../src/sim/world.ts';
import { step, applyCmd, stressTest } from '../src/sim/sim.ts';
import { metrics } from '../src/sim/metrics.ts';
import { CATEGORIES, catScore } from '../src/data/categories.ts';
import { P } from '../src/sim/params.ts';
import type { World } from '../src/sim/types.ts';

if (process.env.PX) Object.assign(P, JSON.parse(process.env.PX));

type Strat = (W: World, day: number) => void;
const day = (W: World) => W.tick / P.TPD;

/** Prisen dorthin, wo Leben ist, aber Nährstoff knapp */
function doseGreen(W: World, k: number, amount = 60) {
  const cand: [number, number][] = [];
  for (let c = 0; c < W.n; c += 7) {
    let b = 0; for (let s = 0; s < W.S; s++) if (W.alive[s] && W.role[s] === 0) b += W.B[s * W.n + c];
    if (b > 0.3 && W.N[c] < 1.2) cand.push([b / (W.N[c] + 0.2), c]);
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
/** höchster Punkt (für Wind auf die Berge / Sonne daneben) */
function peakCell(W: World) { let b = 0, bc = 0; for (let c = 0; c < W.n; c++) if (W.hgt[c] > b) { b = W.hgt[c]; bc = c; } return { x: bc % W.w, y: (bc / W.w) | 0 }; }
function landCentroid(W: World) { let sx = 0, sy = 0, k = 0; for (let c = 0; c < W.n; c++) if (!W.seaMask[c]) { sx += c % W.w; sy += (c / W.w) | 0; k++; } return { x: sx / k, y: sy / k }; }
/** Windrichtung, die vom offenen Meer auf die Landmitte weht */
function windFromSea(W: World) {
  const lc = landCentroid(W);
  const dx = lc.x - W.w / 2, dy = lc.y - W.h / 2;
  // Wind kommt von der Seite, auf der weniger Land ist
  const ang = Math.atan2(dy, dx); // Richtung zur Landmasse
  const idx = Math.round(((ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  // WIND_DIRS[i] gibt Wehrichtung; wir wollen zur Landmasse wehen
  return idx;
}

/** „Probierender Spieler“: testet Kandidaten-Eingriffe auf einer Kopie (wie die Live-Sterne der Jury-Vorschau)
 *  und nimmt den besten nach `horizon` Tagen. */
function look(cat: string, cands: ((W: World) => void)[], horizon: number, every: number): Strat {
  return (W, d) => {
    if (d % every !== 0) return;
    let best = -1, bi = 0;
    for (let i = 0; i < cands.length; i++) {
      const C = cloneWorld(W); C.chronicle = [];
      cands[i](C);
      for (let t = 0; t < horizon * P.TPD; t++) step(C);
      const sc = catScore(CATEGORIES[cat], { m: metrics(C), stress: null }).x;
      if (sc > best) { best = sc; bi = i; }
    }
    cands[bi](W);
  };
}
const windTo = (dir: number) => (W: World) => applyCmd(W, { type: 'wind', dir, on: true, str: 0.9 });
const WINDS = [0, 1, 2, 3, 4, 5, 6, 7].map(windTo);
interface Case { cat: string; start: number; days: number; good: Strat; bad?: Strat; setup?: Strat }
const doseC = (k: number) => (W: World) => doseGreen(W, k, 150);
const sunTo = (x: number, y: number, I?: number) => (W: World) => applyCmd(W, { type: 'sun', x, y, I });
const sunLand = (I: number) => (W: World) => { const lc = landCentroid(W); applyCmd(W, { type: 'sun', x: lc.x / W.w, y: lc.y / W.h, I }); };
const NOP = () => {};
const CASES: Case[] = [
  {
    cat: 'green', start: 0, days: 10,
    good: (W, d) => { if (d % 2 === 0) doseGreen(W, 2, 150); },
    bad: (W) => { for (let i = 0; i < 3; i++) applyCmd(W, { type: 'dose', x: W.w / 2, y: W.h / 2, amount: 200 }); },
  },
  {
    cat: 'colorful', start: 10, days: 21,
    good: look('colorful', [NOP, doseC(2), sunTo(0.3, 0.5), sunTo(0.7, 0.5), (W) => applyCmd(W, { type: 'water', delta: 0.02 }), (W) => applyCmd(W, { type: 'water', delta: -0.02 }), ...WINDS.slice(0, 8)], 5, 5),
  },
  {
    cat: 'foodweb', start: 31, days: 28,
    good: look('foodweb', [NOP, doseC(2), (W) => { doseC(2)(W); applyCmd(W, { type: 'sun', I: 1 }); }, (W) => applyCmd(W, { type: 'sun', I: 1 })], 5, 4),
  },
  {
    cat: 'landscapes', start: 59, days: 28,
    good: look('landscapes', [NOP, ...WINDS, sunTo(0.3, 0.5), sunTo(0.7, 0.5), (W) => applyCmd(W, { type: 'water', delta: -0.02 })], 6, 7),
  },
  {
    cat: 'rainforest', start: 87, days: 28,
    good: look('rainforest', [NOP, ...WINDS, sunLand(1), (W) => applyCmd(W, { type: 'sun', I: 1 }), doseC(2)], 7, 7),
  },
  {
    cat: 'sturdy', start: 115, days: 21,
    good: (W, d) => { if (d === 0) applyCmd(W, { type: 'thermo', on: true, set: 16, max: 10 }); },
  },
  {
    cat: 'bigstep', start: 136, days: 42,
    good: look('bigstep', [NOP, doseC(2), (W) => applyCmd(W, { type: 'sun', I: 1 }), (W) => applyCmd(W, { type: 'lid', open: true }), (W) => applyCmd(W, { type: 'lid', open: false })], 7, 7),
  },
];

/** Standardspiel bis zum Start: Kit-Lampe, ab Tag 60 Tageslichtlampe 0,8 (wie gates) */
function prelude(W: World, until: number) {
  while (day(W) < until) { if (day(W) === 60) W.ctl.lamp = 0.8; step(W); }
}
function runCase(cs: Case, seed: number, strat: Strat | null) {
  const W = createWorld({ seed }); W.ctl.lamp = 0.6; seedLife(W);
  prelude(W, cs.start);
  for (let d = 0; d < cs.days; d++) {
    if (strat) strat(W, d);
    for (let i = 0; i < P.TPD; i++) { if (day(W) === 60) W.ctl.lamp = Math.max(W.ctl.lamp, 0.8); step(W); }
  }
  const m = metrics(W);
  const stress = cs.cat === 'sturdy' ? stressTest(W) : null;
  const r = catScore(CATEGORIES[cs.cat], { m, stress });
  if (process.env.RAW) RAWX.push(`${strat ? 'S' : 'std'}:${r.x.toFixed(2)}`);
  return r.s;
}

const RAWX: string[] = [];
const want = process.argv[2] ?? 'all', nSeeds = +(process.argv[3] ?? 8);
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
for (const cs of CASES) {
  if (want !== 'all' && want !== cs.cat) continue;
  const std: number[] = [], good: number[] = [], bad: number[] = [];
  for (let s = 1; s <= nSeeds; s++) {
    std.push(runCase(cs, s, null)); good.push(runCase(cs, s, cs.good));
    if (cs.bad) bad.push(runCase(cs, s, cs.bad));
  }
  const better = good.filter((g, i) => g > std[i]).length;
  const d = (mean(good) - mean(std)) / (Math.sqrt((sd(good) ** 2 + sd(std) ** 2) / 2) || 1);
  let line = `${cs.cat.padEnd(11)} Standard ${mean(std).toFixed(0).padStart(3)} ±${sd(std).toFixed(0).padStart(2)} | Strategie ${mean(good).toFixed(0).padStart(3)} ±${sd(good).toFixed(0).padStart(2)} | besser ${better}/${nSeeds} d=${d.toFixed(1)}`;
  if (bad.length) line += ` | schlecht ${mean(bad).toFixed(0)} (unter Strategie: ${bad.filter((b, i) => b < good[i]).length}/${nSeeds})`;
  console.log(line);
  if (process.env.RAW) console.log('  x', RAWX.splice(0).join(' '));
  if (process.env.RAW) console.log('  std', std.map(v => v.toFixed(0)).join(' '), '\n  good', good.map(v => v.toFixed(0)).join(' '));
}
