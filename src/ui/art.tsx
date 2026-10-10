// Flache, moderne Illustrationen als SVG: Titel, Zimmer je Akt, prozedurale Artenporträts.
import type { Traits } from '../sim/types.ts';
import { hslCss } from './renderer.ts';

export function TitleArt() {
  return (
    <svg viewBox="0 0 220 150" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="tsea" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2d7a8f" /><stop offset="1" stop-color="#0b1c38" /></radialGradient>
        <radialGradient id="tsun" cx="40%" cy="35%" r="45%"><stop offset="0" stop-color="#ffe6a0" stop-opacity=".5" /><stop offset="1" stop-color="#ffe6a0" stop-opacity="0" /></radialGradient>
      </defs>
      <rect width="220" height="150" fill="url(#tsea)" />
      <path d="M58 92c10-30 38-44 60-38s28-20 50-14 26 32 10 52-44 14-62 24-70 12-58-24z" fill="#79b45c" />
      <path d="M80 96c8-16 22-24 38-20s22-10 32-6" stroke="#2f6b3c" stroke-width="9" fill="none" stroke-linecap="round" />
      <path d="M140 72c10-6 22 0 26 10" stroke="#d6bf74" stroke-width="7" fill="none" stroke-linecap="round" />
      <circle cx="132" cy="86" r="7" fill="#a59a8a" /><circle cx="132" cy="84" r="3" fill="#eef2f5" />
      <path d="M150 104c6-2 10 2 14 0" stroke="#3aa6a0" stroke-width="5" fill="none" stroke-linecap="round" />
      <rect width="220" height="150" fill="url(#tsun)" />
      <path d="M22 34c10-14 26-22 44-24" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round" fill="none" />
    </svg>
  );
}

