// Umtopfen: die Welt zieht in eine größere Schale. Arten, Atmosphäre und Chronik ziehen mit.
import { createWorld, traitsOf } from './world.ts';
import { chron } from './world.ts';
import { GLASSES, NC, type GlassSize } from './params.ts';
import { classifyBiomes } from './metrics.ts';
import { thermal, climateDaily } from './climate.ts';
import type { World } from './types.ts';

export function transplant(old: World, size: GlassSize, seed?: number): World {
  const W = createWorld({ size, seed: seed ?? old.seed + 101, landFrac: 0.36, hotspots: Math.max(3, old.hotspots.length) });
  W.tick = old.tick;
  W.o2 = old.o2;
  W.ctl = { ...old.ctl };
  W.species = old.species;
  W.chronicle = old.chronicle;
  W.flags = { ...old.flags };
  W.hist = old.hist;
  W.mutants = old.mutants; W.buried = old.buried;
  W.startTraits = old.startTraits;
  W.wonderLog = [];
  W.settlements = [];
  // Klima vorrechnen, damit Lebensräume stimmen
  thermal(W); climateDaily(W); thermal(W);
  // Stämme übertragen: mittlere Dichte im passenden Lebensraum, in einer zufälligen Region verdichtet
  const order: number[] = [];
  for (let s = 0; s < old.S; s++) if (old.alive[s]) order.push(s);
  order.sort((a, b) => old.tot[b] - old.tot[a]);
  let slot = 0;
  for (const s of order) {
    if (slot >= W.S) break;
    const t = traitsOf(old, s);
    const want = t.land ? 0 : 1;
    let cellsOld = 0; for (let c = 0; c < old.n; c++) if (old.seaMask[c] === want) cellsOld++;
    let cellsNew = 0; for (let c = 0; c < W.n; c++) if (W.seaMask[c] === want) cellsNew++;
    if (!cellsNew) continue;
    const dens = old.tot[s] / Math.max(1, cellsOld);
    const k = slot;
    for (const key of ['role', 'land', 'k', 'topt', 'sig', 'z', 'mob', 'def', 'aff', 'dry', 'hue', 'brain', 'social'] as const) (W[key] as Float32Array)[k] = t[key];
    W.alive[k] = 1; W.sp[k] = old.sp[s]; W.born[k] = old.born[s]; W.novel[k] = old.novel[s]; W.jump[k] = old.jump[s];
    for (let i = 0; i < NC; i++) W.loss[k * NC + i] = old.loss[s * NC + i];
    let tot = 0;
    for (let c = 0; c < W.n; c++) if (W.seaMask[c] === want) {
      // Landpflanzen eher dort, wo es feucht ist; Meeresbewohner überall
      const f = t.land && t.role === 0 ? 0.3 + W.Wsoil[c] : 1;
      const v = dens * f; W.B[k * W.n + c] = v; tot += v;
    }
    W.tot[k] = tot;
    slot++;
  }
  classifyBiomes(W);
  chron(W, { kind: 'event', text: `Umgezogen in die ${GLASSES[size].name}! Deine Arten haben eine neue, größere Welt.`, big: true });
  return W;
}
