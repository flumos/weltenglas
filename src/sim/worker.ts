// Sim-Worker (Konzept 6.2): rechnet im Hintergrund, schickt Render-Snapshots und Tagesdaten.
/// <reference lib="webworker" />
import { createWorld, seedLife, cloneWorld, visThreshold } from './world.ts';
import { step, applyCmd, snapshot, snapMeta, stressTest, sampleSpecies } from './sim.ts';
import { metrics, inspectSpecies, estSpeciesList } from './metrics.ts';
import { transplant } from './transplant.ts';
import { thermal } from './climate.ts';
import { P } from './params.ts';
import type { World, Cmd } from './types.ts';
import type { WorldOpts } from './world.ts';

let W: World | null = null;
let tps = 0;                 // Ticks pro Sekunde (0 = Pause)
let acc = 0, last = 0;
let chronSent = 0;
let wantStress = false;
let selected = -1;
const pool: Uint8Array[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const post = (m: unknown, tr?: Transferable[]) => (self as unknown as Worker).postMessage(m, tr ?? []);

function registry(W: World) {
  return W.species.filter(s => s.est || s.alive && s.name).map(s => ({
    id: s.id, parent: s.parent, name: s.name, latin: s.latin, born: s.born, died: s.died, alive: s.alive, est: s.est,
    reason: s.reason, cause: s.cause, evolvedTo: s.evolvedTo, peak: s.peak, typus: s.typus, firstX: s.firstX, firstY: s.firstY,
    hist: s.alive ? s.hist.slice(-30) : [],
  }));
}

function sendSnap() {
  if (!W) return;
  const buf = pool.pop();
  const s = snapshot(W, buf);
  // optional: Wohlfühlzone der gewählten Art (G des stärksten Stamms)
  let gz: Uint8Array | null = null;
  if (selected >= 0) {
    let best = -1, bt = 0;
    for (let i = 0; i < W.S; i++) if (W.alive[i] && W.sp[i] === selected && W.tot[i] > bt) { bt = W.tot[i]; best = i; }
    if (best >= 0) {
      gz = new Uint8Array(W.n);
      const want = W.land[best] ? 0 : 1, vals: number[] = [];
      for (let c = 0; c < W.n; c++) if (W.seaMask[c] === want) vals.push(W.G[best * W.n + c]);
      vals.sort((a, b) => a - b);
      const lo = vals[Math.floor(vals.length * 0.05)] ?? 0, hi = vals[Math.floor(vals.length * 0.95)] ?? 1, span = Math.max(1e-6, hi - lo);
      for (let c = 0; c < W.n; c++) gz[c] = W.seaMask[c] === want ? 1 + Math.round(254 * Math.max(0, Math.min(1, (W.G[best * W.n + c] - lo) / span))) : 0;
    }
  }
  post({ t: 'snap', buf: s, meta: snapMeta(W), gz }, gz ? [s.buffer, gz.buffer] : [s.buffer]);
}

let lastStressDay = -99, lastStress: unknown = null;
function sendDay(fromLoop = false) {
  if (!W) return;
  const m = metrics(W);
  const chron = W.chronicle.slice(chronSent);
  chronSent = W.chronicle.length;
  // Stresstest-Vorschau ist teuer: höchstens alle 3 Glastage und nur aus dem Zeitlauf
  const d = Math.floor(W.tick / P.TPD);
  let stress: unknown = null;
  if (wantStress && fromLoop && d - lastStressDay >= 3) { lastStress = stressTest(W); lastStressDay = d; stress = lastStress; }
  post({
    t: 'day', day: W.tick / P.TPD, metrics: m, species: estSpeciesList(W), chron, hist: W.hist[W.hist.length - 1],
    registry: registry(W), stress, vis: visThreshold(W), flags: { ...W.flags },
  });
}

function loop() {
  timer = null;
  if (!W || tps <= 0) return;
  const now = performance.now();
  const dtS = Math.min(0.5, (now - last) / 1000);
  last = now;
  acc += dtS * tps;
  let n = 0;
  const t0 = performance.now();
  while (acc >= 1 && performance.now() - t0 < 60) {
    acc -= 1; n++;
    step(W);
    if (W.tick % P.TPD === 0) sendDay(true);
  }
  if (acc > 3) acc = 3; // nicht aufholen, wenn das Gerät zu langsam ist
  if (n > 0) sendSnap();
  timer = setTimeout(loop, 16);
}
function start() { if (timer === null && tps > 0) { last = performance.now(); timer = setTimeout(loop, 16); } }

self.onmessage = (ev: MessageEvent) => {
  const m = ev.data;
  switch (m.t) {
    case 'init': {
      if (m.world) W = m.world as World;
      else {
        W = createWorld(m.opts as WorldOpts);
        if (m.seedLife) seedLife(W);
        for (let i = 0; i < P.TPD; i++) step(W);
      }
      chronSent = m.chronFrom ?? W.chronicle.length;
      post({ t: 'ready', w: W.w, h: W.h, day: W.tick / P.TPD });
      sendSnap(); sendDay();
      break;
    }
    case 'speed': tps = m.tps; acc = 0; start(); break;
    case 'cmd': if (W) { const cm = m.cmd as Cmd; applyCmd(W, cm); if (cm.type === 'sun' || cm.type === 'thermo' || cm.type === 'cool' || cm.type === 'ctl' || cm.type === 'photo') thermal(W); sendSnap(); if (m.day) sendDay(); } break;
    case 'select': selected = m.id; if (W) sendSnap(); break;
    case 'wantStress': wantStress = !!m.on; lastStressDay = -99; break;
    case 'ret': if (m.buf && pool.length < 3) pool.push(m.buf); break;
    case 'refresh': if (W) { sendSnap(); sendDay(); } break;
    case 'inspect': post({ t: 'reply', req: m.req, data: W ? inspectSpecies(W, m.id) : null }); break;
    case 'sample': post({ t: 'reply', req: m.req, data: W ? sampleSpecies(W, m.id) : null }); break;
    case 'stress': post({ t: 'reply', req: m.req, data: W ? stressTest(W) : null }); break;
    case 'metrics': post({ t: 'reply', req: m.req, data: W ? metrics(W) : null }); break;
    case 'save': post({ t: 'reply', req: m.req, data: W ? cloneWorld(W) : null }); break;
    case 'advance': {
      // Zeitsprung (z. B. Ferien bei Oma): rechnet Tage am Stück
      if (!W) break;
      const end = W.tick + m.days * P.TPD;
      while (W.tick < end) { step(W); if (W.tick % P.TPD === 0) sendDay(); }
      sendSnap();
      post({ t: 'reply', req: m.req, data: true });
      break;
    }
    case 'transplant': {
      if (!W) break;
      chronSent = Math.max(0, W.chronicle.length);
      W = transplant(W, m.size, m.seed);
      pool.length = 0;
      post({ t: 'ready', w: W.w, h: W.h, day: W.tick / P.TPD });
      sendSnap(); sendDay();
      post({ t: 'reply', req: m.req, data: true });
      break;
    }
  }
};
