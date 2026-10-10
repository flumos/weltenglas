// Dialoge: Lernkarten, Entdeckungsritual, Nachruf, Einstellungen, Ferien bei Oma, Regal.
import { useState } from 'preact/hooks';
import * as S from '../game/state.ts';
import * as sim from '../game/simClient.ts';
import { CARDS } from '../data/cards.ts';
import { CATEGORIES } from '../data/categories.ts';
import { contestById } from '../data/contests.ts';
import { TIPS_BY_CAUSE } from '../data/story.ts';
import { know, liveStatus, omaHoliday, setSpeedIndex, showCard, fmtMoney } from '../game/career.ts';
import { exportFile, saveGame, wipeSave } from '../game/save.ts';
import { Icon, Stars } from './icons.tsx';
import { Portrait } from './art.tsx';
import { roleText, stageName } from './widgets.tsx';
import { sfx, ambient } from '../game/audio.ts';
import { localStorageGet, localStorageSet } from './App.tsx';
import { ACHIEVEMENTS } from '../data/achievements.ts';

function close() { S.modal.value = null; }

function Discovery({ id }: { id: number }) {
  const r = S.registry.value.find(x => x.id === id);
  const [name, setName] = useState(r?.name ?? '');
  if (!r) { close(); return null; }
  const lupe = know.species();
  const big = r.typus.role > 0 || r.typus.land || r.typus.k > 1;
  return (
    <div class="modal">
      <div class="label">{big ? 'Durchbruch!' : 'Neue Art entdeckt!'}</div>
      <div style="height:170px;border-radius:16px;overflow:hidden;position:relative;margin:12px 0"><Portrait t={r.typus} seed={r.id} unknown={!lupe} /></div>
      <p class="muted small">{lupe ? <>{roleText(r.typus)} · {stageName(r.typus.k)} · <i>{r.latin}</i>{r.reason && r.reason !== 'Ursprung' ? ` · entstand durch ${r.reason}` : ''}</> : 'Ohne Lupe siehst du nur einen Schimmer. Aber einen Namen kannst du ihr trotzdem geben.'}</p>
      <label class="col" style="gap:6px;margin-top:12px"><span class="small muted">Gib ihr einen Namen</span>
        <input value={name} maxLength={24} onInput={e => setName((e.target as HTMLInputElement).value)} style="height:48px;border-radius:12px;border:1px solid var(--line);padding:0 14px;background:var(--card2);font-size:17px;font-weight:600" /></label>
      <div class="row" style="margin-top:16px">
        <button class="btn primary grow" onClick={() => {
          if (name.trim() && name !== r.name) sim.sendCmd({ type: 'rename', species: id, name: name.trim() }, true);
          S.patchCareer(k => { if (!k.named.includes(id)) k.named.push(id); });
          showCard('species'); if (S.modal.value?.kind === 'discovery') close();
          S.selectedSpecies.value = id; sim.selectSpecies(id);
        }}><Icon name="check" size={18} />So soll sie heißen</button>
        <button class="btn" onClick={() => { S.patchCareer(k => { if (!k.named.includes(id)) k.named.push(id); }); close(); }}>Später</button>
      </div>
    </div>
  );
}

function Obituary({ id }: { id: number }) {
  const r = S.registry.value.find(x => x.id === id);
  if (!r) return null;
  const lupe = know.species();
  return (
    <div class="modal">
      <div class="label">Nachruf</div>
      <div style="height:130px;border-radius:16px;overflow:hidden;position:relative;margin:12px 0;filter:grayscale(1)"><Portrait t={r.typus} seed={r.id} unknown={!lupe} /></div>
      <h2>{lupe || S.career.value!.named.includes(id) ? r.name : 'Eine Sorte'} ist ausgestorben</h2>
      <p class="muted" style="margin-top:6px">Gelebt von Tag {Math.floor(r.born / 4)} bis Tag {Math.floor(r.died / 4)}. Größter Bestand: {r.peak.toFixed(0)} Einheiten.</p>
      <div class="letter" style="margin-top:12px">Hauptursache: <b>{r.cause || 'unbekannt'}</b>{TIPS_BY_CAUSE[r.cause] ? <><br />Was hätte geholfen? {TIPS_BY_CAUSE[r.cause]}</> : null}</div>
      <button class="btn primary" style="margin-top:16px" onClick={() => { close(); showCard('extinct'); }}>Verstanden</button>
    </div>
  );
}

