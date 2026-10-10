// Glas-Ansicht (Konzept 7.3): oben schauen, unten bedienen.
import { useEffect, useRef, useState } from 'preact/hooks';
import * as S from '../game/state.ts';
import * as sim from '../game/simClient.ts';
import { know, liveStatus, setSpeedIndex, maxSpeedIndex, tempWord, o2Word, countWord, showCard, glassYears, fmtMoney, startContest, available } from '../game/career.ts';
import { CATEGORIES } from '../data/categories.ts';
import { itemById } from '../data/items.ts';
import { BIOMES, CAUSES } from '../sim/params.ts';
import { WIND_NAMES } from '../sim/climate.ts';
import { MapCanvas, takePhoto } from './MapCanvas.tsx';
import { Icon, Stars } from './icons.tsx';
import { Portrait } from './art.tsx';
import { Sparkline, TpcCurve, Bar, biomeCss, speciesColor, roleText, stageName } from './widgets.tsx';
import { sfx } from '../game/audio.ts';
import { saveGame } from '../game/save.ts';
import { TIPS_BY_CAUSE } from '../data/story.ts';
import { SNAP_FIELDS } from '../sim/sim.ts';
import type { Inspect } from '../sim/metrics.ts';

interface ToolDef { id: string; name: string; icon: string; needs?: string; count?: () => number; overlay?: string; brush?: number }
const TOOLS: ToolDef[] = [
  { id: 'look', name: 'Untersuchen', icon: 'lens' },
  { id: 'sun', name: 'Sonne', icon: 'sun', overlay: 'temp' },
  { id: 'wind', name: 'Wind', icon: 'wind', needs: 'vent', overlay: 'rain' },
  { id: 'water', name: 'Wasser', icon: 'drop', needs: 'kanne', overlay: 'height' },
  { id: 'volcano', name: 'Vulkan', icon: 'volcano', needs: 'vulkan', count: () => S.career.value?.inv.vulkan ?? 0, overlay: 'height' },
  { id: 'terrain', name: 'Gelände', icon: 'mountain', needs: 'spachtel', count: () => S.career.value?.inv.kruemel ?? 0, overlay: 'height', brush: 3 },
  { id: 'dose', name: 'Nährsalz', icon: 'salt', needs: 'salz', count: () => S.career.value?.inv.salz ?? 0, overlay: 'nutr', brush: 4 },
  { id: 'inoc', name: 'Impfen', icon: 'pipette', needs: 'pipette' },
  { id: 'net', name: 'Kescher', icon: 'net', needs: 'kescher', brush: 3 },
  { id: 'gear', name: 'Geräte', icon: 'gear' },
];
const VIEWS: { id: string; name: string; needs?: () => boolean; item?: string }[] = [
  { id: 'biome', name: 'Biome' },
  { id: 'temp', name: 'Temperatur', needs: know.temp, item: 'thermo' },
  { id: 'rain', name: 'Regen', needs: know.rain, item: 'regen' },
  { id: 'height', name: 'Höhe', needs: know.height, item: 'hoehe' },
  { id: 'nutr', name: 'Nährstoffe', needs: know.nutr, item: 'boden' },
  { id: 'species', name: 'Arten', needs: know.species, item: 'lupe' },
  { id: 'zone', name: 'Wohlfühlzone', needs: know.micro, item: 'mikro' },
];

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

function useInspect(id: number) {
  const [d, setD] = useState<Inspect | null>(null);
  const dayV = Math.floor(S.day.value);
  useEffect(() => { let alive = true; if (id >= 0) sim.inspect(id).then(r => { if (alive) setD(r); }); else setD(null); return () => { alive = false; }; }, [id, dayV]);
  return d;
}