export function RoomArt({ act, dark }: { act: 1 | 2 | 3; dark?: boolean }) {
  const wall = act === 1 ? '#e8dcc8' : act === 2 ? '#c9ccd2' : '#e6ecf0';
  const floor = act === 1 ? '#b98c5f' : act === 2 ? '#7d7f86' : '#cfd6dc';
  const desk = act === 1 ? '#8b5e3c' : act === 2 ? '#4b4f58' : '#f7f9fa';
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" style={dark ? 'filter:brightness(.82)' : ''}>
      <rect width="800" height="500" fill={wall} />
      <rect y="380" width="800" height="120" fill={floor} />
      {/* Fenster */}
      {act !== 2 && <g><rect x="520" y="60" width="200" height="170" rx="10" fill={act === 1 ? '#9fd0ec' : '#bfe0ee'} /><rect x="615" y="60" width="10" height="170" fill="#fff" /><rect x="520" y="140" width="200" height="8" fill="#fff" /><circle cx="680" cy="100" r="18" fill="#ffe08a" /></g>}
      {act === 2 && <g><rect x="560" y="40" width="160" height="50" rx="6" fill="#8fb3c4" /><rect x="560" y="62" width="160" height="5" fill="#d9dde2" /></g>}
      {/* Kalender */}
      <g><rect x="80" y="70" width="120" height="130" rx="8" fill="#fff" /><rect x="80" y="70" width="120" height="30" rx="8" fill="#e15b4f" />{Array.from({ length: 12 }, (_, i) => <rect x={92 + (i % 4) * 26} y={110 + Math.floor(i / 4) * 26} width="18" height="18" rx="4" fill={i === 6 ? '#f5b301' : '#eceef1'} />)}</g>
      {/* Regal */}
      <g><rect x="250" y="80" width="200" height="12" rx="4" fill={desk} /><rect x="250" y="160" width="200" height="12" rx="4" fill={desk} />
        <rect x="270" y="48" width="22" height="32" rx="4" fill="#f5b301" /><rect x="300" y="56" width="18" height="24" rx="4" fill="#9aa3b2" /><rect x="330" y="40" width="26" height="40" rx="4" fill="#4f8a6b" /><rect x="370" y="52" width="40" height="28" rx="6" fill="#6aa7c9" />
        <rect x="275" y="124" width="60" height="36" rx="6" fill="#d8c3a5" /><rect x="350" y="128" width="40" height="32" rx="6" fill="#c56b5c" /></g>
      {/* Schreibtisch */}
      <rect x="120" y="300" width="560" height="26" rx="8" fill={desk} />
      <rect x="150" y="326" width="22" height="120" fill={desk} /><rect x="628" y="326" width="22" height="120" fill={desk} />
      {/* Lampe */}
      <path d="M470 300V190l-60-40" stroke="#2b2f36" stroke-width="8" fill="none" stroke-linecap="round" />
      <path d="M380 135l60 20-20 30z" fill="#2b2f36" />
      <path d="M392 172l-30 90h150z" fill="#ffe7a3" opacity=".35" />
      {/* Glas */}
      <ellipse cx="400" cy="292" rx="120" ry="22" fill="#000" opacity=".12" />
      <rect x="290" y="236" width="220" height="62" rx="28" fill="#1d5c74" />
      <path d="M310 262c20-18 60-14 80-4s60-14 90 2c-10 18-60 22-90 18s-70 4-80-16z" fill="#79b45c" />
      <rect x="290" y="236" width="220" height="62" rx="28" fill="none" stroke="#e6f2f6" stroke-opacity=".7" stroke-width="4" />
      {/* Heft & Sparschwein */}
      <rect x="560" y="276" width="70" height="24" rx="4" fill="#3b6fb6" transform="rotate(-6 595 288)" />
      <g transform="translate(180 262)"><ellipse cx="30" cy="22" rx="30" ry="20" fill="#f19cb3" /><circle cx="52" cy="16" r="3" fill="#333" /><rect x="22" y="2" width="14" height="4" rx="2" fill="#a65873" /></g>
      {act === 2 && <g><rect x="580" y="200" width="90" height="80" rx="8" fill="#3a3f48" /><rect x="590" y="210" width="70" height="52" rx="4" fill="#173d2c" /><path d="M594 250l12-12 10 6 14-18 16 10" stroke="#5fe39a" stroke-width="3" fill="none" /></g>}
      {act === 3 && <g><rect x="560" y="210" width="120" height="70" rx="8" fill="#20252d" /><rect x="568" y="218" width="104" height="54" rx="4" fill="#0e6b8c" /><path d="M576 260l16-14 14 8 18-22 20 12" stroke="#9fe6ff" stroke-width="3" fill="none" /><rect x="60" y="250" width="40" height="60" rx="6" fill="#fff" stroke="#c9d3da" /></g>}
    </svg>
  );
}

