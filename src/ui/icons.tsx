// Liniensymbole (24×24, Strich), selbst gezeichnet im Lucide-Stil.
const P: Record<string, string> = {
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  volcano: 'M3 20l6-10h6l6 10zM10 10l1-4M14 10l-1-4M12 6V3M9 4l1 2M15 4l-1 2',
  mountain: 'M3 20l6.5-11 4 6 2.5-4L21 20zM9.5 9l1.5 2.5',
  salt: 'M8 9h8l-1 11H9zM9 9V7a3 3 0 0 1 6 0v2M11 13h.01M13 16h.01M11 17h.01',
  pipette: 'M19 5a2 2 0 0 0-3-1l-2 2-1-1-2 2 1 1-7 7v3h3l7-7 1 1 2-2-1-1 2-2a2 2 0 0 0 0-2z',
  net: 'M4 4l7 7M11 11a5 5 0 1 0 7-1l-3-3a5 5 0 0 0-4 4zM13 9l4 4M12 12l4 4',
  uv: 'M13 2L4 14h7l-1 8 9-12h-7z',
  lens: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M21 21l-5-5',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4l13 8-13 8z',
  home: 'M3 11l9-8 9 8M5 9v11h14V9M10 20v-6h4v6',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M12 14h2',
  store: 'M4 9l1.5-5h13L20 9M4 9h16v11H4zM4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5',
  gear: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  thermo: 'M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0zM12 10v6',
  rain: 'M7 15a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 6.5a3.5 3.5 0 0 1 .5 7M8 18l-1 3M12 17l-1 3M16 18l-1 3',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7 15h10',
  chart: 'M4 4v16h16M7 15l4-5 3 3 5-6',
  gauge: 'M12 14l4-4M4.5 18a9 9 0 1 1 15 0M12 14a1.5 1.5 0 1 0 0 .01',
  micro: 'M6 18h12M8 22h8M12 18v4M9 14l2-2M14 3l3 3-6 6-3-3zM17 6a6 6 0 0 1 1 9',
  tree: 'M6 3v12M18 9a3 3 0 1 0 0-6a3 3 0 1 0 0 6M6 21a3 3 0 1 0 0-6a3 3 0 1 0 0 6M18 9a9 9 0 0 1-9 9',
  podium: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3',
  scope: 'M3 14l14-6 2 4-14 6zM10 15l-2 6M12 14l3 7M17 8l1-2 3 1-1 3',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
  shovel: 'M4 20l7-7M9 11l4 4M14 3l7 7-4 4-7-7z',
  dots: 'M7 12h.01M12 12h.01M17 12h.01M9.5 8h.01M14.5 8h.01M9.5 16h.01M14.5 16h.01',
  snow: 'M12 2v20M4 6l16 12M20 6L4 18M9 3l3 2 3-2M9 21l3-2 3 2',
  heat: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  lid: 'M4 15h16M6 15a6 6 0 0 1 12 0M12 9V7M10 7h4M3 19h18',
  seed: 'M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 15c0-3-2-5-6-5 0 3 2 5 6 5z',
  pond: 'M3 15c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 19c3 0 3-2 6-2s3 2 6 2 3-2 6-2M9 9a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  glass: 'M4 9c0-2 3.6-3 8-3s8 1 8 3v6c0 3-3.6 5-8 5s-8-2-8-5zM4 9c0 2 3.6 3 8 3s8-1 8-3',
  cold: 'M12 2v20M17 7l-5 5-5-5M17 17l-5-5-5 5M2 12h20',
  fast: 'M4 5l8 7-8 7zM12 5l8 7-8 7z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  x: 'M6 6l12 12M18 6L6 18',
  chevR: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6', chevD: 'M6 9l6 6 6-6', chevU: 'M6 15l6-6 6 6',
  up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6', upr: 'M7 17L17 7M8 7h9v9', dnr: 'M7 7l10 10M17 8v9H8', right: 'M5 12h14M13 6l6 6-6 6',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v5M12 8h.01',
  warn: 'M12 3l10 18H2zM12 10v4M12 17h.01',
  check: 'M5 12l5 5 9-10',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16', upload: 'M12 20V9M7 14l5-5 5 5M4 4h16',
  sparkle: 'M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  leaf: 'M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7',
  bug: 'M9 7a3 3 0 0 1 6 0M8 9h8v6a4 4 0 0 1-8 0zM4 12h4M16 12h4M5 7l3 2M19 7l-3 2M5 18l3-2M19 18l-3-2',
  fish: 'M3 12c4-6 11-6 15 0-4 6-11 6-15 0zM18 12l3-3v6zM8 11h.01',
  paw: 'M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 13c-3 0-5 3-5 5s2 3 5 3 5-1 5-3-2-5-5-5z',
  house: 'M4 20V10l8-6 8 6v10zM10 20v-5h4v5',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  volume: 'M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3',
  dna: 'M7 3c0 6 10 6 10 12M17 3c0 6-10 6-10 12M7 21c0-2 1-3 2-4M17 21c0-2-1-3-2-4M9 7h6M8 11h8',
  door: 'M5 21V3h11l3 2v16M12 12h.01M3 21h18',
  pig: 'M5 11a7 6 0 0 1 13-2l2-1v4l-1 1v3a2 2 0 0 1-2 2h-1v2h-2v-2H9v2H7v-3a6 6 0 0 1-2-4zM14 10h.01',
};

export function Icon({ name, size = 22, stroke = 1.8, class: cls = '' }: { name: string; size?: number; stroke?: number; class?: string }) {
  const d = P[name] ?? P.info;
  return (
    <svg class={`icon ${cls}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Stars({ n, unknown = false, size = 16 }: { n: number; unknown?: boolean; size?: number }) {
  if (unknown) return <span class="stars unknown">? ? ?</span>;
  return (
    <span class="stars" aria-label={`${n} von 3 Sternen`}>
      {[0, 1, 2].map(i => (
        <svg width={size} height={size} viewBox="0 0 24 24" class={i < n ? 'on' : 'off'}><path d={P.star} fill={i < n ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
      ))}
    </span>
  );
}