// ---------------------------------------------------------------- Top-Leiste
function TopBar() {
  const c = S.career.value!;
  const st = liveStatus();
  const sp = S.speed.value, pz = S.paused.value, maxI = maxSpeedIndex();
  return (
    <div class="topbar">
      <span class="brand">Weltenglas</span>
      <button class="iconbtn" title="Zimmer" onClick={() => { setSpeedIndex(-1); saveGame(); S.screen.value = 'hub'; }}><Icon name="home" /></button>
      <span class="pill" title={glassYears(S.day.value)}>Tag {Math.floor(S.day.value)}<span class="muted small gy" style="font-weight:500">· {glassYears(S.day.value)}</span></span>
      <div class="seg">
        <button class={pz ? 'on' : ''} onClick={() => setSpeedIndex(-1)} aria-label="Pause" disabled={S.locked.value}><Icon name="pause" size={16} /></button>
        {S.SPEEDS.slice(0, maxI + 1).map((s, i) => <button class={!pz && sp === i ? 'on' : ''} disabled={S.locked.value} onClick={() => { setSpeedIndex(i); prevSpeed = -1; }}>{s.label}</button>)}
      </div>
      <span class="spacer" />
      {st ? (
        <button class="pill dark contest-pill" onClick={() => S.modal.value = { kind: 'contest' }}>
          <Icon name="trophy" size={18} />{st.ct.name}<span class="muted ctx" style="opacity:.75;font-weight:500">· {st.ct.cats.map(x => CATEGORIES[x.id].short).join(' + ')} · noch {Math.ceil(st.daysLeft)} Tage</span>
          <span class="spacer" style="display:block" />{know.rank() ? <span style="margin-left:4px">Platz {st.place}</span> : <Stars n={st.stars} unknown={st.unknown} />}<span class="tiny mob-only" style="opacity:.7;margin-left:6px">{Math.ceil(st.daysLeft)} T.</span>
        </button>
      ) : (
        <button class="pill choose" onClick={() => { setSpeedIndex(-1); S.screen.value = 'calendar'; }}><Icon name="calendar" size={18} />Wettbewerb wählen</button>
      )}
      <span class="pill money"><Icon name="pig" size={18} />{fmtMoney(c.money)}</span>
      <button class="iconbtn" title="Foto" onClick={() => takePhoto(`Weltenglas · ${c.name}s Welt · Tag ${Math.floor(S.day.value)}`)}><Icon name="camera" /></button>
      <button class="iconbtn" title="Forschungsheft" onClick={() => { S.screen.value = 'notebook'; }}><Icon name="book" /></button>
      <button class="iconbtn" title="Einstellungen" onClick={() => S.modal.value = { kind: 'settings' }}><Icon name="gear" /></button>
    </div>
  );
}

