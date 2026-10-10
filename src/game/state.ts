// Globaler Zustand (Preact Signals): Karriere, UI, Live-Daten aus dem Worker.
import { signal, computed } from '@preact/signals';
import type { Metrics, Inspect } from '../sim/metrics.ts';
import type { ChronicleEntry, DayStat, Traits } from '../sim/types.ts';
import type { SnapMeta } from '../sim/sim.ts';
import type { StressResult } from '../data/categories.ts';
import type { GlassSize } from '../sim/params.ts';

export interface SpeciesRow { id: number; name: string; latin: string; total: number; share: number; trend: number; typus: Traits; born: number; reason: string; est: boolean }
export interface RegRow {
  id: number; parent: number; name: string; latin: string; born: number; died: number; alive: boolean; est: boolean;
  reason: string; cause: string; evolvedTo: number; peak: number; typus: Traits; firstX: number; firstY: number; hist: number[];
}
export interface ContestResult {
  contest: string; attempt: number; day: number; place: number; points: number; prize: number;
  cats: { id: string; s: number; x: number }[]; field: { name: string; points: number; me?: boolean }[]; letter: string; tip: string;
}
export interface Frozen extends Traits { name: string; frozenDay: number }
export interface Note { day: number; kind: 'letter' | 'tip' | 'card' | 'story'; title: string; text: string }

export interface Career {
  v: number; name: string; hero: 'boy' | 'girl'; act: 1 | 2 | 3; money: number; currency: 'DM' | 'EUR'; rep: number;
  inv: Record<string, number>; glass: GlassSize; seed: number;
  current: { id: string; start: number; end: number; attempt: number; events: { day: number; id: string }[]; entryPaid: boolean } | null;
  results: ContestResult[]; done: string[]; flags: Record<string, number | string | boolean>;
  notes: Note[]; freezer: Frozen[]; cards: string[]; named: number[];
  settings: { sound: boolean; music: boolean; reduced: boolean; gentle: boolean; scale: number };
  started: number; playMs: number; day: number; ended?: boolean;
}

export type Screen = 'title' | 'prolog' | 'hub' | 'glass' | 'shop' | 'calendar' | 'jury' | 'notebook' | 'act' | 'ending';

export const career = signal<Career | null>(null);
export const screen = signal<Screen>('title');

// Live-Daten
export const day = signal(0);
export const metrics = signal<Metrics | null>(null);
export const speciesList = signal<SpeciesRow[]>([]);
export const registry = signal<RegRow[]>([]);
export const chronicle = signal<ChronicleEntry[]>([]);
export const hist = signal<DayStat[]>([]);
export const meta = signal<SnapMeta | null>(null);
/** Seitenverhältnis der Schale (ändert sich nur beim Umzug) — für Layouts, die nicht bei jedem Snapshot neu rendern sollen */
export const metaAspect = computed(() => { const m = meta.value; return m ? m.w / m.h : 1.5; });
export const stress = signal<StressResult | null>(null);
export const worldFlags = signal<Record<string, number>>({});
export const visTh = signal(1);

// UI
export const speed = signal(0);           // Index in SPEEDS
export const paused = signal(true);
export const tool = signal<string>('look');
export const overlay = signal<string>('biome');
export const selectedSpecies = signal<number>(-1);
export const inspectData = signal<Inspect | null>(null);
export const cellInfo = signal<null | { x: number; y: number; c: number }>(null);
export const toasts = signal<{ id: number; text: string; kind: string; species?: number; x?: number; y?: number }[]>([]);
export const modal = signal<null | { kind: string; data?: unknown }>(null);
export const sheetOpen = signal(false);
export const locked = signal(false);       // z. B. Ferien bei Oma
export const notebookTab = signal('album');
export const ping = signal<null | { x: number; y: number; at: number }>(null);
export function showAt(x?: number, y?: number) { if (x === undefined || y === undefined || x < 0) return; ping.value = { x: x + 0.5, y: y + 0.5, at: performance.now() }; screen.value = 'glass'; }

export const SPEEDS = [
  { label: '1×', tps: 4 / 12 },
  { label: '3×', tps: 4 / 4 },
  { label: '10×', tps: 4 / 1.2 },
  { label: '30×', tps: 4 / 0.4 },
];

export const has = (id: string) => (career.value?.inv[id] ?? 0) > 0;
export const cur = computed(() => (career.value?.currency === 'EUR' ? '€' : 'DM'));
export const money = computed(() => career.value?.money ?? 0);

let toastId = 0;
export function toast(text: string, kind = 'info', extra: { species?: number; x?: number; y?: number } = {}) {
  const id = ++toastId;
  toasts.value = [...toasts.value.slice(-3), { id, text, kind, ...extra }];
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, kind === 'big' ? 7000 : 5000);
}

export function patchCareer(f: (c: Career) => void) {
  const c = career.value; if (!c) return;
  const n = structuredClone(c); f(n); career.value = n;
}