function Settings() {
  const c = S.career.value;
  const set = (f: (s: S.Career['settings']) => void) => S.patchCareer(k => f(k.settings));
  const theme = localStorageGet('wg.theme') ?? 'auto';
  const [th, setTh] = useState(theme);
  return (
    <div class="modal">
      <div class="row"><h2 class="grow">Einstellungen</h2><button class="iconbtn" onClick={close}><Icon name="x" /></button></div>
      {c && <div class="col" style="gap:14px;margin-top:16px">
        <div class="row"><span class="grow">Geräusche</span><button class={`btn small ${c.settings.sound ? 'primary' : ''}`} onClick={() => set(s => { s.sound = !s.sound; })}>{c.settings.sound ? 'an' : 'aus'}</button></div>
        <div class="row"><span class="grow">Musik</span><button class={`btn small ${c.settings.music ? 'primary' : ''}`} onClick={() => { set(s => { s.music = !s.music; }); setTimeout(() => ambient(S.screen.value === 'glass' || S.screen.value === 'hub'), 0); }}>{c.settings.music ? 'an' : 'aus'}</button></div>
        <div class="row"><span class="grow">Weniger Bewegung</span><button class={`btn small ${c.settings.reduced ? 'primary' : ''}`} onClick={() => set(s => { s.reduced = !s.reduced; })}>{c.settings.reduced ? 'an' : 'aus'}</button></div>
        <div class="row"><div class="grow">Gärtner-Modus<div class="tiny muted">keine zufälligen Haushalts-Ereignisse</div></div><button class={`btn small ${c.settings.gentle ? 'primary' : ''}`} onClick={() => set(s => { s.gentle = !s.gentle; })}>{c.settings.gentle ? 'an' : 'aus'}</button></div>
        <div class="row"><span class="grow">Erscheinungsbild</span><div class="seg">{[['auto', 'Auto'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, n]) => <button class={th === k ? 'on' : ''} onClick={() => { localStorageSet('wg.theme', k); setTh(k); if (k === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = k; }}>{n}</button>)}</div></div>
        <hr style="border:0;border-top:1px solid var(--line);width:100%" />
        <div class="row" style="flex-wrap:wrap"><button class="btn small" onClick={() => { saveGame(); S.toast('Gespeichert.', 'info'); }}><Icon name="check" size={16} />Speichern</button>
          <button class="btn small" onClick={() => exportFile()}><Icon name="download" size={16} />Als Datei sichern</button>
          <button class="btn small ghost" style="color:var(--bad)" onClick={async () => { if (!confirm('Wirklich alles löschen und neu anfangen?')) return; await wipeSave(); location.reload(); }}>Neues Spiel</button></div>
        <p class="tiny faint">Dein Spielstand liegt nur in diesem Browser. Tipp: Auf dem iPhone „Zum Home-Bildschirm“ hinzufügen, dann bleibt er sicher erhalten. Gespielt: {Math.round(c.playMs / 60000)} min.</p>
      </div>}
    </div>
  );
}

