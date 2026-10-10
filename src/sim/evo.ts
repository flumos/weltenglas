// Evolution (Konzept 5.7): Mutation, Durchbrüche, Artbildung, Verschmelzen bei Genfluss, Aussterben.
import { P, NC, CAUSES } from './params.ts';
import { clamp, gauss, rngNext } from './math.ts';
import { addStrain, chron, dist, killStrain, nameSpecies, newSpecies, traitsOf, visThreshold } from './world.ts';
import type { World, Traits } from './types.ts';

// Sprung-Codes je Stamm
export const J_NONE = 0, J_LAND = 1, J_WOOD = 2, J_GRAZER = 3, J_PRED = 4, J_BACK = 5, J_STAGE = 6, J_LANDANIMAL = 7, J_DRIFT = 8, J_BRAIN = 9;
const JUMP_REASON = ['', 'Landgang', 'Holz', 'frisst Pflanzen', 'jagt', 'frisst wieder Pflanzen', 'neue Stufe', 'Landgang der Tiere', 'weiterentwickelt', 'Klugheit'];

function isCoastSea(W: World, c: number) {
  const { w, n } = W; if (!W.seaMask[c]) return false;
  const x = c % w;
  return (x > 0 && !W.seaMask[c - 1]) || (x < w - 1 && !W.seaMask[c + 1]) || (c - w >= 0 && !W.seaMask[c - w]) || (c + w < n && !W.seaMask[c + w]);
}
function landNeighbor(W: World, c: number, needVeg = 0) {
  const { w, n } = W, x = c % w;
  const cand = [x > 0 ? c - 1 : -1, x < w - 1 ? c + 1 : -1, c - w, c + w];
  let best = -1, bv = -1;
  for (const d of cand) if (d >= 0 && d < n && !W.seaMask[d] && W.veg[d] >= needVeg && W.veg[d] > bv) { bv = W.veg[d]; best = d; }
  return best;
}

/** Platz in der Stamm-Tabelle schaffen: kleine, gescheiterte Mutanten räumen; Durchbrüche haben Vorrang */
export function makeRoom(W: World, isJump: boolean) {
  for (let s = 0; s < W.S; s++) if (!W.alive[s]) return;
  const vis = visThreshold(W);
  let v = -1, vb = Infinity;
  for (let s = 0; s < W.S; s++) {
    const t = W.tot[s]; if (t >= vis || t >= vb) continue;
    const age = W.tick - W.born[s], nv = W.novel[s];
    const minAge = isJump ? (nv === 2 ? 40 : nv ? 8 : 4) : (nv === 2 ? 160 : nv ? 24 : 8);
    if (age < minAge) continue;
    vb = t; v = s;
  }
  if (v >= 0) killStrain(W, v, true);
}
export const MUT_STATS = { tries: 0, dropped: 0, jumpTries: 0, jumpDropped: 0 };
/** Großer Schritt einer ganzen Linie (einmal je Glastag): Ein etablierter Stamm spaltet eine Gründerpopulation
 *  mit höherer Stufe bzw. mehr Klugheit ab. Nötig, weil einzelne Mutanten gegen Kill-the-Winner-Koexistenz kaum durchkommen. */
