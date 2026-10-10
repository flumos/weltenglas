// Fuzz: zufällige Befehle über 200 Tage — kein NaN/Inf, Biomasse endlich, Stamm-Deckel hält.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, seedLife, START_TRAITS } from '../src/sim/world.ts';
import { step, applyCmd } from '../src/sim/sim.ts';
import { P } from '../src/sim/params.ts';
import { finiteCheck } from './helpers.ts';
import type { Cmd, World } from '../src/sim/types.ts';

function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randomCmd(W: World, r: () => number): Cmd {
  const x = r() * W.w, y = r() * W.h;
  const pick = Math.floor(r() * 16);
  switch (pick) {
    case 0: return { type: 'sun', x: r(), y: r(), I: r() };
    case 1: return { type: 'photo', hours: 6 + r() * 12 };
    case 2: return { type: 'wind', dir: Math.floor(r() * 8), on: r() > 0.2, str: r() };
    case 3: return { type: 'water', delta: (r() - 0.5) * 0.08 };
    case 4: return { type: 'hotspot', x, y };
    case 5: return { type: 'terrain', x, y, r: 1 + r() * 8, delta: (r() - 0.5) * 0.4 };
    case 6: return { type: 'dose', x, y, amount: r() * 600 };
    case 7: return { type: 'lid', open: r() > 0.5 };
    case 8: return { type: 'uv', factor: 0.5 + r() * 3.5 };
    case 9: return { type: 'thermo', on: r() > 0.3, set: 5 + r() * 30, max: r() * 15 };
    case 10: return { type: 'cool', delta: r() * 12 };
    case 11: return { type: 'net', x, y, r: 1 + r() * 10 };
    case 12: return { type: 'inoculate', traits: { ...START_TRAITS, role: Math.floor(r() * 3), land: r() > 0.5 ? 1 : 0, k: 1 + Math.floor(r() * 6), topt: r() * 40, z: r(), mob: r(), brain: r(), social: r() }, x, y, amount: r() * 3 };
    case 13: return { type: 'event', id: ['hitze', 'lueften', 'strom', 'katze', 'saft', 'winter', 'heizstab'][Math.floor(r() * 7)] };
    case 14: return { type: 'meteor', x, y };
    default: return { type: 'ctl', patch: { maxK: 1 + Math.floor(r() * 6), seasons: r() > 0.5, drift: r() > 0.5, cultures: r() > 0.5, tectonics: r() * 3 } };
  }
}
for (const seed of [1, 2, 3]) {
  test(`Fuzz Seed ${seed}: 200 Tage zufällige Eingriffe bleiben endlich`, () => {
    const W = createWorld({ seed }); seedLife(W);
    const r = mulberry(seed * 977);
    for (let d = 0; d < 200; d++) {
      if (r() < 0.35) applyCmd(W, randomCmd(W, r));
      if (r() < 0.1) applyCmd(W, randomCmd(W, r));
      for (let i = 0; i < P.TPD; i++) step(W);
      const bad = finiteCheck(W);
      assert.equal(bad, '', `Tag ${d}: ${bad}`);
      let alive = 0; for (let s = 0; s < W.S; s++) alive += W.alive[s];
      assert.ok(alive <= W.S);
      assert.ok(W.o2 >= 0 && W.o2 <= 30, `o2 ${W.o2}`);
    }
  });
}
