// Deterministische Mathe-Helfer für den Sim-Pfad (Konzept 6.4):
// nur + − × ÷, sqrt, floor und Integer-Ops. Kein Math.exp/log/pow/sin/random im Sim.

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

const LN2 = 0.6931471805599453;
const INV_LN2 = 1.4426950408889634;
// exp(r) für |r| ≤ ln2/2 per Taylor/Horner Grad 12 (Fehler ≈ 1e-16)
function expSmall(r: number) {
  let p = 1 / 479001600;
  p = p * r + 1 / 39916800;
  p = p * r + 1 / 3628800;
  p = p * r + 1 / 362880;
  p = p * r + 1 / 40320;
  p = p * r + 1 / 5040;
  p = p * r + 1 / 720;
  p = p * r + 1 / 120;
  p = p * r + 1 / 24;
  p = p * r + 1 / 6;
  p = p * r + 0.5;
  p = p * r + 1;
  p = p * r + 1;
  return p;
}
/** deterministisches exp */
export function dexp(x: number) {
  if (x > 700) x = 700;
  if (x < -700) return 0;
  const k = Math.floor(x * INV_LN2 + 0.5);
  const r = x - k * LN2;
  let v = expSmall(r);
  if (k > 0) for (let i = 0; i < k; i++) v *= 2;
  else for (let i = 0; i < -k; i++) v *= 0.5;
  return v;
}
/** deterministisches sin (Reduktion auf [−π, π], Taylor Grad 15) */
export function dsin(x: number) {
  const TAU = 6.283185307179586;
  x = x - Math.floor(x / TAU + 0.5) * TAU;
  const x2 = x * x;
  let p = -1 / 1307674368000;
  p = p * x2 + 1 / 6227020800;
  p = p * x2 - 1 / 39916800;
  p = p * x2 + 1 / 362880;
  p = p * x2 - 1 / 5040;
  p = p * x2 + 1 / 120;
  p = p * x2 - 1 / 6;
  p = p * x2 + 1;
  return p * x;
}
export const dcos = (x: number) => dsin(x + 1.5707963267948966);
/** deterministisches ln (Newton auf dexp, für Diagnose/Gauss nicht nötig, nur Kennzahlen) */
export function dlog(x: number) {
  if (x <= 0) return -700;
  // Reduktion auf [0.5, 1)
  let k = 0;
  while (x >= 1) { x *= 0.5; k++; }
  while (x < 0.5) { x *= 2; k--; }
  // atanh-Reihe: ln(x) = 2·atanh((x-1)/(x+1))
  const u = (x - 1) / (x + 1), u2 = u * u;
  let s = 0, t = u;
  for (let i = 1; i < 40; i += 2) { s += t / i; t *= u2; }
  return 2 * s + k * LN2;
}
const LN10 = 2.302585092994046;
export const pow10 = (x: number) => dexp(x * LN10);
export const dpow = (b: number, e: number) => dexp(e * dlog(b));

// ---------------------------------------------------------------- RNG
/** sfc32, Zustand in Uint32Array(4) — klonbar, speicherbar */
export function rngNext(st: Uint32Array) {
  let a = st[0], b = st[1], c = st[2], d = st[3];
  let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11); d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
  st[0] = a; st[1] = b; st[2] = c; st[3] = d;
  return (t >>> 0) / 4294967296;
}
export function seedState(seed: number) {
  const st = new Uint32Array([0x9e3779b9, 0x243f6a88, 0xb7e15162, seed >>> 0]);
  for (let i = 0; i < 15; i++) rngNext(st);
  return st;
}
/** Normalverteilung ≈ N(0,1) über Irwin–Hall (4 Uniforme), rein arithmetisch */
export function gauss(st: Uint32Array) {
  const s = rngNext(st) + rngNext(st) + rngNext(st) + rngNext(st);
  return (s - 2) * 1.7320508075688772;
}
/** zählerbasierter Hash → [0,1) */
export function hash01(...xs: number[]) {
  let h = 0x811c9dc5 | 0;
  for (const x of xs) {
    h ^= x | 0; h = Math.imul(h, 0x01000193);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- LUTs
// q10(T) = 2^((T−20)/10), T in [−40, 80] in 0,05-°C-Schritten
const Q_MIN = -40, Q_STEP = 0.05, Q_N = 2401;
const QLUT = new Float64Array(Q_N);
for (let i = 0; i < Q_N; i++) QLUT[i] = dexp(((Q_MIN + i * Q_STEP) - 20) / 10 * LN2);
export function q10(T: number) {
  let f = (T - Q_MIN) / Q_STEP;
  if (f < 0) f = 0; else if (f > Q_N - 1.001) f = Q_N - 1.001;
  const i = f | 0, t = f - i;
  return QLUT[i] * (1 - t) + QLUT[i + 1] * t;
}
// exp(−x²) für x in [0, 5]
const G_STEP = 0.005, G_N = 1001;
const GLUT = new Float64Array(G_N + 1);
for (let i = 0; i <= G_N; i++) GLUT[i] = dexp(-(i * G_STEP) * (i * G_STEP));
export function gaussBump(x: number) {
  if (x < 0) x = -x;
  const f = x / G_STEP;
  if (f >= G_N) return 0;
  const i = f | 0, t = f - i;
  return GLUT[i] * (1 - t) + GLUT[i + 1] * t;
}
/** rohe thermische Leistungskurve (Deutsch et al. 2008), ohne Spitzenfaktor */
export function tpcRaw(T: number, topt: number, sig: number) {
  const d = T - topt;
  if (d <= 0) return gaussBump(d / sig);
  const x = d / (0.7 * sig);
  return x >= 1 ? 0 : 1 - x * x;
}
/** Generalisten-Malus (4/σ)^0,35 */
export const peak = (sig: number) => dpow(4 / sig, 0.35);
/** logistische Funktion, deterministisch */
export const sigm = (x: number) => 1 / (1 + dexp(-x));
/** O2-Sättigung Süßwasser (mg/L), Benson-Krause-Fit */
export const o2Sat = (T: number) => {
  const t = clamp(T, 0, 40);
  return 14.59 - 0.3958 * t + 0.007254 * t * t - 0.000062 * t * t * t;
};
// exp(−x) für x in [0, 40] per LUT (0,005-Schritte, linear interpoliert)
const E_STEP = 0.005, E_N = 8001;
const ELUT = new Float64Array(E_N + 1);
for (let i = 0; i <= E_N; i++) ELUT[i] = dexp(-i * E_STEP);
export function expNeg(x: number) {
  if (x <= 0) return 1;
  const f = x / E_STEP;
  if (f >= E_N) return 0;
  const i = f | 0, t = f - i;
  return ELUT[i] * (1 - t) + ELUT[i + 1] * t;
}
