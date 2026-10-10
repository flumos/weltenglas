// Glas-Ansicht: Kopfzeile (Gesamtlage) · links Messwerte · Mitte das Glas · rechts Bedingungen · unten Eingriffe, Tempo, Menü.
// Auf dem Handy liegt das Glas hochkant; Werte, Bedingungen, Eingriffe und Menü öffnen sich als Blätter über der Tab-Leiste.
import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import * as S from '../game/state.ts';
import * as sim from '../game/simClient.ts';
import { chronText, know, liveStatus, setSpeedIndex, maxSpeedIndex, tempWord, o2Word, countWord, showCard, fmtMoney, startContest, available, price } from '../game/career.ts';
import { CATEGORIES } from '../data/categories.ts';
import { itemById } from '../data/items.ts';
import { BIOMES, CAUSES } from '../sim/params.ts';
import { WIND_NAMES } from '../sim/climate.ts';
import { MapCanvas, takePhoto } from './MapCanvas.tsx';
import { Icon, Stars } from './icons.tsx';
import { Portrait } from './art.tsx';
import { Sparkline, TpcCurve, biomeCss, speciesColor, roleText, stageName } from './widgets.tsx';
import { sfx } from '../game/audio.ts';
import { saveGame } from '../game/save.ts';
import { TIPS_BY_CAUSE } from '../data/story.ts';
import { SNAP_FIELDS } from '../sim/sim.ts';
import type { Inspect } from '../sim/metrics.ts';
import type { ComponentChildren } from 'preact';

// ---------------------------------------------------------------- Werkzeuge (Eingriffe an einem Ort)
interface ToolDef { id: string; name: string; icon: string; needs?: string; count?: () => number; overlay?: string; brush?: number; hint: string }
const TOOLS: ToolDef[] = [
  { id: 'look', name: 'Prüfen', icon: 'lens', hint: 'Feld antippen, um es zu untersuchen' },
  { id: 'dose', name: 'Salz', icon: 'salt', needs: 'salz', count: () => S.career.value?.inv.salz ?? 0, overlay: 'nutr', brush: 4, hint: 'Tippe, wohin eine Prise Nährsalz soll. Zu viel trübt das Wasser.' },
  { id: 'volcano', name: 'Vulkan', icon: 'volcano', needs: 'vulkan', count: () => S.career.value?.inv.vulkan ?? 0, overlay: 'height', hint: 'Tippe, wo ein Vulkan entstehen soll: hebt Land, düngt, wärmt.' },
  { id: 'terrain', name: 'Gelände', icon: 'mountain', needs: 'spachtel', count: () => S.career.value?.inv.kruemel ?? 0, overlay: 'height', brush: 3, hint: 'Über die Welt streichen formt Gebirge oder Becken. Jeder Strich kostet einen Erdkrümel.' },
  { id: 'net', name: 'Kescher', icon: 'net', needs: 'kescher', brush: 3, hint: 'Tippe auf eine Stelle: Der Kescher entfernt alles Leben im Kreis.' },
  { id: 'inoc', name: 'Impfen', icon: 'pipette', needs: 'pipette', hint: 'Wähle, was du einsetzen willst, dann tippe auf die Welt.' },
];
const VIEWS: { id: string; name: string; color: string; needs?: () => boolean; item?: string }[] = [
  { id: 'biome', name: 'Biome', color: '#6fe07a' },
  { id: 'temp', name: 'Temperatur', color: '#ff4fd8', needs: know.temp, item: 'thermo' },
  { id: 'rain', name: 'Regen', color: '#3aa8ff', needs: know.rain, item: 'regen' },
  { id: 'height', name: 'Höhe', color: '#2ef2ff', needs: know.height, item: 'hoehe' },
  { id: 'nutr', name: 'Nährstoffe', color: '#c8ff7a', needs: know.nutr, item: 'boden' },
  { id: 'species', name: 'Leben', color: '#a98bff', needs: know.species, item: 'lupe' },
  { id: 'zone', name: 'Wohlfühlzone', color: '#5dffa8', needs: know.micro, item: 'mikro' },
];
const SCALES: Record<string, [string, string, string]> = {
  temp: ['−5 °C', 'linear-gradient(90deg,#14288c,#1e96ff,#28e6dc,#f0dc5a,#ff50c8)', '35 °C'],
  rain: ['trocken', 'linear-gradient(90deg,#734d29,#4d8099,#3ba8ff)', 'nass'],
  height: ['tief', 'linear-gradient(90deg,#08102a,#1a3866,#1f7389,#bff2ff)', 'hoch'],
  nutr: ['karg', 'linear-gradient(90deg,#0a141e,#1e5a46,#5dffa8,#ffb03a)', 'überdüngt'],
  zone: ['ungeeignet', 'linear-gradient(90deg,#ff4d6d,#1a1f29,#5dffa8)', 'ideal'],
};

/** Handy-Blatt: '' = zu */
const sheet = signal<'' | 'werte' | 'bed' | 'eingriff' | 'menu'>('');
const detailTab = signal<'arten' | 'biome' | 'chronik'>('arten');
/** Regler unter dem Zeiger → welche Messwerte er bewegt */
const linking = signal<string[]>([]);
/** Zell-Messung unter dem Zeiger (Gitter + Bildschirmposition relativ zur Bühne) */
const hoverCell = signal<{ x: number; y: number; px: number; py: number } | null>(null);

