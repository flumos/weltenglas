// Geländekarte im Fragment-Shader (Konzept 6.5): weiche Küsten, Biomfarben überblendet,
// Hillshading, Meerestiefe, Ansichten tauschen nur die Farbfunktion. WebGL2, Fallback WebGL1-frei.
// Neon-Palette je Biom (Reihenfolge wie BIOMES): warm = Pink/Magenta, kalt = Blau/Violett, Leben = Mint/Grün
export const NEON_BIOMES: [number, number, number][] = [
  [10, 18, 52],    // Tiefsee
  [22, 56, 112],   // Flachmeer
  [30, 200, 210],  // Riff/Algenwiese
  [205, 225, 255], // Eis
  [104, 92, 150],  // Fels
  [255, 110, 150], // Wüste
  [205, 125, 220], // Steppe
  [70, 235, 160],  // Grasland
  [30, 185, 125],  // Wald
  [20, 150, 110],  // Regenwald
  [40, 135, 165],  // Nadelwald
  [140, 160, 215], // Tundra
];
import { SNAP_FIELDS } from '../sim/sim.ts';
import type { Snap } from '../game/simClient.ts';

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D A0, A1, B0, B1, GZ; // A = Höhe/Biom/Produzenten/Tiere, B = T/Boden/N/Licht; 0 = vorher, 1 = jetzt
uniform sampler2D PAL; uniform sampler2D HUE;
uniform vec2 grid; uniform float mixT, sea, mode, time, dark, hasGz, desat;
uniform vec2 sun; uniform float sunI;
uniform vec2 aspect;

