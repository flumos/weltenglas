// Forschungsheft (Konzept 4.8): Album, Chronik, Stammbaum, Daten, Notizen.
import { useState } from 'preact/hooks';
import * as S from '../game/state.ts';
import { know } from '../game/career.ts';
import { Icon } from './icons.tsx';
import { Portrait } from './art.tsx';
import { LineChart, speciesColor, roleText, stageName } from './widgets.tsx';
import { TIPS_BY_CAUSE } from '../data/story.ts';
import type { RegRow } from '../game/state.ts';

function Album() {
  const reg = S.registry.value.filter(r => r.est);
  const lupe = know.species(), micro = know.micro();
  const [open, setOpen] = useState<RegRow | null>(null);
  const alive = reg.filter(r => r.alive), dead = reg.filter(r => !r.alive);
  const card = (r: RegRow) => (
    <button class={`card acard ${r.alive ? '' : 'dead'}`} onClick={() => setOpen(r)}>
      <div class="art"><Portrait t={r.typus} seed={r.id} unknown={!lupe && !S.career.value!.named.includes(r.id)} /></div>
      <div class="body"><b>{lupe || S.career.value!.named.includes(r.id) ? r.name : 'Unbekannte Sorte'}</b>
        <div class="tiny muted">{lupe ? `${roleText(r.typus)} · Tag ${Math.floor(r.born / 4)}` : `entdeckt an Tag ${Math.floor(r.born / 4)}`}{!r.alive ? ` · † Tag ${Math.floor(r.died / 4)}` : ''}</div></div>
    </button>
  );
  return <>
    <div class="label" style="margin-bottom:10px">Lebende Arten · {alive.length}</div>
    <div class="album">{alive.map(card)}</div>
    {dead.length > 0 && <><div class="label" style="margin:22px 0 10px">Ausgestorben oder weiterentwickelt · {dead.length}</div><div class="album">{dead.map(card)}</div></>}
    {open && <div class="scrim" onClick={() => setOpen(null)}><div class="modal" onClick={e => e.stopPropagation()}>
      <div style="height:150px;border-radius:14px;overflow:hidden;position:relative;margin-bottom:14px"><Portrait t={open.typus} seed={open.id} unknown={!lupe && !S.career.value!.named.includes(open.id)} /></div>
      <h2>{lupe || S.career.value!.named.includes(open.id) ? open.name : 'Unbekannte Sorte'}</h2>
      {lupe ? <p class="muted"><i>{open.latin}</i> · {roleText(open.typus)} · {stageName(open.typus.k)}</p> : <p class="muted">Mit der Lupe erfährst du mehr.</p>}
      <p style="margin-top:10px">Entstanden an Tag {Math.floor(open.born / 4)}{open.reason && lupe ? ` durch ${open.reason}` : ''}{open.parent >= 0 && lupe ? `, Elternart: ${S.registry.value.find(r => r.id === open.parent)?.name ?? '?'}` : ''}.</p>
      {micro && <p class="small muted" style="margin-top:6px">Wohlfühltemperatur {open.typus.topt.toFixed(1)} °C (±{open.typus.sig.toFixed(1)}), Größe {open.typus.z.toFixed(2)}, Beweglichkeit {open.typus.mob.toFixed(2)}{open.typus.land ? `, Trockenresistenz ${open.typus.dry.toFixed(2)}` : ''}.</p>}
      {!open.alive && open.evolvedTo >= 0 && <p style="margin-top:10px">Hat sich weiterentwickelt zu <b>{S.registry.value.find(r => r.id === open.evolvedTo)?.name}</b>.</p>}
      {!open.alive && open.evolvedTo < 0 && <div class="letter" style="margin-top:12px"><b>Nachruf.</b> Ausgestorben an Tag {Math.floor(open.died / 4)}. Hauptursache: <b>{open.cause || 'unbekannt'}</b>.{TIPS_BY_CAUSE[open.cause] ? <><br />Was hätte geholfen? {TIPS_BY_CAUSE[open.cause]}</> : null}</div>}
      <button class="btn" style="margin-top:16px" onClick={() => setOpen(null)}>Schließen</button>
    </div></div>}
  </>;
}

