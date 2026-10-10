// Akt 3 · Kultur und Ehrfurcht (Konzept 5.12). Siedlungen als Agenten über den Zellen.
import { P } from './params.ts';
import { clamp, dpow } from './math.ts';
import { chron } from './world.ts';
import { settlementName } from './names.ts';
import type { World, Settlement } from './types.ts';

export const ERAS = ['Sammler', 'Ackerbau', 'Bronze', 'Schrift', 'Optik', 'Licht'];
const ERA_K = [0, 6, 20, 50, 110, 240];
export const ERA_TEXT = [
  'sammeln Früchte und erzählen sich Geschichten über die warme Scheibe am Himmel.',
  'bestellen Felder. Ein Überschuss ernährt die ersten Handwerker.',
  'schmelzen Erz aus den Bergen.',
  'schreiben ihre Geschichte auf – auch die Wunder am Himmel.',
  'schleifen Linsen und schauen nach oben.',
  'beherrschen das Licht.',
];

export function registerWonder(W: World, x: number, y: number, good: number, kind: string) {
  if (!W.ctl.cultures) return;
  W.wonderLog.push({ tick: W.tick, x, y, good, kind });
  if (W.wonderLog.length > 300) W.wonderLog.splice(0, W.wonderLog.length - 300);
}

const WONDER_WORD: Record<string, string> = {
  Manna: 'Manna fällt vom Himmel', Sonne: 'die Sonne wandert', Strafe: 'eine Strafe des Himmels', Feuerberg: 'ein Feuerberg erwacht',
  Berg: 'ein Berg wächst aus der Erde', Senke: 'die Erde versinkt', Himmelsstein: 'ein Himmelsstein schlägt ein',
};

function speciesBioAround(W: World, spId: number, x: number, y: number, r: number) {
  const { w, h, n } = W; let b = 0, veg = 0, rock = 0, cells = 0, T = 0;
  for (let yy = Math.max(0, (y - r) | 0); yy <= Math.min(h - 1, (y + r) | 0); yy++)
    for (let xx = Math.max(0, (x - r) | 0); xx <= Math.min(w - 1, (x + r) | 0); xx++) {
      const dx = xx - x, dy = yy - y; if (dx * dx + dy * dy > r * r) continue;
      const c = yy * w + xx; cells++;
      for (let s = 0; s < W.S; s++) if (W.alive[s] && W.sp[s] === spId) b += W.B[s * n + c];
      veg += W.veg[c]; T += W.T[c];
      if (!W.seaMask[c] && W.hgt[c] - W.sea > 0.07) rock++;
    }
  return { b, veg, rock, cells, T: cells ? T / cells : 0 };
}

