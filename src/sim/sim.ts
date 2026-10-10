// Tick-Pipeline (Konzept 5.4) und Befehle. Reihenfolge ist Teil des Determinismus-Vertrags.
import { P, NC, BIOMES, B_FOREST, B_RAIN, B_TAIGA } from './params.ts';
import { clamp, gaussBump, rngNext } from './math.ts';
import { climateDaily, thermal, WIND_NAMES } from './climate.ts';
import { biology, nutrients, movement } from './bio.ts';
import { mutation, bookkeeping, merge, strainOfSpecies } from './evo.ts';
import { classifyBiomes, dayStat } from './metrics.ts';
import { cultureDaily, registerWonder } from './culture.ts';
import { addStrain, chron, cloneWorld, nameSpecies, seedLife, totalBiomass, traitsOf, updateSeaMask, visThreshold } from './world.ts';
import type { World, Cmd, Traits } from './types.ts';

export function step(W: World) {
  if (W.tick % P.TPD === 0) {
    W.effects = W.effects.filter(e => e.until > W.tick);
    climateDaily(W);
  }
  thermal(W);
  biology(W);
  nutrients(W);
  movement(W);
  mutation(W);
  bookkeeping(W);
  W.tick++;
  if (W.tick % P.TPD === 0) daily(W);
}

function daily(W: World) {
  merge(W);
  classifyBiomes(W);
  // Verluste zerfallen täglich; Artstatistik
  for (let i = 0; i < W.loss.length; i++) W.loss[i] *= 0.85;
  const spTot = new Map<number, number>();
  for (let s = 0; s < W.S; s++) if (W.alive[s]) spTot.set(W.sp[s], (spTot.get(W.sp[s]) || 0) + W.tot[s]);
  const plague = new Map<number, number>(), lossT = new Map<number, number>();
  for (let s = 0; s < W.S; s++) if (W.alive[s]) {
    const id = W.sp[s]; let lt = 0; for (let i = 0; i < NC; i++) lt += W.loss[s * NC + i];
    plague.set(id, (plague.get(id) || 0) + W.loss[s * NC + 8]); lossT.set(id, (lossT.get(id) || 0) + lt);
  }
  for (const sp of W.species) {
    if (!sp.alive) continue;
    const t = spTot.get(sp.id) || 0;
    sp.hist.push(+t.toFixed(3)); if (sp.hist.length > 60) sp.hist.shift();
    // geglätteter Ursachen-Vektor der Art
    const cv = new Array(NC).fill(0);
    for (let s = 0; s < W.S; s++) if (W.alive[s] && W.sp[s] === sp.id) for (let i = 0; i < NC; i++) cv[i] += W.loss[s * NC + i];
    sp.cv = cv;
    const pl = plague.get(sp.id) || 0, lt = lossT.get(sp.id) || 1;
    const key = 'plague' + sp.id;
    if (sp.est && t > 80 && pl / lt > 0.6 && (W.flags[key] ?? -1e9) < W.tick - 40 * P.TPD && (W.flags.plagueAny ?? -1e9) < W.tick - 8 * P.TPD) {
      W.flags.plagueAny = W.tick;
      W.flags[key] = W.tick;
      chron(W, { kind: 'plague', text: `Seuche bei den ${sp.name}: Die Art ist zu dicht geworden.`, species: sp.id });
    }
  }
  // Sauerstoff-Meilensteine
  const ms: [number, string][] = [[1, 'Die Luft im Glas enthält jetzt 1 % Sauerstoff.'], [2, 'Sauerstoff 2 %: Eine Ozonschicht schützt das Land. Leben kann an Land gehen.'],
    [8, 'Sauerstoff 8 %: Genug für Holz – Pflanzen können zu Bäumen werden.'], [15, 'Sauerstoff 15 %: Die Luft wird reich.'], [21, 'Sauerstoff 21 %: so viel wie in deinem Zimmer.']];
  for (const [v, txt] of ms) if (W.o2 >= v && !W.flags['o2_' + v]) { W.flags['o2_' + v] = W.tick; chron(W, { kind: 'o2', text: txt, big: v === 2 || v === 8 }); }
  // erster Wald
  let forest = 0; for (let c = 0; c < W.n; c++) { const b = W.biome[c]; if (b === B_FOREST || b === B_RAIN || b === B_TAIGA) forest++; }
  if (forest >= 20 && !W.flags.forest) { W.flags.forest = W.tick; chron(W, { kind: 'biome', text: 'Ein erster Wald ist gewachsen!', big: true }); }
  if (W.ctl.cultures) cultureDaily(W);
  W.hist.push(dayStat(W));
  if (W.hist.length > 400) W.hist.shift();
}

