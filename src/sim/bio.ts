// Biologie (Konzept 5.6): Produzenten (Plankton/Landpflanzen), Weidegänger, Räuber,
// Atmung, Tod, Kill-the-Winner, Zersetzung, Atmosphären-O2, Ursachen-Buchhaltung.
import { P, NC, C_LIGHT, C_NUTR, C_HOT, C_COLD, C_O2, C_POISON, C_EATEN, C_HUNGER, C_PLAGUE, C_DRY, C_PLACE } from './params.ts';
import { tpcRaw, peak, pow10, sigm, clamp, expNeg } from './math.ts';
import type { World } from './types.ts';

interface Scratch {
  S: number; n: number;
  muS: Float64Array; rS: Float64Array; pk: Float64Array; KL: Float64Array; KWs: Float64Array; zf: Float64Array; mort0: Float64Array;
  spIx: Int32Array; spB: Float64Array; eat: Float64Array; rem: Float64Array; shadeM: Float64Array;
  prodS: Int32Array; prodL: Int32Array; pres: Int32Array; aliveL: Int32Array; prefM: Float64Array; consS: Int32Array[]; consL: Int32Array[];
  np: number[]; // Zähler
}
let SC: Scratch | null = null;
function scratch(S: number, n: number): Scratch {
  if (SC && SC.S === S && SC.n === n) return SC;
  SC = {
    S, n, muS: new Float64Array(S), rS: new Float64Array(S), pk: new Float64Array(S), KL: new Float64Array(S), KWs: new Float64Array(S),
    zf: new Float64Array(S), mort0: new Float64Array(S),
    spIx: new Int32Array(S), spB: new Float64Array(S), eat: new Float64Array(S * S), rem: new Float64Array(S), shadeM: new Float64Array(S * S),
    prodS: new Int32Array(S), prodL: new Int32Array(S), pres: new Int32Array(S), aliveL: new Int32Array(S), prefM: new Float64Array(S * S), consS: [new Int32Array(S), new Int32Array(S), new Int32Array(S)], consL: [new Int32Array(S), new Int32Array(S), new Int32Array(S)],
    np: [0, 0, 0, 0, 0, 0, 0, 0],
  };
  return SC;
}

