// Umwelt (Konzept 5.5): Gelände, Sonne, Temperatur, Wind, Feuchte, Regen, Bodenwasser.
import { P } from './params.ts';
import { clamp, gaussBump, q10, dsin, o2Sat } from './math.ts';
import { updateSeaMask } from './world.ts';
import type { World } from './types.ts';

// 8 Windrichtungen: Index = woher der Wind kommt (0 = West → weht nach Osten), im Uhrzeigersinn
export const WIND_DIRS: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
export const WIND_NAMES = ['West', 'Nordwest', 'Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest'];

export const YEAR_DAYS = 40;
let LUV: Int32Array | null = null, SRC: Float32Array | null = null, KEEP: Float32Array | null = null;

export function roomTemp(W: World) {
  let r = W.ctl.roomBase;
  for (const e of W.effects) if (e.room) r += e.room;
  if (W.ctl.seasons) r += 3.5 * dsin(6.283185307179586 * (W.tick / P.TPD) / YEAR_DAYS);
  return r;
}
export function lampOff(W: World) { for (const e of W.effects) if (e.lampOff) return true; return false; }

export function sunPos(W: World) {
  let x = W.ctl.lampX, y = W.ctl.lampY;
  if (W.ctl.seasons) y = clamp(y + 0.16 * dsin(6.283185307179586 * (W.tick / P.TPD) / YEAR_DAYS), 0.05, 0.95);
  return { x, y };
}

/** Licht und Temperatur — jeden Tick (Ereignisse wirken stündlich genau) */
export function thermal(W: World) {
  const { w, h, n, T, L } = W;
  const room = roomTemp(W);
  let base = room;
  if (W.ctl.thermo) base += clamp(W.ctl.thermoSet - room, 0, W.ctl.thermoMax);
  base -= W.ctl.cool;
  const off = lampOff(W);
  const I = off ? 0 : W.ctl.lamp * clamp(W.ctl.photo / 12, 0.4, 1.6);
  const heatI = off ? 0 : W.ctl.lamp * clamp(0.6 + 0.4 * W.ctl.photo / 12, 0.6, 1.3);
  const sp = sunPos(W), lx = sp.x * w, ly = sp.y * h, sg = P.sunSigma * w;
  for (let c = 0; c < n; c++) {
    const x = c % w, y = (c / w) | 0;
    const r = Math.sqrt((x - lx) * (x - lx) + (y - ly) * (y - ly)) / sg;
    const g = gaussBump(r);
    let l = I * g;
    if (W.seaMask[c]) {
      const bloom = W.N[c] - P.nBloom;
      if (bloom > 0) l *= 1 / (1 + P.kTurb * bloom * 2);
    }
    L[c] = l;
    const elev = W.hgt[c] - W.sea;
    T[c] = base + P.sunHeat * heatI * g - P.lapse * (elev > 0 ? elev : 0);
  }
  for (const hs of W.hotspots) {
    const cx = hs.x | 0, cy = hs.y | 0, R = 4;
    for (let y = Math.max(0, cy - R); y <= Math.min(h - 1, cy + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(w - 1, cx + R); x++) {
      const d = Math.sqrt((x - hs.x) * (x - hs.x) + (y - hs.y) * (y - hs.y)) / 2.2;
      T[y * w + x] += P.volcanoHeat * W.ctl.tectonics * gaussBump(d);
    }
  }
  const t = W.tmp;
  for (let it = 0; it < P.oceanSteps; it++) {
    t.set(T);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const c = y * w + x; if (!W.seaMask[c]) continue;
      T[c] = t[c] * (1 - P.oceanMod) + P.oceanMod * 0.25 * (t[c - 1] + t[c + 1] + t[c - w] + t[c + w]);
    }
  }
  // gelöster Sauerstoff (mg/L): Meer folgt der Sättigung skaliert mit der Atmosphäre, Blüte zehrt
  const pa = W.o2 / 21;
  for (let c = 0; c < n; c++) {
    W.q[c] = q10(T[c]);
    if (W.seaMask[c]) {
      let o = o2Sat(T[c]) * pa;
      const bloom = W.N[c] - P.nBloom;
      if (bloom > 0) o -= P.bloomO2 * bloom * W.q[c];
      W.O[c] = o > 0 ? o : 0;
    } else W.O[c] = 9.1 * pa;
  }
}

