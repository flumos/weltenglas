// Jury-Show (Konzept 3.2): Lupe fährt übers Glas, Kategorien füllen sich, Podium, Brief.
import { useEffect, useState } from 'preact/hooks';
import * as S from '../game/state.ts';
import { judge, fmtMoney, canAdvanceAct, showCard } from '../game/career.ts';
import { contestById } from '../data/contests.ts';
import { CATEGORIES, stars, medal } from '../data/categories.ts';
import { itemById } from '../data/items.ts';
import { Icon, Stars } from './icons.tsx';
import { Bar } from './widgets.tsx';
import { sfx } from '../game/audio.ts';
import type { ContestResult } from '../game/state.ts';

export function Jury() {
  const [res, setRes] = useState<ContestResult | null>(null);
  const [stage, setStage] = useState(0);
  const c = S.career.value!;
  useEffect(() => {
    let alive = true;
    sfx('drum');
    judge().then(r => { if (!alive) return; if (!r) { S.screen.value = 'calendar'; return; } setRes(r); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!res) return;
    const reduced = c.settings.reduced;
    const steps = res.cats.length + 3;
    if (stage < steps) { const t = setTimeout(() => { setStage(stage + 1); if (stage === res.cats.length + 1) sfx(res.place <= 3 ? 'win' : 'lose'); }, reduced ? 50 : stage === 0 ? 1600 : 900); return () => clearTimeout(t); }
  }, [res, stage]);
  useEffect(() => { if (res && res.place > 3 && stage > res.cats.length + 2) showCard('lose'); }, [res, stage]);
  if (!res) return <div class="jury"><div class="card jury-card"><h2>Die Jury schaut sich dein Glas an …</h2><p class="muted" style="margin-top:8px">Die Lupe fährt langsam über die Schale.</p></div></div>;
  const ct = contestById(res.contest);
  const top3 = res.field.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = [90, 120, 70];
  const advance = ct.finale && res.place <= 3;
  return (
    <div class="jury"><div class="card jury-card">
      <div class="label">{ct.place} · Jury: {ct.jury.join(', ')}</div>
      <h2 style="margin:6px 0 16px">{ct.name}</h2>
      {res.cats.map((x, i) => {
        const cat = CATEGORIES[x.id];
        return <div class="catline" style={stage > i ? '' : 'opacity:.25'}>
          <div><b>{cat.name}</b><div class="tiny muted">{stage > i ? cat.fmt(x.x) : '…'}</div></div>
          <Bar v={stage > i ? x.s / 100 : 0} color="var(--accent)" />
          <b style="text-align:right">{stage > i ? x.s : ''}</b>
        </div>;
      })}
      {stage > res.cats.length && <div class="row" style="margin:14px 0"><span class="grow" style="font-size:20px;font-weight:700">{res.points} Punkte</span><Stars n={stars(res.points)} size={22} />{medal(res.points) && <span class="chip">{medal(res.points)}-Schleife</span>}</div>}
      {stage > res.cats.length + 1 && <>
        <div class="podium">
          {podiumOrder.map((p, i) => <div class={(p as { me?: boolean }).me ? 'me' : ''} style={`height:${heights[i]}px`}><span>{p.name}</span><span style="opacity:.75">{p.points} P.</span><span style="font-size:18px">{[2, 1, 3][i]}.</span></div>)}
        </div>
        <p style="text-align:center;font-size:18px;font-weight:700">{res.place <= 3 ? `Platz ${res.place}! ${res.prize ? `Preisgeld: ${fmtMoney(res.prize)}` : ''}` : `Platz ${res.place} von ${res.field.length}. Jeder bekommt eine Schleife.`}</p>
        {res.place === 1 && ct.prizeItem && <p style="text-align:center" class="small">Sachpreis: <b>{itemById(ct.prizeItem).name}</b></p>}
        <p class="tiny muted" style="text-align:center;margin-top:4px">{res.field.map((f, i) => `${i + 1}. ${f.name} (${f.points})`).join(' · ')}</p>
      </>}
      {stage > res.cats.length + 2 && <>
        <div class="label" style="margin:18px 0 8px">Jury-Brief</div>
        <div class="letter">{res.letter}<br /><br /><b>Tipp:</b> {res.tip}</div>
        <p class="small muted" style="margin-top:8px">+ {fmtMoney(c.act === 1 ? 5 : c.act === 2 ? 10 : 25)} Taschengeld</p>
        <div class="row" style="margin-top:16px;flex-wrap:wrap">
          {advance && ct.id === 'grandprix' ? <button class="btn primary" onClick={() => S.screen.value = 'ending'}>Zum Epilog<Icon name="right" size={18} /></button>
            : advance && canAdvanceAct(S.career.value!) ? <button class="btn primary" onClick={() => S.screen.value = 'act'}>Weiter: ein neues Kapitel<Icon name="right" size={18} /></button>
              : <button class="btn primary" onClick={() => { S.screen.value = 'shop'; showCard('shop'); }}><Icon name="store" size={18} />Zur Zoohandlung</button>}
          <button class="btn" onClick={() => S.screen.value = 'calendar'}><Icon name="calendar" size={18} />Kalender</button>
          <button class="btn ghost" onClick={() => S.screen.value = 'glass'}>Zum Glas</button>
        </div>
      </>}
    </div></div>
  );
}