export function biology(W: World) {
  const { n, S } = W, dt = 1 / P.TPD;
  const B = W.B, G = W.G, T = W.T, L = W.L, N = W.N, O = W.O, D = W.D, q = W.q, loss = W.loss;
  const sc = scratch(S, n);
  const { muS, rS, pk, KL, KWs, zf, mort0, spIx, spB, eat, rem, shadeM } = sc;
  W.prod.fill(0);
  let nPS = 0, nPL = 0; const nCS = [0, 0, 0], nCL = [0, 0, 0];
  const spMap = new Map<number, number>();
  for (let s = 0; s < S; s++) {
    spIx[s] = -1;
    if (!W.alive[s]) continue;
    // Neuheiten (Sprünge, abweichende Varianten) haben eigene Krankheitserreger: seltene Typen sind im Vorteil
    const key = W.novel[s] ? -1 - s : W.sp[s];
    if (!spMap.has(key)) spMap.set(key, spMap.size);
    spIx[s] = spMap.get(key)!;
    const r = W.role[s], land = W.land[s], z = W.z[s], k = W.k[s];
    pk[s] = peak(W.sig[s]);
    if (r === 0) {
      const ss = pow10(-(land ? 0.4 : 0.6) * z);
      zf[s] = ss;
      muS[s] = P.muP[land] * P.muK[k] * ss * (1 + (land ? 0.8 * z : 0)) * (1 - P.dryCost * W.dry[s]) * (1 - (land ? 0 : P.affCost * W.aff[s]));
      KL[s] = P.KL0 * (1 - (land ? 0 : P.affGain * W.aff[s]));
      KWs[s] = Math.max(0.03, 0.15 + P.waterCostZ * z - P.dryGain * W.dry[s]);
      rS[s] = P.respP * ss * (1 + 0.3 * W.mob[s] + P.kCost * (k - 1));
      mort0[s] = P.mortP * (1 - 0.7 * z * land);
      if (land) sc.prodL[nPL++] = s; else sc.prodS[nPS++] = s;
    } else {
      const ss = pow10(-z);
      zf[s] = ss;
      muS[s] = P.Imax[r] * ss * (1 + P.mobGain * W.mob[s]) * (1 + 0.5 * W.brain[s]);
      rS[s] = P.respC[r] * ss * (1 + P.mobCost * W.mob[s] + P.defCost * W.def[s] + P.kCost * (k - 1) + P.brainCost * W.brain[s]);
      mort0[s] = P.mortC[r];
      if (land) sc.consL[r][nCL[r]++] = s; else sc.consS[r][nCS[r]++] = s;
    }
  }
  // Kronendach-Matrix für Landpflanzen: σ((z_o − z_s)/0,04)
  for (let a = 0; a < nPL; a++) for (let b = 0; b < nPL; b++) {
    const sa = sc.prodL[a], sb = sc.prodL[b];
    shadeM[sa * S + sb] = sigm((W.z[sb] - W.z[sa]) / 0.04);
  }
  const uvM = W.ctl.uv > 1 ? (W.ctl.uv - 1) * 0.015 : 0;
  // Wachstumspotenzial G dort, wo ein Stamm (noch) nicht lebt, nur einmal je Glastag neu rechnen
  const full = W.tick % P.TPD === 0;
  const w = W.w, pres = sc.pres;
  const near = (i: number, c: number) => {
    const x = c % w;
    return (x > 0 && B[i - 1] > 0) || (x < w - 1 && B[i + 1] > 0) || (c >= w && B[i - w] > 0) || (c + w < n && B[i + w] > 0);
  };
  // Fraß-Präferenz je Paar (Größe, Verteidigung, Klugheit) — innerhalb eines Ticks konstant
  const prefM = sc.prefM;
  for (let s = 0; s < S; s++) {
    if (!W.alive[s] || W.role[s] === 0) continue;
    const r = W.role[s], zs = W.z[s];
    for (let j = 0; j < S; j++) {
      if (!W.alive[j] || j === s) { prefM[s * S + j] = 0; continue; }
      const u = (zs - W.z[j] - P.sizeOpt[r]) / P.sizeW[r];
      let pref = 1 / (1 + u * u * (1 + 0.5 * u * u)); // ≈ exp(−u²)
      if (r === 2 && W.z[j] > zs) pref *= 0.1;
      prefM[s * S + j] = pref * (1 - P.defVuln * W.def[j]) * (1 - 0.3 * W.brain[j]);
    }
  }
  const nSp = spMap.size;
  const aliveL = sc.aliveL; let nAl = 0;
  for (let s = 0; s < S; s++) if (spIx[s] >= 0) aliveL[nAl++] = s;
  let o2net = 0;

  for (let c = 0; c < n; c++) {
    const sea = W.seaMask[c] === 1, Tc = T[c], qc = q[c], Oc = O[c];
    for (let i = 0; i < nSp; i++) spB[i] = 0;
    for (let a = 0; a < nAl; a++) { const s = aliveL[a]; spB[spIx[s]] += B[s * n + c]; }
    const prods = sea ? sc.prodS : sc.prodL, np = sea ? nPS : nPL;
    const wrongP = sea ? sc.prodL : sc.prodS, nwp = sea ? nPL : nPS;
    // falscher Lebensraum: schnelles Sterben (z. B. nach Überflutung oder Hebung)
    for (let a = 0; a < nwp; a++) {
      const s = wrongP[a], i = s * n + c, b = B[i];
      if (full) G[i] = -3;
      if (b > 0) { const d = b * Math.min(1, 3 * dt); B[i] = b - d; D[c] += d; loss[s * NC + C_PLACE] += d; }
    }
    for (let r = 1; r <= 2; r++) {
      const wl = sea ? sc.consL[r] : sc.consS[r], nw = sea ? nCL[r] : nCS[r];
      for (let a = 0; a < nw; a++) {
        const s = wl[a], i = s * n + c, b = B[i];
        if (full) G[i] = -3;
        if (b > 0) { const d = b * Math.min(1, 3 * dt); B[i] = b - d; D[c] += d; loss[s * NC + C_PLACE] += d; }
      }
    }
    // ---------------- Produzenten
    let bp = 0; for (let a = 0; a < np; a++) bp += B[prods[a] * n + c];
    let nAvail = N[c];
    const Ws = sea ? 1 : W.Wsoil[c];
    let veg = 0;
    let npres = 0;
    for (let a = 0; a < np; a++) if (B[prods[a] * n + c] > 0) pres[npres++] = prods[a];
    for (let a = 0; a < np; a++) {
      const s = prods[a], i = s * n + c, b = B[i];
      if (b <= 0 && !full && !near(i, c)) continue;
      const fr = tpcRaw(Tc, W.topt[s], W.sig[s]);
      const fT = fr * pk[s];
      let Lc = L[c];
      if (!sea) { let sh = 0; for (let o = 0; o < npres; o++) { const so = pres[o]; sh += B[so * n + c] * shadeM[s * S + so]; } Lc = Lc * expNeg(P.canopyK * sh); }
      const fL = Lc / (Lc + KL[s]);
      const fN = sea ? nAvail / (nAvail + P.KN) : nAvail / (nAvail + P.KN * (1 - 0.6 * W.z[s]));
      const fW = sea ? 1 : Ws / (Ws + KWs[s]);
      const k = W.k[s];
      const fO = k <= 1 ? 1 : Oc / (Oc + P.kHalf[k]);
      let lim = fL, limC = C_LIGHT;
      if (fN < lim) { lim = fN; limC = C_NUTR; }
      if (fW < lim) { lim = fW; limC = C_DRY; }
      const crowd = 1 / (1 + bp / (P.crowdP * (1 + 4 * W.z[s] * (sea ? 0 : 1))));
      const g = muS[s] * qc * fT * lim * fO * crowd;
      const resp = rS[s] * qc;
      // Sterblichkeit
      const mStress = fr < P.STRESS_F ? P.STRESS_M * (P.STRESS_F - fr) / P.STRESS_F : 0;
      let mOx = 0;
      if (k <= 1) { if (Oc > P.o2Tox) mOx = P.o2ToxM * (Oc - P.o2Tox) / P.o2Tox; }
      else { const thr = P.kThr[k] * 0.5; if (Oc < thr) mOx = P.hypoxM * (1 - Oc / thr); }
      const mKW = P.KW[0] * spB[spIx[s]];
      const m = mort0[s] + mStress + mOx + mKW + uvM;
      G[i] = g - resp - m;
      if (b <= 0) continue;
      let gross = g * b * dt;
      if (gross * P.nu > nAvail * 0.5) gross = nAvail * 0.5 / P.nu;
      nAvail -= gross * P.nu;
      const rb = resp * b * dt, db = m * b * dt;
      const nb = b + gross - rb - db;
      B[i] = nb > 0 ? nb : 0;
      nAvail += rb * P.nu;
      D[c] += db;
      W.prod[s] += gross;
      o2net += gross - rb;
      if (!sea) veg += B[i];
      // Ursachen: verpasstes Wachstum + Tod nach Grund
      const pot = muS[s] * qc * pk[s] * fO * crowd * b * dt;
      const off = s * NC;
      if (fr < lim) loss[off + (Tc > W.topt[s] ? C_HOT : C_COLD)] += 0.3 * pot * (1 - fr);
      else loss[off + limC] += 0.3 * pot * (1 - lim);
      if (mStress > 0) loss[off + (Tc > W.topt[s] ? C_HOT : C_COLD)] += mStress * b * dt;
      if (mOx > 0) loss[off + (k <= 1 ? C_POISON : C_O2)] += mOx * b * dt;
      loss[off + C_PLAGUE] += mKW * b * dt;
    }
    N[c] = nAvail;
    if (!sea) W.veg[c] = veg;
    // ---------------- Konsumenten (erst Weidegänger, dann Räuber)
    const nh3 = sea && N[c] > P.nTox ? P.mNH3 * (N[c] - P.nTox) / P.nTox : 0;
    const refuge = sea ? 0 : clamp(W.veg[c] / 6, 0, 0.5); // Wald und Gras bieten Deckung
    for (let r = 1; r <= 2; r++) {
      const list = sea ? sc.consS[r] : sc.consL[r], nl = sea ? nCS[r] : nCL[r];
      if (!nl) continue;
      // Beuteliste
      let preyA: Int32Array, nPrey: number, preyB: Int32Array | null = null, nPreyB = 0;
      if (r === 1) { preyA = pres; nPrey = npres; }
      else { preyA = sea ? sc.consS[1] : sc.consL[1]; nPrey = sea ? nCS[1] : nCL[1]; preyB = list; nPreyB = nl; }
      let C = 0; for (let a = 0; a < nl; a++) C += B[list[a] * n + c];
      const prot = 1 - 0.6 * refuge;
      for (let a = 0; a < nPrey; a++) rem[preyA[a]] = 0;
      for (let a = 0; a < nPreyB; a++) rem[preyB![a]] = 0;
      for (let a = 0; a < nl; a++) {
        const s = list[a], i = s * n + c, b = B[i];
        if (b <= 0 && !full && !near(i, c)) continue;
        let F = 0;
        const so = s * S;
        for (let pass = 0; pass < 2; pass++) {
          const arr = pass === 0 ? preyA : preyB, cnt = pass === 0 ? nPrey : nPreyB;
          if (!arr) continue;
          for (let e = 0; e < cnt; e++) {
            const j = arr[e];
            const v = prefM[so + j] * prot * B[j * n + c];
            const vv = v > 0 ? v : 0;
            eat[so + j] = vv; F += vv;
          }
        }
        const fr = tpcRaw(Tc, W.topt[s], W.sig[s]);
        const k = W.k[s];
        const fO = k <= 1 ? 1 : Oc / (Oc + P.kHalf[k]);
        const CI = P.CI[r] * (1 + W.social[s]);
        const I = muS[s] * qc * fr * pk[s] * fO * F / (F + P.KF[r]) / (1 + C / CI);
        const mStress = fr < P.STRESS_F ? P.STRESS_M * (P.STRESS_F - fr) / P.STRESS_F : 0;
        let mOx = 0;
        if (k <= 1) { if (Oc > P.o2Tox) mOx = P.o2ToxM * (Oc - P.o2Tox) / P.o2Tox; }
        else { const thr = P.kThr[k] * 0.5; if (Oc < thr) mOx = P.hypoxM * (1 - Oc / thr); }
        const mKW = P.KW[r] * spB[spIx[s]];
        const resp = rS[s] * qc;
        const m = mort0[s] + mStress + mOx + nh3 + mKW + uvM;
        const e = P.eps[r] * P.effK[k] * (1 + 0.3 * W.brain[s]);
        G[i] = e * I - resp - m;
        if (b <= 0 || F <= 0) {
          for (let pass = 0; pass < 2; pass++) { const arr = pass === 0 ? preyA : preyB, cnt = pass === 0 ? nPrey : nPreyB; if (arr) for (let x = 0; x < cnt; x++) eat[s * S + arr[x]] = 0; }
          if (b > 0) {
            const d = (resp + m) * b * dt; B[i] = Math.max(0, b - d); D[c] += m * b * dt; o2net -= resp * b * dt;
            const off = s * NC; loss[off + C_HUNGER] += resp * b * dt;
            if (mStress > 0) loss[off + (Tc > W.topt[s] ? C_HOT : C_COLD)] += mStress * b * dt;
            if (mOx > 0) loss[off + (k <= 1 ? C_POISON : C_O2)] += mOx * b * dt;
            if (nh3 > 0) loss[off + C_POISON] += nh3 * b * dt;
            loss[off + C_PLAGUE] += mKW * b * dt;
          }
          continue;
        }
        const tot = I * b * dt;
        for (let pass = 0; pass < 2; pass++) {
          const arr = pass === 0 ? preyA : preyB, cnt = pass === 0 ? nPrey : nPreyB;
          if (!arr) continue;
          for (let x = 0; x < cnt; x++) { const j = arr[x]; const v = eat[s * S + j] / F * tot; eat[s * S + j] = v; rem[j] += v; }
        }
      }
      // höchstens 50 % einer Beute je Tick
      for (let pass = 0; pass < 2; pass++) {
        const arr = pass === 0 ? preyA : preyB, cnt = pass === 0 ? nPrey : nPreyB;
        if (!arr) continue;
        for (let x = 0; x < cnt; x++) { const j = arr[x]; const bj = B[j * n + c]; const want = rem[j]; rem[j] = want > 0.5 * bj ? (want > 0 ? 0.5 * bj / want : 0) : 1; }
      }
      for (let a = 0; a < nl; a++) {
        const s = list[a], i = s * n + c, b = B[i];
        if (b <= 0) continue;
        let got = 0;
        for (let pass = 0; pass < 2; pass++) {
          const arr = pass === 0 ? preyA : preyB, cnt = pass === 0 ? nPrey : nPreyB;
          if (!arr) continue;
          for (let x = 0; x < cnt; x++) {
            const j = arr[x]; const v = eat[s * S + j] * rem[j];
            if (v > 0) { got += v; B[j * n + c] -= v; loss[j * NC + C_EATEN] += v; }
            eat[s * S + j] = 0;
          }
        }
        if (got <= 0) continue;
        const fr = tpcRaw(Tc, W.topt[s], W.sig[s]);
        const k = W.k[s];
        const e = P.eps[r] * P.effK[k] * (1 + 0.3 * W.brain[s]);
        const gain = e * got, waste = got - gain;
        const mStress = fr < P.STRESS_F ? P.STRESS_M * (P.STRESS_F - fr) / P.STRESS_F : 0;
        let mOx = 0;
        if (k <= 1) { if (Oc > P.o2Tox) mOx = P.o2ToxM * (Oc - P.o2Tox) / P.o2Tox; }
        else { const thr = P.kThr[k] * 0.5; if (Oc < thr) mOx = P.hypoxM * (1 - Oc / thr); }
        const mKW = P.KW[r] * spB[spIx[s]];
        const rb = rS[s] * qc * b * dt;
        const md = mort0[s] + mStress + mOx + nh3 + mKW + uvM;
        const db = md * b * dt;
        const nb = b + gain - rb - db;
        B[i] = nb > 0 ? nb : 0;
        D[c] += 0.5 * waste + db; N[c] += 0.5 * waste * P.nu + rb * P.nu;
        o2net -= rb * (k >= 2 ? 1 : 0.3);
        W.prod[s] += gain;
        const off = s * NC;
        if (mStress > 0) loss[off + (Tc > W.topt[s] ? C_HOT : C_COLD)] += mStress * b * dt;
        if (mOx > 0) loss[off + (k <= 1 ? C_POISON : C_O2)] += mOx * b * dt;
        if (nh3 > 0) loss[off + C_POISON] += nh3 * b * dt;
        loss[off + C_PLAGUE] += mKW * b * dt;
        if (gain < rb) loss[off + C_HUNGER] += rb - gain;
      }
    }
    // ---------------- Detritus: Zersetzung, Begraben
    const dc = D[c];
    if (dc > 0) {
      const ox = W.o2 > 0.5 ? 1 : 0.4 + 1.2 * W.o2;
      const dec = dc * P.decay * qc * dt * ox;
      const bur = dc * P.burial * dt;
      D[c] = dc - dec - bur; N[c] += dec * P.nu; o2net -= dec * (W.o2 > 0.2 ? 1 : 0.2);
      W.buried += bur;
    }
    // Bakterienblüte bei Überdüngung zehrt Sauerstoff
    if (sea && N[c] > P.nBloom) o2net -= 0.15 * (N[c] - P.nBloom) * qc * dt;
  }
  // Atmosphäre
  W.o2 = clamp(W.o2 + o2net * P.o2Conv / (n / 1000), 0, 30);
  // Oxidation/Brände: über 18 % zehrt der Sauerstoff an sich selbst (hält die Luft nahe 21 %)
  if (W.o2 > P.o2Fire) W.o2 -= (W.o2 - P.o2Fire) * P.o2FireK * dt;
  if (W.ctl.lid) W.o2 += (21 - W.o2) * P.lidRate * dt;
  W.flags._o2net = o2net;
}