function lineageLeaps(W: World) {
  const { n, S } = W, rs = W.rng, maxK = W.ctl.maxK;
  const vis = visThreshold(W);
  // nur die Front einer Gruppe (Rolle × Lebensraum) macht große Schritte – sonst explodiert die Artenzahl
  const frontK = new Int32Array(6), frontB = new Float32Array(6);
  for (let s = 0; s < S; s++) if (W.alive[s] && W.tot[s] >= vis) {
    const g = W.role[s] * 2 + W.land[s];
    if (W.k[s] > frontK[g]) frontK[g] = W.k[s];
    if (W.brain[s] > frontB[g]) frontB[g] = W.brain[s];
  }
  for (let s = 0; s < S; s++) {
    if (!W.alive[s] || W.novel[s] || W.tot[s] < vis * 2) continue;
    const grp = W.role[s] * 2 + W.land[s];
    if (W.k[s] < frontK[grp] && W.brain[s] < frontB[grp] - 0.01) continue;
    if (W.tick - W.born[s] < 4 * P.TPD) continue;
    const t: Traits = traitsOf(W, s);
    let kind = 0;
    if (t.k < maxK && t.k === frontK[grp] && rngNext(rs) < (t.k >= 4 ? P.pLeapHigh : P.pLeap)) {
      const nk = t.k + 1;
      if (t.role === 0 && nk > 4) continue;
      let best = 0, bc = -1; const off = s * n;
      for (let c = 0; c < n; c++) if (W.B[off + c] > best) { best = W.B[off + c]; bc = c; }
      if (bc < 0 || W.O[bc] < P.kThr[Math.min(nk, 4)]) continue;
      if (nk === 5 && !(t.role > 0 && t.mob > P.nerveMob)) continue;
      if (nk === 6 && !(t.role > 0 && t.land && t.brain > P.brainMin && t.social > P.socialMin && t.z > P.sizeMinMind)) continue;
      t.k = nk; kind = 1;
      if (nk === 5) { t.mob = Math.max(t.mob, 0.55); t.z += 0.08; }
    } else if (maxK >= 5 && t.role > 0 && t.k >= P.brainFromK && t.brain < 0.9 && t.brain >= frontB[grp] - 0.01 && rngNext(rs) < P.pBrainLeap * (t.land ? 1.5 : 0.5)) {
      t.brain = clamp(t.brain + 0.22, 0, 1); t.social = clamp(t.social + 0.18, 0, 1); t.z += 0.08; kind = 2;
    }
    if (!kind) continue;
    t.z = clamp(t.z, 0, t.role === 0 && t.land ? 1 : P.zMax[t.k]);
    makeRoom(W, true);
    const ns = addStrain(W, t, W.sp[s]);
    if (ns < 0) continue;
    const off = s * n, noff = ns * n;
    for (let c = 0; c < n; c++) { const v = W.B[off + c] * P.leapFrac; if (v > 0) { W.B[off + c] -= v; W.B[noff + c] = v; } }
    W.tot[ns] = W.tot[s] * P.leapFrac; W.tot[s] -= W.tot[ns];
    W.jump[ns] = kind === 1 ? J_STAGE : J_DRIFT; W.novel[ns] = 2;
    if (kind === 2) W.jump[ns] = J_BRAIN;
  }
}

