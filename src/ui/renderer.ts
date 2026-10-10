// Geländekarte im Fragment-Shader (Konzept 6.5): weiche Küsten, Biomfarben überblendet,
// Hillshading, Meerestiefe, Ansichten tauschen nur die Farbfunktion. WebGL2, Fallback WebGL1-frei.
// Biomfarben (Reihenfolge wie BIOMES) = Legendenfarben; der Shader dunkelt sie für die Karte stark ab
export const NEON_BIOMES: [number, number, number][] = [
  [10, 42, 82],    // Tiefsee
  [19, 102, 160],  // Flachmeer
  [25, 211, 192],  // Riff/Algenwiese
  [214, 246, 255], // Eis
  [107, 115, 132], // Fels
  [232, 194, 94],  // Wüste
  [184, 166, 72],  // Steppe
  [111, 224, 122], // Grasland
  [35, 160, 90],   // Wald
  [15, 191, 120],  // Regenwald
  [47, 125, 108],  // Nadelwald
  [143, 174, 158], // Tundra
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
  // Ruhige Messkarte: gedämpfte Biomfarben, Höhenstufen statt Relief, feine Küste, Punktraster je 4 Felder
  vec2 q = uv;
  vec2 g0 = q * grid;
  vec2 g = warp(g0);
  float h = hAt(g);
  float land = smoothstep(sea - 0.002, sea + 0.002, h);
  float depth = max(0.0, sea - h);
  float elev = max(0.0, h - sea);
  float prod; vec3 bc = bilinBiome(g, prod);
  vec4 b = bilinB(g);
  float T = b.r * 255.0 / 4.0 - 20.0;
  const vec3 BG = vec3(0.024, 0.043, 0.078);
  vec3 dim = BG + (bc - BG) * 0.42;
  // Hangneigung nur als Hauch
  float e = 0.75;
  float hx = hAt(g + vec2(e, 0.0)) - hAt(g - vec2(e, 0.0));
  float hy = hAt(g + vec2(0.0, e)) - hAt(g - vec2(0.0, e));
  float slope = clamp((-hx - hy) * 4.0, -0.06, 0.06);
  // Meer: dunkel, nach Tiefe gestuft, Plankton färbt das Flachwasser leicht
  float dstep = floor(depth / 0.035);
  vec3 seaC = dim * (0.82 - 0.08 * min(dstep, 4.0));
  seaC += vec3(0.02, 0.10, 0.10) * clamp(prod * 3.0, 0.0, 1.0) * (1.0 - smoothstep(0.03, 0.14, depth));
  if (T < -1.0) seaC = mix(seaC, BG + (vec3(0.84, 0.96, 1.0) - BG) * 0.42, smoothstep(-1.0, -3.0, T) * 0.85);
  // Land: Höhenstufen
  float lstep = floor(elev / 0.035);
  vec3 landC = dim * (min(1.25, 0.92 + lstep * 0.045) + slope);
  vec3 col = mix(seaC, landC, land);
  // Höhenlinien: an Land zart, im Meer kaum sichtbar
  float cl = (h - sea) / 0.035; float cf = fract(cl); float cw = max(fwidth(cl), 1e-4);
  float cline = 1.0 - smoothstep(0.0, cw * 1.1, min(cf, 1.0 - cf));
  col = mix(col, vec3(0.67, 0.86, 0.94), cline * (land * 0.08 + (1.0 - land) * 0.04) * smoothstep(0.004, 0.02, abs(h - sea)));
  // Küste: dünne Cyan-Linie
  float dc = abs(h - sea);
  float coast = 1.0 - smoothstep(0.0, 0.004, dc);
  col = mix(col, vec3(0.18, 0.95, 1.0), coast * 0.6);

  // Ansichten: gestufte, gedämpfte Falschfarben
  vec3 ov = col; float ovA = 0.0;
  int m = int(mode + 0.5);
  if (m == 1) { float t = floor(clamp((T + 5.0) / 40.0, 0.0, 1.0) * 10.0 + 0.5) / 10.0;
    vec3 c0 = vec3(0.08,0.16,0.55), c1 = vec3(0.12,0.59,1.0), c2 = vec3(0.16,0.9,0.86), c3 = vec3(0.94,0.86,0.35), c4 = vec3(1.0,0.31,0.78);
    ov = t < 0.25 ? mix(c0, c1, t/0.25) : t < 0.5 ? mix(c1, c2, (t-0.25)/0.25) : t < 0.75 ? mix(c2, c3, (t-0.5)/0.25) : mix(c3, c4, (t-0.75)/0.25); ovA = 1.0; }
  else if (m == 2) { float w = floor(b.g * 8.0 + 0.5) / 8.0; ov = land > 0.5 ? ramp(w, vec3(0.45,0.3,0.16), vec3(0.3,0.5,0.6), vec3(0.23,0.66,1.0)) : vec3(0.06,0.1,0.18); ovA = 1.0; }
  else if (m == 3) {
    float hh = h - sea;
    ov = hh < 0.0 ? mix(vec3(0.1,0.22,0.4), vec3(0.03,0.06,0.14), clamp(-hh/0.25,0.0,1.0)) : mix(vec3(0.12,0.45,0.55), vec3(0.75,0.95,1.0), clamp(floor(hh / 0.05) * 0.05 / 0.5, 0.0, 1.0));
    ov = mix(ov, vec3(0.75, 0.95, 1.0), cline * (0.45 * land + 0.18 * (1.0 - land)));
    ovA = 1.0;
  }
  else if (m == 4) { float N = b.b * 255.0 / 60.0; float t = floor(clamp(N / 3.0, 0.0, 1.0) * 8.0 + 0.5) / 8.0;
    ov = t < 0.83 ? ramp(t / 0.83, vec3(0.04,0.08,0.12), vec3(0.12,0.35,0.27), vec3(0.36,1.0,0.66)) : mix(vec3(0.36,1.0,0.66), vec3(1.0,0.69,0.23), (t - 0.83) / 0.17); ovA = 1.0; }
  else if (m == 5) {
    vec2 gi = clamp(floor(g), vec2(0.0), grid-1.0);
    vec4 hc = texture(HUE, (gi + 0.5) / grid);
    ov = hc.a > 0.0 ? hc.rgb : vec3(0.06,0.08,0.12); ovA = 1.0;
  }
  else if (m == 6) { float L = floor(b.a * 8.0 + 0.5) / 8.0; ov = ramp(L, vec3(0.02,0.03,0.06), vec3(0.4,0.36,0.7), vec3(1.0,0.86,0.5)); ovA = 1.0; }
  else if (m == 7 && hasGz > 0.5) { float raw = bilinGz(g) * 255.0; if (raw < 0.5) { ov = vec3(0.08,0.09,0.12); } else { float v = (raw - 1.0) / 254.0; ov = v > 0.5 ? mix(vec3(0.1,0.12,0.16), vec3(0.36,1.0,0.66), (v-0.5)*2.0) : mix(vec3(1.0,0.3,0.43), vec3(0.1,0.12,0.16), v*2.0); } ovA = 1.0; }
  if (ovA > 0.0) {
    col = ov * mix(0.3, 0.5, land) + BG * 0.45;
    col = mix(col, vec3(0.67, 0.86, 0.94), cline * land * 0.06);
    col = mix(col, vec3(0.18, 0.95, 1.0), coast * 0.55);
  }
  // Punktraster: ein Punkt je 4×4 Felder
  vec2 gp = abs(fract(g0 / 4.0 + 0.5) - 0.5) * 4.0; float fw = max(fwidth(g0.x), 1e-4);
  float dotv = 1.0 - smoothstep(fw * 0.4, fw * 1.1, length(gp));
  col += vec3(0.7, 0.86, 1.0) * dotv * 0.07;
  // Lampenschein: nur ein Hauch
  vec2 dv = (q - sun) * aspect;
  float sg = exp(-dot(dv, dv) / 0.06);
  col += vec3(1.0, 0.84, 0.47) * sg * 0.06 * sunI;
  // Randabdunklung zum Glas hin
  vec2 cc = abs(q - 0.5) * 2.0;
  col *= 1.0 - 0.45 * smoothstep(0.82, 1.0, cc.x) - 0.4 * smoothstep(0.78, 1.0, cc.y);
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