/** Prozedurales Artenporträt aus den Eigenschaften */
export function Portrait({ t, seed = 0, unknown = false }: { t: Traits; seed?: number; unknown?: boolean }) {
  const col = unknown ? '#9aa3b2' : hslCss(t.hue, 0.55, t.land ? 0.42 : 0.52);
  const col2 = unknown ? '#c5cbd4' : hslCss(t.hue + 20, 0.5, t.land ? 0.62 : 0.72);
  const bg = t.land ? (t.role === 0 ? '#dfeccf' : '#efe6d2') : '#d6ebf0';
  const r = (i: number) => { const x = Math.sin(seed * 9.13 + i * 12.7) * 43758.5453; return x - Math.floor(x); };
  const size = 0.6 + t.z * 0.8;
  let body;
  if (t.role === 0 && !t.land) {
    // Plankton: Kugeln, Fäden bei Kolonien
    const n = t.k >= 3 ? 7 : t.k === 2 ? 4 : 1;
    body = <g>{Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.28; const rr = n > 1 ? 16 * size : 0; return <circle cx={100 + Math.cos(a) * rr} cy={60 + Math.sin(a) * rr} r={(n > 1 ? 9 : 18) * size} fill={col} stroke={col2} stroke-width="3" />; })}
      {t.k >= 2 && <circle cx="100" cy="60" r={5 * size} fill={col2} />}</g>;
  } else if (t.role === 0) {
    if (t.z > 0.6) body = <g><rect x="95" y="58" width="10" height="40" rx="4" fill="#7a5a3a" /><circle cx="100" cy="48" r={30 * size * 0.8} fill={col} /><circle cx="84" cy="56" r={18 * size * 0.8} fill={col} /><circle cx="116" cy="56" r={18 * size * 0.8} fill={col2} /></g>;
    else if (t.z > 0.3) body = <g>{[0, 1, 2, 3, 4].map(i => <path d={`M100 98 Q${70 + i * 15} ${60 - r(i) * 20} ${68 + i * 16} ${40 + r(i + 5) * 14}`} stroke={i % 2 ? col : col2} stroke-width="7" fill="none" stroke-linecap="round" />)}</g>;
    else body = <g>{Array.from({ length: 9 }, (_, i) => <path d={`M${64 + i * 9} 98 q${(r(i) - 0.5) * 10} -${24 + r(i + 3) * 26} ${(r(i + 7) - 0.5) * 16} -${30 + r(i + 1) * 20}`} stroke={i % 2 ? col : col2} stroke-width="4" fill="none" stroke-linecap="round" />)}</g>;
  } else {
    const w = 34 * size, h = 20 * size * (t.role === 2 ? 0.8 : 1);
    const pred = t.role === 2;
    body = <g>
      {t.land && [0, 1, 2, 3].map(i => <path d={`M${100 - w * 0.6 + i * w * 0.4} ${60 + h * 0.6} l${(i % 2 ? 4 : -4)} 16`} stroke={col} stroke-width="4" stroke-linecap="round" />)}
      {!t.land && t.k <= 2 && Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * 6.28; return <path d={`M${100 + Math.cos(a) * w} ${60 + Math.sin(a) * h} l${Math.cos(a) * 7} ${Math.sin(a) * 7}`} stroke={col2} stroke-width="2" />; })}
      {pred ? <path d={`M${100 - w} 60 Q100 ${60 - h * 1.4} ${100 + w} 60 L${100 + w + 14} 52 L${100 + w + 6} 60 L${100 + w + 14} 68 L${100 + w} 60 Q100 ${60 + h * 1.4} ${100 - w} 60z`} fill={col} stroke={col2} stroke-width="3" />
        : <ellipse cx="100" cy="60" rx={w} ry={h} fill={col} stroke={col2} stroke-width="3" />}
      {t.k >= 3 && [1, 2].map(i => <path d={`M${100 - w + i * w * 0.66} ${60 - h * 0.8} v${h * 1.6}`} stroke={col2} stroke-width="2" opacity=".6" />)}
      {t.def > 0.4 && Array.from({ length: 6 }, (_, i) => <path d={`M${100 - w * 0.7 + i * w * 0.28} ${60 - h * 0.85} l3 -8 l3 8`} fill={col2} />)}
      <circle cx={100 + w * 0.55} cy={56} r={t.k >= 4 ? 4.5 : 3} fill="#fff" /><circle cx={100 + w * 0.6} cy={56} r={t.k >= 4 ? 2.4 : 1.6} fill="#111" />
      {t.k >= 6 && <path d={`M${100 - 6} ${60 - h - 6} q6 -10 12 0`} stroke="#f5b301" stroke-width="3" fill="none" />}
    </g>;
  }
  return (
    <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="120" fill={bg} />
      {!t.land && Array.from({ length: 10 }, (_, i) => <circle cx={r(i) * 200} cy={r(i + 20) * 120} r={1 + r(i + 40) * 2} fill="#fff" opacity=".5" />)}
      {t.land && <rect y="98" width="200" height="22" fill={t.role === 0 ? '#c8dcb4' : '#e2d6b8'} />}
      <g opacity={unknown ? 0.55 : 1}>{body}</g>
      {unknown && <text x="100" y="66" text-anchor="middle" font-size="34" font-weight="800" fill="#fff">?</text>}
    </svg>
  );
}

export function Avatar({ name, hue }: { name: string; hue: number }) {
  const initials = name.split(/\s+/).filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return <div class="avatar" style={`background:${hslCss(hue, 0.45, 0.45)}`}>{initials}</div>;
}
