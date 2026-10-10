// Karriere-Zeitleiste: Rohwerte aller Kategorien an den Wettbewerbstagen, Standard- vs. engagiertes Spiel.
// node tools/career.ts seed profile(std|good) → JSON-Zeile { day: { cat: x } , culture: {...} }
import { createWorld, seedLife, cloneWorld, START_TRAITS } from '../src/sim/world.ts';
import { step, applyCmd, stressTest } from '../src/sim/sim.ts';
import { climateDaily } from '../src/sim/climate.ts';
import { metrics, estSpeciesList, inspectSpecies } from '../src/sim/metrics.ts';
import { CATEGORIES } from '../src/data/categories.ts';
import { P } from '../src/sim/params.ts';
import { makeRoom } from '../src/sim/evo.ts';
import type { World } from '../src/sim/types.ts';

const seed = +process.argv[2], prof = process.argv[3] ?? 'std';
const DAYS = [13, 34, 63, 91, 119, 140, 183, 220, 255, 285, 313, 341, 385, 425, 465, 500, 551];
const W = createWorld({ seed }); W.ctl.lamp = 0.6; seedLife(W);
const day = () => W.tick / P.TPD;
function landRain(X: World) { let r = 0; for (let c = 0; c < X.n; c++) if (!X.seaMask[c]) r += X.Wsoil[c]; return r; }
function bestWind(X: World) { let best = 0, bv = -1; for (let d = 0; d < 8; d++) { const C = cloneWorld(X); C.ctl.wind = d; C.ctl.windOn = true; for (let i = 0; i < 6; i++) climateDaily(C); const v = landRain(C); if (v > bv) { bv = v; best = d; } } return best; }
function doseGreen(X: World, k: number) {
  const cand: [number, number][] = [];
  for (let c = 0; c < X.n; c += 5) { let b = 0; for (let s = 0; s < X.S; s++) if (X.alive[s] && X.role[s] === 0) b += X.B[s * X.n + c]; if (b > 0.3 && X.N[c] < 1.2) cand.push([b * X.L[c] / (X.N[c] + 0.2), c]); }
  cand.sort((a, b) => b[0] - a[0]); const used: number[] = [];
  for (const [, c] of cand) { const x = c % X.w, y = (c / X.w) | 0; if (used.some(u => Math.abs((u % X.w) - x) + Math.abs(((u / X.w) | 0) - y) < 12)) continue; applyCmd(X, { type: 'dose', x, y, amount: 150 }); used.push(c); if (used.length >= k) break; }
}
const out: any = { seed, prof, x: {}, culture: {} };
let lab = -1;
for (let d = 0; d <= 551; d++) {
  if (d === 60) W.ctl.lamp = 0.8;
  if (d === 160) { W.ctl.maxK = 6; W.ctl.seasons = true; W.ctl.drift = true; for (const h of W.hotspots) { h.vx = 0.02; h.vy = -0.01; } }
  if (d === 340) {
    W.ctl.cultures = true;
    const reg = estSpeciesList(W);
    if (!reg.some(r => r.typus.k >= 6)) {
      // Laborprobe wie career.ts/labSample
      const base = reg.filter(r => r.typus.land && r.typus.role > 0).sort((a, b) => b.total - a.total)[0];
      const t = base ? { ...base.typus } : { ...START_TRAITS, role: 1, land: 1, mob: 0.7, dry: 0.3, hue: 30, z: 0.3, k: 4 };
      Object.assign(t, { k: 6, brain: 0.8, social: 0.6, mob: Math.max(0.62, t.mob), role: 1, land: 1 });
      let x = W.w / 2, y = W.h / 2;
      if (base) { const i = inspectSpecies(W, base.id); if (i && i.cx >= 0) { x = i.cx; y = i.cy; } }
      if (!process.env.NOROOM) makeRoom(W, true);
      const before = W.species.length;
      applyCmd(W, { type: 'inoculate', traits: t, x, y, name: 'Denker', amount: 2.0 });
      out.culture.labOk = W.species.length > before;
      lab = d; out.culture.lab = d;
    }
  }
  if (prof === 'good') {
    if (d === 30) W.ctl.lamp = 0.8;
    if (d === 90) W.ctl.lamp = 1.0;
    if (d % 3 === 0 && d < 160) { let nn = 0, k = 0; for (let c = 0; c < W.n; c++) if (W.seaMask[c]) { nn += W.N[c]; k++; } if (nn / k < 1.0) doseGreen(W, 2); }
    if (d % 20 === 5 && d > 30) applyCmd(W, { type: 'wind', dir: bestWind(W), on: true, str: 0.9 });
    if (d === 115) applyCmd(W, { type: 'thermo', on: true, set: 16, max: 10 });
  }
  if (DAYS.includes(d)) {
    const m = metrics(W);
    const needStress = [140, 183, 285, 551].includes(d);
    const stress = needStress ? stressTest(W) : null;
    const xs: Record<string, number> = {};
    for (const [id, c] of Object.entries(CATEGORIES)) { if (id === 'sturdy' && !stress) continue; xs[id] = +c.x({ m, stress }).toFixed(2); }
    out.x[d] = xs;
  }
  if (W.settlements.length && out.culture.found === undefined) out.culture.found = d;
  for (let e = 1; e <= 5; e++) if (W.settlements.some(s => s.era >= e) && out.culture['era' + e] === undefined) out.culture['era' + e] = d;
  for (let i = 0; i < P.TPD; i++) step(W);
}
console.log(JSON.stringify(out));