function ContestInfo() {
  const st = liveStatus(); if (!st) { close(); return null; }
  return (
    <div class="modal">
      <div class="row"><div class="grow"><div class="label">{st.ct.place}</div><h2>{st.ct.name}</h2></div><button class="iconbtn" onClick={close}><Icon name="x" /></button></div>
      <p class="muted" style="margin:8px 0 14px">{st.ct.intro}</p>
      {st.cats.map(x => { const cat = CATEGORIES[x.id]; const unk = cat.needs && !S.has(cat.needs); return <div class="catline"><div><b>{cat.name}</b><div class="tiny muted">{cat.desc}</div></div><div class="small">{unk ? '?' : cat.fmt(x.x)}</div><b style="text-align:right">{unk ? '?' : Math.round(x.s)}</b></div>; })}
      <div class="row" style="margin:14px 0"><span class="grow">Wenn die Jury jetzt käme</span><Stars n={st.stars} unknown={st.unknown} size={20} /></div>
      <p class="small muted">Noch {Math.ceil(st.daysLeft)} Tage. Preise: {st.ct.prizes.map(p => fmtMoney(p)).join(' / ')}. Gegner: {st.ct.rivals.map(r => r.name).join(', ')}.</p>
      <div class="letter" style="margin-top:12px"><b>Tipp:</b> {CATEGORIES[[...st.cats].sort((a, b) => a.s - b.s)[0].id].tip}</div>
      <div class="row" style="margin-top:16px"><button class="btn" onClick={() => { if (!confirm('Schon jetzt zur Jury? Die restlichen Tage verfallen.')) return; close(); setSpeedIndex(-1); S.screen.value = 'jury'; }}>Jetzt schon zur Jury</button><button class="btn primary grow" onClick={close}>Weiter</button></div>
    </div>
  );
}

function Oma() {
  return (
    <div class="modal">
      <div class="label">Ferien bei Oma</div>
      <h2 style="margin:6px 0">Fünf Tage weg!</h2>
      <p>Mama sagt: Wir fahren zu Oma. Dein Glas bleibt allein. Stell vorher alles so ein, wie es fünf Tage halten soll – Sonne, Wind, Heizplatte.</p>
      <div class="row" style="margin-top:16px"><button class="btn primary grow" onClick={async () => { close(); await omaHoliday(); }}>Abfahren</button></div>
    </div>
  );
}

function Shelf() {
  const c = S.career.value!;
  const t = c.results.filter(r => r.place <= 3);
  return (
    <div class="modal">
      <div class="row"><h2 class="grow">Regal</h2><button class="iconbtn" onClick={close}><Icon name="x" /></button></div>
      <div class="label" style="margin:14px 0 8px">Pokale und Schleifen</div>
      {t.map(r => <div class="row" style="padding:6px 0"><Icon name="trophy" class={r.place === 1 ? '' : 'faint'} /><span class="grow">{contestById(r.contest).name}</span><b>Platz {r.place}</b></div>)}
      {!t.length && <p class="muted small">Noch leer. Der erste Pokal kommt bestimmt.</p>}
      <div class="label" style="margin:14px 0 8px">Erfolge · {ACHIEVEMENTS.filter(a => c.flags['ach_' + a.id]).length}/{ACHIEVEMENTS.length}</div>
      {ACHIEVEMENTS.map(a => <div class="row small" style={`padding:4px 0;${c.flags['ach_' + a.id] ? '' : 'opacity:.4'}`}><Icon name={c.flags['ach_' + a.id] ? 'star' : 'lens'} size={16} /><b>{a.name}</b><span class="muted grow">{a.desc}</span></div>)}
      <div class="label" style="margin:14px 0 8px">Instrumente</div>
      <p class="small">{Object.keys(c.inv).filter(k => c.inv[k] > 0 && !['salz', 'kruemel', 'vulkan', 'vulkanUsed', 'starter', 'tuempel'].includes(k)).length} Geräte im Regal · Kryo-Röhrchen: {c.freezer.length}/3{c.freezer.length ? ` (${c.freezer.map(f => f.name).join(', ')})` : ''}</p>
    </div>
  );
}