/** Gelände, Feuchte, Regen, Bodenwasser — einmal pro Glastag */
export function climateDaily(W: World) {
  const { w, h, n } = W;
  const tec = W.ctl.tectonics;
  // Tektonik: Hotspots heben, Akt 2: Hotspots driften (Kontinente)
  if (tec > 0) {
    for (const hs of W.hotspots) {
      if (W.ctl.drift) { hs.x = clamp(hs.x + hs.vx, 6, w - 7); hs.y = clamp(hs.y + hs.vy, 6, h - 7); }
      const R = P.hotspotR * 3, cx = hs.x | 0, cy = hs.y | 0;
      for (let y = Math.max(0, cy - R); y <= Math.min(h - 1, cy + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(w - 1, cx + R); x++) {
        const d = Math.sqrt((x - hs.x) * (x - hs.x) + (y - hs.y) * (y - hs.y)) / P.hotspotR;
        const c = y * w + x;
        W.hgt[c] = Math.min(1, W.hgt[c] + P.uplift * tec * gaussBump(d));
      }
    }
  }
  const t = W.tmp; t.set(W.hgt);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const c = y * w + x;
    if (t[c] < W.sea) continue;
    const lap = t[c - 1] + t[c + 1] + t[c - w] + t[c + w] - 4 * t[c];
    W.hgt[c] = Math.max(W.sea + 0.002, W.hgt[c] + P.eroK * (0.3 + W.Rain[c]) * lap * 0.25);
  }
  updateSeaMask(W);
  // Wind, Feuchte, Regen (Regenschatten hinter Gebirgen)
  const dirI = ((W.ctl.wind % 8) + 8) % 8;
  const [dx, dy] = W.ctl.windOn ? WIND_DIRS[dirI] : WIND_DIRS[0];
  const str = W.ctl.windOn ? W.ctl.windStr : 0.3;
  const a = 0.35 + 0.5 * str;
  const frac = W.tmp2, M = W.M, M2 = W.tmp, R = W.Rain;
  if (!LUV || LUV.length !== n) { LUV = new Int32Array(n); SRC = new Float32Array(n); KEEP = new Float32Array(n); }
  const luvA = LUV, srcA = SRC!, keepA = KEEP!;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = y * w + x, u = clamp(y - dy, 0, h - 1) * w + clamp(x - dx, 0, w - 1);
    luvA[c] = u;
    frac[c] = W.seaMask[c] ? 0 : Math.min(0.8, P.rainBase + P.rainOro * Math.max(0, W.hgt[c] - W.hgt[u]));
    srcA[c] = W.seaMask[c] ? (W.T[c] > -1 ? P.evap * W.q[c] * 0.3 : 0.02) : P.transp * Math.min(1, W.veg[c]) * W.Wsoil[c];
    keepA[c] = P.moistKeep * (1 - frac[c]);
  }
  const a1 = a, a2 = (1 - a) * 0.25;
  for (let it = 0; it < P.climIters; it++) {
    for (let y = 0; y < h; y++) {
      const row = y * w, up = y > 0 ? -w : 0, dn = y < h - 1 ? w : 0;
      for (let x = 0; x < w; x++) {
        const c = row + x;
        const l = x > 0 ? c - 1 : c, r = x < w - 1 ? c + 1 : c;
        M2[c] = srcA[c] + keepA[c] * (a1 * M[luvA[c]] + a2 * (M[l] + M[r] + M[c + up] + M[c + dn]));
      }
    }
    M.set(M2);
  }
  for (let c = 0; c < n; c++) R[c] = M[c] * frac[c];
  for (let c = 0; c < n; c++) {
    const target = W.seaMask[c] ? 1 : clamp(R[c] * 4 + 0.03, 0, 1);
    W.Wsoil[c] += (target - W.Wsoil[c]) * P.soilRelax;
  }
}
