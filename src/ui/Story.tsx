// Aktwechsel und Epilog
import { useState } from 'preact/hooks';
import * as S from '../game/state.ts';
import { ACTS, ENDING } from '../data/story.ts';
import { enterAct, fill, labSample, fmtMoney } from '../game/career.ts';
import { RoomArt } from './art.tsx';
import { Icon } from './icons.tsx';
import { saveGame } from '../game/save.ts';

export function ActIntro() {
  const c = S.career.value!;
  const [next] = useState(() => Math.min(3, c.act + 1) as 2 | 3);
  const a = ACTS[next];
  const [busy, setBusy] = useState(false);
  return (
    <div class="prolog"><div class="card prolog-card col" style="gap:16px;max-width:720px">
      <div class="room-scene" style="aspect-ratio:16/8"><RoomArt act={next} /></div>
      <div class="label">{a.year}</div>
      <h2>{a.title}</h2>
      <p style="font-size:17px">{fill(a.text)}</p>
      {next === 2 && <p class="small muted">Dein Erspartes wird umgerechnet: 1 Euro = 1,95583 Mark. Neu: Jahreszeiten, wandernde Kontinente, Nervensysteme – und vielleicht mehr. In der Zoohandlung gibt es Stammbaum-Software, eine Jury-Prognose und ein Zeitraffer-Modul.</p>}
      {next === 3 && <p class="small muted">Neu: Kulturen. Wesen, die denken, bilden Siedlungen – und deuten alles, was du in ihrem Sichtfeld tust, als Wunder. Sei gütig, und sei sparsam damit.</p>}
      <button class="btn primary" disabled={busy} onClick={async () => {
        setBusy(true);
        await enterAct(next);
        if (next === 3) {
          // Fallback: Gibt es noch keine denkenden Wesen, schickt Dr. Brand eine Laborprobe
          if (await labSample()) S.toast('Dr. Ilse Brand schickt dir eine Laborprobe: „Denker“, eine kluge Linie aus ihrem Institut.', 'big');
        }
        if (next === 2) S.toast(`Willkommen im Keller! Kontostand: ${fmtMoney(S.career.value!.money)}`, 'big');
        saveGame();
        S.screen.value = 'hub';
        setBusy(false);
      }}>Los geht's<Icon name="right" size={18} /></button>
    </div></div>
  );
}

export function Ending() {
  const [i, setI] = useState(0);
  const c = S.career.value!;
  const last = i >= ENDING.length;
  return (
    <div class="prolog"><div class="card prolog-card col" style="gap:18px;max-width:640px;text-align:center">
      <div class="label">Epilog</div>
      {!last ? <p style="font-size:20px;line-height:1.55">{fill(ENDING[i])}</p> : <>
        <h2>Ende</h2>
        <p class="muted">Danke fürs Spielen, {c.name}. Dein Glas läuft weiter – im freien Spiel, so lange du willst.</p>
        <div class="stat-grid" style="margin-top:6px">
          <div class="stat"><b>{Math.floor(S.day.value)}</b><span>Glastage</span></div>
          <div class="stat"><b>{S.registry.value.filter(r => r.est).length}</b><span>Arten entdeckt</span></div>
          <div class="stat"><b>{c.results.filter(r => r.place === 1).length}</b><span>Siege</span></div>
          <div class="stat"><b>{Math.round(c.playMs / 60000)} min</b><span>Spielzeit</span></div>
        </div>
      </>}
      <button class="btn primary" onClick={() => { if (!last) setI(i + 1); else { S.patchCareer(k => { k.ended = true; }); S.screen.value = 'glass'; } }}>{last ? 'Weiter im freien Spiel' : 'Weiter'}<Icon name="right" size={18} /></button>
    </div></div>
  );
}