function Chronicle() {
  const [f, setF] = useState('all');
  const ch = [...S.chronicle.value].reverse();
  const kinds: [string, string][] = [['all', 'Alles'], ['breakthrough', 'Durchbrüche'], ['species', 'Neue Arten'], ['extinct', 'Ausgestorben'], ['event', 'Ereignisse'], ['culture', 'Kulturen'], ['player', 'Eingriffe']];
  const list = ch.filter(e => f === 'all' || e.kind === f || (f === 'event' && (e.kind === 'o2' || e.kind === 'biome' || e.kind === 'plague')));
  return <>
    <div class="tabs">{kinds.map(([k, n]) => <button class={f === k ? 'on' : ''} onClick={() => setF(k)}>{n}</button>)}</div>
    <div class="card" style="padding:4px 18px">
      {list.slice(0, 300).map(e => <div class="chron-row"><span class="muted">Tag {Math.floor(e.tick / 4)}</span><span class="row" style={e.big ? 'font-weight:700' : ''}><span class="grow">{know.species() || !e.text.startsWith('Neue Art') ? e.text : 'Eine neue Sorte ist aufgetaucht.'}</span>{e.x !== undefined && e.x >= 0 && <button class="btn small ghost" onClick={() => S.showAt(e.x, e.y)}><Icon name="eye" size={14} />Zeig mir</button>}</span></div>)}
      {!list.length && <p class="muted" style="padding:16px 0">Noch nichts passiert.</p>}
    </div>
  </>;
}

function Tree() {
  const reg = S.registry.value.filter(r => r.est);
  const [cmp, setCmp] = useState<number[]>([]);
  if (!know.tree()) return <div class="card" style="padding:20px"><h3>Stammbaum</h3><p class="muted" style="margin-top:6px">Wer stammt von wem ab? Die Stammbaum-Software (ab dem Keller) zeichnet es dir auf. Bis dahin: Album und Chronik.</p></div>;
  const byId = new Map(reg.map(r => [r.id, r]));
  // Elternkette auf etablierte Arten verkürzen
  const parentOf = (r: RegRow) => { let p = r.parent; const all = S.registry.value; while (p >= 0 && !byId.has(p)) { const q = all.find(x => x.id === p); p = q ? q.parent : -1; } return p; };
  const kids = new Map<number, RegRow[]>();
  const roots: RegRow[] = [];
  for (const r of reg) { const p = parentOf(r); if (p < 0) roots.push(r); else { if (!kids.has(p)) kids.set(p, []); kids.get(p)!.push(r); } }
  const order: RegRow[] = [];
  const walk = (r: RegRow) => { order.push(r); for (const k of (kids.get(r.id) ?? []).sort((a, b) => a.born - b.born)) walk(k); };
  roots.sort((a, b) => a.born - b.born).forEach(walk);
  const now = S.day.value * 4 || 1;
  const W = Math.max(600, order.length * 46), H = 460, pad = 30;
  const X = new Map(order.map((r, i) => [r.id, pad + i * ((W - 2 * pad) / Math.max(1, order.length - 1))]));
  const Y = (t: number) => H - pad - (t / now) * (H - 2 * pad);
  const a = cmp[0] !== undefined ? byId.get(cmp[0]) : undefined, b = cmp[1] !== undefined ? byId.get(cmp[1]) : undefined;
  return <>
    <p class="small muted" style="margin-bottom:10px">Zeit läuft nach oben. Astbreite = größter Bestand. Tippe zwei Arten an, um sie zu vergleichen.</p>
    <div class="treewrap"><svg width={W} height={H}>
      {order.map(r => {
        const x = X.get(r.id)!, y0 = Y(r.born), y1 = Y(r.alive ? now : r.died);
        const p = parentOf(r); const w = Math.max(2, Math.min(14, Math.sqrt(r.peak) * 0.9));
        const col = speciesColor(r.typus);
        return <g onClick={() => setCmp(c => c.includes(r.id) ? c.filter(x => x !== r.id) : [...c.slice(-1), r.id])} style="cursor:pointer">
          {p >= 0 && <path d={`M${X.get(p)} ${y0} H${x}`} stroke="var(--line)" stroke-width="2" fill="none" />}
          <line x1={x} x2={x} y1={y0} y2={y1} stroke={col} stroke-width={w} stroke-linecap="round" opacity={r.alive ? 1 : 0.45} />
          <circle cx={x} cy={y0} r="4" fill="var(--card)" stroke={col} stroke-width="2" />
          {cmp.includes(r.id) && <circle cx={x} cy={y1} r="9" fill="none" stroke="var(--accent)" stroke-width="2.5" />}
          <text x={x + 6} y={y1 - 6} font-size="11" fill="var(--text)" transform={`rotate(-35 ${x + 6} ${y1 - 6})`}>{r.name}</text>
          {r.reason && r.reason !== 'Ursprung' && <text x={x + 6} y={y0 + 12} font-size="9.5" fill="var(--muted)">{r.reason}</text>}
        </g>;
      })}
    </svg></div>
    {a && b && <div class="card" style="padding:18px;margin-top:14px">
      <h3>{a.name} und {b.name}</h3>
      <p class="small" style="margin:8px 0">{(() => {
        const out: string[] = [];
        const anc = (r: RegRow) => { const s: number[] = []; let p = parentOf(r); while (p >= 0) { s.push(p); const q = byId.get(p); p = q ? parentOf(q) : -1; } return s; };
        const aa = anc(a), bb = anc(b); const common = aa.find(x => bb.includes(x) || x === b.id) ?? bb.find(x => x === a.id);
        if (common !== undefined) out.push(`Gemeinsamer Vorfahre: ${byId.get(common)?.name ?? '?'}.`);
        const dT = b.typus.topt - a.typus.topt;
        if (Math.abs(dT) > 1.5) out.push(`${dT > 0 ? b.name : a.name} mag es ${Math.abs(dT).toFixed(1)} °C wärmer.`);
        if (a.typus.role !== b.typus.role) out.push(`Sie ernähren sich verschieden: ${roleText(a.typus)} gegen ${roleText(b.typus)}.`);
        if (a.typus.land !== b.typus.land) out.push('Eine lebt im Meer, die andere an Land.');
        if (Math.abs(a.typus.z - b.typus.z) > 0.08) out.push(`${a.typus.z > b.typus.z ? a.name : b.name} ist größer.`);
        if (a.typus.k !== b.typus.k) out.push(`Stufe ${a.typus.k} gegen Stufe ${b.typus.k}.`);
        return out.join(' ') || 'Sie sind sich sehr ähnlich – vielleicht trennt sie nur der Ort.';
      })()}</p>
    </div>}
  </>;
}