export function runDays(W: World, days: number) { const end = W.tick + days * P.TPD; while (W.tick < end) step(W); }

// ------------------------------------------------------------ Befehle
function cellsIn(W: World, x: number, y: number, r: number) {
  const out: number[] = [];
  for (let yy = Math.max(0, Math.floor(y - r)); yy <= Math.min(W.h - 1, Math.ceil(y + r)); yy++)
    for (let xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(W.w - 1, Math.ceil(x + r)); xx++)
      if ((xx - x) * (xx - x) + (yy - y) * (yy - y) <= r * r) out.push(yy * W.w + xx);
  return out;
}

export function applyCmd(W: World, cmd: Cmd) {
  const ctl = W.ctl;
  switch (cmd.type) {
    case 'sun': {
      if (cmd.x !== undefined) ctl.lampX = clamp(cmd.x, 0, 1);
      if (cmd.y !== undefined) ctl.lampY = clamp(cmd.y, 0, 1);
      if (cmd.I !== undefined) ctl.lamp = clamp(cmd.I, 0, 1);
      registerWonder(W, ctl.lampX * W.w, ctl.lampY * W.h, 0.3, 'Sonne');
      break;
    }
    case 'photo': ctl.photo = clamp(cmd.hours, 6, 18); break;
    case 'wind': ctl.wind = ((cmd.dir % 8) + 8) % 8; ctl.windOn = cmd.on; if (cmd.str !== undefined) ctl.windStr = clamp(cmd.str, 0, 1); break;
    case 'water': {
      W.sea = clamp(W.sea + cmd.delta, 0.05, 0.95); updateSeaMask(W);
      chron(W, { kind: 'player', text: cmd.delta > 0 ? 'Du hast Wasser nachgefüllt. Der Meeresspiegel steigt.' : 'Du hast Wasser abgelassen. Neue Küsten tauchen auf.' });
      break;
    }
    case 'hotspot': {
      if (W.hotspots.length >= 6) break;
      W.hotspots.push({ x: clamp(cmd.x, 2, W.w - 3), y: clamp(cmd.y, 2, W.h - 3), vx: 0, vy: 0 });
      chron(W, { kind: 'player', text: 'Ein neuer Vulkan glüht unter dem Glasboden.', x: cmd.x, y: cmd.y });
      registerWonder(W, cmd.x, cmd.y, -0.2, 'Feuerberg');
      break;
    }
    case 'terrain': {
      for (const c of cellsIn(W, cmd.x, cmd.y, cmd.r)) {
        const ddx = (c % W.w) - cmd.x, ddy = ((c / W.w) | 0) - cmd.y, d = Math.sqrt(ddx * ddx + ddy * ddy) / Math.max(1, cmd.r);
        const f = gaussBump(d * 1.3);
        W.hgt[c] = clamp(W.hgt[c] + cmd.delta * f, 0, 1);
        // Leben am Ort stirbt teilweise
        for (let s = 0; s < W.S; s++) if (W.alive[s]) { const i = s * W.n + c; const kill = W.B[i] * 0.6 * f; W.B[i] -= kill; W.D[c] += kill; }
      }
      updateSeaMask(W);
      registerWonder(W, cmd.x, cmd.y, cmd.delta > 0 ? -0.1 : -0.3, cmd.delta > 0 ? 'Berg' : 'Senke');
      break;
    }
    case 'dose': {
      const cs = cellsIn(W, cmd.x, cmd.y, 4);
      for (const c of cs) W.N[c] += cmd.amount / cs.length;
      registerWonder(W, cmd.x, cmd.y, 1, 'Manna');
      break;
    }
    case 'lid': ctl.lid = cmd.open; chron(W, { kind: 'player', text: cmd.open ? 'Der Deckel ist offen: Zimmerluft strömt ins Glas.' : 'Der Deckel ist wieder zu.' }); break;
    case 'uv': ctl.uv = clamp(cmd.factor, 0.5, 4); break;
    case 'thermo': ctl.thermo = cmd.on; ctl.thermoSet = cmd.set; ctl.thermoMax = cmd.max; break;
    case 'cool': ctl.cool = clamp(cmd.delta, 0, 12); break;
    case 'net': {
      let got = 0;
      for (const c of cellsIn(W, cmd.x, cmd.y, cmd.r)) for (let s = 0; s < W.S; s++) if (W.alive[s]) {
        const i = s * W.n + c; got += W.B[i]; W.B[i] = 0;
      }
      chron(W, { kind: 'player', text: `Kescher: ${got.toFixed(1)} Einheiten Leben entfernt.`, x: cmd.x, y: cmd.y });
      registerWonder(W, cmd.x, cmd.y, -1, 'Strafe');
      break;
    }
    case 'inoculate': {
      const t = { ...cmd.traits };
      const s = addStrain(W, t, -1, 'eingesetzt');
      if (s < 0) break;
      const want = t.land ? 0 : 1;
      let placed = 0;
      for (const c of cellsIn(W, cmd.x, cmd.y, 3)) if (W.seaMask[c] === want) { W.B[s * W.n + c] = cmd.amount ?? 0.6; placed++; }
      if (placed < 6) {
        // zu wenig passende Zellen: nächstgelegenen passenden Fleck suchen
        let best = -1, bd = Infinity;
        for (let c = 0; c < W.n; c++) if (W.seaMask[c] === want) {
          const dx = (c % W.w) - cmd.x, dy = ((c / W.w) | 0) - cmd.y, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = c; }
        }
        if (best >= 0) for (const c of cellsIn(W, best % W.w, (best / W.w) | 0, 3)) if (W.seaMask[c] === want && !W.B[s * W.n + c]) { W.B[s * W.n + c] = cmd.amount ?? 0.6; placed++; }
        if (!placed) for (let c = 0; c < W.n; c++) if (W.seaMask[c] === want) W.B[s * W.n + c] = 0.02;
      }
      const sp = W.species[W.sp[s]]; sp.est = true;
      if (cmd.name) sp.name = cmd.name; else nameSpecies(W, sp.id);
      sp.seen = true;
      chron(W, { kind: 'player', text: `Eingesetzt: ${sp.name}.`, species: sp.id, x: cmd.x, y: cmd.y });
      break;
    }
    case 'rename': { const sp = W.species[cmd.species]; if (sp) sp.name = cmd.name.slice(0, 28); break; }
    case 'meteor': meteor(W, cmd.x, cmd.y); break;
    case 'event': householdEvent(W, cmd.id, cmd.x, cmd.y); break;
    case 'ctl': Object.assign(ctl, cmd.patch); if (cmd.patch.drift) for (const h of W.hotspots) if (!h.vx && !h.vy) { h.vx = (rngNext(W.rng) - 0.5) * 0.06; h.vy = (rngNext(W.rng) - 0.5) * 0.06; } break;
    case 'seedLife': seedLife(W); chron(W, { kind: 'player', text: 'Tütchen 2: Lebenskeime im Urmeer.' }); break;
    case 'tuempel': {
      // drei wilde Arten aus einem echten Tümpel
      const base = W.startTraits;
      const kinds: Traits[] = [
        { ...base, topt: base.topt + 4, hue: 40, aff: 0.6 },
        { ...base, topt: base.topt - 5, hue: 200, z: 0.05 },
        { ...base, role: 1, mob: 0.45, z: 0.15, hue: 15, k: Math.max(1, base.k) },
      ];
      for (const t of kinds) applyCmd(W, { type: 'inoculate', traits: t, x: cmd.x, y: cmd.y });
      break;
    }
  }
}

