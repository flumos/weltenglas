// Determinismus (Konzept 6.4): gleicher Seed + gleiche Befehle = gleicher Zustand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, seedLife } from '../src/sim/world.ts';
import { step, applyCmd } from '../src/sim/sim.ts';
import { worldHash } from './helpers.ts';
import type { Cmd } from '../src/sim/types.ts';

const CMDS: [number, Cmd][] = [
  [8, { type: 'dose', x: 40, y: 30, amount: 150 }], [20, { type: 'sun', x: 0.35, y: 0.5, I: 0.8 }],
  [30, { type: 'wind', dir: 3, on: true, str: 0.8 }], [44, { type: 'water', delta: -0.02 }],
  [60, { type: 'terrain', x: 50, y: 30, r: 4, delta: 0.08 }], [70, { type: 'event', id: 'lueften' }],
];
function run(seed: number, ticks: number) {
  const W = createWorld({ seed }); seedLife(W);
  for (let t = 0; t < ticks; t++) { for (const [at, c] of CMDS) if (at === t) applyCmd(W, c); step(W); }
  return W;
}
test('gleicher Seed und Befehlslog ergeben identischen Zustand', () => {
  const a = run(3, 240), b = run(3, 240);
  assert.equal(worldHash(a), worldHash(b));
});
test('anderer Seed ergibt andere Welt', () => {
  assert.notEqual(worldHash(run(3, 40)), worldHash(run(4, 40)));
});
test('Klon läuft deterministisch weiter', () => {
  const W = run(5, 120); const C = structuredClone(W);
  for (let i = 0; i < 80; i++) { step(W); step(C); }
  assert.equal(worldHash(W), worldHash(C));
});