export function mutation(W: World) {
  if (W.tick % P.TPD === 0) lineageLeaps(W);
  const { n, S } = W, rs = W.rng, uv = W.ctl.uv;
  const su = Math.sqrt(uv);
  const maxK = W.ctl.maxK;
  for (let s = 0; s < S; s++) {
    if (!W.alive[s] || W.prod[s] <= 0) continue;
    // Tiere haben kürzere Generationen je Biomasse: mehr Mutationen je Zuwachs
    const lam = P.MU * uv * Math.sqrt(W.prod[s] * (W.role[s] > 0 ? P.consMutBoost : 1));
    if (rngNext(rs) >= Math.min(0.3, lam)) continue;
    const off = s * n;
    let c = -1, best = 0, bb = 0, found = 0;
    for (let k = 0; k < 48 && found < 8; k++) {
      const j = (rngNext(rs) * n) | 0, bj = W.B[off + j];
      if (bj < 0.003) continue;
      found++;
      const v = bj * (0.05 + Math.max(0, W.G[off + j]));
      if (v > best) { best = v; c = j; bb = bj; }
    }
    if (c < 0) continue;
    const t: Traits = traitsOf(W, s);
    const g = () => gauss(rs) * su;
    t.topt = clamp(t.topt + g() * P.sd.topt, -8, 45);
    t.sig = clamp(t.sig + g() * P.sd.sig, 1.5, 10);
    t.z = t.z + g() * P.sd.z * (t.land ? 1.4 : 1);
    t.mob = clamp(t.mob + g() * P.sd.mob, 0, 1);
    t.def = clamp(t.def + g() * P.sd.def, 0, 1);
    t.aff = clamp(t.aff + g() * P.sd.aff, 0, 1);
    t.dry = clamp(t.dry + g() * P.sd.dry * (t.land ? 1 : 0), 0, 1);
    t.hue = (t.hue + g() * P.sd.hue + 360) % 360;
    if (maxK >= 5 && t.role > 0 && t.k >= P.brainFromK) {
      const lb = t.land ? 1.5 : 1;
      t.brain = clamp(t.brain + g() * P.sd.brain + P.brainBias * lb, 0, 1);
      t.social = clamp(t.social + g() * P.sd.social + P.socialBias * lb, 0, 1);
    }
    let jump = J_NONE, dest = c;
    // Landgang der Pflanzen (Ozonschutz ab 2 % O2)
    if (t.role === 0 && !t.land && W.o2 >= P.O2_LAND && rngNext(rs) < P.pLand) {
      for (let k = 0; k < 60; k++) {
        const j = (rngNext(rs) * n) | 0;
        if (W.B[off + j] < 0.005 || !isCoastSea(W, j)) continue;
        const d = landNeighbor(W, j);
        if (d >= 0) { c = j; bb = W.B[off + j]; dest = d; t.land = 1; t.dry = 0.1; t.z = Math.min(t.z, 0.15); t.aff = 0; jump = J_LAND; break; }
      }
    }
    // Holz: Größensprung an Land, erst ab 8 % O2
    if (!jump && t.role === 0 && t.land && W.o2 >= P.O2_WOOD && t.z < 0.6 && rngNext(rs) < P.pWood) {
      let bv = 0;
      for (let k = 0; k < 30; k++) {
        const j = (rngNext(rs) * n) | 0, v = W.B[off + j] * W.Wsoil[j];
        if (v > bv && W.B[off + j] > 0.01) { bv = v; c = j; bb = W.B[off + j]; dest = j; }
      }
      if (bv > 0) { t.z = Math.min(1, Math.max(0.5, t.z + 0.3)); jump = J_WOOD; }
    }
    // Rollenwechsel
    if (!jump) {
      if (t.role === 0 && rngNext(rs) < P.pRole) { t.role = 1; t.mob = Math.max(0.3, t.mob); t.aff = 0; jump = J_GRAZER; }
      else if (t.role === 1 && rngNext(rs) < P.pPred) { t.role = 2; t.z += 0.3; t.mob = Math.max(0.4, t.mob); jump = J_PRED; }
      else if (t.role === 2 && rngNext(rs) < 0.02) { t.role = 1; t.z -= 0.2; jump = J_BACK; }
    }
    // Landgang der Tiere: an Küsten mit Vegetation, ab Stufe 2 und 4 % O2
    if (!jump && t.role > 0 && !t.land && t.k >= 2 && W.o2 >= 4 && rngNext(rs) < P.pLandAnimal) {
      for (let k = 0; k < 60; k++) {
        const j = (rngNext(rs) * n) | 0;
        if (W.B[off + j] < 0.005 || !isCoastSea(W, j)) continue;
        const d = landNeighbor(W, j, 0.3);
        if (d >= 0) { c = j; bb = W.B[off + j]; dest = d; t.land = 1; t.dry = 0.2; jump = J_LANDANIMAL; break; }
      }
    }
    // Stufenaufstieg (an lokalen Sauerstoff gebunden)
    if (!jump && t.k < maxK && rngNext(rs) < (t.role > 0 ? P.pKcons : P.pK)) {
      const nk = t.k + 1;
      let ok = W.O[c] >= P.kThr[Math.min(nk, 4)];
      if (nk === 5) ok = ok && t.role > 0 && t.mob > P.nerveMob;
      if (nk === 6) ok = ok && t.role > 0 && t.brain > P.brainMin && t.social > P.socialMin && t.z > P.sizeMinMind && !!t.land;
      if (ok) { t.k = nk; jump = J_STAGE; if (nk === 5) { t.mob = Math.max(t.mob, 0.55); t.z += 0.1; } }
    }
    t.z = clamp(t.z, 0, t.role === 0 && t.land ? 1 : P.zMax[t.k]); // Landpflanzen: Holz statt Zellstufe
    MUT_STATS.tries++; if (jump) MUT_STATS.jumpTries++;
    makeRoom(W, jump !== J_NONE);
    const ns = addStrain(W, t, W.sp[s]);
    if (ns < 0) { MUT_STATS.dropped++; if (jump) MUT_STATS.jumpDropped++; continue; }
    // Durchbrüche starten mit einer größeren Gründerpopulation, sonst verschwinden sie, bevor die Auslese greift
    const mv = jump ? Math.min(bb * 0.6, Math.max(0.12, bb * P.jumpStartFrac)) : Math.min(bb * 0.5, Math.max(0.02, bb * P.mutStartFrac));
    W.B[off + c] = Math.max(0, W.B[off + c] - mv);
    W.B[ns * n + dest] += mv;
    W.jump[ns] = jump;
    const typ = W.species[W.sp[s]].typus;
    W.novel[ns] = jump ? 2 : dist(t, typ) > P.D_SPEC ? 1 : 0;
    W.mutants++;
  }
}

