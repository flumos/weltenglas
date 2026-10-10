// Schneller Lauf: node tools/run.ts [seed] [days] [lamp]
import { createWorld, seedLife } from '../src/sim/world.ts';
import { step } from '../src/sim/sim.ts';
import { metrics } from '../src/sim/metrics.ts';
import { BIOMES, P } from '../src/sim/params.ts';
const seed = +(process.argv[2] ?? 3), days = +(process.argv[3] ?? 120), lamp = +(process.argv[4] ?? 0.6);
const W = createWorld({ seed });
W.ctl.lamp = lamp;
seedLife(W);
const t0 = performance.now();
let printed = 0;
for (let d = 1; d <= days; d++) {
  for (let i = 0; i < P.TPD; i++) step(W);
  if (d % 10 === 0 || d === days) {
    const m = metrics(W);
    const bi = m.biomes.map((v, i) => v > 0 ? `${BIOMES[i].name}:${v}` : '').filter(Boolean).join(' ');
    console.log(`d${d} o2=${m.o2.toFixed(2)} bio=${m.total.toFixed(0)} sp=${m.species} hill=${m.hill.toFixed(1)} roles=${m.prod.toFixed(0)}/${m.graz.toFixed(0)}/${m.pred.toFixed(0)} k=${m.kMax} land=${m.landBio.toFixed(0)} T=${m.minT.toFixed(0)}..${m.maxT.toFixed(0)} strains=${m.strains} | ${bi}`);
  }
}
const ms = (performance.now() - t0) / (days * P.TPD);
console.log(`ms/tick ${ms.toFixed(2)}`);
for (const e of W.chronicle.filter(e => e.kind !== 'species').slice(-40)) console.log(`  [${(e.tick / P.TPD).toFixed(0)}] ${e.kind}: ${e.text}`);
console.log('species named:', W.species.filter(s=>s.est).map(s=>s.name).join(', '));
