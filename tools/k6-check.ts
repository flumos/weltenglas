// Wie lange überlebt eine eingesetzte Denker-Linie? node tools/k6-check.ts seed
import { createWorld, seedLife } from '../src/sim/world.ts';
import { applyCmd, runDays } from '../src/sim/sim.ts';
import { estSpeciesList, inspectSpecies } from '../src/sim/metrics.ts';
const seed = +(process.argv[2] ?? 3);
const W = createWorld({ seed }); seedLife(W); W.ctl.lamp = 0.8;
runDays(W, 160); applyCmd(W, { type: 'ctl', patch: { maxK: 6, seasons: true, drift: true } }); runDays(W, 180);
applyCmd(W, { type: 'ctl', patch: { cultures: true } });
const base = estSpeciesList(W).filter(s => s.typus.land && s.typus.role > 0).sort((a, b) => b.total - a.total)[0];
const d0 = inspectSpecies(W, base.id)!;
const t = { ...base.typus, k: 6, brain: 0.8, social: 0.6, mob: Math.max(0.62, base.typus.mob), role: 1, land: 1 };
applyCmd(W, { type: 'inoculate', traits: t, x: d0.cx, y: d0.cy, name: 'Denker', amount: 2 });
const id = W.species.length - 1;
for (let d = 1; d <= 120; d++) {
  runDays(W, 1);
  if (d % 10 === 0) { const i = inspectSpecies(W, id)!; const k6 = estSpeciesList(W).filter(s => s.typus.k >= 6).reduce((a, s) => a + s.total, 0);
    console.log(`d${d} Denker=${i.total.toFixed(1)} alle k6=${k6.toFixed(1)} Siedl=${W.settlements.filter(s => s.alive).length} Ära=${Math.max(0, ...W.settlements.map(s => s.era))} Verlust: ${i.losses.slice(0, 3).map(l => l.cause + ' ' + (l.share * 100).toFixed(0) + '%').join(', ')} fT=${i.fT.toFixed(2)} T=${i.T.toFixed(1)}`); }
}