function speciationReason(W: World, s: number, parentSp: number) {
  const j = W.jump[s];
  if (j && j !== J_DRIFT) {
    if (j === J_STAGE) return `Stufe ${W.k[s]}`;
    return JUMP_REASON[j];
  }
  const t = traitsOf(W, s), p = W.species[parentSp]?.typus;
  if (!p) return 'Ursprung';
  const cands: [number, string][] = [
    [(t.topt - p.topt) / 6, 'Wärme'], [(p.topt - t.topt) / 6, 'Kälte'],
    [(t.z - p.z) / (t.land ? 0.12 : 0.25), 'Größe'], [(p.z - t.z) / (t.land ? 0.12 : 0.25), 'klein und schnell'],
    [(t.dry - p.dry) / 0.4, 'Trockenheit'], [(t.mob - p.mob) / 0.5, 'Beweglichkeit'], [(t.def - p.def) / 0.5, 'Panzer'],
    [(t.aff - p.aff) / 0.5, 'Schatten'], [(t.sig - p.sig) / 4, 'Wechselklima'], [(p.sig - t.sig) / 4, 'Spezialisierung'],
    [(t.brain - p.brain) / 0.4, 'Klugheit'], [(t.social - p.social) / 0.4, 'Gemeinschaft'],
  ];
  cands.sort((a, b) => b[0] - a[0]);
  let r = cands[0][1];
  // Isolation: kaum räumliche Überlappung mit der Elternart → Trennung durch Meer oder Gebirge
  const { n } = W; let tp = 0, ov = 0;
  const ts = W.tot[s] || 1e-9;
  for (let o = 0; o < W.S; o++) if (o !== s && W.alive[o] && W.sp[o] === parentSp) tp += W.tot[o];
  if (tp > 0) {
    for (let c = 0; c < n; c++) {
      const a = W.B[s * n + c] / ts; if (a <= 0) continue;
      let b = 0; for (let o = 0; o < W.S; o++) if (o !== s && W.alive[o] && W.sp[o] === parentSp) b += W.B[o * n + c];
      b /= tp; ov += a < b ? a : b;
    }
    if (ov < 0.12) r += ' · getrennt';
  }
  return r;
}

