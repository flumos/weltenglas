// Gate-Messung für einen Seed: node tools/gates.ts seed days [lamp] [lamp2day lamp2] [act2day] [act3day]
import { createWorld, seedLife } from '../src/sim/world.ts';
import { step } from '../src/sim/sim.ts';
import { metrics } from '../src/sim/metrics.ts';
import { P } from '../src/sim/params.ts';
import { dist } from '../src/sim/world.ts';
if (process.env.PX) Object.assign(P, JSON.parse(process.env.PX));
const a = process.argv.slice(2).map(Number);
const seed = a[0] ?? 1, days = a[1] ?? 150, lamp = a[2] ?? 0.6, l2d = a[3] ?? 60, l2 = a[4] ?? 0.8, act2 = a[5] ?? 9999, act3 = a[6] ?? 9999;
const W = createWorld({ seed }); W.ctl.lamp = lamp; seedLife(W);
const r: any = { seed };
const at = (k: string, d: number) => { if (r[k] === undefined) r[k] = d; };
let peak = 0, minAfterPeak = Infinity; const t0 = performance.now(); let ticks = 0;
for (let d = 1; d <= days; d++) {
  if (d === l2d) W.ctl.lamp = l2;
  if (d === act2) { W.ctl.maxK = 6; W.ctl.seasons = true; W.ctl.drift = true; for (const h of W.hotspots) { h.vx = 0.03 * ((h.x * 7) % 3 - 1); h.vy = 0.03 * ((h.y * 13) % 3 - 1); } }
  if (d === act3) W.ctl.cultures = true;
  for (let i = 0; i < P.TPD; i++) { step(W); ticks++; }
  if (W.o2 >= 2) at('o2_2', d); if (W.o2 >= 8) at('o2_8', d);
  if (W.flags.r0l1 !== undefined) at('land', d); if (W.flags.r1l0 !== undefined) at('graz', d);
  if (W.flags.r2l0 !== undefined || W.flags.r2l1 !== undefined) at('pred', d);
  if (W.flags.k2 !== undefined) at('k2', d); if (W.flags.k5 !== undefined) at('k5', d); if (W.flags.k6 !== undefined) at('k6', d);
  if (W.flags.forest !== undefined) at('forest', d);
  if (W.settlements.length) at('settle', d);
  if (W.settlements.some(s => s.era >= 4)) at('era4', d);
  if (d <= 200 && (d % 10 === 0 || d === days)) {
    let tot = 0; for (let s = 0; s < W.S; s++) if (W.alive[s]) tot += W.tot[s];
    if (tot > peak) { peak = tot; minAfterPeak = tot; } else minAfterPeak = Math.min(minAfterPeak, tot);
  }
  if (d === 100) { const m = metrics(W); r.sp100 = m.species; r.hill100 = +m.hill.toFixed(1); }
}
const m = metrics(W);
r.spEnd = m.species; r.hillEnd = +m.hill.toFixed(1); r.o2End = +W.o2.toFixed(1); r.kMax = m.kMax; r.collapse = +(minAfterPeak / peak).toFixed(2);
r.forestCells = m.biomes[8] + m.biomes[9] + m.biomes[10]; r.era = m.era; r.sett = m.settlements;
r.ms = +((performance.now() - t0) / ticks).toFixed(2);
console.log(JSON.stringify(r));