function meteor(W: World, x: number, y: number) {
  const r = 7;
  for (const c of cellsIn(W, x, y, r)) {
    const ddx = (c % W.w) - x, ddy = ((c / W.w) | 0) - y, d = Math.sqrt(ddx * ddx + ddy * ddy) / r;
    for (let s = 0; s < W.S; s++) if (W.alive[s]) { const i = s * W.n + c; const k = W.B[i] * (d < 0.7 ? 1 : 0.6); W.B[i] -= k; W.D[c] += k; }
    W.hgt[c] = clamp(W.hgt[c] - 0.08 * (1 - d * d) + (d > 0.8 ? 0.03 : 0), 0, 1);
    W.N[c] += 0.8;
  }
  updateSeaMask(W);
  W.effects.push({ kind: 'staub', until: W.tick + 4 * P.TPD, room: -4 });
  chron(W, { kind: 'event', text: 'Die Murmel! Ein Einschlag reißt einen Krater. Staub verdunkelt und kühlt die Welt.', x, y, big: true });
  registerWonder(W, x, y, -2, 'Himmelsstein');
}

export const HOUSEHOLD: Record<string, { text: string; apply: (W: World, x?: number, y?: number) => void }> = {
  hitze: { text: 'Hitzewelle! Im Kinderzimmer ist es heiß (+6 °C für 2 Tage).', apply: W => W.effects.push({ kind: 'hitze', until: W.tick + 2 * P.TPD, room: 6 }) },
  lueften: { text: 'Mama hat gelüftet. Kalte Luft zieht übers Glas (−6 °C für knapp einen Tag).', apply: W => W.effects.push({ kind: 'lueften', until: W.tick + 3, room: -6 }) },
  strom: { text: 'Stromausfall! Die Lampe ist für einige Stunden aus.', apply: W => W.effects.push({ kind: 'strom', until: W.tick + 2, lampOff: true }) },
  katze: {
    text: 'Die Katze ist ans Glas gestoßen. Das Meer ist aufgewirbelt und trüb.', apply: W => {
      let m = 0, k = 0; for (let c = 0; c < W.n; c++) if (W.seaMask[c]) { m += W.N[c]; k++; }
      m /= k || 1; for (let c = 0; c < W.n; c++) if (W.seaMask[c]) W.N[c] = W.N[c] * 0.5 + m * 0.5 + 0.4;
    },
  },
  saft: {
    text: 'Deine Schwester hat Saft ins Glas gekippt! Bakterien blühen und zehren Sauerstoff.', apply: (W, x, y) => {
      const cx = x ?? W.w / 2, cy = y ?? W.h / 2;
      for (const c of cellsIn(W, cx, cy, 10)) if (W.seaMask[c]) W.N[c] += 2.2;
      W.o2 = Math.max(0, W.o2 - 0.6);
    },
  },
  oma: { text: 'Ferien bei Oma: 5 Tage kannst du nicht eingreifen.', apply: () => {} },
  winter: { text: 'Die Heizung im Keller fällt aus: eine Eiszeit kommt (−8 °C für 4 Tage).', apply: W => W.effects.push({ kind: 'winter', until: W.tick + 4 * P.TPD, room: -8 }) },
  heizstab: {
    text: 'Ein defekter Heizstab glüht unter dem Glas: ein neuer Vulkan!', apply: W => {
      const x = 0.2 + 0.6 * rngNext(W.rng), y = 0.2 + 0.6 * rngNext(W.rng);
      W.hotspots.push({ x: x * W.w, y: y * W.h, vx: 0, vy: 0 });
    },
  },
};
function householdEvent(W: World, id: string, x?: number, y?: number) {
  const e = HOUSEHOLD[id]; if (!e) return;
  e.apply(W, x, y);
  chron(W, { kind: 'event', text: e.text, big: true });
  registerWonder(W, W.w / 2, W.h / 2, id === 'saft' || id === 'katze' ? -0.5 : -0.3, id);
}

