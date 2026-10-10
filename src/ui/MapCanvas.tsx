// Glas-Renderer: WebGL-Geländekarte + 2D-Ebene für Leben, Sonne, Wind, Vulkane, Siedlungen.
import { useEffect, useRef } from 'preact/hooks';
import { MapRenderer, hslCss } from './renderer.ts';
import * as sim from '../game/simClient.ts';
import * as S from '../game/state.ts';
import { SNAP_FIELDS } from '../sim/sim.ts';
import { WIND_DIRS } from '../sim/climate.ts';

export const MODES: Record<string, number> = { biome: 0, temp: 1, rain: 2, height: 3, nutr: 4, species: 5, light: 6, zone: 7 };

interface Particle { x: number; y: number; tx: number; ty: number; hue: number; land: boolean; pred: boolean; animal: boolean; life: number; size: number; col: string }

export interface MapProps {
  onPointer?: (x: number, y: number, phase: 'down' | 'move' | 'up' | 'hover', e?: PointerEvent) => void;
  showSunHandle?: boolean; showWind?: boolean; brush?: number; small?: boolean; onLeave?: () => void;
  /** Lampe als kleinen Ring zeigen (auch ohne Sonnen-Werkzeug) */
  showSun?: boolean;
  /** Prüfpunkt unter dem Zeiger */
  showMarker?: boolean;
  /** Handy: Welt um 90° im Uhrzeigersinn gedreht dargestellt (CSS), Zeiger entsprechend umrechnen */
  rot?: boolean;
}

let photoRefs: { gl: HTMLCanvasElement | null; fx: HTMLCanvasElement | null } = { gl: null, fx: null };
export function takePhoto(label: string) {
  const { gl, fx } = photoRefs; if (!gl || !fx) return;
  const c = document.createElement('canvas'); c.width = gl.width; c.height = gl.height + Math.round(gl.height * 0.08);
  const x = c.getContext('2d')!;
  x.fillStyle = '#06050c'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(gl, 0, 0); x.drawImage(fx, 0, 0, gl.width, gl.height);
  x.fillStyle = '#2ee6ff'; x.font = `500 ${Math.round(gl.height * 0.032)}px 'JetBrains Mono', ui-monospace, monospace`;
  x.fillText(label, Math.round(gl.width * 0.02), gl.height + Math.round(gl.height * 0.055));
  const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `weltenglas-${Date.now()}.png`; a.click();
}