vec4 fA(vec2 c){ ivec2 i = ivec2(clamp(c, vec2(0.0), grid - 1.0)); return mix(texelFetch(A0, i, 0), texelFetch(A1, i, 0), mixT); }
vec4 fB(vec2 c){ ivec2 i = ivec2(clamp(c, vec2(0.0), grid - 1.0)); return mix(texelFetch(B0, i, 0), texelFetch(B1, i, 0), mixT); }
float hAt(vec2 g){ // bilineare Höhe
  vec2 f = g - 0.5; vec2 b = floor(f); vec2 t = f - b;
  float h00 = fA(b).r, h10 = fA(b+vec2(1,0)).r, h01 = fA(b+vec2(0,1)).r, h11 = fA(b+vec2(1,1)).r;
  return mix(mix(h00,h10,t.x), mix(h01,h11,t.x), t.y);
}
vec3 biomeCol(float id){ return texture(PAL, vec2((id*255.0 + 0.5)/16.0, 0.5)).rgb; }
vec3 bilinBiome(vec2 g, out float prodS){
  vec2 f = g - 0.5; vec2 b = floor(f); vec2 t = f - b;
  vec4 a00 = fA(b), a10 = fA(b+vec2(1,0)), a01 = fA(b+vec2(0,1)), a11 = fA(b+vec2(1,1));
  vec3 c = mix(mix(biomeCol(a00.g), biomeCol(a10.g), t.x), mix(biomeCol(a01.g), biomeCol(a11.g), t.x), t.y);
  prodS = mix(mix(a00.b,a10.b,t.x), mix(a01.b,a11.b,t.x), t.y);
  return c;
}
vec4 bilinB(vec2 g){
  vec2 f = g - 0.5; vec2 b = floor(f); vec2 t = f - b;
  return mix(mix(fB(b), fB(b+vec2(1,0)), t.x), mix(fB(b+vec2(0,1)), fB(b+vec2(1,1)), t.x), t.y);
}
float bilinGz(vec2 g){
  vec2 f = g - 0.5; vec2 b = floor(f); vec2 t = f - b;
  ivec2 i0 = ivec2(clamp(b, vec2(0.0), grid-1.0)), i1 = ivec2(clamp(b+vec2(1,0), vec2(0.0), grid-1.0)), i2 = ivec2(clamp(b+vec2(0,1), vec2(0.0), grid-1.0)), i3 = ivec2(clamp(b+vec2(1,1), vec2(0.0), grid-1.0));
  return mix(mix(texelFetch(GZ,i0,0).r, texelFetch(GZ,i1,0).r, t.x), mix(texelFetch(GZ,i2,0).r, texelFetch(GZ,i3,0).r, t.x), t.y);
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
vec2 warp(vec2 g){ return g + (vec2(vnoise(g*0.85), vnoise(g*0.85 + 11.3)) - 0.5) * 0.75 + (vec2(vnoise(g*2.3+3.1), vnoise(g*2.3+7.7)) - 0.5) * 0.3; }
vec3 ramp(float t, vec3 a, vec3 b, vec3 c){ return t < 0.5 ? mix(a, b, t*2.0) : mix(b, c, t*2.0-1.0); }
vec3 tempCol(float T){ float t = clamp((T + 6.0) / 42.0, 0.0, 1.0);
  return t < 0.33 ? mix(vec3(0.16,0.32,0.72), vec3(0.45,0.7,0.85), t/0.33) : t < 0.6 ? mix(vec3(0.45,0.7,0.85), vec3(0.96,0.86,0.55), (t-0.33)/0.27) : mix(vec3(0.96,0.86,0.55), vec3(0.85,0.27,0.18), (t-0.6)/0.4); }

void main(){
  // Schalenform: abgerundetes Rechteck mit Rand
  vec2 q = uv;
  vec2 g0 = q * grid;
  vec2 g = warp(g0);
  float h = hAt(g);
  float land = smoothstep(sea - 0.0025, sea + 0.0025, h);
  float depth = max(0.0, sea - h);
  float prod; vec3 bc = bilinBiome(g, prod);
  float prodN = prod;
  vec4 b = bilinB(g);
  float T = b.r * 255.0 / 4.0 - 20.0;
  // Hillshading (Licht von Nordwest)
  float e = 0.75;
  float hx = hAt(g + vec2(e, 0.0)) - hAt(g - vec2(e, 0.0));
  float hy = hAt(g + vec2(0.0, e)) - hAt(g - vec2(0.0, e));
  vec3 n = normalize(vec3(-hx * 22.0, -hy * 22.0, 1.0));
  float shade = clamp(dot(n, normalize(vec3(-0.6, -0.7, 0.75))), 0.0, 1.0);
  // Meer: fast schwarzes Tiefblau, Plankton leuchtet biolumineszent
  vec3 shelf = vec3(0.04, 0.13, 0.30), deep = vec3(0.012, 0.02, 0.07);
  vec3 seaC = mix(shelf, deep, smoothstep(0.0, 0.17, depth));
  float pl = clamp(prod * 3.0, 0.0, 1.0);
  seaC += vec3(0.05, 0.55, 0.65) * pl * 0.55 * (1.0 - 0.5 * smoothstep(0.03, 0.14, depth));
  seaC += vec3(0.25, 0.12, 0.55) * clamp(prod * 2.0, 0.0, 0.6) * smoothstep(0.03, 0.14, depth) * 0.6;
  if (T < -1.0) seaC = mix(seaC, vec3(0.62, 0.78, 1.0), smoothstep(-1.0, -3.0, T) * 0.8);
  // Plankton-Funkeln
  float sp = hash(floor(g * 3.0) + floor(time * 0.7));
  seaC += vec3(0.3, 1.0, 0.95) * step(0.982, sp) * pl * 0.9;
  // Land: Biom-Neonfarben, dunkel schattiert, leuchtet von innen
  vec3 landC = bc * (0.28 + 0.72 * shade) * (0.9 + 0.16 * vnoise(g0 * 4.0));
  float elev = max(0.0, h - sea);
  landC = mix(landC, vec3(0.78, 0.86, 1.0), smoothstep(0.38, 0.5, elev) * smoothstep(4.0, -2.0, T));
  // Höhenlinien in Violett (Labor-Karte)
  float cl = h * 26.0; float cf = fract(cl); float cw = max(fwidth(cl), 1e-4);
  float cline = (1.0 - smoothstep(0.0, cw * 1.2, min(cf, 1.0 - cf))) * land * smoothstep(0.004, 0.03, elev);
  landC += vec3(0.55, 0.38, 1.0) * cline * 0.28;
  vec3 col = mix(seaC, landC, land);
  // Küste: Neon-Cyan-Linie mit Schein ins Wasser
  float dc = abs(h - sea);
  float coastCore = 1.0 - smoothstep(0.0, 0.0045, dc);
  float coastGlow = (1.0 - smoothstep(0.0, 0.03, dc)) * (1.0 - land);
  col += vec3(0.18, 0.9, 1.0) * (coastCore * 0.85 + coastGlow * 0.22);
  // Messraster
  vec2 gr = abs(fract(g0 / 8.0 + 0.5) - 0.5) * 8.0; float gw = fwidth(g0.x);
  float grid1 = (1.0 - smoothstep(0.0, gw * 1.2, min(gr.x, gr.y)));
  col += vec3(0.35, 0.3, 0.9) * grid1 * 0.06;

  // Ansichten (Falschfarben im Neon-Spektrum)
  vec3 ov = col; float ovA = 0.0;
  int m = int(mode + 0.5);
  vec3 C0 = vec3(0.12,0.2,0.85), C1 = vec3(0.18,0.9,1.0), C2 = vec3(0.62,0.48,1.0), C3 = vec3(1.0,0.31,0.85), C4 = vec3(1.0,0.48,0.36);
  if (m == 1) { float t = clamp((T + 6.0) / 42.0, 0.0, 1.0);
    ov = t < 0.25 ? mix(C0, C1, t/0.25) : t < 0.5 ? mix(C1, C2, (t-0.25)/0.25) : t < 0.75 ? mix(C2, C3, (t-0.5)/0.25) : mix(C3, C4, (t-0.75)/0.25); ovA = 0.85; }
  else if (m == 2) { float w = b.g; ov = land > 0.5 ? ramp(w, vec3(0.16,0.08,0.25), vec3(0.42,0.25,0.82), C1) : vec3(0.05,0.08,0.22); ovA = 0.88; }
  else if (m == 3) {
    float hh = h - sea;
    ov = hh < 0.0 ? mix(vec3(0.09,0.23,0.55), vec3(0.02,0.04,0.14), clamp(-hh/0.25,0.0,1.0)) : (hh < 0.3 ? mix(C1, C2, hh/0.3) : mix(C2, mix(C3, vec3(1.0), 0.0), clamp((hh-0.3)/0.3,0.0,1.0)));
    if (hh > 0.5) ov = mix(ov, vec3(1.0), clamp((hh-0.5)/0.15, 0.0, 1.0));
    float fr = fract(h * 20.0); float lw = max(fwidth(h * 20.0), 1e-4);
    float line = 1.0 - smoothstep(0.0, lw * 1.5, min(fr, 1.0 - fr)); ov = mix(ov, vec3(1.0), line * 0.35);
    ovA = 0.9;
  }
  else if (m == 4) { float N = b.b * 255.0 / 60.0; ov = N < 2.5 ? mix(vec3(0.08,0.06,0.16), vec3(0.24,1.0,0.69), N / 2.5) : mix(vec3(0.24,1.0,0.69), C3, clamp((N - 2.5) / 1.2, 0.0, 1.0)); ovA = 0.85; }
  else if (m == 5) {
    vec2 gi = clamp(floor(g), vec2(0.0), grid-1.0);
    vec4 hc = texture(HUE, (gi + 0.5) / grid);
    ov = hc.a > 0.0 ? hc.rgb : vec3(0.06,0.05,0.12); ovA = 0.92;
  }
  else if (m == 6) { float L = b.a; ov = ramp(L, vec3(0.02,0.02,0.05), vec3(0.48,0.36,1.0), vec3(0.91,0.98,1.0)); ovA = 0.88; }
  else if (m == 7 && hasGz > 0.5) { float raw = bilinGz(g) * 255.0; if (raw < 0.5) { ov = vec3(0.1,0.09,0.16); } else { float v = (raw - 1.0) / 254.0; ov = v > 0.5 ? mix(vec3(0.1,0.08,0.19), vec3(0.24,1.0,0.69), (v-0.5)*2.0) : mix(vec3(1.0,0.3,0.48), vec3(0.1,0.08,0.19), v*2.0); } ovA = 0.9; }
  if (ovA > 0.0) {
    float l = dot(col, vec3(0.3,0.59,0.11));
    col = mix(vec3(l) * 0.35, ov * (0.62 + 0.45 * shade), ovA);
    col += vec3(0.18, 0.9, 1.0) * (1.0 - smoothstep(0.0, 0.005, abs(h - sea))) * 0.6;
  }
  // Lampenschein (kühles Weiß mit rosa Rand)
  vec2 dv = (q - sun) * aspect;
  float sg = exp(-dot(dv, dv) / 0.05);
  col += vec3(1.0, 0.82, 0.95) * sg * 0.10 * sunI;
  // Vignette und Glas
  vec2 cc = (q - 0.5) * 2.0;
  float vig = 1.0 - 0.32 * pow(length(cc * vec2(0.9, 1.0)), 2.6);
  col *= vig;
  float gloss = smoothstep(0.6, 0.0, length((q - vec2(0.18, 0.12)) * vec2(1.0, 1.6))) * 0.05;
  col += vec3(0.7, 0.9, 1.0) * gloss;
  // Glasrand-Schimmer
  float edge = smoothstep(0.8, 1.0, max(abs(cc.x), abs(cc.y)));
  col += mix(vec3(0.18,0.9,1.0), vec3(1.0,0.31,0.85), q.x) * edge * 0.05;
  o = vec4(col, 1.0);
}`;

export class MapRenderer {
  gl: WebGL2RenderingContext;
  prog: WebGLProgram;
  tex: Record<string, WebGLTexture> = {};
  w = 0; h = 0;
  a0: Uint8Array; a1: Uint8Array; b0: Uint8Array; b1: Uint8Array; hue: Uint8Array;
  loc: Record<string, WebGLUniformLocation | null> = {};
  curAt = 0; prevAt = 0; lastSnap: Snap | null = null;
  ok = true;

  canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 nicht verfügbar');
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    this.prog = p;
    gl.useProgram(p);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const u of ['A0', 'A1', 'B0', 'B1', 'GZ', 'PAL', 'HUE', 'grid', 'mixT', 'sea', 'mode', 'time', 'dark', 'hasGz', 'sun', 'sunI', 'aspect', 'desat']) this.loc[u] = gl.getUniformLocation(p, u);
    this.a0 = this.a1 = this.b0 = this.b1 = this.hue = new Uint8Array(0);
    // Palette
    const pal = new Uint8Array(16 * 4);
    NEON_BIOMES.forEach((c, i) => { pal[i * 4] = c[0]; pal[i * 4 + 1] = c[1]; pal[i * 4 + 2] = c[2]; pal[i * 4 + 3] = 255; });
    this.tex.PAL = this.mkTex(16, 1, pal, gl.LINEAR);
    this.tex.GZ = this.mkTex(1, 1, new Uint8Array([128, 0, 0, 255]), gl.NEAREST);
  }

  mkTex(w: number, h: number, data: Uint8Array, filter: number) {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  upload(name: string, w: number, h: number, data: Uint8Array, filter?: number) {
    const gl = this.gl;
    if (!this.tex[name] || this.w !== w || this.h !== h) { this.tex[name] = this.mkTex(w, h, data, filter ?? gl.NEAREST); return; }
    gl.bindTexture(gl.TEXTURE_2D, this.tex[name]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  setSnap(cur: Snap, prev: Snap | null) {
    if (this.lastSnap === cur) return;
    const { w, h } = cur.meta; const n = w * h;
    const pack = (s: Snap, a: Uint8Array, b: Uint8Array) => {
      const buf = s.buf;
      for (let c = 0; c < n; c++) {
        const o = c * SNAP_FIELDS, i = c * 4;
        a[i] = buf[o]; a[i + 1] = buf[o + 1]; a[i + 2] = buf[o + 2]; a[i + 3] = buf[o + 3];
        b[i] = buf[o + 4]; b[i + 1] = buf[o + 5]; b[i + 2] = buf[o + 6]; b[i + 3] = buf[o + 9];
      }
    };
    const sizeChanged = this.w !== w || this.h !== h;
    if (sizeChanged || this.a1.length !== n * 4) { this.a0 = new Uint8Array(n * 4); this.a1 = new Uint8Array(n * 4); this.b0 = new Uint8Array(n * 4); this.b1 = new Uint8Array(n * 4); this.hue = new Uint8Array(n * 4); }
    if (prev && prev.meta.w === w) pack(prev, this.a0, this.b0); else pack(cur, this.a0, this.b0);
    pack(cur, this.a1, this.b1);
    // Arten-Farben je Zelle (dominanter Produzent, sonst Tier)
    const st = cur.meta.strains;
    for (let c = 0; c < n; c++) {
      const o = c * SNAP_FIELDS, i = c * 4;
      let s = cur.buf[o + 8] !== 255 && cur.buf[o + 3] > 30 ? cur.buf[o + 8] : cur.buf[o + 7];
      const info = s !== 255 ? st[s] : null;
      if (info && cur.buf[o + 2] + cur.buf[o + 3] > 8) {
        const [r, g, b] = hsl(info.hue, 0.9, info.land ? 0.55 : 0.62);
        this.hue[i] = r; this.hue[i + 1] = g; this.hue[i + 2] = b; this.hue[i + 3] = 255;
      } else { this.hue[i] = this.hue[i + 1] = this.hue[i + 2] = 0; this.hue[i + 3] = 0; }
    }
    this.upload('A0', w, h, this.a0); this.upload('A1', w, h, this.a1);
    this.upload('B0', w, h, this.b0); this.upload('B1', w, h, this.b1);
    this.upload('HUE', w, h, this.hue);
    if (cur.gz) {
      const g = new Uint8Array(n * 4); for (let c = 0; c < n; c++) { g[c * 4] = cur.gz[c]; g[c * 4 + 3] = 255; }
      this.upload('GZ', w, h, g);
    }
    this.w = w; this.h = h;
    this.prevAt = this.curAt; this.curAt = performance.now();
    this.lastSnap = cur;
  }

  draw(opts: { mode: number; tickMs: number; sea: number; sunX: number; sunY: number; sunI: number; hasGz: boolean }) {
    const gl = this.gl;
    const c = this.canvas;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.prog);
    const units: [string, number][] = [['A0', 0], ['A1', 1], ['B0', 2], ['B1', 3], ['GZ', 4], ['PAL', 5], ['HUE', 6]];
    for (const [name, u] of units) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, this.tex[name] ?? this.tex.PAL); gl.uniform1i(this.loc[name], u); }
    const t = opts.tickMs > 0 ? Math.min(1, (performance.now() - this.curAt) / Math.min(4000, opts.tickMs)) : 1;
    gl.uniform2f(this.loc.grid, this.w || 1, this.h || 1);
    gl.uniform1f(this.loc.mixT, t);
    gl.uniform1f(this.loc.sea, opts.sea);
    gl.uniform1f(this.loc.mode, opts.mode);
    gl.uniform1f(this.loc.time, performance.now() / 1000);
    gl.uniform1f(this.loc.hasGz, opts.hasGz ? 1 : 0);
    gl.uniform2f(this.loc.sun, opts.sunX, opts.sunY);
    gl.uniform1f(this.loc.sunI, opts.sunI);
    gl.uniform2f(this.loc.aspect, 1, (this.h || 1) / (this.w || 1));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export function hsl(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360;
  const f = (n: number) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
export const hslCss = (h: number, s = 0.55, l = 0.5) => { const [r, g, b] = hsl(h, s, l); return `rgb(${r},${g},${b})`; };