/** Nährstoffe: Diffusion, Abfluss bergab, Verwitterung, Vulkane */
export function nutrients(W: World) {
  const { w, h, n } = W, dt = 1 / P.TPD, Nn = W.N, t = W.tmp;
  t.set(Nn);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const c = y * w + x;
    if (!W.seaMask[c]) {
      let best = c;
      if (W.hgt[c - 1] < W.hgt[best]) best = c - 1;
      if (W.hgt[c + 1] < W.hgt[best]) best = c + 1;
      if (W.hgt[c - w] < W.hgt[best]) best = c - w;
      if (W.hgt[c + w] < W.hgt[best]) best = c + w;
      const mv = t[c] * P.runoff * W.Wsoil[c];
      Nn[c] -= mv; Nn[best] += mv;
    }
    const avg = 0.25 * (t[c - 1] + t[c + 1] + t[c - w] + t[c + w]);
    Nn[c] += (avg - t[c]) * P.diffN;
  }
  for (const hs of W.hotspots) { const c = Math.round(hs.y) * w + Math.round(hs.x); if (c >= 0 && c < n) Nn[c] += P.volcanoN * W.ctl.tectonics; }
  for (let c = 0; c < n; c++) if (!W.seaMask[c]) Nn[c] += P.weather * W.Wsoil[c] * dt;
  // langsame Auswaschung extrem hoher Werte (Sedimentation), hält Überdüngung endlich
  for (let c = 0; c < n; c++) if (Nn[c] > 4) Nn[c] -= (Nn[c] - 4) * 0.05 * dt;
}