// ------------------------------------------------------------ Kryo-Proben
export function sampleSpecies(W: World, id: number): (Traits & { name: string }) | null {
  const s = strainOfSpecies(W, id); if (s < 0) return null;
  return { ...traitsOf(W, s), name: W.species[id].name };
}

// ------------------------------------------------------------ Jury-Stresstest (Konzept 4.5/5.8)
export function stressTest(W0: World, { dT = -9, shock = 6, recover = 8 } = {}) {
  const A = cloneWorld(W0), K = cloneWorld(W0);
  A.chronicle = []; K.chronicle = [];
  let rs = 0, k = 0;
  A.effects.push({ kind: 'jury', until: A.tick + shock, room: dT });
  for (let i = 0; i < shock + recover; i++) {
    step(A); step(K);
    const ba = totalBiomass(A), bk = totalBiomass(K) || 1e-9;
    if (i < shock + 2) { rs += Math.min(1, ba / bk); k++; }
  }
  const resil = Math.min(1, totalBiomass(A) / (totalBiomass(K) || 1e-9));
  const est = (X: World) => {
    const vis = visThreshold(X), m = new Map<number, number>();
    for (let s = 0; s < X.S; s++) if (X.alive[s]) m.set(X.sp[s], (m.get(X.sp[s]) || 0) + X.tot[s]);
    let c = 0; for (const v of m.values()) if (v >= vis) c++; return c;
  };
  const sa = est(A), sk = est(K) || 1;
  const resistance = rs / k, speciesKept = Math.min(1, sa / sk);
  return { resistance, resilience: resil, speciesKept, score: 40 * resistance + 40 * resil + 20 * speciesKept };
}

