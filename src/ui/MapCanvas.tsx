// Glas-Renderer: WebGL-Geländekarte + 2D-Ebene für Leben, Sonne, Wind, Vulkane, Siedlungen.
import { useEffect, useRef } from 'preact/hooks';
import { MapRenderer, hslCss } from './renderer.ts';
import * as sim from '../game/simClient.ts';
import * as S from '../game/state.ts';
import { SNAP_FIELDS } from '../sim/sim.ts';
import { WIND_DIRS } from '../sim/climate.ts';

export const MODES: Record<string, number> = { biome: 0, temp: 1, rain: 2, height: 3, nutr: 4, species: 5, light: 6, zone: 7 };

interface Particle { x: number; y: number; tx: number; ty: number; hue: number; land: boolean; pred: boolean; life: number; size: number }

export interface MapProps {
  onPointer?: (x: number, y: number, phase: 'down' | 'move' | 'up' | 'hover') => void;
  showSunHandle?: boolean; showWind?: boolean; brush?: number; small?: boolean; onLeave?: () => void;
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

export function MapCanvas({ onPointer, showSunHandle, showWind, brush = 0, small, onLeave }: MapProps) {
  const glRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const hover = useRef<{ x: number; y: number } | null>(null);
  const propsRef = useRef({ onPointer, showSunHandle, showWind, brush });
  propsRef.current = { onPointer, showSunHandle, showWind, brush };

  useEffect(() => {
    let r: MapRenderer | null = null;
    if (!small) photoRefs = { gl: glRef.current, fx: fxRef.current };
    try { r = new MapRenderer(glRef.current!); } catch (e) { console.error(e); }
    const fx = fxRef.current!, ctx = fx.getContext('2d')!;
    let raf = 0, lastGl = 0;
    const parts: Particle[] = [];
    let partSnap: unknown = null;
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
        p.hue = st ? st.hue : 30; p.land = !!st?.land; p.pred = st?.role === 2; p.size = 1 + (st ? st.z * 1.6 : 0); p.life = 200 + Math.random() * 400;
      };
      for (const p of parts) if (Math.random() < 0.35) place(p);
      while (parts.length < want && total > 0) { const p = { x: 0, y: 0, tx: 0, ty: 0, hue: 0, land: false, pred: false, life: 0, size: 1 }; place(p); parts.push(p); }
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
      // Tiere: Leuchtpunkte, additiv geblendet
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        if (!reduced) {
          if (Math.abs(p.x - p.tx) + Math.abs(p.y - p.ty) < 0.05) { p.tx = Math.floor(p.x) + Math.random(); p.ty = Math.floor(p.y) + Math.random(); }
          const sp = p.land ? 0.012 : 0.02;
          p.x += (p.tx - p.x) * sp * (p.pred ? 2 : 1); p.y += (p.ty - p.y) * sp * (p.pred ? 2 : 1);
        }
        const X = p.x * sx, Y = p.y * sy, R = (p.size + (small ? 0 : 0.6)) * dpr * (p.land ? 1 : 0.85);
        const c = hslCss(p.hue, 1, p.pred ? 0.62 : 0.6);
        ctx.globalAlpha = 0.22; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X, Y, R * 2.6, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(X, Y, R, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, R * 0.38, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const m = cur.meta;
      // Vulkane
      for (const hs of m.hotspots) {
        const X = hs.x * sx, Y = hs.y * sy, k = (small ? 4 : 7) * dpr;
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, k * 2.4);
        const pulse = 0.75 + 0.25 * Math.sin(now / 420 + hs.x);
        g.addColorStop(0, `rgba(255,90,120,${0.55 * pulse})`); g.addColorStop(1, 'rgba(255,79,216,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, k * 2.4, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(20,8,24,.85)'; ctx.strokeStyle = '#ff6a8a'; ctx.lineWidth = 1.5 * dpr; ctx.shadowColor = '#ff4f8a'; ctx.shadowBlur = 8 * dpr;
        ctx.beginPath(); ctx.moveTo(X - k, Y + k * 0.6); ctx.lineTo(X - k * 0.3, Y - k * 0.6); ctx.lineTo(X + k * 0.3, Y - k * 0.6); ctx.lineTo(X + k, Y + k * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffb08a'; ctx.beginPath(); ctx.arc(X, Y - k * 0.6, k * 0.28, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      }
      // Siedlungen
      for (const st of m.settlements) {
        const X = st.x * sx, Y = st.y * sy, k = 6 * dpr;
        ctx.fillStyle = 'rgba(10,8,24,.85)'; ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 1.4 * dpr; ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = 6 * dpr;
        const n = Math.min(5, 1 + Math.floor(Math.sqrt(st.pop) / 6));
        for (let i = 0; i < n; i++) {
          const ox = X + (i - (n - 1) / 2) * k * 1.2, oy = Y + (i % 2) * k * 0.4;
          ctx.beginPath(); ctx.moveTo(ox - k / 2, oy); ctx.lineTo(ox - k / 2, oy - k * 0.6); ctx.lineTo(ox, oy - k * 1.1); ctx.lineTo(ox + k / 2, oy - k * 0.6); ctx.lineTo(ox + k / 2, oy); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        if (st.temple) { ctx.fillStyle = '#ff4fd8'; ctx.beginPath(); ctx.arc(X, Y - k * 1.9, k * 0.35, 0, 6.283); ctx.fill(); }
        if (!small) {
          ctx.font = `500 ${10.5 * dpr}px 'JetBrains Mono', ui-monospace, monospace`; ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(6,5,12,.8)'; const tw = ctx.measureText(st.name).width + 10 * dpr;
          ctx.beginPath(); ctx.roundRect(X - tw / 2, Y + k * 0.7, tw, 16 * dpr, 4 * dpr); ctx.fill();
          ctx.strokeStyle = 'rgba(255,216,77,.6)'; ctx.lineWidth = 1 * dpr; ctx.stroke();
          ctx.fillStyle = '#ffe9a0'; ctx.fillText(st.name, X, Y + k * 0.7 + 12 * dpr);
          if (st.sawFace) { ctx.strokeStyle = '#ff4fd8'; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(X, Y - k * 0.4, k * 2.4, 0, 6.283); ctx.stroke(); }
        }
      }
      // Wind
      const pr = propsRef.current;
      if (pr.showWind) {
        const [dx, dy] = m.ctl.windOn ? WIND_DIRS[m.ctl.wind] : WIND_DIRS[0];
        const len = Math.hypot(dx, dy); const ux = dx / len, uy = dy / len;
        const t = (now / 1000) % 1;
        ctx.strokeStyle = 'rgba(46,230,255,.55)'; ctx.lineWidth = 1.6 * dpr; ctx.lineCap = 'round'; ctx.shadowColor = '#2ee6ff'; ctx.shadowBlur = 6 * dpr;
        for (let gy = 0.5; gy < 6; gy++) for (let gx = 0.5; gx < 9; gx++) {
          const X = (gx / 9) * W + ux * t * 30 * dpr, Y = (gy / 6) * H + uy * t * 30 * dpr;
          ctx.beginPath(); ctx.moveTo(X - ux * 12 * dpr, Y - uy * 12 * dpr); ctx.lineTo(X + ux * 12 * dpr, Y + uy * 12 * dpr);
          ctx.lineTo(X + ux * 6 * dpr - uy * 5 * dpr, Y + uy * 6 * dpr + ux * 5 * dpr); ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
      // Sonnengriff
      if (pr.showSunHandle) {
        const X = m.ctl.lampX * W, Y = m.ctl.lampY * H, k = 18 * dpr;
        ctx.strokeStyle = '#ff4fd8'; ctx.fillStyle = 'rgba(255,240,250,.95)'; ctx.lineWidth = 2.2 * dpr; ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = 14 * dpr;
        ctx.beginPath(); ctx.arc(X, Y, k * 0.55, 0, 6.283); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i * 0.785; ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * k * 0.8, Y + Math.sin(a) * k * 0.8); ctx.lineTo(X + Math.cos(a) * k * 1.15, Y + Math.sin(a) * k * 1.15); ctx.stroke(); }
        ctx.shadowBlur = 0;
      }
      // Puls: „Zeig mir“
      const pg = S.ping.value;
      if (pg && now - pg.at < 4000) {
        const k = (now - pg.at) / 1000;
        for (let i = 0; i < 3; i++) {
          const ph = (k * 1.2 + i / 3) % 1;
          ctx.strokeStyle = `rgba(255,79,216,${(1 - ph) * 0.95})`; ctx.lineWidth = 2.5 * dpr;
          ctx.beginPath(); ctx.arc(pg.x * sx, pg.y * sy, (6 + ph * 40) * dpr, 0, 6.283); ctx.stroke();
        }
      }
      // Pinsel
      if (pr.brush > 0 && hover.current) {
        ctx.strokeStyle = 'rgba(46,230,255,.9)'; ctx.setLineDash([5 * dpr, 4 * dpr]); ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath(); ctx.ellipse(hover.current.x * sx, hover.current.y * sy, pr.brush * sx, pr.brush * sy, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toGrid = (e: PointerEvent) => {
    const el = fxRef.current!, rc = el.getBoundingClientRect();
    const m = sim.snapCur?.meta; const w = m?.w ?? 96, h = m?.h ?? 64;
    return { x: ((e.clientX - rc.left) / rc.width) * w, y: ((e.clientY - rc.top) / rc.height) * h };
  };
  const down = useRef(false);
  return (
    <>
      <canvas ref={glRef} />
      <canvas ref={fxRef} class="fx2"
        onPointerDown={(e) => { if (!onPointer) return; (e.target as Element).setPointerCapture(e.pointerId); down.current = true; const g = toGrid(e); hover.current = g; propsRef.current.onPointer?.(g.x, g.y, 'down'); }}
        onPointerMove={(e) => { const g = toGrid(e); hover.current = g; propsRef.current.onPointer?.(g.x, g.y, down.current ? 'move' : 'hover'); }}
        onPointerUp={(e) => { if (!down.current) return; down.current = false; const g = toGrid(e); propsRef.current.onPointer?.(g.x, g.y, 'up'); }}
        onPointerLeave={() => { hover.current = null; onLeave?.(); }}
      />
    </>
  );
}