function centroid(W: World, s: number) {
  const { n, w } = W; let sx = 0, sy = 0, t = 0, best = 0, bc = 0;
  for (let c = 0; c < n; c++) { const b = W.B[s * n + c]; if (b <= 0) continue; sx += (c % w) * b; sy += ((c / w) | 0) * b; t += b; if (b > best) { best = b; bc = c; } }
  return t > 0 ? { x: bc % w, y: (bc / w) | 0 } : { x: -1, y: -1 };
}

const BREAK: Record<string, string> = {
  r1l0: 'Durchbruch: der erste Weidegänger! Etwas frisst jetzt Plankton.',
  r2l0: 'Durchbruch: der erste Räuber! Jetzt wird auch gejagt.',
  r0l1: 'Durchbruch: Landgang! Die ersten Pflanzen wachsen an der Küste.',
  r1l1: 'Durchbruch: Tiere gehen an Land!',
  r2l1: 'Durchbruch: der erste Jäger an Land.',
  wood: 'Durchbruch: Holz! Pflanzen bilden Stämme – Wälder werden möglich.',
  k2: 'Durchbruch: komplexe Zellen (Stufe 2). Sie atmen Sauerstoff.',
  k3: 'Durchbruch: Mehrzeller (Stufe 3).',
  k4: 'Durchbruch: Gewebe und Organe (Stufe 4).',
  k5: 'Durchbruch: ein Nervensystem (Stufe 5)! Sie spüren, wohin sie wollen.',
  k6: 'Durchbruch: Intelligenz (Stufe 6). Etwas im Glas denkt nach.',
};

export function bookkeeping(W: World) {
  const { n, S } = W;
  for (let s = 0; s < S; s++) {
    if (!W.alive[s]) continue;
    const off = s * n; let t = 0;
    for (let c = 0; c < n; c++) {
      const v = W.B[off + c];
      if (v < P.B_CELL_MIN) { if (v > 0) W.D[c] += v; W.B[off + c] = 0; }
      else t += v;
    }
    W.tot[s] = t;
    if (t < P.B_EXT) {
      // Ursachen des Stamms an die Art vererben
      const sp = W.species[W.sp[s]];
      if (sp) { if (!sp.cv.length) sp.cv = new Array(NC).fill(0); for (let i = 0; i < NC; i++) sp.cv[i] += W.loss[s * NC + i]; }
      killStrain(W, s, true);
    }
  }
  const vis = visThreshold(W);
  for (let s = 0; s < S; s++) {
    if (!W.alive[s] || !W.novel[s] || W.tot[s] < vis) continue;
    if (W.tick - W.born[s] < P.TPD && W.novel[s] !== 2) continue; // 1 Tag Mindestdauer gegen Flackern
    const parent = W.sp[s];
    const reason = speciationReason(W, s, parent);
    const id = newSpecies(W, s, parent, reason);
    W.sp[s] = id;
    const wasJump = W.novel[s] === 2, drift = W.jump[s] === J_DRIFT;
    W.novel[s] = 0; W.jump[s] = 0;
    const sp = W.species[id]; sp.est = true;
    nameSpecies(W, id);
    const pos = centroid(W, s); sp.firstX = pos.x; sp.firstY = pos.y;
    const par = W.species[parent];
    if (drift && par) {
      let still = false; for (let o = 0; o < S; o++) if (W.alive[o] && W.sp[o] === parent) still = true;
      if (!still) { par.alive = false; par.died = W.tick; par.evolvedTo = id; par.cause = 'weiterentwickelt'; }
      chron(W, { kind: 'anagenesis', text: `${par.name || 'Eine Art'} hat sich zu ${sp.name} weiterentwickelt.`, species: id, x: pos.x, y: pos.y });
    } else {
      chron(W, { kind: 'species', text: `Neue Art: ${sp.name}${reason ? ' (' + reason + ')' : ''}`, species: id, x: pos.x, y: pos.y, big: wasJump });
    }
    const t = sp.typus;
    const keys = [`r${t.role}l${t.land}`];
    if (t.k >= 2) keys.push('k' + t.k);
    if (t.role === 0 && t.land && t.z > 0.42) keys.push('wood');
    for (const key of keys) if (!W.flags[key] && BREAK[key]) {
      W.flags[key] = W.tick;
      chron(W, { kind: 'breakthrough', text: BREAK[key], species: id, x: pos.x, y: pos.y, big: true });
    }
  }
  // Artenstatus
  const spTot = new Float64Array(W.species.length);
  for (let s = 0; s < S; s++) if (W.alive[s]) spTot[W.sp[s]] += W.tot[s];
  for (const sp of W.species) {
    if (!sp.alive) continue;
    const t = spTot[sp.id];
    if (t > sp.peak) sp.peak = t;
    if (!sp.est && t >= vis) { sp.est = true; nameSpecies(W, sp.id); }
    if (t <= 0) {
      sp.alive = false; sp.died = W.tick;
      if (sp.est && sp.evolvedTo < 0) {
        let bi = 0; const cv = sp.cv;
        for (let i = 1; i < cv.length; i++) if (cv[i] > cv[bi]) bi = i;
        sp.cause = cv.length ? CAUSES[bi] : 'unbekannt';
        chron(W, { kind: 'extinct', text: `${sp.name} ist ausgestorben (${sp.cause}).`, species: sp.id, big: sp.peak > 20 });
      }
    }
  }
}

