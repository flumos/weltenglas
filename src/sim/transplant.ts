// Umtopfen: die Welt zieht in eine größere Schale. Arten, Atmosphäre und Chronik ziehen mit.
import { createWorld, traitsOf, updateSeaMask } from './world.ts';
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
  const fx = W.w / old.w, fy = W.h / old.h;
  // Gelände der alten Welt bilinear hochskalieren: gleiche Küsten, gleiche Nischen, nur größer
  for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
    const ox = Math.min(old.w - 1.001, Math.max(0, (x + 0.5) / fx - 0.5)), oy = Math.min(old.h - 1.001, Math.max(0, (y + 0.5) / fy - 0.5));
    const ix = Math.floor(ox), iy = Math.floor(oy), tx = ox - ix, ty = oy - iy, o = iy * old.w + ix;
    const a = old.hgt[o], b = old.hgt[o + 1], c = old.hgt[o + old.w], d = old.hgt[o + old.w + 1];
    W.hgt[y * W.w + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
  W.sea = old.sea; updateSeaMask(W);
  W.hotspots = old.hotspots.map(h => ({ x: h.x * fx, y: h.y * fy, vx: h.vx, vy: h.vy }));
  for (let c = 0; c < W.n; c++) { const x = c % W.w, y = (c / W.w) | 0; const oc = Math.min(old.h - 1, Math.floor(y / fy)) * old.w + Math.min(old.w - 1, Math.floor(x / fx)); W.N[c] = old.N[oc]; W.Wsoil[c] = old.Wsoil[oc]; W.veg[c] = old.veg[oc]; W.M[c] = old.M[oc]; W.Rain[c] = old.Rain[oc]; }
  W.settlements = old.settlements.map(st => ({ ...st, x: st.x * fx, y: st.y * fy }));
  // Klima vorrechnen, damit Lebensräume stimmen
  thermal(W); climateDaily(W); thermal(W);
  // Stämme übertragen: Verteilung räumlich skaliert mitnehmen (Nischen bleiben erhalten),
  // dazu eine dünne Grunddichte im ganzen passenden Lebensraum
  const order: number[] = [];
  for (let s = 0; s < old.S; s++) if (old.alive[s]) order.push(s);
  order.sort((a, b) => old.tot[b] - old.tot[a]);
  let slot = 0;
  for (const s of order) {
    if (slot >= W.S) break;
    const t = traitsOf(old, s);
    const want = t.land ? 0 : 1;
    let cellsNew = 0; for (let c = 0; c < W.n; c++) if (W.seaMask[c] === want) cellsNew++;
    if (!cellsNew) continue;
    const k = slot;
    for (const key of ['role', 'land', 'k', 'topt', 'sig', 'z', 'mob', 'def', 'aff', 'dry', 'hue', 'brain', 'social'] as const) (W[key] as Float32Array)[k] = t[key];
    W.alive[k] = 1; W.sp[k] = old.sp[s]; W.born[k] = old.born[s]; W.novel[k] = old.novel[s]; W.jump[k] = old.jump[s];
    for (let i = 0; i < NC; i++) W.loss[k * NC + i] = old.loss[s * NC + i];
    const base = 0.08 * old.tot[s] / cellsNew;
    let tot = 0;
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
      const c = y * W.w + x; if (W.seaMask[c] !== want) continue;
      const oc = Math.min(old.h - 1, Math.floor(y / fy)) * old.w + Math.min(old.w - 1, Math.floor(x / fx));
      const v = old.B[s * old.n + oc] / (fx * fy) * 0.92 + base;
      W.B[k * W.n + c] = v; tot += v;
    }
    W.tot[k] = tot;
    slot++;
  }
  classifyBiomes(W);
  chron(W, { kind: 'event', text: `Umgezogen in die ${GLASSES[size].name}! Deine Welt ist mitgewachsen – mehr Platz für neue Arten.`, big: true });
  return W;
}
