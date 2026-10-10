// Prüft den Akt-3-Pfad mit Laborprobe: node tools/culture-check.ts [seed]
import { createWorld, seedLife } from '../src/sim/world.ts';
import { step, applyCmd, runDays } from '../src/sim/sim.ts';
import { metrics } from '../src/sim/metrics.ts';
const seed = +(process.argv[2] ?? 3);
const W = createWorld({ seed });
seedLife(W);
W.ctl.lamp = 0.8;
runDays(W, 150);
applyCmd(W, { type: 'ctl', patch: { maxK: 6, seasons: true, drift: true } });
runDays(W, 60);
applyCmd(W, { type: 'ctl', patch: { cultures: true } });
let m = metrics(W);
console.log('vor Probe: k', m.kMax, 'landAnimals', m.landAnimals.toFixed(1), 'o2', m.o2.toFixed(1));
// Laborprobe in die Mitte
import { estSpeciesList } from '../src/sim/metrics.ts';
const base = estSpeciesList(W).filter(s => s.typus.land && s.typus.role > 0).sort((a, b) => b.total - a.total)[0];
const sp = W.species[base.id];
// Ort: Zelle mit dem meisten Bestand der Vorlage
let bc = 0, bv = 0; for (let s = 0; s < W.S; s++) if (W.alive[s] && W.sp[s] === base.id) for (let c = 0; c < W.n; c++) if (W.B[s * W.n + c] > bv) { bv = W.B[s * W.n + c]; bc = c; }
const t = { ...sp.typus, k: 6, brain: 0.8, social: 0.6, role: 1, land: 1 };
console.log('Vorlage', sp.name, 'z', t.z.toFixed(2), 'an', bc % W.w, (bc / W.w) | 0);
applyCmd(W, { type: 'inoculate', traits: t, x: bc % W.w, y: (bc / W.w) | 0, name: 'Denker' });
for (let d = 0; d < 140; d++) {
  runDays(W, 1);
  if (d % 20 === 0 && d % 7 === 0 || d % 20 === 19) { m = metrics(W); console.log(`d+${d + 1} siedl=${m.settlements} pop=${m.pop.toFixed(0)} era=${m.era} K=${m.knowledge.toFixed(1)} awe=${m.awe.toFixed(2)} k=${m.kMax}`); }
  if (d === 30) applyCmd(W, { type: 'dose', x: W.settlements[0]?.x ?? 40, y: W.settlements[0]?.y ?? 30, amount: 60 });
}
for (const e of W.chronicle.filter(e => e.kind === 'culture')) console.log(`  [${Math.floor(e.tick / 4)}] ${e.text}`);