export function MapCanvas({ onPointer, showSunHandle, showWind, brush = 0, small, onLeave, showSun, showMarker, rot }: MapProps) {
  const glRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const hover = useRef<{ x: number; y: number } | null>(null);
  const rotRef = useRef(!!rot); rotRef.current = !!rot;
  const propsRef = useRef({ onPointer, showSunHandle, showWind, brush, showSun, showMarker });
  propsRef.current = { onPointer, showSunHandle, showWind, brush, showSun, showMarker };

  useEffect(() => {
    let r: MapRenderer | null = null;
    if (!small) photoRefs = { gl: glRef.current, fx: fxRef.current };
    try { r = new MapRenderer(glRef.current!); } catch (e) { console.error(e); }
    const fx = fxRef.current!, ctx = fx.getContext('2d')!;
    let raf = 0, lastGl = 0;
    const parts: Particle[] = [];
    let partSnap: unknown = null;
    const streaks = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), l: Math.random() }));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || S.career.value?.settings.reduced;

    const respawn = () => {
      const s = sim.snapCur; if (!s) return;
      const { w, h, strains } = s.meta; const n = w * h; const buf = s.buf;
      let total = 0; const cum = new Float32Array(n);
      for (let c = 0; c < n; c++) { total += buf[c * SNAP_FIELDS + 3]; cum[c] = total; }
      const want = Math.min(small ? 120 : 420, Math.round(total / 140));
      parts.length = Math.min(parts.length, want);
      const place = (p: Particle) => {
        const v = Math.random() * total; let lo = 0, hi = n - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < v) lo = mid + 1; else hi = mid; }
        const c = lo, slot = buf[c * SNAP_FIELDS + 8], st = slot !== 255 ? strains[slot] : null;
        p.x = p.tx = (c % w) + Math.random(); p.y = p.ty = Math.floor(c / w) + Math.random();
        p.hue = st ? st.hue : 30; p.land = !!st?.land; p.pred = st?.role === 2; p.animal = !!st && st.role > 0; p.size = 1 + (st ? st.z * 1.6 : 0); p.life = 200 + Math.random() * 400; p.col = hslCss(p.hue, 0.85, 0.64);
      };
      for (const p of parts) if (Math.random() < 0.35) place(p);
      while (parts.length < want && total > 0) { const p = { x: 0, y: 0, tx: 0, ty: 0, hue: 0, land: false, pred: false, animal: false, life: 0, size: 1, col: '#fff' }; place(p); parts.push(p); }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const cur = sim.snapCur;
      if (!cur) return;
      const tickMs = S.paused.value ? 0 : 1000 / (S.SPEEDS[S.speed.value]?.tps || 1);
      if (r) {
        r.setSnap(cur, sim.snapPrev);
        const mixing = tickMs > 0 && now - r.curAt < Math.min(4000, tickMs);
        if ((mixing && now - lastGl > 32) || now - lastGl > 120) {
          const m = cur.meta;
          r.draw({ mode: MODES[S.overlay.value] ?? 0, tickMs, sea: m.sea, sunX: m.ctl.lampX, sunY: m.ctl.lampY, sunI: m.ctl.lamp, hasGz: !!cur.gz });
          lastGl = now;
        }
      }
      // 2D-Ebene
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.round(fx.clientWidth * dpr), H = Math.round(fx.clientHeight * dpr);
      if (fx.width !== W || fx.height !== H) { fx.width = W; fx.height = H; }
      ctx.clearRect(0, 0, W, H);
      const { w, h } = cur.meta; const sx = W / w, sy = H / h;
      if (partSnap !== cur) { partSnap = cur; respawn(); }
      // Leben: kleine klare Punkte (Plankton/Pflanzen als Quadrate, Tiere als Kreise), kein Leuchten
      const big = S.overlay.value === 'species';
      const unit = Math.max(0.8, Math.min(W, H) / 380) * (small ? 0.8 : 1);
      for (const p of parts) {
        if (!reduced) {
          if (Math.abs(p.x - p.tx) + Math.abs(p.y - p.ty) < 0.05) { p.tx = Math.floor(p.x) + Math.random(); p.ty = Math.floor(p.y) + Math.random(); }
          const sp = p.land ? 0.012 : 0.02;
          p.x += (p.tx - p.x) * sp * (p.pred ? 2 : 1); p.y += (p.ty - p.y) * sp * (p.pred ? 2 : 1);
        }
        const X = p.x * sx, Y = p.y * sy;
        ctx.fillStyle = p.col;
        if (p.animal) {
          const R = (1.2 + p.size * 0.5) * unit * (big ? 1.6 : 1);
          ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(X, Y, R, 0, 6.283); ctx.fill();
        } else {
          const R = (p.land ? 1.4 : 1.1) * unit * (big ? 1.6 : 1);
          ctx.globalAlpha = p.land ? 0.7 : 0.6; ctx.fillRect(X - R / 2, Y - R / 2, R, R);
        }
      }
      ctx.globalAlpha = 1;
      const m = cur.meta;
      // Vulkane: dünne Dreiecke
      for (const hs of m.hotspots) {
        const X = hs.x * sx, Y = hs.y * sy, k = (small ? 3.5 : 5) * dpr;
        ctx.save(); if (rotRef.current) { ctx.translate(X, Y); ctx.rotate(-Math.PI / 2); ctx.translate(-X, -Y); }
        ctx.strokeStyle = 'rgba(255,140,90,.9)'; ctx.lineWidth = 1.3 * dpr;
        ctx.beginPath(); ctx.moveTo(X, Y - k); ctx.lineTo(X + k, Y + k * 0.8); ctx.lineTo(X - k, Y + k * 0.8); ctx.closePath(); ctx.stroke();
        ctx.restore();
      }
      // Siedlungen
      for (const st of m.settlements) {
        const X = st.x * sx, Y = st.y * sy, k = 5 * dpr;
        ctx.save(); if (rotRef.current) { ctx.translate(X, Y); ctx.rotate(-Math.PI / 2); ctx.translate(-X, -Y); }
        ctx.fillStyle = 'rgba(3,6,12,.85)'; ctx.strokeStyle = '#ffc54d'; ctx.lineWidth = 1.2 * dpr;
        const n = Math.min(5, 1 + Math.floor(Math.sqrt(st.pop) / 6));
        for (let i = 0; i < n; i++) {
          const ox = X + (i - (n - 1) / 2) * k * 1.2, oy = Y + (i % 2) * k * 0.4;
          ctx.beginPath(); ctx.moveTo(ox - k / 2, oy); ctx.lineTo(ox - k / 2, oy - k * 0.6); ctx.lineTo(ox, oy - k * 1.1); ctx.lineTo(ox + k / 2, oy - k * 0.6); ctx.lineTo(ox + k / 2, oy); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        if (st.temple) { ctx.fillStyle = '#a98bff'; ctx.beginPath(); ctx.arc(X, Y - k * 1.9, k * 0.35, 0, 6.283); ctx.fill(); }
        if (!small) {
          ctx.font = `500 ${10 * dpr}px 'JetBrains Mono', ui-monospace, monospace`; ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(3,6,12,.82)'; const tw = ctx.measureText(st.name).width + 10 * dpr;
          ctx.beginPath(); ctx.roundRect(X - tw / 2, Y + k * 0.7, tw, 15 * dpr, 4 * dpr); ctx.fill();
          ctx.strokeStyle = 'rgba(255,197,77,.45)'; ctx.lineWidth = 1 * dpr; ctx.stroke();
          ctx.fillStyle = '#ffe2a0'; ctx.fillText(st.name, X, Y + k * 0.7 + 11 * dpr);
          if (st.sawFace) { ctx.strokeStyle = '#a98bff'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(X, Y - k * 0.4, k * 2.4, 0, 6.283); ctx.stroke(); }
        }
        ctx.restore();
      }
      // Wind: feine Schlieren (deutlicher in der Regen-Ansicht)
      const pr = propsRef.current;
      if ((m.ctl.windOn || pr.showWind) && !small) {
        const [dx, dy] = m.ctl.windOn ? WIND_DIRS[m.ctl.wind] : WIND_DIRS[0];
        const len = Math.hypot(dx, dy) || 1; const ux = dx / len, uy = dy / len;
        const str = m.ctl.windOn ? 0.5 + m.ctl.windStr : 0.4;
        ctx.strokeStyle = `rgba(200,250,255,${pr.showWind ? 0.16 : 0.06})`; ctx.lineWidth = 1 * dpr;
        for (let i = 0; i < streaks.length; i++) {
          const s = streaks[i];
          if (!reduced) { s.x += ux * 0.0009 * str * (S.paused.value ? 0.3 : 1); s.y += uy * 0.0013 * str * (S.paused.value ? 0.3 : 1); }
          s.x = (s.x + 1) % 1; s.y = (s.y + 1) % 1;
          const X = s.x * W, Y = s.y * H, L = (10 + s.l * 16) * dpr * str;
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - ux * L, Y - uy * L); ctx.stroke();
        }
      }
      // Lampe: kleiner gelber Ring; mit Sonnen-Werkzeug etwas kräftiger
      if (pr.showSun || pr.showSunHandle) {
        const X = m.ctl.lampX * W, Y = m.ctl.lampY * H, k = (pr.showSunHandle ? 12 : 10) * dpr;
        ctx.strokeStyle = `rgba(255,197,77,${pr.showSunHandle ? 0.95 : 0.7})`; ctx.lineWidth = (pr.showSunHandle ? 1.6 : 1.1) * dpr;
        ctx.beginPath(); ctx.arc(X, Y, k, 0, 6.283); ctx.stroke();
        ctx.fillStyle = 'rgba(255,197,77,.85)'; ctx.beginPath(); ctx.arc(X, Y, 2.6 * dpr, 0, 6.283); ctx.fill();
      }
      // Nordmarke an der oberen Weltkante (am Handy wegen der Drehung rechts)
      if (!small) {
        ctx.save(); ctx.translate(W / 2, 14 * dpr); if (rotRef.current) ctx.rotate(-Math.PI / 2);
        ctx.font = `600 ${10 * dpr}px 'JetBrains Mono', ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(127,147,173,.75)'; ctx.fillText('N', 0, 0); ctx.restore();
      }
      // Prüfpunkt
      if (pr.showMarker && hover.current && !pr.brush) {
        const X = hover.current.x * sx, Y = hover.current.y * sy;
        ctx.strokeStyle = 'rgba(230,243,255,.9)'; ctx.lineWidth = 1.3 * dpr;
        ctx.beginPath(); ctx.arc(X, Y, 7 * dpr, 0, 6.283); ctx.stroke();
        ctx.fillStyle = 'rgba(230,243,255,.9)'; ctx.beginPath(); ctx.arc(X, Y, 1.3 * dpr, 0, 6.283); ctx.fill();
      }
      // Puls: „Zeig mir“
      const pg = S.ping.value;
      if (pg && now - pg.at < 4000) {
        const k = (now - pg.at) / 1000;
        for (let i = 0; i < 3; i++) {
          const ph = (k * 1.2 + i / 3) % 1;
          ctx.strokeStyle = `rgba(46,242,255,${(1 - ph) * 0.9})`; ctx.lineWidth = 1.6 * dpr;
          ctx.beginPath(); ctx.arc(pg.x * sx, pg.y * sy, (6 + ph * 40) * dpr, 0, 6.283); ctx.stroke();
        }
      }
      // Pinsel
      if (pr.brush > 0 && hover.current) {
        ctx.strokeStyle = 'rgba(46,242,255,.8)'; ctx.setLineDash([4 * dpr, 4 * dpr]); ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath(); ctx.ellipse(hover.current.x * sx, hover.current.y * sy, pr.brush * sx, pr.brush * sy, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toGrid = (e: PointerEvent) => {
    const el = fxRef.current!, rc = el.getBoundingClientRect();
    const m = sim.snapCur?.meta; const w = m?.w ?? 96, h = m?.h ?? 64;
    // gedreht (Handy): Welt-x läuft nach unten, Welt-y von rechts nach links
    if (rotRef.current) return { x: ((e.clientY - rc.top) / rc.height) * w, y: ((rc.right - e.clientX) / rc.width) * h };
    return { x: ((e.clientX - rc.left) / rc.width) * w, y: ((e.clientY - rc.top) / rc.height) * h };
  };
  const down = useRef(false);
  return (
    <>
      <canvas ref={glRef} />
      <canvas ref={fxRef} class="fx2"
        onPointerDown={(e) => { if (!onPointer) return; (e.target as Element).setPointerCapture(e.pointerId); down.current = true; const g = toGrid(e); hover.current = g; propsRef.current.onPointer?.(g.x, g.y, 'down', e); }}
        onPointerMove={(e) => { const g = toGrid(e); hover.current = g; propsRef.current.onPointer?.(g.x, g.y, down.current ? 'move' : 'hover', e); }}
        onPointerUp={(e) => { if (!down.current) return; down.current = false; const g = toGrid(e); propsRef.current.onPointer?.(g.x, g.y, 'up', e); }}
        onPointerLeave={() => { hover.current = null; onLeave?.(); }}
      />
    </>
  );
}
