// Flache, moderne Illustrationen als SVG: Titel, Zimmer je Akt, prozedurale Artenporträts.
import type { Traits } from '../sim/types.ts';
import { hslCss } from './renderer.ts';

export function TitleArt() {
  return (
    <svg viewBox="0 0 220 150" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="tsea" cx="50%" cy="48%" r="70%"><stop offset="0" stop-color="#0d2a5c" /><stop offset="1" stop-color="#04050f" /></radialGradient>
        <linearGradient id="tland" x1="0" x2="1"><stop offset="0" stop-color="#2ef2ff" /><stop offset=".55" stop-color="#4d7fa8" /><stop offset="1" stop-color="#a98bff" /></linearGradient>
        <filter id="tglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width="220" height="150" fill="url(#tsea)" />
      {Array.from({ length: 7 }, (_, i) => <path d={`M0 ${20 + i * 18}H220`} stroke="#4d7fa8" stroke-opacity=".08" />)}
      {Array.from({ length: 10 }, (_, i) => <path d={`M${i * 24 + 6} 0V150`} stroke="#4d7fa8" stroke-opacity=".08" />)}
      <g filter="url(#tglow)">
        <path d="M58 92c10-30 38-44 60-38s28-20 50-14 26 32 10 52-44 14-62 24-70 12-58-24z" fill="#0b1830" stroke="url(#tland)" stroke-width="2.2" />
        <path d="M74 90c10-20 30-30 48-26s22-14 38-10 18 22 8 36-32 10-46 16-52 8-48-16z" fill="none" stroke="#4d7fa8" stroke-opacity=".55" stroke-width="1" />
        <path d="M92 88c8-10 20-16 30-14s14-8 24-6" fill="none" stroke="#4d7fa8" stroke-opacity=".4" stroke-width="1" />
        {[[96, 84], [120, 70], [142, 92], [108, 100], [158, 74], [130, 104], [84, 96]].map(([x, y], i) => <circle cx={x} cy={y} r={i % 3 ? 1.8 : 2.6} fill={['#5dffa8', '#2ef2ff', '#a98bff'][i % 3]} />)}
      </g>
      <path d="M22 34c10-14 26-22 44-24" stroke="#bff6ff" stroke-opacity=".25" stroke-width="5" stroke-linecap="round" fill="none" />
    </svg>
  );
}

export function RoomArt({ act }: { act: 1 | 2 | 3; dark?: boolean }) {
  // Nachts im Zimmer: nur das Glas leuchtet — und ein bisschen der Monitor, die LED-Leiste, die Stadt draußen.
  const wall = act === 1 ? '#0e0b1c' : act === 2 ? '#0a0c18' : '#0b0a16';
  const desk = act === 1 ? '#1a1430' : act === 2 ? '#161a2c' : '#1c1a34';
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="rglow" cx="50%" cy="56%" r="45%"><stop offset="0" stop-color="#2ef2ff" stop-opacity=".32" /><stop offset=".5" stop-color="#4d7fa8" stop-opacity=".12" /><stop offset="1" stop-color="#4d7fa8" stop-opacity="0" /></radialGradient>
        <linearGradient id="rled" x1="0" x2="1"><stop offset="0" stop-color="#2ef2ff" /><stop offset=".5" stop-color="#4d7fa8" /><stop offset="1" stop-color="#a98bff" /></linearGradient>
        <linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0a26" /><stop offset="1" stop-color="#2a1240" /></linearGradient>
        <radialGradient id="rsea" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#0d3570" /><stop offset="1" stop-color="#050a1e" /></radialGradient>
        <filter id="rblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <rect width="800" height="500" fill={wall} />
      <rect y="380" width="800" height="120" fill="#07060e" />
      {/* Fenster: Nachtstadt */}
      <g><rect x="520" y="60" width="200" height="170" rx="8" fill="url(#rsky)" stroke="#2a2550" stroke-width="3" />
        {[[540, 80], [600, 92], [690, 74], [650, 110], [560, 120]].map(([x, y]) => <circle cx={x} cy={y} r="1.3" fill="#cfd8ff" opacity=".8" />)}
        <circle cx="690" cy="96" r="12" fill="#e8e4ff" opacity=".85" /><circle cx="695" cy="92" r="11" fill="#141030" />
        <path d="M520 230v-50h22v-24h18v40h20v-60h26v94h24v-36h22v-30h20v52h28v14z" fill="#140f2c" />
        {[[548, 176], [566, 170], [588, 150], [592, 166], [612, 182], [634, 198], [654, 184], [676, 190], [700, 210]].map(([x, y], i) => <rect x={x} y={y} width="4" height="4" fill={i % 3 === 0 ? '#a98bff' : i % 3 === 1 ? '#2ef2ff' : '#ffc54d'} opacity=".75" />)}
        <rect x="615" y="60" width="6" height="170" fill="#2a2550" /><rect x="520" y="142" width="200" height="5" fill="#2a2550" /></g>
      {/* Kalender als leuchtendes Board */}
      <g><rect x="80" y="70" width="120" height="130" rx="8" fill="#081322" stroke="#4d7fa8" stroke-opacity=".5" />
        <rect x="80" y="70" width="120" height="26" rx="8" fill="#a98bff" opacity=".25" />
        {Array.from({ length: 12 }, (_, i) => <rect x={92 + (i % 4) * 26} y={108 + Math.floor(i / 4) * 28} width="18" height="18" rx="3" fill={i === 6 ? '#a98bff' : '#13243a'} opacity={i === 6 ? 0.9 : 1} />)}</g>
      {/* Regal mit LED-Leiste */}
      <g><rect x="250" y="80" width="200" height="10" rx="3" fill={desk} /><rect x="250" y="160" width="200" height="10" rx="3" fill={desk} />
        <rect x="250" y="90" width="200" height="2" fill="url(#rled)" opacity=".9" /><rect x="250" y="88" width="200" height="8" fill="url(#rled)" opacity=".35" filter="url(#rblur)" />
        <rect x="270" y="48" width="22" height="32" rx="4" fill="#ffc54d" opacity=".75" /><rect x="300" y="56" width="18" height="24" rx="4" fill="#3a3560" /><rect x="330" y="40" width="26" height="40" rx="4" fill="#24204a" stroke="#5dffa8" stroke-opacity=".5" /><rect x="370" y="52" width="40" height="28" rx="6" fill="#1c2a50" />
        <rect x="275" y="124" width="60" height="36" rx="6" fill="#1f1a3c" /><rect x="350" y="128" width="40" height="32" rx="6" fill="#2a1a40" /></g>
      {/* Lichtkegel des Glases an Wand und Decke */}
      <ellipse cx="400" cy="270" rx="330" ry="210" fill="url(#rglow)" />
      {/* Schreibtisch */}
      <rect x="120" y="300" width="560" height="22" rx="6" fill={desk} />
      <rect x="120" y="300" width="560" height="2" fill="#2ef2ff" opacity=".35" />
      <rect x="150" y="322" width="18" height="120" fill={desk} /><rect x="632" y="322" width="18" height="120" fill={desk} />
      {/* Lampe (Schreibtischlampe, aus — das Glas hat seine eigene) */}
      <rect x="498" y="292" width="54" height="9" rx="4" fill="#24203c" />
      <path d="M525 294V196L452 140" stroke="#24203c" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M352 158c0-26 22-42 48-42s48 16 48 42z" fill="#1c1838" />
      <rect x="348" y="156" width="104" height="7" rx="3" fill="#2a2550" />
      <ellipse cx="400" cy="166" rx="30" ry="5" fill="#fff4dc" opacity=".9" />
      <path d="M372 166L318 236h164l-54-70z" fill="#ffe7b0" opacity=".07" />
      {/* Glas */}
      <ellipse cx="400" cy="298" rx="140" ry="14" fill="#2ef2ff" opacity=".2" filter="url(#rblur)" />
      <rect x="290" y="236" width="220" height="62" rx="28" fill="url(#rsea)" />
      <path d="M310 262c20-18 60-14 80-4s60-14 90 2c-10 18-60 22-90 18s-70 4-80-16z" fill="#0b1830" stroke="#5dffa8" stroke-width="1.6" />
      {[[340, 262], [372, 258], [410, 266], [446, 260], [468, 268]].map(([x, y], i) => <circle cx={x} cy={y} r="1.8" fill={i % 2 ? '#a98bff' : '#2ef2ff'} />)}
      <rect x="290" y="236" width="220" height="62" rx="28" fill="none" stroke="#2ef2ff" stroke-width="2.5" />
      <rect x="286" y="232" width="228" height="70" rx="32" fill="none" stroke="#2ef2ff" stroke-width="6" opacity=".3" filter="url(#rblur)" />
      {/* Heft & Sparschwein */}
      <rect x="560" y="276" width="70" height="22" rx="3" fill="#101c30" stroke="#4d7fa8" stroke-opacity=".6" transform="rotate(-6 595 288)" />
      <g transform="translate(180 262)"><ellipse cx="30" cy="22" rx="30" ry="20" fill="#1b1830" stroke="#a98bff" stroke-opacity=".7" stroke-width="1.5" /><circle cx="52" cy="16" r="2.5" fill="#a98bff" /><rect x="22" y="2" width="14" height="4" rx="2" fill="#a98bff" opacity=".7" /></g>
      {/* Monitor (ab Akt 2) */}
      {act >= 2 && <g><rect x="580" y="200" width="96" height="78" rx="6" fill="#100e22" stroke="#2a2550" stroke-width="2" /><rect x="588" y="208" width="80" height="56" rx="3" fill="#05121e" />
        <path d="M594 252l12-12 10 6 14-18 16 10 14-8" stroke="#2ef2ff" stroke-width="2" fill="none" /><path d="M594 258l14-4 12 2 16-10 14 4 12-6" stroke="#a98bff" stroke-width="1.5" fill="none" opacity=".8" />
        <rect x="560" y="210" width="140" height="80" fill="#2ef2ff" opacity=".06" filter="url(#rblur)" /></g>}
      {act === 3 && <g><rect x="60" y="250" width="40" height="60" rx="6" fill="#0a1626" stroke="#4d7fa8" stroke-opacity=".6" /><circle cx="80" cy="270" r="6" fill="#5dffa8" opacity=".7" /></g>}
    </svg>
  );
}