export function cultureDaily(W: World) {
  const { n, S } = W;
  const dt = 1;
  // Gründung: intelligente Landarten mit dichter Population
  const live = W.settlements.filter(s => s.alive);
  if (live.length < 6) {
    for (let s = 0; s < S; s++) {
      if (!W.alive[s] || W.k[s] < 6 || !W.land[s] || W.tot[s] < 1.5) continue;
      let best = -1, bv = 0;
      for (let c = 0; c < n; c++) { const v = W.B[s * n + c]; if (v > bv) { bv = v; best = c; } }
      if (best < 0 || bv < 0.12) continue;
      const x = best % W.w, y = (best / W.w) | 0;
      if (W.settlements.some(t => t.alive && (t.x - x) * (t.x - x) + (t.y - y) * (t.y - y) < 14 * 14)) continue;
      const id = W.settlements.length;
      const st: Settlement = {
        id, species: W.sp[s], x, y, pop: 20, K: 1, era: 0, R: 0.3, F: 0, S: 0.3, conflict: 0, founded: W.tick,
        name: settlementName(W.seed, id), wonders: 0, fears: 0, sawFace: false, temple: false, paint: false, alive: true,
      };
      W.settlements.push(st);
      const spn = W.species[W.sp[s]]?.name ?? 'Wesen';
      chron(W, { kind: 'culture', text: `Die ${spn} gründen eine Siedlung: ${st.name}. Sie halten die Lampe für die Sonne.`, x, y, big: true });
      break;
    }
  }
  const sightR = 14;
  const recent = W.wonderLog.filter(e => e.tick > W.tick - P.TPD);
  for (const st of W.settlements) {
    if (!st.alive) continue;
    const r = 4 + st.era;
    const env = speciesBioAround(W, st.species, st.x, st.y, r);
    // Rohstoffe: Berge im weiteren Umland (Handelswege)
    const ore = env.rock > 0 ? env.rock : speciesBioAround(W, st.species, st.x, st.y, r + 8).rock;
    const sp = W.species[st.species];
    if (!sp || !sp.alive || env.b < 0.05) {
      st.pop *= 0.7;
      if (st.pop < 5) { st.alive = false; chron(W, { kind: 'culture', text: `${st.name} ist verlassen. Nur Ruinen bleiben.`, x: st.x, y: st.y, big: true }); }
      continue;
    }
    // Bevölkerung folgt der Biomasse der Art im Territorium (Körpermasse ~ 1/20 BE)
    const target = env.b * 20 * (st.era >= 1 ? 1.6 : 1) * (1 - 0.4 * st.conflict);
    st.pop += (target - st.pop) * 0.15 * dt;
    // Überschuss und Spezialisten (Diamond)
    const harvest = env.veg * 0.4 * (st.era >= 1 ? 2.2 : 1);
    const need = st.pop * 0.02 + 1e-3;
    const surplus = harvest / need;
    const f = clamp(1 - 1 / Math.max(1, surplus), 0, 0.9);
    // Wissen (Kremer + Henrich)
    const Pstar = 30 + 25 * st.era;
    const g = 0.03;
    let dK = g * dpow(Math.max(1, st.pop * (0.1 + f)), 0.5) * dpow(Math.max(1, st.K), 0.25);
    if (st.pop < Pstar) dK -= 0.02 * st.K;
    st.K = Math.max(1, st.K + dK * dt);
    // Ära: Wissen + Rohstoffe + Überschuss
    const next = st.era + 1;
    if (next < ERAS.length && st.K >= ERA_K[next] && (next < 2 || ore > 0 || st.K >= 2 * ERA_K[next]) && (next < 1 || surplus > 1.2)) {
      st.era = next;
      chron(W, { kind: 'culture', text: `${st.name} erreicht die Ära „${ERAS[next]}“: Sie ${ERA_TEXT[next]}`, x: st.x, y: st.y, big: next >= 4 });
    }
    // Wunder im Sichtradius
    let wp = 0, wm = 0, lastKind = '';
    for (const e of recent) {
      const dx = e.x - st.x, dy = e.y - st.y;
      if (dx * dx + dy * dy > sightR * sightR) continue;
      if (e.good > 0) wp += e.good; else wm -= e.good;
      lastKind = e.kind;
    }
    st.wonders += wp; st.fears += wm;
    if ((wp > 0.5 || wm > 0.5) && lastKind && WONDER_WORD[lastKind] && (W.flags['wonder' + st.id] ?? -1e9) < W.tick - 6 * P.TPD) {
      W.flags['wonder' + st.id] = W.tick;
      chron(W, { kind: 'culture', text: `In ${st.name} erzählen sie: „${WONDER_WORD[lastKind]}!“ ${wp >= wm ? 'Sie danken dem Gesicht.' : 'Sie fürchten das Gesicht.'}`, x: st.x, y: st.y });
    }
    // Sicherheit (Norris & Inglehart)
    const envVar = clamp(Math.abs(env.T - 18) / 20, 0, 1);
    st.S = clamp(0.5 * f + 0.3 * (1 - st.conflict) + 0.2 * (1 - envVar), 0, 1);
    // Ehrfurcht und Furcht
    const Kh = clamp(st.K / 200, 0, 1);
    const kind = st.wonders >= st.fears;
    const eTerm = st.sawFace ? (kind ? -0.06 * Kh : 0.06 * Kh) : 0.05 * Kh;
    const dR = 0.04 * (1 - st.S) * (1 - st.R) + 0.25 * Math.min(1, wp) * (1 - st.R) + (st.pop > 150 ? 0.02 : 0) * (1 - st.R)
      - 0.03 * st.S * st.R - eTerm * st.R;
    st.R = clamp(st.R + dR * dt, 0, 1);
    st.F = clamp(st.F + (0.3 * Math.min(1, wm) * (1 - st.F) - 0.04 * st.F) * dt, 0, 1);
    if (!st.paint && st.R > 0.4) { st.paint = true; chron(W, { kind: 'culture', text: `In ${st.name} malen sie ein riesiges Gesicht an die Höhlenwände.`, x: st.x, y: st.y }); }
    if (!st.temple && st.era >= 2 && st.R > 0.5) { st.temple = true; chron(W, { kind: 'culture', text: `${st.name} baut einen Tempel, ausgerichtet zur Lampe.`, x: st.x, y: st.y, big: true }); }
    if (st.era >= 3 && Kh > 0.3 && st.R < 0.35 && !W.flags['secular' + st.id]) { W.flags['secular' + st.id] = W.tick; chron(W, { kind: 'culture', text: `In ${st.name} zweifeln die Gelehrten an den alten Geschichten.`, x: st.x, y: st.y }); }
    if (!st.sawFace && st.era >= 4) {
      st.sawFace = true;
      W.flags.sawFace = W.flags.sawFace ?? W.tick;
      chron(W, { kind: 'culture', text: `${st.name}: Durch ihre Linsen sehen sie hinter dem Himmel ein riesiges Gesicht. Sie sehen dich.`, x: st.x, y: st.y, big: true });
      chron(W, { kind: 'culture', text: kind ? 'Die Wunder waren gütig: Aus Wissen wird Respekt.' : 'Die Wunder waren hart: Furcht breitet sich aus. Manche verbergen sich vor dem Gesicht.', x: st.x, y: st.y, big: true });
    }
    if (st.era >= 5 && st.sawFace && !W.flags.signal) { W.flags.signal = W.tick; chron(W, { kind: 'culture', text: `${st.name} sendet Lichtsignale nach oben. Eine Botschaft an das Gesicht.`, x: st.x, y: st.y, big: true }); }
  }
  // Konflikte zwischen nahen Siedlungen bei Knappheit
  const L = W.settlements.filter(s => s.alive);
  for (const a of L) a.conflict *= 0.9;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j];
    const d = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    const reach = 10 + 3 * (a.era + b.era);
    if (d > reach) continue;
    const scarcity = clamp(1 - (a.S + b.S), 0, 1);
    const pressure = scarcity * (a.species !== b.species ? 1.5 : 1) * (a.F + b.F + 0.3);
    a.conflict = clamp(a.conflict + 0.1 * pressure, 0, 1); b.conflict = clamp(b.conflict + 0.1 * pressure, 0, 1);
    if (a.conflict > 0.6 && !W.flags[`war${a.id}_${b.id}`]) { W.flags[`war${a.id}_${b.id}`] = W.tick; chron(W, { kind: 'culture', text: `Streit zwischen ${a.name} und ${b.name} um Land und Nahrung.`, x: a.x, y: a.y }); }
    if (a.conflict < 0.1 && b.conflict < 0.1 && d < reach && !W.flags[`trade${a.id}_${b.id}`] && a.era >= 1 && b.era >= 1) { W.flags[`trade${a.id}_${b.id}`] = W.tick; chron(W, { kind: 'culture', text: `${a.name} und ${b.name} handeln miteinander.`, x: a.x, y: a.y }); }
  }
}
