// Brücke zum Sim-Worker. Hält die letzten Snapshots für den Renderer.
import SimWorker from '../sim/worker.ts?worker';
import type { Cmd, World, ChronicleEntry, DayStat, Traits } from '../sim/types.ts';
import type { Metrics, Inspect } from '../sim/metrics.ts';
import type { StressResult } from '../data/categories.ts';
import type { SnapMeta } from '../sim/sim.ts';
import type { WorldOpts } from '../sim/world.ts';
import type { GlassSize } from '../sim/params.ts';
import { batch } from '@preact/signals';
import * as S from './state.ts';

export interface Snap { buf: Uint8Array; meta: SnapMeta; gz: Uint8Array | null; at: number }

let worker: Worker | null = null;
let req = 0;
const pending = new Map<number, (d: unknown) => void>();
export let snapCur: Snap | null = null;
export let snapPrev: Snap | null = null;
export let gridW = 96, gridH = 64;
type DayListener = (d: DayMsg) => void;
const dayListeners: DayListener[] = [];
export const onDay = (f: DayListener) => { dayListeners.push(f); };
let readyResolve: (() => void) | null = null;

export interface DayMsg {
  day: number; metrics: Metrics; species: S.SpeciesRow[]; chron: ChronicleEntry[]; hist: DayStat;
  registry: S.RegRow[]; stress: StressResult | null; vis: number; flags: Record<string, number>;
}

function ensure(): Worker {
  if (worker) return worker;
  const wk: Worker = new SimWorker();
  worker = wk;
  wk.onmessage = (ev: MessageEvent) => {
    const m = ev.data;
    if (m.t === 'snap') {
      if (snapPrev && snapPrev.buf.buffer.byteLength) wk.postMessage({ t: 'ret', buf: snapPrev.buf }, [snapPrev.buf.buffer]);
      snapPrev = snapCur;
      snapCur = { buf: m.buf, meta: m.meta, gz: m.gz, at: performance.now() };
      S.meta.value = m.meta;
    } else if (m.t === 'day') {
      const d = m as DayMsg;
      batch(() => {
        S.day.value = d.day;
        S.metrics.value = d.metrics;
        S.speciesList.value = d.species;
        S.registry.value = d.registry;
        S.visTh.value = d.vis;
        S.worldFlags.value = d.flags;
        if (d.stress) S.stress.value = d.stress;
        if (d.chron.length) S.chronicle.value = [...S.chronicle.value, ...d.chron].slice(-500);
        if (d.hist) {
          const h = S.hist.value;
          if (!h.length || h[h.length - 1].day < d.hist.day) S.hist.value = [...h, d.hist].slice(-400);
        }
      });
      for (const f of dayListeners) f(d);
    } else if (m.t === 'ready') {
      gridW = m.w; gridH = m.h;
      snapPrev = null; snapCur = null;
      readyResolve?.(); readyResolve = null;
    } else if (m.t === 'reply') {
      const f = pending.get(m.req); if (f) { pending.delete(m.req); f(m.data); }
    }
  };
  return wk;
}

function ask<T>(msg: Record<string, unknown>): Promise<T> {
  const w = ensure();
  const id = ++req;
  return new Promise(res => { pending.set(id, res as (d: unknown) => void); w.postMessage({ ...msg, req: id }); });
}

export function initWorld(opts: { world?: World; opts?: WorldOpts; seedLife?: boolean; chronFrom?: number }) {
  const w = ensure();
  return new Promise<void>(res => { readyResolve = res; w.postMessage({ t: 'init', ...opts }); });
}
export function setTps(tps: number) { ensure().postMessage({ t: 'speed', tps }); }
export function sendCmd(cmd: Cmd, wantDay = false) { ensure().postMessage({ t: 'cmd', cmd, day: wantDay }); }
export function selectSpecies(id: number) { ensure().postMessage({ t: 'select', id }); }
export function wantStress(on: boolean) { ensure().postMessage({ t: 'wantStress', on }); }
export function refresh() { ensure().postMessage({ t: 'refresh' }); }
export const inspect = (id: number) => ask<Inspect | null>({ t: 'inspect', id });
export const sample = (id: number) => ask<(Traits & { name: string }) | null>({ t: 'sample', id });
export const runStress = () => ask<StressResult | null>({ t: 'stress' });
export const getMetrics = () => ask<Metrics | null>({ t: 'metrics' });
export const saveWorld = () => ask<World | null>({ t: 'save' });
export const advance = (days: number) => ask<boolean>({ t: 'advance', days });
export const transplantTo = (size: GlassSize, seed?: number) => {
  const w = ensure();
  return new Promise<void>(res => {
    const id = ++req; pending.set(id, () => res());
    readyResolve = null;
    w.postMessage({ t: 'transplant', size, seed, req: id });
  });
};