function Data() {
  const h = S.hist.value;
  if (!know.data()) return <div class="card" style="padding:20px"><h3>Daten</h3><p class="muted" style="margin-top:6px">Was ist passiert, während du weg warst? Mit dem Datenlogger aus der Zoohandlung zeichnet das Heft Kurven auf.</p></div>;
  const days = h.map(d => Math.floor(d.day));
  return <div class="col" style="gap:14px">
    <div class="card" style="padding:18px"><div class="label">Leben (Biomasse)</div>
      <LineChart series={[{ name: 'Meer', color: '#2f7fa0', data: h.map(d => d.sea) }, { name: 'Land', color: '#5a9c4e', data: h.map(d => d.land) }]} labels={days} />
      <div class="row small"><span class="dot" style="background:#2f7fa0" />Meer <span class="dot" style="background:#5a9c4e;margin-left:10px" />Land</div></div>
    <div class="card" style="padding:18px"><div class="label">Tiere</div>
      <LineChart series={[{ name: 'Weidegänger', color: '#d08a00', data: h.map(d => d.graz) }, { name: 'Räuber', color: '#c2453b', data: h.map(d => d.pred) }]} labels={days} />
      <div class="row small"><span class="dot" style="background:#d08a00" />Weidegänger <span class="dot" style="background:#c2453b;margin-left:10px" />Räuber</div></div>
    <div class="card" style="padding:18px"><div class="label">Arten und Vielfalt</div>
      <LineChart series={[{ name: 'Arten', color: '#6b4fbb', data: h.map(d => d.species) }, { name: 'Hill', color: '#2563eb', data: h.map(d => d.hill) }]} labels={days} />
      <div class="row small"><span class="dot" style="background:#6b4fbb" />etablierte Arten <span class="dot" style="background:#2563eb;margin-left:10px" />effektive Artenzahl (Hill)</div></div>
    {know.o2() && <div class="card" style="padding:18px"><div class="label">Sauerstoff der Luft (%)</div>
      <LineChart series={[{ name: 'O2', color: '#1f9d55', data: h.map(d => d.o2) }]} labels={days} /></div>}
  </div>;
}

function Notes() {
  const n = [...S.career.value!.notes].reverse();
  return <div class="col" style="gap:10px">{n.map(x => <div class="card" style="padding:16px"><div class="label">{x.kind === 'letter' ? 'Jury-Brief' : x.kind === 'card' ? 'Lernkarte' : 'Notiz'} · Tag {x.day}</div><h3 style="margin:4px 0 6px;font-size:17px">{x.title}</h3><p class="small">{x.text}</p></div>)}
    {!n.length && <p class="muted">Noch keine Notizen.</p>}</div>;
}

export function Notebook() {
  const tab = S.notebookTab.value;
  const tabs: [string, string][] = [['album', 'Album'], ['chron', 'Chronik'], ['tree', 'Stammbaum'], ['data', 'Daten'], ['notes', 'Notizen']];
  return (
    <div class="page">
      <div class="page-head"><button class="iconbtn" onClick={() => S.screen.value = 'glass'}><Icon name="chevL" /></button><h1 class="grow">Forschungsheft</h1></div>
      <div class="tabs">{tabs.map(([k, n]) => <button class={tab === k ? 'on' : ''} onClick={() => S.notebookTab.value = k}>{n}</button>)}</div>
      {tab === 'album' && <Album />}
      {tab === 'chron' && <Chronicle />}
      {tab === 'tree' && <Tree />}
      {tab === 'data' && <Data />}
      {tab === 'notes' && <Notes />}
    </div>
  );
}