/** Prozedurales Artenporträt aus den Eigenschaften */
export function Portrait({ t, seed = 0, unknown = false }: { t: Traits; seed?: number; unknown?: boolean }) {
  const col = unknown ? '#4a4570' : hslCss(t.hue, 0.9, t.land ? 0.55 : 0.6);
  const col2 = unknown ? '#8a84b8' : hslCss(t.hue + 20, 1, t.land ? 0.75 : 0.8);
  const bg = t.land ? (t.role === 0 ? '#0a1414' : '#140c1a') : '#060c1e';
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
      {!t.land && Array.from({ length: 10 }, (_, i) => <circle cx={r(i) * 200} cy={r(i + 20) * 120} r={1 + r(i + 40) * 2} fill="#2ef2ff" opacity=".45" />)}
      {Array.from({ length: 5 }, (_, i) => <path d={`M0 ${i * 24 + 12}H200`} stroke="#4d7fa8" stroke-opacity=".08" />)}
      {t.land && <rect y="98" width="200" height="22" fill={t.role === 0 ? '#0f2420' : '#1e1430'} />}{t.land && <rect y="98" width="200" height="1.5" fill="#5dffa8" opacity=".5" />}
      <g opacity={unknown ? 0.55 : 1} style={unknown ? '' : `filter:drop-shadow(0 0 6px ${col})`}>{body}</g>
      {unknown && <text x="100" y="66" text-anchor="middle" font-size="34" font-weight="800" fill="#fff">?</text>}
    </svg>
  );
}

export function Avatar({ name, hue }: { name: string; hue: number }) {
  const initials = name.split(/\s+/).filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return <div class="avatar" style={`background:${hslCss(hue, 0.45, 0.45)}`}>{initials}</div>;
}
