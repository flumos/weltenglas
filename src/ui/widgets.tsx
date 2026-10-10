// Kleine Bausteine: Sparkline, Wohlfühlkurve, Balken, Biom-Farben.
import type { Traits } from '../sim/types.ts';
import { hslCss, NEON_BIOMES } from './renderer.ts';

export const biomeCss = (i: number) => `rgb(${NEON_BIOMES[i].join(',')})`;

export function Sparkline({ data, color = 'currentColor', w = 80, h = 24 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const max = Math.max(...data, 1e-6), min = Math.min(...data, 0);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><polyline points={pts} fill="none" stroke={color} stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" /></svg>;
}

/** Wohlfühlkurve (TPC) mit Marker der aktuellen Temperatur */
export function TpcCurve({ t, T, color }: { t: Traits; T?: number; color?: string }) {
  const W = 300, H = 80, lo = -5, hi = 45;
  const f = (x: number) => { const d = x - t.topt; if (d <= 0) return Math.exp(-((d / t.sig) * (d / t.sig))); const u = d / (0.7 * t.sig); return u >= 1 ? 0 : 1 - u * u; };
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) { const x = lo + (hi - lo) * i / 100; pts.push(`${(i / 100) * W},${H - 6 - f(x) * (H - 16)}`); }
  const X = (v: number) => ((v - lo) / (hi - lo)) * W;
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} style="width:100%;height:auto">
      <polyline points={pts.join(' ')} fill="none" stroke={color ?? 'var(--good)'} stroke-width="2.5" stroke-linejoin="round" />
      <line x1={X(t.topt)} x2={X(t.topt)} y1="6" y2={H - 6} stroke="var(--muted)" stroke-dasharray="3 3" />
      {T !== undefined && <g><line x1={X(T)} x2={X(T)} y1="2" y2={H - 4} stroke="var(--text)" stroke-width="2" /><text x={Math.min(W - 30, Math.max(0, X(T) - 14))} y={H + 12} font-size="11" fill="var(--muted)">hier {T.toFixed(0)} °C</text></g>}
      {[0, 10, 20, 30, 40].map(v => <text x={X(v) - 6} y={H + 12} font-size="10" fill="var(--faint)" opacity={T !== undefined && Math.abs(v - T) < 6 ? 0 : 1}>{v}°</text>)}
    </svg>
  );
}

export function Bar({ v, color }: { v: number; color: string }) {
  return <div class="bar"><i style={`width:${Math.max(0, Math.min(100, v * 100))}%;background:${color}`} /></div>;
}

export const speciesColor = (t: Traits) => hslCss(t.hue, 0.9, t.land ? 0.6 : 0.66);

export function roleText(t: Traits) {
  const r = t.role === 0 ? (t.land ? (t.z > 0.62 ? 'Baum' : t.z > 0.32 ? 'Busch' : 'Landpflanze') : 'Plankton') : t.role === 1 ? 'Weidegänger' : 'Räuber';
  return r + (t.role > 0 ? (t.land ? ' · Land' : ' · Meer') : '');
}
export const stageName = (k: number) => ['', 'Einfache Zelle', 'Komplexe Zelle', 'Mehrzeller', 'Gewebe & Organe', 'Nervensystem', 'Intelligenz'][k] ?? '';

export function LineChart({ series, h = 160, labels }: { series: { name: string; color: string; data: number[] }[]; h?: number; labels?: number[] }) {
  const W = 600;
  const n = Math.max(...series.map(s => s.data.length), 2);
  return (
    <svg viewBox={`0 0 ${W} ${h + 20}`} class="chart" preserveAspectRatio="none" style={`height:${h + 20}px`}>
      {[0.25, 0.5, 0.75].map(f => <line x1="0" x2={W} y1={h * f} y2={h * f} stroke="var(--line)" />)}
      {series.map(s => {
        const max = Math.max(...s.data, 1e-6);
        const pts = s.data.map((v, i) => `${(i / (n - 1)) * W},${h - (v / max) * (h - 8) - 4}`).join(' ');
        return <polyline points={pts} fill="none" stroke={s.color} stroke-width="2.2" vector-effect="non-scaling-stroke" />;
      })}
      {labels && labels.map((d, i) => i % Math.ceil(labels.length / 6) === 0 ? <text x={(i / (n - 1)) * W} y={h + 16} font-size="11" fill="var(--faint)">Tag {d}</text> : null)}
    </svg>
  );
}
