// Zimmer-Hub (Konzept 7.2): diegetisch, aber beschriftet — Kalender, Regal, Heft, Tür, Sparschwein.
import * as S from '../game/state.ts';
import { ACTS } from '../data/story.ts';
import { contestById } from '../data/contests.ts';
import { fmtMoney, liveStatus, fill } from '../game/career.ts';
import { RoomArt } from './art.tsx';
import { Icon, Stars } from './icons.tsx';

export function Hub() {
  const c = S.career.value!;
  const act = ACTS[c.act];
  const st = liveStatus();
  const trophies = c.results.filter(r => r.place <= 3);
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const go = (s: S.Screen) => () => { S.screen.value = s; };
  return (
    <div class="hub">
      <div class="row" style="flex-wrap:wrap">
        <div class="grow"><div class="label">{act.title}</div><h1 style="font-size:28px;margin-top:4px">{fill(`{name}s ${act.place}`)}</h1></div>
        <span class="pill"><Icon name="pig" size={18} />{fmtMoney(c.money)}</span>
        <button class="iconbtn" onClick={() => S.modal.value = { kind: 'settings' }}><Icon name="gear" /></button>
      </div>
      <div class="room">
        <div class="room-scene">
          <RoomArt act={c.act} dark={dark} />
          <button class="hotspot" style="left:9%;top:12%" onClick={go('calendar')}><Icon name="calendar" size={16} />Kalender</button>
          <button class="hotspot" style="left:33%;top:6%" onClick={() => S.modal.value = { kind: 'shelf' }}><Icon name="trophy" size={16} />Regal · {trophies.length}</button>
          <button class="hotspot main" style="left:41%;top:44%" onClick={go('glass')}><Icon name="glass" size={16} />Glas</button>
          <button class="hotspot" style="left:70%;top:62%" onClick={go('notebook')}><Icon name="book" size={16} />Heft</button>
          <button class="hotspot" style="left:20%;top:62%" onClick={() => S.toast(`Im Sparschwein: ${fmtMoney(c.money)}`, 'info')}><Icon name="pig" size={16} />Sparschwein</button>
          <button class="hotspot" style="right:3%;top:40%" onClick={go('shop')}><Icon name="door" size={16} />Zur Zoohandlung</button>
        </div>
        <div class="col" style="gap:12px">
          <div class="card" style="padding:18px">
            <div class="label">Gerade</div>
            {st ? <>
              <h3 style="margin:6px 0">{st.ct.name}</h3>
              <p class="small muted">{st.ct.place} · noch {Math.ceil(st.daysLeft)} Tage</p>
              <div class="row" style="margin-top:10px"><Stars n={st.stars} unknown={st.unknown} size={20} /><span class="spacer" /><button class="btn primary small" onClick={go('glass')}>Zum Glas<Icon name="right" size={16} /></button></div>
            </> : <>
              <p style="margin:6px 0 12px">Kein Wettbewerb läuft. Schau in den Kalender!</p>
              <button class="btn primary small" onClick={go('calendar')}><Icon name="calendar" size={16} />Kalender öffnen</button>
            </>}
          </div>
          <div class="card" style="padding:18px">
            <div class="label">Letzte Ergebnisse</div>
            {c.results.slice(-4).reverse().map(r => <div class="row small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="grow">{contestById(r.contest).name}</span><b>Platz {r.place}</b><span class="muted">{r.points} P.</span></div>)}
            {!c.results.length && <p class="small muted" style="margin-top:6px">Noch keine. Dein erster Wettbewerb wartet.</p>}
          </div>
          <div class="quick">
            <button class="main" onClick={go('glass')}><Icon name="glass" size={26} /><span class="grow" style="color:var(--text);font-size:17px;font-weight:600">Zum Glas<span class="tiny muted" style="display:block;font-weight:400;font-size:13px">beobachten & eingreifen</span></span><Icon name="right" /></button>
            <button onClick={go('shop')}><Icon name="store" />Zoohandlung<span>Instrumente & Geräte</span></button>
            <button onClick={go('notebook')}><Icon name="book" />Forschungsheft<span>Arten, Chronik, Briefe</span></button>
          </div>
        </div>
      </div>
      <p class="small muted" style="margin-top:18px">{act.text}</p>
    </div>
  );
}
