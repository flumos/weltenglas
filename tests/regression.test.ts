// Regressionen aus der Kalibrierung (Konzept 5.13): Überdüngung schadet, Thermostat hilft im Stresstest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, seedLife } from '../src/sim/world.ts';
import { step, applyCmd, stressTest } from '../src/sim/sim.ts';
import { metrics } from '../src/sim/metrics.ts';
import { CATEGORIES, catScore } from '../src/data/categories.ts';
import { P } from '../src/sim/params.ts';

function seaSpot(W: ReturnType<typeof createWorld>, fx: number) {
  let best = 0, bd = Infinity;
  for (let c = 0; c < W.n; c++) if (W.seaMask[c]) { const dx = (c % W.w) - W.w * fx, dy = ((c / W.w) | 0) - W.h / 2, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = c; } }
  return { x: best % W.w, y: (best / W.w) | 0 };
}
function prep(seed: number, days: number, fn?: (W: ReturnType<typeof createWorld>, d: number) => void) {
  const W = createWorld({ seed }); seedLife(W);
  for (let d = 0; d < days; d++) { fn?.(W, d); for (let i = 0; i < P.TPD; i++) step(W); }
  return W;
}
test('Überdüngung trübt das Wasser und ist schlechter als gezieltes Düngen', () => {
  let better = 0;
  for (const seed of [1, 2, 3]) {
    const good = prep(seed, 12, (W, d) => { if (d % 2 === 0) { const p = seaSpot(W, 0.4); applyCmd(W, { type: 'dose', x: p.x, y: p.y, amount: 150 }); } });
    const over = prep(seed, 12, W => { const p = seaSpot(W, 0.5); for (let i = 0; i < 3; i++) applyCmd(W, { type: 'dose', x: p.x, y: p.y, amount: 200 }); });
    const g = catScore(CATEGORIES.green, { m: metrics(good) }).x, o = catScore(CATEGORIES.green, { m: metrics(over) }).x;
    assert.ok(metrics(over).clarity < metrics(good).clarity, 'Überdüngung muss trüben');
    if (g > o) better++;
  }
  assert.ok(better >= 2, `gezielt besser in ${better}/3`);
});
test('Thermostat verbessert den Jury-Stresstest', () => {
  let better = 0;
  for (const seed of [1, 2, 3]) {
    const base = prep(seed, 40);
    const th = structuredClone(base); applyCmd(th, { type: 'thermo', on: true, set: 16, max: 10 });
    for (let i = 0; i < 8 * P.TPD; i++) { step(base); step(th); }
    if (stressTest(th).score > stressTest(base).score) better++;
  }
  assert.equal(better, 3);
});
test('Sauerstoff steigt nur durch Leben und bleibt unter 30 %', () => {
  const dead = createWorld({ seed: 2 }); for (let i = 0; i < 40; i++) step(dead);
  assert.equal(dead.o2, 0);
  const W = prep(2, 120);
  assert.ok(W.o2 > 2 && W.o2 < 30);
});