function useMedia(q: string) {
  const [v, setV] = useState(() => window.matchMedia(q).matches);
  useEffect(() => { const mm = window.matchMedia(q); const f = () => setV(mm.matches); mm.addEventListener('change', f); return () => mm.removeEventListener('change', f); }, [q]);
  return v;
}
function useSize(ref: { current: HTMLElement | null }) {
  const [sz, setSz] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setSz({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSz({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  return sz;
}

let prevSpeed = -1;
export const glyphOf = (t: { role: number; land: number; z: number }) => t.role === 0 ? (t.land ? (t.z > 0.45 ? 'pine' : 'leaf') : 'dots') : t.role === 1 ? (t.land ? 'paw' : 'bug') : 'fish';
function selectTool(id: string) {
  const t = TOOLS.find(x => x.id === id)!;
  const c = S.career.value!;
  if (t.needs && !(c.inv[t.needs] > 0) && !(id === 'inoc' && (c.inv.starter || c.inv.tuempel || c.freezer.length))) {
    S.toast(`Dafür brauchst du: ${itemById(t.needs).name} (Zoohandlung)`, 'info'); sfx('click'); return;
  }
  if (S.tool.value === id && id !== 'look') { S.tool.value = 'look'; restoreSpeed(); return; }
  S.tool.value = id;
  sfx('click');
  if (t.overlay) { const v = VIEWS.find(x => x.id === t.overlay); if (!v?.needs || v.needs()) S.overlay.value = t.overlay; }
  if (id !== 'look' && !S.paused.value && S.speed.value > 0) { prevSpeed = S.speed.value; setSpeedIndex(0); }
  if (id === 'look') restoreSpeed();
  if (!c.cards.includes('tools')) showCard('tools');
}
function restoreSpeed() { if (prevSpeed >= 0 && !S.paused.value) setSpeedIndex(prevSpeed); prevSpeed = -1; }
function leaveGlass(to: S.Screen) { setSpeedIndex(-1); saveGame(); S.screen.value = to; }

function useInspect(id: number) {
  const [d, setD] = useState<Inspect | null>(null);
  const dayV = Math.floor(S.day.value);
  useEffect(() => { let alive = true; if (id >= 0) sim.inspect(id).then(r => { if (alive) setD(r); }); else setD(null); return () => { alive = false; }; }, [id, dayV]);
  return d;
}
function pickSpecies(id: number) { S.selectedSpecies.value = id; sim.selectSpecies(id); S.cellInfo.value = null; if (S.tool.value !== 'look') S.tool.value = 'look'; }

// ---------------------------------------------------------------- Kopfzeile
/** Welche Messwerte zählen für die Kategorie des laufenden Wettbewerbs */
const CAT_METRIC: Record<string, string> = {
  green: 'bio', colorful: 'species', foodweb: 'species', web: 'species', exotic: 'species', balance: 'species', giants: 'species',
  bigstep: 'o2', mind: 'o2', hot: 'temp', icewold: 'temp', sturdy: 'temp',
  landscapes: 'land', rainforest: 'land', continents: 'land', deepsea: 'land',
};
function countingMetrics() { const st = liveStatus(); return new Set(st ? st.ct.cats.map(x => CAT_METRIC[x.id]).filter(Boolean) : []); }

function ContestBox() {
  const c = S.career.value!;
  const st = liveStatus();
  if (!st) {
    const av = available(c).filter(x => !c.done.includes(x.id) || x.finale);
    return (
      <div class="gv-contest none">
        <div class="what"><b>Kein Wettbewerb</b><span>Freies Spiel. Im Kalender wartet der nächste.</span></div>
        <div class="row">
          {av[0] && <button class="btn small primary" onClick={() => { if (startContest(av[0].id)) S.toast(`${av[0].name} beginnt!`, 'info'); else leaveGlass('calendar'); }}>{av[0].name} starten</button>}
          <button class="btn small" onClick={() => leaveGlass('calendar')}><Icon name="calendar" size={16} />Kalender</button>
        </div>
      </div>
    );
  }
  const days = Math.ceil(st.daysLeft);
  const rank = know.rank();
  const leader = [...st.field].sort((a, b) => b.points - a.points)[0];
  return (
    <button class="gv-contest" onClick={() => S.modal.value = { kind: 'contest' }} title="Wertung im Detail">
      <div class="when"><b class="mono">{days}</b><span>{days === 1 ? 'Tag bis Abgabe' : 'Tage bis Abgabe'}</span></div>
      <div class="what"><b>{st.ct.name} · {st.ct.cats.map(x => CATEGORIES[x.id].name).join(' + ')}</b>
        <span>Zählt: {st.ct.cats.map(x => CATEGORIES[x.id].desc.split(/[.:]/)[0]).join(' · ')}</span></div>
      <div class="score">
        {rank && leader ? <div class="vs">
          <div class="vrow"><span>{leader.name.split(' ')[0]}</span><i style={`--w:${Math.min(100, leader.points)}%;--c:var(--muted)`} /><b>{Math.round(leader.points)}</b></div>
          <div class="vrow me"><span>Du</span><i style={`--w:${Math.min(100, st.points)}%;--c:var(--violet)`} /><b>{st.unknown ? '?' : Math.round(st.points)}</b></div>
        </div> : <div class="vs"><div class="vrow me"><span>Punkte</span><i style={`--w:${st.unknown ? 0 : Math.min(100, st.points)}%;--c:var(--violet)`} /><b>{st.unknown ? '?' : Math.round(st.points)}</b></div></div>}
        <div class="place">{rank ? <><b class="mono">{st.place}.</b><span>Prognose</span></> : <><Stars n={st.stars} unknown={st.unknown} size={15} /><span>Jury jetzt</span></>}</div>
      </div>
    </button>
  );
}

function TopBar() {
  const c = S.career.value!;
  const pz = S.paused.value, sp = S.speed.value, maxI = maxSpeedIndex();
  return (
    <header class="gv-top">
      <div class="gv-brand">
        <button class="brand-mark" title="Ins Zimmer" aria-label="Ins Zimmer" onClick={() => leaveGlass('hub')} />
        <div class="brand-name"><b>Weltenglas</b><small>Akt {['', 'I', 'II', 'III'][c.act]} · {c.name}s Welt</small></div>
        <div class="day"><small>Glastag</small><b class="mono">{Math.floor(S.day.value)}</b></div>
      </div>
      <ContestBox />
      <div class="gv-money"><span>Kasse</span><b class="mono">{fmtMoney(c.money)}</b></div>
      <button class="pspeed" aria-label="Tempo wechseln" disabled={S.locked.value} onClick={() => {
        const L = [-1, ...Array.from({ length: maxI + 1 }, (_, i) => i)]; const curI = pz ? -1 : sp;
        setSpeedIndex(L[(L.indexOf(curI) + 1) % L.length]); prevSpeed = -1;
      }}>{pz ? <Icon name="pause" size={14} /> : S.SPEEDS[sp].label}</button>
    </header>
  );
}

// ---------------------------------------------------------------- Links: Zustand der Welt
function trendOf(data: number[]) { if (data.length < 6) return 0; const a = data[data.length - 6], b = data[data.length - 1]; return b - a; }
function WorldState() {
  const m = S.metrics.value; if (!m) return null;
  const h = S.hist.value.slice(-160);
  const logger = know.data();
  const counts = countingMetrics();
  const link = linking.value;
  const rows: { id: string; name: string; val: string; unit: string; color: string; data: number[]; fmtD: (d: number) => string; known: boolean; off?: string }[] = [
    { id: 'species', name: know.species() ? 'Arten' : 'Leben', val: know.species() ? String(m.species) : countWord(m.species), unit: '', color: '#a98bff', data: h.map(d => d.species), fmtD: d => (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(Math.round(d)), known: know.species() },
    { id: 'bio', name: 'Biomasse', val: Math.round(h[h.length - 1]?.bio ?? m.total).toLocaleString('de-DE'), unit: '', color: '#5dffa8', data: h.map(d => d.bio), fmtD: d => { const b = h[h.length - 6]?.bio || 1; return (d >= 0 ? '+' : '−') + Math.abs(Math.round(d / b * 100)) + ' %'; }, known: true },
    { id: 'o2', name: 'Sauerstoff', val: know.o2() ? m.o2.toFixed(1).replace('.', ',') : o2Word(m.o2), unit: know.o2() ? '% O₂' : '', color: '#2ef2ff', data: h.map(d => d.o2), fmtD: d => (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1).replace('.', ','), known: know.o2(), off: know.o2() ? undefined : itemById('gas').name },
    { id: 'temp', name: 'Temperatur Ø', val: know.temp() ? m.avgT.toFixed(1).replace('.', ',') : tempWord(m.avgT), unit: know.temp() ? '°C' : '', color: '#ff4fd8', data: h.map(d => d.T), fmtD: d => (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1).replace('.', ','), known: know.temp(), off: know.temp() ? undefined : itemById('thermo').name },
  ];
  const k = Math.max(1, m.kMax);
  return (
    <section class="gpanel">
      <div class="ph"><span class="cap">Zustand der Welt</span><small>{logger ? 'letzte 40 Tage' : ''}</small></div>
      <div class={`metrics ${link.length ? 'linking' : ''}`}>
        {rows.map(r => {
          const d = trendOf(r.data);
          return (
            <div class={`metric ${link.includes(r.id) ? 'hit' : ''}`} style={`--c:${r.color}`}>
              <span class="nm">{r.name}{counts.has(r.id) && <span class="badge">zählt</span>}</span>
              <div class="val"><span class={r.known ? 'mono' : 'word'}>{r.val}</span>{r.unit && <small>{r.unit}</small>}
                {logger && r.known && r.data.length > 5 && <em class={d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}>{r.fmtD(d)}</em>}</div>
              {logger && r.known ? <Spark data={r.data} color={r.color} /> : <span class="off">{r.off ? `genau: ${r.off}` : ''}</span>}
            </div>
          );
        })}
      </div>
      {!logger && <p class="hint">Verlaufskurven zeigt der Datenlogger (Zoohandlung).</p>}
      <div>
        <div class="kv"><span>Stufe des Lebens</span><b class="stage-name">{stageName(k)} · {k} von 6</b></div>
        <div class="steps">{[1, 2, 3, 4, 5, 6].map(i => <i class={i <= k ? 'on' : i === k + 1 ? 'next' : ''} />)}</div>
      </div>
    </section>
  );
}
function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <svg class="spark" />;
  const w = 200, h = 20, mx = Math.max(...data), mn = Math.min(...data), sp = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - mn) / sp) * (h - 6)}`).join(' ');
  return <svg class="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity=".1" /><polyline points={pts} fill="none" stroke={color} stroke-width="1.4" vector-effect="non-scaling-stroke" /></svg>;
}

function SpeciesList() {
  const list = S.speciesList.value.filter(s => s.est);
  const lupe = know.species(), logger = know.data();
  const reg = S.registry.value;
  return (
    <div class="tabbody">
      {list.slice(0, lupe ? 30 : 6).map((s, i) => {
        const r = reg.find(x => x.id === s.id);
        const col = speciesColor(s.typus);
        return (
          <button class="sp" onClick={() => { pickSpecies(s.id); }} style={`--c:${col}`}>
            <span class="glyph"><Icon name={glyphOf(s.typus)} size={14} stroke={2.2} /></span>
            <span class="grow"><b>{lupe ? s.name : (r?.name && S.career.value!.named.includes(s.id) ? r.name : `Sorte ${i + 1}`)}</b>
              <small>{lupe ? `${roleText(s.typus)}${know.temp() ? ` · ${s.typus.topt.toFixed(0)} °C` : ''}` : s.typus.role === 0 ? 'grünlich' : 'bewegt sich'}</small></span>
            {logger && r?.hist?.length ? <Sparkline data={r.hist} color={col} w={46} h={16} /> : <span />}
            <Icon name={s.trend > 1.08 ? 'upr' : s.trend < 0.92 ? 'dnr' : 'right'} size={14} class="faint" />
          </button>
        );
      })}
      {!list.length && <p class="hint">Noch kein Leben, das man zählen könnte.</p>}
      {!lupe && list.length > 0 && <p class="hint">Mit einer Lupe erkennst du die Arten genauer.</p>}
    </div>
  );
}
function BiomeList() {
  const m = S.metrics.value; if (!m) return null;
  const tot = m.biomes.reduce((a, b) => a + b, 0) || 1;
  const rows = m.biomes.map((v, i) => ({ i, f: v / tot })).filter(r => r.f > 0.004).sort((a, b) => b.f - a.f);
  return (
    <div class="tabbody">
      {rows.map(r => <div class="bio" style={`--c:${biomeCss(r.i)};--w:${Math.min(100, r.f * 160)}%`}><span class="dot" /><span class="grow">{BIOMES[r.i].name}</span><i /><b class="mono">{Math.round(r.f * 100)} %</b></div>)}
      <p class="hint">Land {Math.round(m.landFrac * 100)} % · Meer {Math.round((1 - m.landFrac) * 100)} %</p>
    </div>
  );
}
function ChronList() {
  const ch = S.chronicle.value.slice(-40).reverse();
  return (
    <div class="tabbody">
      {ch.map(e => <button class="ev" onClick={() => S.showAt(e.x, e.y)}><span class="mono">Tag {Math.floor(e.tick / 4)}</span><span class={e.big ? 'big' : ''}>{chronText(e.text, e.kind)}</span></button>)}
      {!ch.length && <p class="hint">Das Glas ist still.</p>}
    </div>
  );
}

function Detail() {
  const sel = S.selectedSpecies.value, ci = S.cellInfo.value;
  const tab = detailTab.value;
  const counts = countingMetrics();
  if (sel >= 0) return <section class="gpanel detail sel"><SpeciesDetail id={sel} /></section>;
  if (ci) return <section class="gpanel detail sel"><CellDetail /></section>;
  const n = S.speciesList.value.filter(s => s.est).length;
  return (
    <section class="gpanel detail">
      <div class="tabs">
        <button class={tab === 'arten' ? 'on' : ''} onClick={() => detailTab.value = 'arten'}>{know.species() ? `Arten · ${n}` : 'Leben'}</button>
        <button class={tab === 'biome' ? 'on' : ''} onClick={() => detailTab.value = 'biome'}>Landschaften{counts.has('land') && <i class="tdot" />}</button>
        <button class={tab === 'chronik' ? 'on' : ''} onClick={() => detailTab.value = 'chronik'}>Chronik</button>
      </div>
      {tab === 'arten' ? <SpeciesList /> : tab === 'biome' ? <BiomeList /> : <ChronList />}
    </section>
  );
}

// ---------------------------------------------------------------- Detail: Art und Feld
function reasons(d: Inspect, micro: boolean, kn: { temp: boolean; nutr: boolean; rain: boolean }) {
  const out: { dir: 'up' | 'down' | 'right' | 'unk'; text: string }[] = [];
  const t = d.traits;
  const Tm = d.T;
  if (d.fT > 0.75) out.push({ dir: 'up', text: kn.temp ? `Temperatur passt (Ø ${Tm.toFixed(0)} °C, mag ${t.topt.toFixed(0)} °C)` : 'Die Wärme passt' });
  else out.push({ dir: 'down', text: Tm < t.topt ? (kn.temp ? `zu kalt hier (Ø ${Tm.toFixed(0)} °C, mag ${t.topt.toFixed(0)} °C)` : 'Es ist ihr zu kalt') : (kn.temp ? `zu warm hier (Ø ${Tm.toFixed(0)} °C, mag ${t.topt.toFixed(0)} °C)` : 'Es ist ihr zu warm') });
  if (!micro) { out.push({ dir: 'unk', text: 'Weitere Gründe · Mikroskop fehlt' }); return out; }
  if (t.role === 0) {
    out.push(d.fL > 0.65 ? { dir: 'up', text: 'viel Licht' } : { dir: 'down', text: 'zu wenig Licht' });
    if (kn.nutr) out.push(d.fN > 0.7 ? { dir: 'up', text: 'genug Nährstoffe' } : { dir: 'down', text: 'Nährstoffe knapp' });
    else out.push({ dir: 'unk', text: 'Nährstoffe · Bodenprobe fehlt' });
    if (t.land) out.push(d.fW > 0.7 ? { dir: 'up', text: kn.rain ? 'genug Regen' : 'genug Wasser' } : { dir: 'down', text: 'braucht mehr Wasser' });
  }
  const top = d.losses.filter(l => l.share > 0.18).slice(0, 2);
  for (const l of top) {
    const txt: Record<string, string> = { 'gefressen': 'wird gefressen', 'Seuche': 'zu dicht: Krankheiten breiten sich aus', 'Hunger': 'findet zu wenig Futter', 'Sauerstoff': 'zu wenig Sauerstoff', 'Gift': 'Gift im Wasser (Ammoniak oder zu viel Sauerstoff)', 'Licht': 'Licht reicht nicht', 'Nährstoff': 'Nährstoffe fehlen', 'zu warm': 'leidet unter Hitze', 'zu kalt': 'leidet unter Kälte', 'Trockenheit': 'zu trocken', 'falscher Ort': 'Lebensraum geht verloren' };
    if (l.cause === 'Nährstoff' && out.some(o => o.text.startsWith('Nährstoffe'))) continue;
    if (l.cause === 'Licht' && out.some(o => o.text.includes('Licht'))) continue;
    if ((l.cause === 'zu kalt' || l.cause === 'zu warm') && out[0]?.dir === 'down') continue;
    if (!out.some(o => o.text === txt[l.cause])) out.push({ dir: 'down', text: txt[l.cause] ?? l.cause });
  }
  if (d.better > 0.02) out.push({ dir: 'right', text: 'Woanders ginge es ihr besser (siehe Wohlfühlzone)' });
  return out;
}

function SpeciesDetail({ id }: { id: number }) {
  const d = useInspect(id);
  const c = S.career.value!;
  const lupe = know.species(), micro = know.micro();
  const [editing, setEditing] = useState(false);
  const [nm, setNm] = useState('');
  const close = () => { S.selectedSpecies.value = -1; sim.selectSpecies(-1); if (S.overlay.value === 'zone') S.overlay.value = 'biome'; };
  if (!d) return <p class="hint">Lade …</p>;
  const t = d.traits;
  const canSample = c.inv.pipette && c.inv.kryo && c.freezer.length < 3 && d.alive;
  return (
    <div class="dbody">
      <div class="dhead">
        <button class="back" onClick={close} aria-label="Zurück zur Liste"><Icon name="chevL" size={16} />Liste</button>
        <span class="grow" />
        {lupe && !editing && <button class="iconbtn sm" title="Umbenennen" onClick={() => { setNm(d.name); setEditing(true); }}><Icon name="sparkle" size={16} /></button>}
      </div>
      <div class="spcard-head"><Portrait t={t} seed={d.id} unknown={!lupe && !c.named.includes(d.id)} /></div>
      {editing ? <div class="row"><input class="field" value={nm} maxLength={24} onInput={e => setNm((e.target as HTMLInputElement).value)} onKeyDown={e => { if (e.key === 'Enter') { sim.sendCmd({ type: 'rename', species: id, name: nm }, true); setEditing(false); } }} />
        <button class="btn small primary" onClick={() => { sim.sendCmd({ type: 'rename', species: id, name: nm }, true); setEditing(false); }}>OK</button></div>
        : <h3 class="dtitle" style={`color:${speciesColor(t)}`}>{lupe || c.named.includes(d.id) ? d.name : 'Unbekannte Sorte'}</h3>}
      {lupe ? <p class="small muted"><i>{d.latin}</i> · {roleText(t)} · {stageName(t.k)} · seit Tag {Math.floor(d.born / 4)}{d.reason && d.reason !== 'Ursprung' ? ` · entstand durch ${d.reason}` : ''}</p>
        : <p class="small muted">Für Name, Rolle und Herkunft brauchst du eine Lupe.</p>}
      {!d.alive && <p class="small" style="color:var(--alarm)">Ausgestorben (Tag {Math.floor(d.died / 4)}) · {d.cause}</p>}
      <div class="cap sub">Warum wächst sie hier?</div>
      {reasons(d, micro, { temp: know.temp(), nutr: know.nutr(), rain: know.rain() }).map(r => (
        <div class={`reason ${r.dir}`}><Icon name={r.dir === 'up' ? 'up' : r.dir === 'down' ? 'down' : r.dir === 'right' ? 'right' : 'info'} size={14} /><span>{r.text}</span></div>
      ))}
      {micro && <><div class="cap sub">Wohlfühlklima</div><TpcCurve t={t} T={d.T} color={speciesColor(t)} /></>}
      <div class="kvgrid">
        <div class="kv"><span>Bestand</span><b class="mono">{d.total.toFixed(0)}</b></div>
        <div class="kv"><span>Fläche</span><b class="mono">{(d.area * 100).toFixed(1)} %</b></div>
        {micro && <><div class="kv"><span>Größe</span><b class="mono">{t.z.toFixed(2)}</b></div><div class="kv"><span>Beweglichkeit</span><b class="mono">{t.mob.toFixed(2)}</b></div></>}
      </div>
      {know.data() && d.hist.length > 2 && <div><div class="cap sub">Verlauf</div><Sparkline data={d.hist} w={240} h={36} color={speciesColor(t)} /></div>}
      <div class="row wrap">
        {micro && <button class={`btn small ${S.overlay.value === 'zone' ? 'primary' : ''}`} onClick={() => { S.overlay.value = S.overlay.value === 'zone' ? 'biome' : 'zone'; sim.selectSpecies(id); }}><Icon name="eye" size={16} />Wohlfühlzone</button>}
        {c.inv.pipette ? <button class="btn small" disabled={!canSample} onClick={async () => {
          const smp = await sim.sample(id); if (!smp) return;
          S.patchCareer(k => { k.freezer.push({ ...smp, frozenDay: Math.floor(S.day.value) }); });
          S.toast(`${smp.name} eingefroren (${S.career.value!.freezer.length}/3 Röhrchen).`, 'info'); sfx('buy');
        }} title={!c.inv.kryo ? 'Kryo-Box fehlt' : c.freezer.length >= 3 ? 'Alle Röhrchen voll' : ''}><Icon name="snow" size={16} />Einfrieren</button> : null}
        {know.tree() && <button class="btn small" onClick={() => { S.notebookTab.value = 'tree'; leaveGlass('notebook'); }}><Icon name="tree" size={16} />Stammbaum</button>}
      </div>
    </div>
  );
}

function cellData(x: number, y: number) {
  const snap = sim.snapCur; if (!snap) return null;
  const { w, h, sea } = snap.meta; if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const o = (y * w + x) * SNAP_FIELDS, b = snap.buf;
  const hgt = b[o] / 255;
  return { biome: b[o + 1], T: b[o + 4] / 4 - 20, soil: b[o + 5] / 255, N: b[o + 6] / 60, L: b[o + 9] / 255, hgt, sea: hgt < sea, seaLvl: sea,
    strains: [b[o + 7], b[o + 8]].filter(v => v !== 255).map(v => snap.meta.strains[v]).filter(Boolean) };
}
function cellRows(d: NonNullable<ReturnType<typeof cellData>>) {
  const r: [string, string][] = [];
  r.push([d.sea ? 'Tiefe' : 'Höhe', know.height() ? (d.sea ? `${((d.seaLvl - d.hgt) * 1000).toFixed(0)} m` : `${((d.hgt - d.seaLvl) * 3000).toFixed(0)} m`) : d.sea ? 'Meer' : 'Land']);
  r.push(['Temperatur', know.temp() ? `${d.T.toFixed(1)} °C` : tempWord(d.T)]);
  r.push(['Licht', d.L > 0.6 ? 'hell' : d.L > 0.3 ? 'mittel' : d.L > 0.1 ? 'dämmrig' : 'dunkel']);
  if (!d.sea) r.push(['Bodenfeuchte', know.rain() ? `${Math.round(d.soil * 100)} %` : d.soil > 0.6 ? 'nass' : d.soil > 0.3 ? 'feucht' : 'trocken']);
  if (know.nutr()) r.push(['Nährstoffe', d.N.toFixed(2) + (d.N > 2.5 ? ' · zu viel' : '')]);
  return r;
}
function CellDetail() {
  const ci = S.cellInfo.value; void S.day.value;
  if (!ci) return null;
  const d = cellData(ci.x, ci.y); if (!d) return null;
  const reg = S.registry.value;
  return (
    <div class="dbody">
      <div class="dhead">
        <button class="back" onClick={() => S.cellInfo.value = null} aria-label="Zurück zur Liste"><Icon name="chevL" size={16} />Liste</button>
        <span class="grow" /><span class="mono faint tiny">Feld {ci.x}·{ci.y}</span>
      </div>
      <h3 class="dtitle"><span class="dot" style={`background:${biomeCss(d.biome)}`} />{BIOMES[d.biome].name}</h3>
      <div class="kvgrid">{cellRows(d).map(([k, v]) => <div class="kv"><span>{k}</span><b class="mono">{v}</b></div>)}</div>
      {d.strains.length > 0 && <><div class="cap sub">Hier lebt</div>
        {d.strains.map(s => { const r = reg.find(x => x.id === s!.sp); return r ? (
          <button class="sp" style={`--c:${speciesColor(r.typus)}`} onClick={() => pickSpecies(r.id)}>
            <span class="glyph"><Icon name={glyphOf(r.typus)} size={14} stroke={2.2} /></span>
            <span class="grow"><b>{know.species() || S.career.value!.named.includes(r.id) ? r.name : 'eine Sorte'}</b><small>{know.species() ? roleText(r.typus) : ''}</small></span><span /><Icon name="chevR" size={14} class="faint" />
          </button>) : null; })}</>}
    </div>
  );
}

// ---------------------------------------------------------------- Mitte: Meldung, Glas, Ansichten
function alerts() {
  const m = S.metrics.value, meta = S.meta.value; if (!m || !meta) return [];
  const out: { text: string; why?: string; act?: { label: string; run: () => void } }[] = [];
  const effNames: Record<string, string> = { hitze: 'Hitzewelle', lueften: 'Gelüftet: kalte Luft', strom: 'Stromausfall', staub: 'Staub verdunkelt', winter: 'Eiszeit' };
  for (const e of meta.effects) if (effNames[e]) out.push({ text: effNames[e] });
  if (meta.ctl.lamp <= 0.01) out.push({ text: 'Lampe aus', why: 'ohne Licht wächst nichts' });
  const h = S.hist.value; if (h.length > 4) { const a = h[h.length - 4].bio, b = h[h.length - 1].bio; if (b < a * 0.7 && a > 50) out.push({ text: 'Leben nimmt ab' }); }
  if (m.o2 > 12 && m.kMax <= 1) out.push({ text: 'Sauerstoff wird zum Gift', why: 'einfache Zellen vertragen ihn nicht' });
  if (m.clarity < 0.85) out.push({ text: 'Wasser trüb', why: 'Algenblüte durch zu viele Nährstoffe', act: know.nutr() ? { label: 'Nährstoffe zeigen', run: () => { S.overlay.value = 'nutr'; } } : undefined });
  if (m.maxT > 33) out.push({ text: 'Zu heiß für viele Arten', act: know.temp() ? { label: 'Temperatur zeigen', run: () => { S.overlay.value = 'temp'; } } : undefined });
  if (m.minT < -1) out.push({ text: 'Eis bildet sich' });
  if (meta.ctl.lid) out.push({ text: 'Deckel offen', why: 'Zimmerluft strömt ein' });
  return out;
}
function AlertLine() {
  const a = alerts();
  if (!a.length) return <div class="alertline" />;
  const f = a[0];
  return (
    <div class="alertline">
      <div class="alert" role="status"><span class="pulse" />{f.text}{f.why && <em> · {f.why}</em>}
        {f.act && <button onClick={() => { f.act!.run(); sfx('click'); }}>{f.act.label}</button>}
        {a.length > 1 && <span class="more" title={a.slice(1).map(x => x.text).join(', ')}>+{a.length - 1}</span>}
      </div>
    </div>
  );
}

function Probe() {
  const hc = hoverCell.value; void S.day.value;
  if (!hc || S.tool.value !== 'look') return null;
  const d = cellData(hc.x, hc.y); if (!d) return null;
  const sp = d.strains.map(s => S.registry.value.find(r => r.id === s!.sp)).filter(Boolean);
  return (
    <div class="probe" style={`left:${hc.px}px;top:${hc.py}px`}>
      <div class="pt">{BIOMES[d.biome].name}</div>
      {cellRows(d).map(([k, v]) => <div class="kv"><span>{k}</span><b class="mono">{v}</b></div>)}
      {sp.length > 0 && <div class="kv"><span>Hier lebt</span><b>{know.species() ? sp.map(r => r!.name).join(', ') : `${sp.length} Sorte${sp.length > 1 ? 'n' : ''}`}</b></div>}
    </div>
  );
}

function Views() {
  const v = S.overlay.value; const sc = SCALES[v];
  return (
    <div class="viewbar">
      <div class="seg views">
        {VIEWS.map(x => {
          const ok = !x.needs || x.needs();
          return <button class={`${v === x.id ? 'on' : ''} ${ok ? '' : 'locked'}`} style={`--c:${x.color}`} title={ok ? '' : `Braucht: ${itemById(x.item!).name}`} onClick={() => {
            if (!ok) { S.toast(`Diese Ansicht braucht: ${itemById(x.item!).name}`, 'info'); return; }
            if (x.id === 'zone' && S.selectedSpecies.value < 0) { S.toast('Wähle zuerst eine Art aus der Liste.', 'info'); return; }
            S.overlay.value = x.id; sfx('click');
          }}>{x.name}</button>;
        })}
      </div>
      <div class="scalebar">
        {sc ? <><span>{sc[0]}</span><i style={`--g:${sc[1]}`} /><span>{sc[2]}</span></>
          : v === 'species' ? <span>Farbe = Art · Punkte = Populationen</span> : <span>Legende im Tab „Landschaften“</span>}
      </div>
    </div>
  );
}

function MiniStrip() {
  const m = S.metrics.value; if (!m) return null;
  const counts = countingMetrics();
  const items: [string, string, string, string][] = [
    ['species', know.species() ? 'Arten' : 'Leben', know.species() ? String(m.species) : countWord(m.species), '#a98bff'],
    ['bio', 'Biomasse', Math.round(m.total).toLocaleString('de-DE'), '#5dffa8'],
    ['o2', 'Sauerstoff', know.o2() ? m.o2.toFixed(1).replace('.', ',') + ' %' : o2Word(m.o2), '#2ef2ff'],
    ['temp', 'Temperatur', know.temp() ? m.avgT.toFixed(1).replace('.', ',') + ' °C' : tempWord(m.avgT), '#ff4fd8'],
  ];
  return (
    <div class="ministrip">
      {items.map(([id, n, v, c]) => <button class={`mini ${counts.has(id) ? 'count' : ''}`} style={`--c:${c}`} onClick={() => { sheet.value = 'werte'; }}><span>{n}</span><b>{v}</b></button>)}
    </div>
  );
}

// ---------------------------------------------------------------- Rechts: Bedingungen
function Ctl({ links, color, icon, name, value, children }: { links: string; color: string; icon: string; name: string; value?: ComponentChildren; children?: ComponentChildren }) {
  const on = () => { linking.value = links.split(','); }, off = () => { linking.value = []; };
  return (
    <div class="ctl" style={`--c:${color}`} onPointerEnter={on} onPointerLeave={off} onFocusIn={on} onFocusOut={off}>
      <Icon name={icon} size={18} class="ic" />
      <span class="nm">{name}</span>{value !== undefined && <b class="v mono">{value}</b>}
      {children && <div class="wide">{children}</div>}
    </div>
  );
}
function Range({ min, max, step, value, onInput, onChange, label }: { min: number; max: number; step: number; value: number; onInput?: (v: number) => void; onChange: (v: number) => void; label: string }) {
  const p = ((value - min) / (max - min || 1)) * 100;
  return <input type="range" aria-label={label} min={min} max={max} step={step} value={value} style={`--p:${p}%`}
    onInput={e => { const el = e.target as HTMLInputElement; el.style.setProperty('--p', ((+el.value - min) / (max - min || 1)) * 100 + '%'); onInput?.(+el.value); }}
    onChange={e => onChange(+(e.target as HTMLInputElement).value)} />;
}
const DIR_ORDER = [2, 3, 4, 5, 6, 7, 0, 1]; // N NO O SO S SW W NW → Index in WIND_NAMES
const DIR_SHORT = ['W', 'NW', 'N', 'NO', 'O', 'SO', 'S', 'SW'];

function Conditions() {
  const m = S.meta.value, c = S.career.value!; const mt = S.metrics.value;
  const [lampLocal, setLampLocal] = useState<number | null>(null);
  if (!m) return null;
  const ctl = m.ctl;
  const lampMax = c.inv.tageslicht ? 100 : 60;
  const lamp = lampLocal ?? Math.round(ctl.lamp * 100);
  const eight = !!c.inv.vent8;
  const devices = ['arm', 'tageslicht', 'uhr', 'vent', 'vent8', 'kanne', 'deckel', 'heizplatte', 'uv', 'kuehlplatte'];
  const missing = devices.map(itemById).filter(it => it && it.act <= c.act && !c.inv[it.id] && (!it.requires || c.inv[it.requires]));
  return (
    <section class="gpanel conditions">
      <div class="ph"><span class="cap">Bedingungen</span><small>wirken auf die ganze Welt</small></div>
      <Ctl links="temp,o2,bio" color="var(--sun)" icon="sun" name="Lampe" value={`${lamp} %`}>
        <Range label="Lampenstärke" min={0} max={lampMax} step={5} value={Math.min(lamp, lampMax)} onInput={v => setLampLocal(v)}
          onChange={v => { setLampLocal(null); sim.sendCmd({ type: 'sun', I: v / 100 }, true); sfx('click'); }} />
        <p class="sub">{c.inv.arm ? 'Den Lichtfleck im Glas mit der Maus oder dem Finger ziehen.' : 'Die Kit-Lampe steht fest in der Mitte.'}{lampMax < 100 ? ' Mehr als 60 % schafft die Tageslichtlampe.' : ''}</p>
      </Ctl>
      {c.inv.uhr ? <Ctl links="bio,temp" color="var(--sun)" icon="clock" name="Tageslänge" value={`${ctl.photo} h`}>
        <Range label="Tageslänge" min={6} max={18} step={1} value={ctl.photo} onChange={v => sim.sendCmd({ type: 'photo', hours: v })} />
      </Ctl> : null}
      {c.inv.vent ? <>
        <div class="sep" />
        <Ctl links="temp,species" color="var(--cyan)" icon="wind" name="Wind aus" value={ctl.windOn ? `${DIR_SHORT[ctl.wind]}${eight ? ` · ${Math.round(ctl.windStr * 100)} %` : ''}` : 'aus'}>
          <div class="dirs">
            {DIR_ORDER.map(i => <button class={ctl.windOn && ctl.wind === i ? 'on' : ''} disabled={!eight && i % 2 === 1} aria-label={`Wind aus ${WIND_NAMES[i]}`} onClick={() => sim.sendCmd({ type: 'wind', dir: i, on: true })}>{DIR_SHORT[i]}</button>)}
            <button class={!ctl.windOn ? 'on off' : ''} onClick={() => sim.sendCmd({ type: 'wind', dir: ctl.wind, on: !ctl.windOn })}>{ctl.windOn ? 'aus' : 'an'}</button>
          </div>
          {eight && <Range label="Windstärke" min={0} max={100} step={5} value={Math.round(ctl.windStr * 100)} onChange={v => sim.sendCmd({ type: 'wind', dir: ctl.wind, on: true, str: v / 100 })} />}
          <p class="sub">Wind trägt feuchte Meeresluft. An Bergen regnet sie ab, dahinter wird es trocken.</p>
        </Ctl>
      </> : null}
      {c.inv.kanne ? <>
        <div class="sep" />
        <Ctl links="land,species" color="var(--water)" icon="drop" name="Meeresspiegel" value={mt ? `Land ${Math.round(mt.landFrac * 100)} %` : ''}>
          <div class="stepper">
            <button class="btn small" onClick={() => { sim.sendCmd({ type: 'water', delta: -0.012 }, true); sfx('place'); }}><Icon name="minus" size={14} />Ablassen</button>
            <button class="btn small" onClick={() => { sim.sendCmd({ type: 'water', delta: 0.012 }, true); sfx('place'); }}><Icon name="plus" size={14} />Nachfüllen</button>
          </div>
        </Ctl>
      </> : null}
      {c.inv.deckel || c.inv.heizplatte || c.inv.kuehlplatte || c.inv.uv ? <div class="sep" /> : null}
      {c.inv.deckel ? <Ctl links="o2,temp" color="var(--cyan)" icon="lid" name="Deckel lüften" value={<button class="sw" role="switch" aria-checked={ctl.lid ? 'true' : 'false'} aria-label="Deckel lüften" onClick={() => sim.sendCmd({ type: 'lid', open: !ctl.lid }, true)} />}>
        <p class="sub">Zimmerluft mit 21 % Sauerstoff strömt ein.</p>
      </Ctl> : null}
      {c.inv.heizplatte ? <Ctl links="temp" color="var(--heat)" icon="heat" name="Heizplatte" value={<span class="row" style="gap:8px">{ctl.thermo ? `${ctl.thermoSet} °C` : 'aus'}<button class="sw" role="switch" aria-checked={ctl.thermo ? 'true' : 'false'} aria-label="Heizplatte" onClick={() => sim.sendCmd({ type: 'thermo', on: !ctl.thermo, set: ctl.thermoSet, max: 8 })} /></span>}>
        <Range label="Grundtemperatur" min={6} max={20} step={1} value={ctl.thermoSet} onChange={v => sim.sendCmd({ type: 'thermo', on: ctl.thermo, set: v, max: 8 })} />
      </Ctl> : null}
      {c.inv.kuehlplatte ? <Ctl links="temp" color="var(--water)" icon="cold" name="Kühlplatte" value={`−${ctl.cool} °C`}>
        <Range label="Kühlung" min={0} max={10} step={1} value={ctl.cool} onChange={v => sim.sendCmd({ type: 'cool', delta: v })} />
      </Ctl> : null}
      {c.inv.uv ? <Ctl links="species" color="var(--violet)" icon="uv" name="Mutationsrate" value={`×${ctl.uv.toFixed(1).replace('.', ',')}`}>
        <Range label="Mutationsrate" min={0.5} max={4} step={0.5} value={ctl.uv} onChange={v => sim.sendCmd({ type: 'uv', factor: v })} />
        <p class="sub">Mehr Mutationen, aber auch mehr Fehlschläge.</p>
      </Ctl> : null}
      {missing.length > 0 && <button class="shopline" onClick={() => leaveGlass('shop')}>
        <span>Im Laden: {missing.slice(0, 3).map((it, i) => <><b>{it!.name}</b>{i < Math.min(3, missing.length) - 1 ? ', ' : ''}</>)}{missing.length > 3 ? ` +${missing.length - 3}` : ''}</span>
        <span class="price">ab {Math.min(...missing.map(it => price(c, it!.price)))} {S.cur.value}</span>
      </button>}
    </section>
  );
}

// ---------------------------------------------------------------- Unten: Eingriffe, Tempo, Menü
function ToolOptions() {
  const tl = S.tool.value; const c = S.career.value!;
  const T = TOOLS.find(x => x.id === tl) ?? TOOLS[0];
  if (tl === 'terrain') return <div class="topts"><span>{T.hint}</span>
    <div class="seg"><button class={(c.flags.terrainUp ?? true) ? 'on' : ''} onClick={() => S.patchCareer(k => { k.flags.terrainUp = true; })}>Anheben</button>
      <button class={!(c.flags.terrainUp ?? true) ? 'on' : ''} onClick={() => S.patchCareer(k => { k.flags.terrainUp = false; })}>Absenken</button></div></div>;
  if (tl === 'inoc') return <div class="topts"><span>{T.hint}</span>
    <div class="row wrap">
      {c.inv.starter ? <button class={`btn small ${c.flags.inoc === 'starter' ? 'primary' : ''}`} onClick={() => S.patchCareer(k => { k.flags.inoc = 'starter'; })}>Starterkultur ({c.inv.starter})</button> : null}
      {c.inv.tuempel ? <button class={`btn small ${c.flags.inoc === 'tuempel' ? 'primary' : ''}`} onClick={() => S.patchCareer(k => { k.flags.inoc = 'tuempel'; })}>Tümpelprobe ({c.inv.tuempel})</button> : null}
      {c.freezer.map((f, i) => <button class={`btn small ${c.flags.inoc === 'f' + i ? 'primary' : ''}`} onClick={() => S.patchCareer(k => { k.flags.inoc = 'f' + i; })}><Icon name="snow" size={14} />{f.name}</button>)}
      {!c.inv.starter && !c.inv.tuempel && !c.freezer.length && <span class="faint">Nichts zum Einsetzen.</span>}
    </div></div>;
  return <div class="topts"><span>{T.hint}</span>{tl !== 'look' && <button class="btn small ghost" onClick={() => { S.tool.value = 'look'; restoreSpeed(); }}><Icon name="x" size={14} />Fertig</button>}</div>;
}
function Tools() {
  const c = S.career.value!; const tl = S.tool.value;
  return (
    <div class="tools" aria-label="Eingriffe am Ort">
      {TOOLS.map(t => {
        const owned = !t.needs || (c.inv[t.needs] ?? 0) > 0 || (t.id === 'inoc' && (c.inv.starter || c.inv.tuempel || c.freezer.length));
        const cnt = t.count?.();
        return <button class={`tool ${tl === t.id ? 'on' : ''} ${owned ? '' : 'locked'} ${t.id === 'dose' && !c.flags.dosed && c.current?.id === 'schulfest' ? 'pulse' : ''}`} disabled={S.locked.value} onClick={() => selectTool(t.id)}>
          {cnt !== undefined && owned && <span class="n">{cnt}</span>}
          <Icon name={t.icon} size={19} />{t.name}</button>;
      })}
    </div>
  );
}
function Speed() {
  const sp = S.speed.value, pz = S.paused.value, maxI = maxSpeedIndex();
  return (
    <div class="seg time" role="group" aria-label="Tempo">
      <button class={pz ? 'on' : ''} onClick={() => setSpeedIndex(-1)} aria-label="Pause" disabled={S.locked.value}><Icon name="pause" size={14} /></button>
      {S.SPEEDS.slice(0, maxI + 1).map((s, i) => <button class={!pz && sp === i ? 'on' : ''} disabled={S.locked.value} onClick={() => { setSpeedIndex(i); prevSpeed = -1; }}>{s.label}</button>)}
    </div>
  );
}
function Menu() {
  const c = S.career.value!;
  const items: [string, string, () => void][] = [
    ['home', 'Zimmer', () => leaveGlass('hub')],
    ['book', 'Heft', () => leaveGlass('notebook')],
    ['store', 'Laden', () => leaveGlass('shop')],
    ['calendar', 'Kalender', () => leaveGlass('calendar')],
    ['camera', 'Foto', () => takePhoto(`Weltenglas · ${c.name}s Welt · Tag ${Math.floor(S.day.value)}`)],
    ['gear', 'System', () => { S.modal.value = { kind: 'settings' }; }],
  ];
  return <div class="menu">{items.map(([ic, n, f]) => <button class="tool" onClick={() => { sfx('click'); f(); }}><Icon name={ic} size={19} />{n}</button>)}</div>;
}
function PhoneTabs() {
  const sh = sheet.value;
  const tabs: [typeof sh, string, string][] = [['werte', 'bars', 'Werte'], ['bed', 'sliders', 'Bedingungen'], ['eingriff', 'lens', 'Eingriff'], ['menu', 'menu', 'Menü']];
  return <div class="ptabs">{tabs.map(([id, ic, n]) => <button class={sh === id ? 'on' : ''} onClick={() => { sheet.value = sh === id ? '' : id; sfx('click'); }}><Icon name={ic} size={20} />{n}</button>)}</div>;
}

// ---------------------------------------------------------------- Hauptansicht
export function GlassView() {
  const c = S.career.value!;
  const tl = S.tool.value;
  const T = TOOLS.find(x => x.id === tl);
  const lastPaint = useRef(0);
  const dragSun = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phone = useMedia('(max-width: 900px)');
  const box = useSize(stageRef);
  const meta = S.meta.value;
  const aspect = meta ? meta.w / meta.h : 1.5;

  // Glasgröße: am Desktop quer, auf dem Handy um 90° gedreht (hochkant)
  let gw = 0, gh = 0;
  if (phone) { const shortS = Math.min(box.w - 4, (box.h - 4) / aspect); gh = Math.max(0, Math.floor(shortS)); gw = Math.floor(gh * aspect); }
  else { gw = Math.max(0, Math.floor(Math.min(box.w - 24, (box.h - 24) * aspect))); gh = Math.floor(gw / aspect); }

  useEffect(() => () => { sheet.value = ''; hoverCell.value = null; linking.value = []; }, []);

  // Tastatur
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || S.locked.value) return;
      if (e.key === 'Escape') { if (S.modal.value) S.modal.value = null; else { S.tool.value = 'look'; S.selectedSpecies.value = -1; S.cellInfo.value = null; sheet.value = ''; } return; }
      if (S.modal.value) return;
      if (e.key === ' ') { e.preventDefault(); if (S.paused.value) setSpeedIndex(S.speed.value); else setSpeedIndex(-1); }
      else if (e.key >= '1' && e.key <= '4') { const i = +e.key - 1; if (i <= maxSpeedIndex()) setSpeedIndex(i); }
      else if (e.key === 'n') selectTool('dose');
      else if (e.key === 'u') selectTool('look'); else if (e.key === 'h') leaveGlass('notebook');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  // Tutorial: Lampe an → Zeit → Schulfest
  useEffect(() => {
    if (c.flags.tutorial === 1 && !S.modal.value) S.modal.value = { kind: 'tutorial-lamp' };
  }, [c.flags.tutorial]);
  useEffect(() => {
    if (c.flags.tutorial === 2 && S.day.value >= 2.5 && !c.current) {
      S.patchCareer(k => { k.flags.tutorial = 3; });
      startContest('schulfest');
      showCard('contest');
    }
  }, [S.day.value, c.flags.tutorial]);

  // Auswahl auf dem Handy: Werte-Blatt öffnen
  const sel = S.selectedSpecies.value, ci = S.cellInfo.value;
  useEffect(() => { if (phone && (sel >= 0 || ci)) sheet.value = 'werte'; }, [sel, ci]);

  const onPointer = (x: number, y: number, phase: 'down' | 'move' | 'up' | 'hover', e?: PointerEvent) => {
    if (S.locked.value) return;
    const meta = S.meta.value; if (!meta) return;
    const { w, h } = meta;
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const cx = Math.floor(x), cy = Math.floor(y);
    const k = S.career.value!;
    if ((phase === 'hover' || phase === 'move') && e && stageRef.current && e.pointerType === 'mouse') {
      const rc = stageRef.current.getBoundingClientRect();
      let px = e.clientX - rc.left + 18, py = e.clientY - rc.top + 18;
      if (px + 200 > rc.width) px -= 236; if (py + 150 > rc.height) py -= 170;
      hoverCell.value = { x: cx, y: cy, px: Math.max(0, px), py: Math.max(0, py) };
    }
    // Lampe ziehen: mit Lampenarm jederzeit am Lichtfleck greifen
    const nearSun = Math.hypot((x / w - meta.ctl.lampX) * w, (y / h - meta.ctl.lampY) * h) < Math.max(4, w / 24);
    if (phase === 'down' && k.inv.arm && (nearSun || tl === 'sun')) dragSun.current = true;
    if (dragSun.current) {
      const sx = x / w, sy = y / h;
      if (phase === 'move' || phase === 'down') { const now = performance.now(); if (now - lastPaint.current > 60) { lastPaint.current = now; sim.sendCmd({ type: 'sun', x: sx, y: sy, quiet: true }); } }
      if (phase === 'up') { dragSun.current = false; sim.sendCmd({ type: 'sun', x: sx, y: sy }, true); }
      return;
    }
    if (tl === 'look' && phase === 'up') {
      S.cellInfo.value = { x: cx, y: cy, c: cy * w + cx };
      S.selectedSpecies.value = -1;
      sfx('click');
      return;
    }
    if (phase === 'hover') return;
    if (tl === 'volcano' && phase === 'up') {
      if ((k.inv.vulkan ?? 0) <= 0) { S.toast('Keine Vulkansteine mehr.', 'info'); return; }
      if (meta.hotspots.length >= 6) { S.toast('Mehr Vulkane passen nicht in diese Schale.', 'info'); return; }
      sim.sendCmd({ type: 'hotspot', x, y }, true);
      S.patchCareer(z => { z.inv.vulkan--; z.inv.vulkanUsed = (z.inv.vulkanUsed ?? 0) + 1; });
      sfx('event');
      return;
    }
    if (tl === 'terrain' && (phase === 'down' || phase === 'move')) {
      const lp = lastPt.current;
      if (phase === 'move' && lp && Math.hypot(x - lp.x, y - lp.y) < 1.6) return;
      lastPt.current = { x, y };
      if ((k.inv.kruemel ?? 0) <= 0) { if (phase === 'down') S.toast('Keine Erdkrümel mehr. Nachschub gibt’s bei Krause.', 'info'); return; }
      const up = k.flags.terrainUp ?? true;
      sim.sendCmd({ type: 'terrain', x, y, r: 3, delta: up ? 0.035 : -0.035 });
      S.patchCareer(z => { z.inv.kruemel--; });
      return;
    }
    if (tl === 'dose' && phase === 'up') {
      if ((k.inv.salz ?? 0) <= 0) { S.toast('Kein Nährsalz mehr.', 'info'); return; }
      sim.sendCmd({ type: 'dose', x, y, amount: 90 }, true);
      S.patchCareer(z => { z.inv.salz--; z.flags.dosed = true; });
      sfx('place');
      return;
    }
    if (tl === 'net' && phase === 'up') { sim.sendCmd({ type: 'net', x, y, r: 3 }, true); sfx('place'); return; }
    if (tl === 'inoc' && phase === 'up') {
      const sel = k.flags.inoc as string | undefined;
      if (!sel) { S.toast('Wähle zuerst unten, was du einsetzen willst.', 'info'); return; }
      if (sel === 'starter' && k.inv.starter) { sim.sendCmd({ type: 'inoculate', traits: { ...{ role: 0, land: 0, k: 1, topt: 20, sig: 6, z: 0.1, mob: 0.2, def: 0, aff: 0.3, dry: 0, hue: 120, brain: 0, social: 0 } }, x, y, name: 'Urflöckchen' }, true); S.patchCareer(z => { z.inv.starter--; z.flags.inoc = ''; }); }
      else if (sel === 'tuempel' && k.inv.tuempel) { sim.sendCmd({ type: 'tuempel', x, y }, true); S.patchCareer(z => { z.inv.tuempel--; z.flags.inoc = ''; }); }
      else if (sel.startsWith('f')) {
        const i = +sel.slice(1); const f = k.freezer[i]; if (!f) return;
        const { name, frozenDay, ...traits } = f; void frozenDay;
        sim.sendCmd({ type: 'inoculate', traits, x, y, name }, true);
        S.patchCareer(z => { z.freezer.splice(i, 1); z.flags.inoc = ''; });
      }
      sfx('discover');
      return;
    }
  };

  const wrapStyle = phone
    ? `width:${gw}px;height:${gh}px;transform:translate(-50%,-50%) rotate(90deg)`
    : `width:${gw}px;height:${gh}px;transform:translate(-50%,-50%)`;
  return (
    <div class={`gv sheet-${sheet.value || 'none'}`}>
      <TopBar />
      <main class="gv-main">
        <aside class="gv-side left" aria-label="Messwerte"><WorldState /><Detail /></aside>
        <section class="gv-center">
          <AlertLine />
          <div class="stage" ref={stageRef}>
            {gw > 0 && <div class={`mapwrap ${phone ? 'rot' : ''}`} style={wrapStyle + (S.locked.value ? ';filter:grayscale(.6)' : '')}>
              <MapCanvas rot={phone} onPointer={onPointer} onLeave={() => { hoverCell.value = null; }}
                showSun showSunHandle={!!c.inv.arm && (tl === 'look' || tl === 'sun')} showMarker={tl === 'look'}
                showWind={S.overlay.value === 'rain' && know.rain()} brush={T?.brush ?? 0} />
            </div>}
            {!phone && <Probe />}
          </div>
          <MiniStrip />
          <Views />
        </section>
        <aside class="gv-side right" aria-label="Bedingungen"><Conditions /></aside>
      </main>
      <nav class="gv-bar" aria-label="Eingriffe und Menü">
        <Tools />
        <div class="barmid"><ToolOptions /><Speed /></div>
        <Menu />
        <PhoneTabs />
      </nav>
    </div>
  );
}

export { CAUSES, TIPS_BY_CAUSE };
