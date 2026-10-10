import type { World } from '../src/sim/types.ts';
/** FNV-artiger Hash über den Sim-Zustand (Golden Hash) */
export function worldHash(W: World) {
  let h = 0x811c9dc5 | 0;
  const mix = (arr: ArrayLike<number>) => {
    const f = new Float32Array(arr.length); f.set(arr as any);
    const u = new Uint32Array(f.buffer);
    for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 0x01000193); }
  };
  mix(W.B); mix(W.hgt); mix(W.N); mix(W.T); mix(W.Wsoil); mix([W.o2, W.sea, W.tick]);
  mix(W.alive); mix(W.k); mix(W.topt); mix(W.z);
  h ^= W.species.length; h = Math.imul(h, 0x01000193);
  return (h >>> 0).toString(16);
}
export function finiteCheck(W: World) {
  const arrs: [string, ArrayLike<number>][] = [['B', W.B], ['G', W.G], ['N', W.N], ['D', W.D], ['T', W.T], ['hgt', W.hgt], ['Wsoil', W.Wsoil], ['M', W.M], ['O', W.O], ['tot', W.tot]];
  for (const [name, a] of arrs) for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return `${name}[${i}]=${a[i]}`;
  if (!Number.isFinite(W.o2)) return 'o2';
  for (let i = 0; i < W.B.length; i++) if (W.B[i] < 0 || W.B[i] > 1e5) return `B[${i}]=${W.B[i]}`;
  return '';
}