// ---------------------------------------------------------------- Linke Spalte
function BiomeCard() {
  const m = S.metrics.value; if (!m) return null;
  const rows = m.biomes.map((v, i) => ({ i, v })).filter(r => r.v > 0).sort((a, b) => b.v - a.v).slice(0, 8);
  const max = Math.max(...rows.map(r => r.v), 1);
  return (
    <div class="card">
      <div class="label" style="margin-bottom:8px">Biome</div>
      {rows.map(r => <div class="biome-row"><span class="dot" style={`background:${biomeCss(r.i)}`} /><span>{BIOMES[r.i].name}</span><Bar v={r.v / max} color={biomeCss(r.i)} /></div>)}
    </div>
  );
}
function SpeciesCard() {
  const list = S.speciesList.value.filter(s => s.est);
  const lupe = know.species(), logger = know.data();
  const sel = S.selectedSpecies.value;
  const reg = S.registry.value;
  return (
    <div class="card">
      <div class="label" style="margin-bottom:6px">{lupe ? `Arten · ${list.length}` : `Leben · ${countWord(list.length)}`}</div>
      {list.slice(0, lupe ? 14 : 6).map((s, i) => {
        const r = reg.find(x => x.id === s.id);
        return (
          <button class={`sp-row ${sel === s.id ? 'sel' : ''}`} onClick={() => { S.selectedSpecies.value = s.id; sim.selectSpecies(s.id); S.cellInfo.value = null; if (S.tool.value !== 'look') S.tool.value = 'look'; }}>
            <span class="glyph" style={`color:${speciesColor(s.typus)}`}><Icon name={glyphOf(s.typus)} size={16} stroke={2.2} /></span>
            <span class="grow"><div class="nm">{lupe ? s.name : (r?.name && S.career.value!.named.includes(s.id) ? r.name : `Sorte ${i + 1}`)}</div>
              <div class="sub">{lupe ? `${roleText(s.typus)}${know.temp() ? ` · ${s.typus.topt.toFixed(0)} °C` : ''}` : s.typus.role === 0 ? 'grünlich' : 'bewegt sich'}</div></span>
            {logger && r?.hist?.length ? <Sparkline data={r.hist} color={speciesColor(s.typus)} w={60} h={22} /> : <Bar v={Math.sqrt(s.share)} color={speciesColor(s.typus)} />}
            <Icon name={s.trend > 1.08 ? 'upr' : s.trend < 0.92 ? 'dnr' : 'right'} size={16} class="faint" />
          </button>
        );
      })}
      {!lupe && <p class="tiny faint" style="margin-top:6px">Mit einer Lupe erkennst du die Arten genauer.</p>}
    </div>
  );
}
function AirCard() {
  const m = S.metrics.value; if (!m) return null;
  const meta = S.meta.value;
  return (
    <div class="card">
      <div class="label" style="margin-bottom:8px">Glas</div>
      <div class="stat-grid">
        <div class="stat"><b>{know.o2() ? `${m.o2.toFixed(1)} %` : o2Word(m.o2)}</b><span>Sauerstoff der Luft</span></div>
        <div class="stat"><b>{know.temp() ? `${m.avgT.toFixed(1)} °C` : tempWord(m.avgT)}</b><span>Temperatur Ø</span></div>
        <div class="stat"><b>{stageName(Math.max(1, m.kMax))}</b><span>höchste Stufe</span></div>
        <div class="stat"><b>{meta ? `${Math.round(meta.ctl.lamp * 100)} %` : '–'}</b><span>Sonne</span></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Rechte Spalte
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
  if (!d) return <div class="card"><p class="muted">Lade …</p></div>;
  const t = d.traits;
  const canSample = c.inv.pipette && c.inv.kryo && c.freezer.length < 3 && d.alive;
  return (
    <div class="card">
      <div class="spcard-head"><Portrait t={t} seed={d.id} unknown={!lupe && !c.named.includes(d.id)} /></div>
      <div class="row">
        {editing ? <input value={nm} maxLength={24} onInput={e => setNm((e.target as HTMLInputElement).value)} onKeyDown={e => { if (e.key === 'Enter') { sim.sendCmd({ type: 'rename', species: id, name: nm }, true); setEditing(false); } }} style="flex:1;height:38px;border-radius:10px;border:1px solid var(--line);padding:0 10px;background:var(--card2)" />
          : <h3 class="grow" style="font-size:22px">{lupe || c.named.includes(d.id) ? d.name : 'Unbekannte Sorte'}</h3>}
        {lupe && (editing ? <button class="btn small primary" onClick={() => { sim.sendCmd({ type: 'rename', species: id, name: nm }, true); setEditing(false); }}>OK</button>
          : <button class="iconbtn" title="Umbenennen" onClick={() => { setNm(d.name); setEditing(true); }}><Icon name="sparkle" size={18} /></button>)}
        <button class="iconbtn" onClick={() => { S.selectedSpecies.value = -1; sim.selectSpecies(-1); }} aria-label="Schließen"><Icon name="x" size={18} /></button>
      </div>
      {lupe ? <p class="small muted"><i>{d.latin}</i> · {roleText(t)} · {stageName(t.k)} · seit Tag {Math.floor(d.born / 4)}{d.reason && d.reason !== 'Ursprung' ? ` · entstand durch ${d.reason}` : ''}</p>
        : <p class="small muted">Für Name, Rolle und Herkunft brauchst du eine Lupe.</p>}
      {!d.alive && <p class="small" style="color:var(--bad);margin-top:6px">Ausgestorben (Tag {Math.floor(d.died / 4)}) · {d.cause}</p>}
      <div class="label" style="margin:14px 0 4px">Warum wächst sie hier?</div>
      {reasons(d, micro, { temp: know.temp(), nutr: know.nutr(), rain: know.rain() }).map(r => (
        <div class={`reason ${r.dir === 'unk' ? 'unk' : ''}`}><Icon name={r.dir === 'up' ? 'up' : r.dir === 'down' ? 'down' : r.dir === 'right' ? 'right' : 'info'} size={16} /><span>{r.text}</span></div>
      ))}
      {micro && <><div class="label" style="margin:14px 0 4px">Wohlfühlklima</div><TpcCurve t={t} T={d.T} color={speciesColor(t)} /></>}
      <div class="stat-grid" style="margin-top:12px">
        <div class="stat"><b>{d.total.toFixed(0)}</b><span>Bestand (Einheiten)</span></div>
        <div class="stat"><b>{(d.area * 100).toFixed(1)} %</b><span>der Welt</span></div>
        {micro && <><div class="stat"><b>{t.z.toFixed(2)}</b><span>Größe</span></div><div class="stat"><b>{t.mob.toFixed(2)}</b><span>Beweglichkeit</span></div></>}
      </div>
      {know.data() && d.hist.length > 2 && <div style="margin-top:10px"><div class="label">Verlauf</div><Sparkline data={d.hist} w={300} h={40} color={speciesColor(t)} /></div>}
      <div class="row" style="margin-top:14px;flex-wrap:wrap">
        {micro && <button class={`btn small ${S.overlay.value === 'zone' ? 'primary' : ''}`} onClick={() => { S.overlay.value = S.overlay.value === 'zone' ? 'biome' : 'zone'; sim.selectSpecies(id); }}><Icon name="eye" size={16} />Wohlfühlzone</button>}
        {c.inv.pipette ? <button class="btn small" disabled={!canSample} onClick={async () => {
          const smp = await sim.sample(id); if (!smp) return;
          S.patchCareer(k => { k.freezer.push({ ...smp, frozenDay: Math.floor(S.day.value) }); });
          S.toast(`${smp.name} eingefroren (${S.career.value!.freezer.length}/3 Röhrchen).`, 'info'); sfx('buy');
        }} title={!c.inv.kryo ? 'Kryo-Box fehlt' : c.freezer.length >= 3 ? 'Alle Röhrchen voll' : ''}><Icon name="snow" size={16} />Probe einfrieren</button> : null}
        {know.tree() && <button class="btn small" onClick={() => { S.notebookTab.value = 'tree'; S.screen.value = 'notebook'; }}><Icon name="tree" size={16} />Stammbaum</button>}
      </div>
    </div>
  );
}

function CellDetail() {
  const ci = S.cellInfo.value; const snap = sim.snapCur;
  if (!ci || !snap) return null;
  const o = ci.c * SNAP_FIELDS, b = snap.buf;
  const biome = b[o + 1], T = b[o + 4] / 4 - 20, soil = b[o + 5] / 255, N = b[o + 6] / 60, L = b[o + 9] / 255, hgt = b[o] / 255;
  const st = snap.meta.strains;
  const sp = [b[o + 7], b[o + 8]].filter(x => x !== 255).map(x => st[x]).filter(Boolean);
  const reg = S.registry.value;
  const sea = hgt < snap.meta.sea;
  return (
    <div class="card">
      <div class="row"><span class="dot" style={`background:${biomeCss(biome)};width:14px;height:14px`} /><h3 class="grow">{BIOMES[biome].name}</h3>
        <button class="iconbtn" onClick={() => S.cellInfo.value = null}><Icon name="x" size={18} /></button></div>
      <div class="stat-grid" style="margin-top:10px">
        <div class="stat"><b>{know.temp() ? `${T.toFixed(1)} °C` : tempWord(T)}</b><span>Temperatur</span></div>
        <div class="stat"><b>{L > 0.6 ? 'hell' : L > 0.3 ? 'mittel' : L > 0.1 ? 'dämmrig' : 'dunkel'}</b><span>Licht</span></div>
        {!sea && <div class="stat"><b>{know.rain() ? `${Math.round(soil * 100)} %` : soil > 0.6 ? 'nass' : soil > 0.3 ? 'feucht' : 'trocken'}</b><span>Bodenfeuchte</span></div>}
        <div class="stat"><b>{know.height() ? (sea ? `${((snap.meta.sea - hgt) * 1000).toFixed(0)} m tief` : `${((hgt - snap.meta.sea) * 3000).toFixed(0)} m hoch`) : sea ? 'Meer' : 'Land'}</b><span>{sea ? 'Tiefe' : 'Höhe'}</span></div>
        {know.nutr() && <div class="stat"><b>{N.toFixed(2)}</b><span>Nährstoffe{N > 2.5 ? ' · zu viel!' : ''}</span></div>}
      </div>
      {sp.length > 0 && <><div class="label" style="margin:12px 0 4px">Hier lebt</div>
        {sp.map(s => { const r = reg.find(x => x.id === s!.sp); return r ? (
          <button class="sp-row" onClick={() => { S.selectedSpecies.value = r.id; sim.selectSpecies(r.id); S.cellInfo.value = null; }}>
            <span class="dot" style={`background:${speciesColor(r.typus)}`} /><span class="grow"><div class="nm">{know.species() || S.career.value!.named.includes(r.id) ? r.name : 'eine Sorte'}</div><div class="sub">{know.species() ? roleText(r.typus) : ''}</div></span><Icon name="chevR" size={16} />
          </button>) : null; })}</>}
    </div>
  );
}

function ToolSheet() {
  const tl = S.tool.value; const m = S.meta.value; const c = S.career.value!;
  if (!m || tl === 'look') return null;
  const ctl = m.ctl;
  const T = TOOLS.find(x => x.id === tl)!;
  const lampMax = c.inv.tageslicht ? 1 : 0.6;
  let body = null;
  if (tl === 'sun') body = <>
    <div class="row"><span class="grow">Stärke</span><span class="big">{Math.round(ctl.lamp * 100)} %</span></div>
    <input type="range" min="0" max={lampMax * 100} step="5" value={Math.round(ctl.lamp * 100)} onChange={e => sim.sendCmd({ type: 'sun', I: +(e.target as HTMLInputElement).value / 100 })} />
    {lampMax < 1 && <p class="tiny faint">Mehr als 60 % schafft erst die Tageslichtlampe.</p>}
    <p class="muted small">{c.inv.arm ? 'Ziehe die Sonne über die Schale: Wo sie steht, ist es warm. Am Rand wird es kalt.' : 'Die Kit-Lampe steht fest in der Mitte. Mit einem Lampenarm kannst du sie verschieben.'}</p>
    {c.inv.uhr && <><div class="row"><span class="grow">Tageslänge</span><b>{ctl.photo} h</b></div>
      <input type="range" min="6" max="18" step="1" value={ctl.photo} onChange={e => sim.sendCmd({ type: 'photo', hours: +(e.target as HTMLInputElement).value })} /></>}
  </>;
  if (tl === 'wind') {
    const eight = !!c.inv.vent8;
    const grid = [7, 6, 5, 0, -1, 4, 1, 2, 3]; // Index = woher; Kompass-Anordnung NW N NO / W · O / SW S SO
    const label = ['W', 'NW', 'N', 'NO', 'O', 'SO', 'S', 'SW'];
    const order = [1, 2, 3, 0, -1, 4, 7, 6, 5];
    void grid;
    body = <>
      <p class="muted small">Woher weht der Wind? Er trägt feuchte Meeresluft. An Bergen regnet sie ab, dahinter wird es trocken.</p>
      <div class="compass">{order.map(i => i < 0 ? <button class={!ctl.windOn ? 'on' : ''} onClick={() => sim.sendCmd({ type: 'wind', dir: ctl.wind, on: !ctl.windOn })}>{ctl.windOn ? 'aus' : 'an'}</button>
        : <button class={ctl.windOn && ctl.wind === i ? 'on' : ''} disabled={!eight && i % 2 === 1} onClick={() => sim.sendCmd({ type: 'wind', dir: i, on: true })}>{label[i]}</button>)}</div>
      <p class="small">Wind aus {WIND_NAMES[ctl.wind]}{!ctl.windOn ? ' (Ventilator aus, nur leichte Brise)' : ''}</p>
      {eight && <><div class="row"><span class="grow">Stärke</span><b>{Math.round(ctl.windStr * 100)} %</b></div>
        <input type="range" min="0" max="100" step="5" value={Math.round(ctl.windStr * 100)} onChange={e => sim.sendCmd({ type: 'wind', dir: ctl.wind, on: true, str: +(e.target as HTMLInputElement).value / 100 })} /></>}
      <p class="tiny faint">Regen und Bodenfeuchte ändern sich über einige Tage.</p>
    </>;
  }
  if (tl === 'water') body = <>
    <p class="muted small">Mehr Wasser überflutet Küsten, weniger Wasser legt Landbrücken frei. Landbrücken verbinden getrennte Arten.</p>
    <div class="row"><button class="btn grow" onClick={() => { sim.sendCmd({ type: 'water', delta: -0.012 }, true); sfx('place'); }}><Icon name="minus" size={16} />Ablassen</button>
      <button class="btn grow" onClick={() => { sim.sendCmd({ type: 'water', delta: 0.012 }, true); sfx('place'); }}><Icon name="plus" size={16} />Nachfüllen</button></div>
    {S.metrics.value && <p class="small">Landanteil: {(S.metrics.value.landFrac * 100).toFixed(0)} %</p>}
  </>;
  if (tl === 'volcano') body = <><p class="muted small">Tippe auf die Welt, um einen Vulkanstein zu setzen. Vulkane heben Land, düngen die Umgebung und wärmen sie.</p><p class="small">Vulkansteine: <b>{c.inv.vulkan ?? 0}</b></p></>;
  if (tl === 'terrain') body = <>
    <div class="seg"><button class={(S.career.value!.flags.terrainUp ?? true) ? 'on' : ''} onClick={() => S.patchCareer(k => { k.flags.terrainUp = true; })}>Anheben</button>
      <button class={!(S.career.value!.flags.terrainUp ?? true) ? 'on' : ''} onClick={() => S.patchCareer(k => { k.flags.terrainUp = false; })}>Absenken</button></div>
    <p class="muted small">Über die Welt streichen formt Gebirge oder Becken. Jeder Strich kostet einen Erdkrümel. Leben am Ort stirbt dabei.</p>
    <p class="small">Erdkrümel: <b>{c.inv.kruemel ?? 0}</b></p>
  </>;
  if (tl === 'dose') body = <><p class="muted small">Tippe, wohin eine Prise Nährsalz soll. Gezielt düngen hilft. Zu viel trübt das Wasser und raubt Sauerstoff.</p><p class="small">Prisen: <b>{c.inv.salz ?? 0}</b></p></>;
  if (tl === 'net') body = <p class="muted small">Tippe auf eine Stelle: Der Kescher entfernt alles Leben im Kreis. Er trifft alle Arten.</p>;
  if (tl === 'inoc') body = <>
    <p class="muted small">Wähle, was du einsetzen willst, dann tippe auf die Welt.</p>
    <div class="col">
      {c.inv.starter ? <button class={`btn small ${c.flags.inoc === 'starter' ? 'primary' : ''}`} onClick={() => S.patchCareer(k => { k.flags.inoc = 'starter'; })}>Starterkultur ({c.inv.starter})</button> : null}
      {c.inv.tuempel ? <button class={`btn small ${c.flags.inoc === 'tuempel' ? 'primary' : ''}`} onClick={() => S.patchCareer(k => { k.flags.inoc = 'tuempel'; })}>Tümpelprobe ({c.inv.tuempel})</button> : null}
      {c.freezer.map((f, i) => <button class={`btn small ${c.flags.inoc === 'f' + i ? 'primary' : ''}`} onClick={() => S.patchCareer(k => { k.flags.inoc = 'f' + i; })}><Icon name="snow" size={14} />{f.name} (Tag {f.frozenDay})</button>)}
      {!c.inv.starter && !c.inv.tuempel && !c.freezer.length && <p class="small faint">Nichts zum Einsetzen. Kauf eine Starterkultur oder friere eine Art ein.</p>}
    </div>
  </>;
  if (tl === 'gear') body = <>
    {c.inv.heizplatte ? <><div class="row"><span class="grow">Thermostat-Heizplatte</span><button class={`btn small ${ctl.thermo ? 'primary' : ''}`} onClick={() => sim.sendCmd({ type: 'thermo', on: !ctl.thermo, set: ctl.thermoSet, max: 8 })}>{ctl.thermo ? 'an' : 'aus'}</button></div>
      <div class="row"><span class="grow small muted">Grundtemperatur halten bei</span><b>{ctl.thermoSet} °C</b></div>
      <input type="range" min="6" max="20" step="1" value={ctl.thermoSet} onChange={e => sim.sendCmd({ type: 'thermo', on: ctl.thermo, set: +(e.target as HTMLInputElement).value, max: 8 })} /></> : <p class="small faint">Thermostat-Heizplatte: noch nicht gekauft.</p>}
    {c.inv.kuehlplatte ? <><div class="row"><span class="grow">Kühlplatte</span><b>−{ctl.cool} °C</b></div><input type="range" min="0" max="10" step="1" value={ctl.cool} onChange={e => sim.sendCmd({ type: 'cool', delta: +(e.target as HTMLInputElement).value })} /></> : null}
    {c.inv.uv ? <><div class="row"><span class="grow">UV-Lampe „Mutator“</span><b>×{ctl.uv.toFixed(1)}</b></div><input type="range" min="0.5" max="4" step="0.5" value={ctl.uv} onChange={e => sim.sendCmd({ type: 'uv', factor: +(e.target as HTMLInputElement).value })} /><p class="tiny faint">Mehr Mutationen, aber auch mehr Fehlschläge.</p></> : <p class="small faint">UV-Lampe: noch nicht gekauft.</p>}
    {c.inv.deckel ? <div class="row"><span class="grow">Deckel</span><button class={`btn small ${ctl.lid ? 'primary' : ''}`} onClick={() => sim.sendCmd({ type: 'lid', open: !ctl.lid }, true)}>{ctl.lid ? 'offen' : 'zu'}</button></div> : <p class="small faint">Lüftungsdeckel: noch nicht gekauft.</p>}
  </>;
  return (
    <div class="card sheet-tool">
      <div class="row"><Icon name={T.icon} /><h3 class="grow">{T.name}</h3><button class="iconbtn" onClick={() => { S.tool.value = 'look'; restoreSpeed(); }}><Icon name="x" size={18} /></button></div>
      {body}
    </div>
  );
}

function ContestCard() {
  const st = liveStatus(); const c = S.career.value!;
  if (!st) {
    const av = available(c).filter(x => !c.done.includes(x.id) || x.finale);
    return <div class="card"><div class="label">Kein Wettbewerb</div><p class="small muted" style="margin:6px 0 10px">Freies Spiel. Wähle im Kalender den nächsten Wettbewerb.</p>
      {av[0] && <button class="btn small primary" onClick={() => { if (startContest(av[0].id)) S.toast(`${av[0].name} beginnt!`, 'info'); else S.screen.value = 'calendar'; }}>{av[0].name} starten</button>}</div>;
  }
  return (
    <div class="card">
      <div class="label">Wenn die Jury jetzt käme</div>
      <div class="row" style="margin:8px 0"><h3 class="grow" style="font-size:18px">{st.ct.name}</h3><Stars n={st.stars} unknown={st.unknown} size={18} /></div>
      {st.cats.map(x => { const cat = CATEGORIES[x.id]; const unk = cat.needs && !S.has(cat.needs); return (
        <div style="padding:6px 0"><div class="row small"><span class="grow">{cat.name}{st.cats.length > 1 ? ` (${Math.round(x.w * 100)} %)` : ''}</span><b>{unk ? '?' : Math.round(x.s)}</b></div>
          <Bar v={unk ? 0 : x.s / 100} color="var(--accent)" />
          <div class="tiny faint" style="margin-top:3px">{unk ? `${itemById(cat.needs!).name} fehlt` : cat.fmt(x.x)}</div></div>); })}
      <p class="tiny muted" style="margin-top:6px">Noch {Math.ceil(st.daysLeft)} Tage · {know.rank() ? `aktuell Platz ${st.place}` : `★ ab 40, ★★ ab 65, ★★★ ab 85 Punkten`}</p>
    </div>
  );
}

function StatusChips() {
  const m = S.metrics.value, meta = S.meta.value; if (!m || !meta) return null;
  const chips: { text: string; kind: string }[] = [];
  const effNames: Record<string, string> = { hitze: 'Hitzewelle', lueften: 'Gelüftet: kalte Luft', strom: 'Stromausfall', staub: 'Staub verdunkelt', winter: 'Eiszeit', jury: '' };
  for (const e of meta.effects) if (effNames[e]) chips.push({ text: effNames[e], kind: 'bad' });
  if (meta.ctl.lamp <= 0.01) chips.push({ text: 'Lampe aus', kind: 'bad' });
  if (m.clarity < 0.85) chips.push({ text: 'Wasser trüb', kind: 'bad' });
  if (m.o2 > 12 && m.kMax <= 1) chips.push({ text: 'Sauerstoff wird zum Gift', kind: 'bad' });
  if (meta.ctl.lid) chips.push({ text: 'Deckel offen', kind: '' });
  const h = S.hist.value; if (h.length > 4) { const a = h[h.length - 4].bio, b = h[h.length - 1].bio; if (b < a * 0.7 && a > 50) chips.push({ text: 'Leben nimmt ab', kind: 'bad' }); }
  if (m.minT < -1) chips.push({ text: 'Eis bildet sich', kind: '' });
  const last = S.toasts.value.filter(t => t.kind === 'species').slice(-1)[0];
  return (
    <div class="chips">
      {last && <span class="chip" onClick={() => { if (last.species !== undefined) { S.selectedSpecies.value = last.species; sim.selectSpecies(last.species); } }}><Icon name="sparkle" size={14} />{last.text.length > 60 ? last.text.slice(0, 58) + '…' : last.text}</span>}
      {chips.slice(0, 4).map(c => <span class={`chip ${c.kind}`}>{c.kind === 'bad' && <Icon name="warn" size={14} />}{c.text}</span>)}
    </div>
  );
}

function Legend() {
  const v = S.overlay.value;
  const L: Record<string, [string, string]> = {
    temp: ['−5 °C', 'linear-gradient(90deg,#2952b8,#73b3d9,#f5dc8c,#d9452e)'], rain: ['trocken', 'linear-gradient(90deg,#eee0bf,#2661bf)'],
    height: ['tief', 'linear-gradient(90deg,#1f3d75,#8cb8db,#8cb86b,#d9bf80,#f2f2f2)'], nutr: ['karg', 'linear-gradient(90deg,#f2eddb,#8cbf59,#993f80)'],
    zone: ['schlecht', 'linear-gradient(90deg,#bf4040,#e6e6e6,#26a659)'], light: ['dunkel', 'linear-gradient(90deg,#1a1f33,#fff2b3)'],
  };
  const end: Record<string, string> = { temp: '40 °C', rain: 'nass', height: 'hoch', nutr: 'überdüngt', zone: 'gut', light: 'hell' };
  if (!L[v]) return null;
  return <div class="legend"><span>{L[v][0]}</span><span class="grad" style={`background:${L[v][1]}`} /><span>{end[v]}</span></div>;
}

function Ticker() {
  const ch = S.chronicle.value; const last = ch[ch.length - 1];
  return <div class="ticker">{last ? `Tag ${Math.floor(last.tick / 4)} · ${know.species() || !last.text.startsWith('Neue Art') ? last.text : 'Etwas Neues regt sich im Glas.'}` : 'Das Glas ist still.'}</div>;
}

// ---------------------------------------------------------------- Hauptansicht
export function GlassView() {
  const c = S.career.value!;
  const tl = S.tool.value;
  const T = TOOLS.find(x => x.id === tl);
  const lastPaint = useRef(0);
  const dragSun = useRef(false);

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

  const onPointer = (x: number, y: number, phase: 'down' | 'move' | 'up' | 'hover') => {
    if (S.locked.value) return;
    const meta = S.meta.value; if (!meta) return;
    const { w, h } = meta;
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const cx = Math.floor(x), cy = Math.floor(y);
    const k = S.career.value!;
    if (tl === 'look' && phase === 'up') {
      S.cellInfo.value = { x: cx, y: cy, c: cy * w + cx };
      S.selectedSpecies.value = -1;
      sfx('click');
      return;
    }
    if (tl === 'sun') {
      if (!k.inv.arm) { if (phase === 'down') S.toast('Die Kit-Lampe steht fest. Ein Lampenarm macht sie beweglich.', 'info'); return; }
      const sx = x / w, sy = y / h;
      if (phase === 'down') dragSun.current = Math.hypot((sx - meta.ctl.lampX) * w, (sy - meta.ctl.lampY) * h) < 12 || true;
      if (dragSun.current && (phase === 'down' || phase === 'move')) { const now = performance.now(); if (now - lastPaint.current > 60) { lastPaint.current = now; sim.sendCmd({ type: 'sun', x: sx, y: sy }); } }
      if (phase === 'up') { dragSun.current = false; sim.sendCmd({ type: 'sun', x: sx, y: sy }, true); }
      return;
    }
    if (phase === 'hover') return;
    if (tl === 'volcano' && phase === 'up') {
      if ((k.inv.vulkan ?? 0) <= 0) { S.toast('Keine Vulkansteine mehr.', 'info'); return; }
      sim.sendCmd({ type: 'hotspot', x, y }, true);
      S.patchCareer(z => { z.inv.vulkan--; z.inv.vulkanUsed = (z.inv.vulkanUsed ?? 0) + 1; });
      sfx('event');
      return;
    }
    if (tl === 'terrain' && (phase === 'down' || phase === 'move')) {
      const now = performance.now(); if (now - lastPaint.current < 140) return; lastPaint.current = now;
      if ((k.inv.kruemel ?? 0) <= 0) { if (phase === 'down') S.toast('Keine Erdkrümel mehr. Nachschub gibt’s bei Krause.', 'info'); return; }
      const up = k.flags.terrainUp ?? true;
      sim.sendCmd({ type: 'terrain', x, y, r: 3, delta: up ? 0.035 : -0.035 });
      S.patchCareer(z => { z.inv.kruemel--; });
      return;
    }
    if (tl === 'dose' && phase === 'up') {
      if ((k.inv.salz ?? 0) <= 0) { S.toast('Kein Nährsalz mehr.', 'info'); return; }
      sim.sendCmd({ type: 'dose', x, y, amount: 60 }, true);
      S.patchCareer(z => { z.inv.salz--; });
      sfx('place');
      return;
    }
    if (tl === 'net' && phase === 'up') { sim.sendCmd({ type: 'net', x, y, r: 3 }, true); sfx('place'); return; }
    if (tl === 'inoc' && phase === 'up') {
      const sel = k.flags.inoc as string | undefined;
      if (!sel) { S.toast('Wähle zuerst rechts, was du einsetzen willst.', 'info'); return; }
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

  const sel = S.selectedSpecies.value;
  const rightContent = tl !== 'look' ? <ToolSheet /> : sel >= 0 ? <SpeciesDetail id={sel} /> : S.cellInfo.value ? <CellDetail /> : <ContestCard />;
  const views = VIEWS;
  return (
    <div class="gv">
      <TopBar />
      <div class="gv-main">
        <div class="panel left"><BiomeCard /><SpeciesCard /><AirCard /></div>
        <div class="stage">
          <div class="mapwrap" style={S.locked.value ? 'filter:grayscale(.6)' : ''}>
            <MapCanvas onPointer={onPointer} showSunHandle={tl === 'sun'} showWind={tl === 'wind' || (S.overlay.value === 'rain' && know.rain())} brush={T?.brush ?? 0} />
            <StatusChips />
            <Legend />
          </div>
          <Ticker />
          <div class="views">
              {views.map(v => {
                const ok = !v.needs || v.needs();
                return <button class={`${S.overlay.value === v.id ? 'on' : ''} ${ok ? '' : 'locked'}`} onClick={() => {
                  if (!ok) { S.toast(`Diese Ansicht braucht: ${itemById(v.item!).name}`, 'info'); return; }
                  if (v.id === 'zone' && S.selectedSpecies.value < 0) { S.toast('Wähle zuerst eine Art aus der Liste.', 'info'); return; }
                  S.overlay.value = v.id; sfx('click');
                }}>{!ok && <Icon name="lens" size={14} />}{v.name}</button>;
              })}
            </div>
        </div>
        <div class="panel right">{rightContent}<MobileExtras /></div>
      </div>
      <div class="dock">
        {TOOLS.map(t => {
          const owned = !t.needs || (c.inv[t.needs] ?? 0) > 0 || (t.id === 'inoc' && (c.inv.starter || c.inv.tuempel || c.freezer.length));
          const cnt = t.count?.();
          return <button class={`tool ${tl === t.id ? 'on' : ''} ${owned ? '' : 'locked'}`} disabled={S.locked.value} onClick={() => selectTool(t.id)}>
            {cnt !== undefined && owned && <span class="badge">{cnt}</span>}
            <Icon name={t.icon} size={24} />{t.name}</button>;
        })}
      </div>
    </div>
  );
}

function MobileExtras() {
  // Auf dem Handy liegen die linken Karten unter der Hauptkarte
  const [mobile, setMobile] = useState(window.innerWidth <= 820);
  useEffect(() => { const f = () => setMobile(window.innerWidth <= 820); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  if (!mobile) return null;
  return <><SpeciesCard /><BiomeCard /><AirCard /></>;
}

export { CAUSES, TIPS_BY_CAUSE };