/** Bewegung: Diffusion + Taxis zum besseren Wachstum, Samenflug an Land; nur im eigenen Lebensraum */
export function movement(W: World) {
  const { w, h, n, S } = W, dt = 1 / P.TPD, B = W.B, G = W.G, t = W.tmp, mask = W.seaMask;
  for (let s = 0; s < S; s++) {
    if (!W.alive[s]) continue;
    const off = s * n, mob = W.mob[s], land = W.land[s];
    const want = land ? 0 : 1;
    const base = (P.D0 + (W.role[s] === 0 ? P.seedDisp * land + 0.15 * mob : P.Dm * mob)) * dt;
    const chi = P.chi * mob * (W.k[s] >= 5 ? P.nerveTaxis : 1) * dt;
    t.set(B.subarray(off, off + n));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = y * w + x, b = t[c];
      if (b <= 0) continue;
      const g = G[off + c];
      let r0 = 0, r1 = 0, r2 = 0, r3 = 0;
      if (x > 0 && mask[c - 1] === want) r0 = base + chi * Math.max(0, G[off + c - 1] - g);
      if (x < w - 1 && mask[c + 1] === want) r1 = base + chi * Math.max(0, G[off + c + 1] - g);
      if (y > 0 && mask[c - w] === want) r2 = base + chi * Math.max(0, G[off + c - w] - g);
      if (y < h - 1 && mask[c + w] === want) r3 = base + chi * Math.max(0, G[off + c + w] - g);
      const tot = r0 + r1 + r2 + r3;
      if (tot <= 0) continue;
      const k = tot > P.maxOut ? P.maxOut / tot : 1;
      const m0 = b * r0 * k, m1 = b * r1 * k, m2 = b * r2 * k, m3 = b * r3 * k;
      B[off + c] -= m0 + m1 + m2 + m3;
      if (m0) B[off + c - 1] += m0;
      if (m1) B[off + c + 1] += m1;
      if (m2) B[off + c - w] += m2;
      if (m3) B[off + c + w] += m3;
    }
  }
}