function Help() {
  return (
    <div class="modal">
      <div class="row"><h2 class="grow">So funktioniert dein Glas</h2><button class="iconbtn" onClick={close}><Icon name="x" /></button></div>
      <p class="muted" style="margin:8px 0 14px">Du steuerst nie ein Lebewesen – nur die Bedingungen. Drei Regeln tragen die Welt:</p>
      <div class="col" style="gap:10px">
        <div class="letter"><b>1 · Sauerstoff öffnet die Welt.</b> Plankton macht Sauerstoff. Ab 2 % geht Leben an Land, ab 8 % entsteht Holz und damit Wald.</div>
        <div class="letter"><b>2 · Wasser wandert mit dem Wind.</b> Wo der Wind vom Meer kommt und an Bergen aufsteigt, regnet es. Dahinter liegen Steppe und Wüste.</div>
        <div class="letter"><b>3 · Vielfalt braucht Unterschiede.</b> Warme und kalte Zonen, Gebirge, Inseln und Meeresarme schaffen Nischen. Eine gleichförmige Welt wird eintönig.</div>
      </div>
      <div class="label" style="margin:16px 0 6px">Bedienung</div>
      <p class="small">Werkzeug unten antippen, dann auf die Welt tippen. Ohne Werkzeug untersuchst du eine Stelle. Oben stellst du das Tempo ein. Jeder Wettbewerb hat einen Stichtag – die Sterne zeigen, wie die Jury dein Glas jetzt bewerten würde.</p>
      <p class="small muted" style="margin-top:8px">Tastatur: Leertaste Pause · 1–4 Tempo · S Sonne · W Wind · N Nährsalz · U Untersuchen · H Heft · Esc schließen</p>
      <button class="btn primary" style="margin-top:16px" onClick={close}>Alles klar</button>
    </div>
  );
}

function Tutorial() {
  return (
    <div class="modal">
      <div class="label">Kinderzimmer, Schreibtisch</div>
      <h2 style="margin:6px 0">Es werde Licht.</h2>
      <p>Die Schale steht auf dem Schreibtisch, die kleine Lampe darüber. Ohne Licht passiert nichts. Schalte sie ein!</p>
      <button class="btn primary" style="margin-top:16px" onClick={() => {
        sim.sendCmd({ type: 'sun', I: 0.6 }, true);
        S.patchCareer(k => { k.flags.tutorial = 2; });
        close(); sfx('discover');
        setSpeedIndex(1);
        showCard('lamp');
      }}><Icon name="bulb" size={18} />Lampe an</button>
    </div>
  );
}

export function Modals() {
  const m = S.modal.value;
  if (!m) return null;
  if (m.kind === 'card') {
    const c = CARDS[m.data as string];
    return <div class="card card-learn"><div class="label">Lernkarte</div><h3 style="margin:4px 0 6px">{c.title}</h3><p class="small">{c.text}</p><button class="btn small primary" style="margin-top:12px" onClick={close}>Verstanden</button></div>;
  }
  const inner = m.kind === 'discovery' ? <Discovery id={m.data as number} /> : m.kind === 'obituary' ? <Obituary id={m.data as number} /> : m.kind === 'settings' ? <Settings />
    : m.kind === 'contest' ? <ContestInfo /> : m.kind === 'oma' ? <Oma /> : m.kind === 'shelf' ? <Shelf /> : m.kind === 'tutorial-lamp' ? <Tutorial /> : m.kind === 'help' ? <Help /> : null;
  const dismissable = !['tutorial-lamp', 'oma', 'discovery'].includes(m.kind);
  return <div class="scrim" onClick={() => dismissable && close()}><div onClick={e => e.stopPropagation()} style="width:100%;display:grid;place-items:center">{inner}</div></div>;
}

export function Toasts() {
  const t = S.toasts.value;
  if (S.screen.value !== 'glass') return null;
  return <div class="toasts">{t.filter(x => x.kind !== 'species').slice(-2).map(x => <div class={`toast ${x.kind}`} onClick={() => { if (x.x !== undefined) S.showAt(x.x, x.y); if (x.species !== undefined) { S.selectedSpecies.value = x.species; sim.selectSpecies(x.species); } S.toasts.value = S.toasts.value.filter(y => y.id !== x.id); }}><Icon name={x.kind === 'bad' ? 'warn' : x.kind === 'big' ? 'sparkle' : 'info'} size={18} />{x.text}</div>)}</div>;
}