function overlap(W: World, a: number, b: number) {
  const { n } = W, ta = W.tot[a] || 1e-9, tb = W.tot[b] || 1e-9; let o = 0;
  for (let c = 0; c < n; c++) {
    const va = W.B[a * n + c]; if (va <= 0) continue;
    const pa = va / ta, pb = W.B[b * n + c] / tb; o += pa < pb ? pa : pb;
  }
  return o;
}

export function merge(W: World) {
  const { n, S } = W;
  const age = P.MERGE_AGE_D * P.TPD;
  for (let a = 0; a < S; a++) {
    if (!W.alive[a]) continue;
    for (let b = a + 1; b < S; b++) {
      if (!W.alive[a]) break;
      if (!W.alive[b] || W.sp[a] !== W.sp[b] || W.novel[a] || W.novel[b]) continue;
      if (W.tick - Math.max(W.born[a], W.born[b]) < age) continue;
      if (dist(traitsOf(W, a), traitsOf(W, b)) >= P.D_MERGE) continue;
      if (overlap(W, a, b) < P.OVERLAP) continue;
      const ta = W.tot[a], tb = W.tot[b], wa = ta / (ta + tb || 1), wb = 1 - wa;
      for (const key of ['topt', 'sig', 'z', 'mob', 'def', 'aff', 'dry', 'brain', 'social'] as const) W[key][a] = W[key][a] * wa + W[key][b] * wb;
      for (let c = 0; c < n; c++) W.B[a * n + c] += W.B[b * n + c];
      for (let i = 0; i < NC; i++) W.loss[a * NC + i] += W.loss[b * NC + i];
      W.tot[a] = ta + tb;
      killStrain(W, b, false);
      W.born[a] = Math.min(W.born[a], W.born[b]);
      if (dist(traitsOf(W, a), W.species[W.sp[a]].typus) > P.D_SPEC) { W.novel[a] = 1; W.jump[a] = J_DRIFT; }
    }
  }
  // Hysterese: Neuheiten, die zurück zur Elternart driften, verlieren den Status
  for (let s = 0; s < S; s++) if (W.alive[s] && W.novel[s] === 1 && dist(traitsOf(W, s), W.species[W.sp[s]].typus) < P.D_REJOIN) { W.novel[s] = 0; W.jump[s] = 0; }
}

/** Kryo-Probe: Stamm mit dem meisten Bestand einer Art */
export function strainOfSpecies(W: World, id: number) {
  let best = -1, bt = 0;
  for (let s = 0; s < W.S; s++) if (W.alive[s] && W.sp[s] === id && W.tot[s] > bt) { bt = W.tot[s]; best = s; }
  return best;
}
