// Speichern & Laden (Konzept 6.7): Karriere + Glas-Schnappschuss in IndexedDB, Export/Import als Datei.
import { get, set, del } from 'idb-keyval';
import * as S from './state.ts';
import * as sim from './simClient.ts';
import type { World } from '../sim/types.ts';
import type { Career } from './state.ts';

const KEY = 'weltenglas-save-v1';
let saving = false;


export async function saveGame() {
  const c = S.career.value; if (!c || saving) return;
  saving = true;
  try {
    const world = await sim.saveWorld();
    if (!world) return;
    await set(KEY, { v: 1, career: S.career.value, world, savedAt: Date.now() });
  } catch (e) { console.warn('Speichern fehlgeschlagen', e); }
  finally { saving = false; }
}

export async function loadGame(): Promise<{ career: Career; world: World } | null> {
  try { const b = await get(KEY); if (b && b.v === 1 && b.career && b.world) return b; } catch (e) { console.warn(e); }
  return null;
}
export async function hasSave() { try { return !!(await get(KEY)); } catch { return false; } }
export async function wipeSave() { try { await del(KEY); } catch { /* egal */ } }

// Datei-Export: Typed Arrays werden als Base64 kodiert
function enc(v: unknown): unknown {
  if (ArrayBuffer.isView(v)) {
    const ta = v as unknown as { constructor: { name: string }; buffer: ArrayBuffer; byteOffset: number; byteLength: number };
    const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return { __ta: ta.constructor.name, b64: btoa(s) };
  }
  if (Array.isArray(v)) return v.map(enc);
  if (v && typeof v === 'object') { const o: Record<string, unknown> = {}; for (const [k, x] of Object.entries(v)) o[k] = enc(x); return o; }
  return v;
}
function dec(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.__ta === 'string') {
      const bin = atob(o.b64 as string); const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const C = ({ Float32Array, Uint8Array, Int32Array, Uint32Array, Float64Array } as Record<string, any>)[o.__ta];
      return new C(u8.buffer);
    }
    const r: Record<string, unknown> = {}; for (const [k, x] of Object.entries(o)) r[k] = dec(x); return r;
  }
  return v;
}
export async function exportFile() {
  const world = await sim.saveWorld();
  const blob = new Blob([JSON.stringify(enc({ v: 1, career: S.career.value, world, savedAt: Date.now() }))], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `weltenglas-${S.career.value?.name ?? 'spiel'}-tag${Math.floor(S.day.value)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export async function importFile(file: File) {
  const txt = await file.text();
  const b = dec(JSON.parse(txt)) as { v: number; career: Career; world: World };
  if (b.v !== 1 || !b.career || !b.world) throw new Error('Keine Weltenglas-Datei');
  await set(KEY, { ...b, savedAt: Date.now() });
  return b;
}