// ------------------------------------------------------------ Render-Snapshot (Konzept 6.2)
export const SNAP_FIELDS = 10;
export function snapshot(W: World, buf?: Uint8Array) {
  const { n, S, B } = W;
  const out = buf && buf.length === n * SNAP_FIELDS ? buf : new Uint8Array(n * SNAP_FIELDS);
  for (let c = 0; c < n; c++) {
    let pb = 0, ab = 0, dp = 255, dpv = 0, da = 255, dav = 0;
    for (let s = 0; s < S; s++) {
      if (!W.alive[s]) continue;
      const b = B[s * n + c]; if (b <= 0) continue;
      if (W.role[s] === 0) { pb += b; if (b > dpv) { dpv = b; dp = s; } }
      else { ab += b; if (b > dav) { dav = b; da = s; } }
    }
    const o = c * SNAP_FIELDS;
    out[o] = clamp(Math.round(W.hgt[c] * 255), 0, 255);
    out[o + 1] = W.biome[c];
    out[o + 2] = clamp(Math.round(Math.sqrt(pb) * 40), 0, 255);
    out[o + 3] = clamp(Math.round(Math.sqrt(ab) * 90), 0, 255);
    out[o + 4] = clamp(Math.round((W.T[c] + 20) * 4), 0, 255);
    out[o + 5] = clamp(Math.round(W.Wsoil[c] * 255), 0, 255);
    out[o + 6] = clamp(Math.round(W.N[c] * 60), 0, 255);
    out[o + 7] = dp;
    out[o + 8] = da;
    out[o + 9] = clamp(Math.round(W.L[c] * 255), 0, 255);
  }
  return out;
}
export function snapMeta(W: World) {
  const strains = [];
  for (let s = 0; s < W.S; s++) strains.push(W.alive[s] ? { sp: W.sp[s], hue: W.hue[s], role: W.role[s], land: W.land[s], k: W.k[s], z: W.z[s] } : null);
  return {
    tick: W.tick, day: W.tick / P.TPD, w: W.w, h: W.h, sea: W.sea, o2: W.o2, strains,
    hotspots: W.hotspots.map(h => ({ x: h.x, y: h.y })), ctl: { ...W.ctl }, windName: WIND_NAMES[W.ctl.wind],
    effects: W.effects.map(e => e.kind),
    settlements: W.settlements.filter(s => s.alive).map(s => ({ id: s.id, x: s.x, y: s.y, pop: s.pop, era: s.era, name: s.name, temple: s.temple, sawFace: s.sawFace, R: s.R, F: s.F })),
  };
}
export type SnapMeta = ReturnType<typeof snapMeta>;
export { BIOMES };
