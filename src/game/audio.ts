// Audio (Konzept 7.4): ruhiges Ambient, Wasser und Wind, Entdeckungs-Chime, Jury-Trommelwirbel.
// Alles synthetisch über WebAudio, keine Dateien.
import { career } from './state.ts';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let ambientOn = false;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
const soundOn = () => career.value?.settings.sound !== false;

function tone(freq: number, t0: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, dest?: AudioNode) {
  const c = ctx!; const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest ?? master!); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(t0: number, dur: number, vol: number, freq = 800, q = 0.7) {
  const c = ctx!; const len = Math.ceil(c.sampleRate * dur);
  const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(master!); s.start(t0);
}

export function sfx(kind: 'discover' | 'buy' | 'event' | 'impact' | 'click' | 'drum' | 'win' | 'lose' | 'place' | 'bad') {
  if (!soundOn()) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.01;
  switch (kind) {
    case 'discover': [659, 784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.09, 0.9, 'sine', 0.12)); break;
    case 'buy': tone(1046, t, 0.15, 'triangle', 0.15); tone(1568, t + 0.08, 0.3, 'triangle', 0.12); break;
    case 'event': tone(196, t, 0.6, 'sine', 0.2); tone(147, t + 0.1, 0.8, 'sine', 0.15); break;
    case 'impact': noise(t, 1.4, 0.5, 200, 0.5); tone(55, t, 1.2, 'sine', 0.4); break;
    case 'click': tone(880, t, 0.05, 'sine', 0.05); break;
    case 'place': tone(520, t, 0.12, 'sine', 0.08); break;
    case 'bad': tone(330, t, 0.4, 'sine', 0.1); tone(311, t + 0.15, 0.5, 'sine', 0.1); break;
    case 'drum': for (let i = 0; i < 24; i++) noise(t + i * 0.06, 0.08, 0.12 + i * 0.008, 300, 1.2); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.12, 1.2, 'triangle', 0.13)); break;
    case 'lose': [440, 392, 349].forEach((f, i) => tone(f, t + i * 0.18, 0.7, 'sine', 0.1)); break;
  }
}

// Ambient: sanfte Akkordflächen + Wasserrauschen
let ambTimer: ReturnType<typeof setInterval> | null = null;
const CHORDS = [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 262, 330]];
export function ambient(on: boolean) {
  const want = on && career.value?.settings.music !== false;
  const c = ac(); if (!c || !musicGain) return;
  musicGain.gain.cancelScheduledValues(c.currentTime);
  musicGain.gain.linearRampToValueAtTime(want ? 0.25 : 0, c.currentTime + 1.5);
  if (want && !ambientOn) {
    ambientOn = true;
    let i = 0;
    const play = () => {
      if (!ctx || !musicGain) return;
      const t = ctx.currentTime + 0.05;
      for (const f of CHORDS[i % CHORDS.length]) {
        const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
        o.type = 'triangle'; o.frequency.value = f / 2; o.detune.value = (Math.random() - 0.5) * 8;
        fl.type = 'lowpass'; fl.frequency.value = 700;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 3); g.gain.linearRampToValueAtTime(0, t + 9);
        o.connect(fl); fl.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 9.5);
      }
      if (Math.random() < 0.5) { const f = CHORDS[i % CHORDS.length][Math.floor(Math.random() * 3)] * 2; tone(f, t + 2 + Math.random() * 3, 2.5, 'sine', 0.025, musicGain); }
      i++;
    };
    play();
    ambTimer = setInterval(play, 8000);
  } else if (!want && ambientOn) {
    ambientOn = false; if (ambTimer) clearInterval(ambTimer); ambTimer = null;
  }
}
export function unlockAudio() { ac(); }
