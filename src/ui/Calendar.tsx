// Kalender: Wettbewerbe wählen (Konzept 3.2)
import * as S from '../game/state.ts';
import { CATEGORIES } from '../data/categories.ts';
import { contestsForAct, available, attemptsOf, bestOf, startContest, fmtMoney, canAdvanceAct, price } from '../game/career.ts';
import { contestById } from '../data/contests.ts';
import { Icon } from './icons.tsx';

export function Calendar() {
  const c = S.career.value!;
  const av = available(c);
  const all = contestsForAct(c.act);
  const cur = c.current ? contestById(c.current.id) : null;
  const advance = canAdvanceAct(c);
  return (
    <div class="page">
      <div class="page-head">
        <button class="iconbtn" onClick={() => S.screen.value = 'hub'}><Icon name="chevL" /></button>
        <h1 class="grow">Kalender</h1>
        <span class="pill"><Icon name="pig" size={18} />{fmtMoney(c.money)}</span>
      </div>
      {cur && <div class="card contest" style="margin-bottom:16px;border-left:4px solid var(--accent)">
        <div class="label">Läuft gerade</div><h3>{cur.name}</h3><p class="small muted">Stichtag in {Math.ceil(c.current!.end - S.day.value)} Tagen.</p>
        <div><button class="btn primary small" onClick={() => S.screen.value = 'glass'}>Zum Glas<Icon name="right" size={16} /></button></div></div>}
      {advance && !c.current && c.act < 3 && <div class="card contest" style="margin-bottom:16px;background:var(--accent);color:var(--accentText)">
        <h3>Ein neues Kapitel wartet</h3><p class="small" style="opacity:.8">Du hast das Finale geschafft. Es geht weiter – Jahre später.</p>
        <div><button class="btn small" onClick={() => { S.modal.value = null; S.screen.value = 'act'; }}>Weiter zu Akt {c.act + 1}<Icon name="right" size={16} /></button></div></div>}
      {advance && !c.current && !c.ended && c.act === 3 && <div class="card contest" style="margin-bottom:16px;background:var(--accent);color:var(--accentText)">
        <h3>Der Grand Prix ist geschafft</h3><div><button class="btn small" onClick={() => S.screen.value = 'ending'}>Zum Epilog<Icon name="right" size={16} /></button></div></div>}
      <div class="cal-grid">
        {all.map(ct => {
          const open = av.includes(ct);
          const tries = attemptsOf(c, ct.id), best = bestOf(c, ct.id);
          const fee = price(c, ct.entry);
          return (
            <div class={`card contest ${tries ? 'done' : ''}`} style={!open ? 'opacity:.55' : ''}>
              <div class="row"><div class="label grow">{ct.finale ? 'Finale' : ct.optional ? 'Sonderwettbewerb' : 'Wettbewerb'} · {ct.place}</div>{best > 0 && <span class="small" style="font-weight:700">bisher Platz {best}</span>}</div>
              <h3>{ct.name}</h3>
              <p class="small muted">{ct.intro}</p>
              <div class="small">{ct.cats.map(x => <div>• <b>{CATEGORIES[x.id].name}</b>{ct.cats.length > 1 ? ` (${Math.round(x.w * 100)} %)` : ''}: <span class="muted">{CATEGORIES[x.id].desc}</span></div>)}</div>
              <div class="row small" style="flex-wrap:wrap;gap:12px"><span><Icon name="clock" size={14} /> {ct.days} Tage</span><span><Icon name="trophy" size={14} /> {ct.prizes.map(p => fmtMoney(price(c, p))).join(' / ')}</span>{fee > 0 && <span>Startgeld {fmtMoney(fee)}</span>}{ct.prizeItem && <span>+ Sachpreis</span>}</div>
              <p class="tiny faint">Gegner: {ct.rivals.map(r => r.name).join(', ')}</p>
              {open && !c.current && <div><button class="btn primary small" onClick={() => { if (startContest(ct.id)) { S.toast(`${ct.name}: Stichtag in ${ct.days} Tagen.`, 'info'); S.screen.value = 'glass'; } }}>{tries ? 'Nochmal antreten' : 'Antreten'}{fee ? ` · ${fmtMoney(fee)}` : ''}</button>{c.money < fee && <span class="tiny muted" style="margin-left:8px">Krause hilft beim Startgeld</span>}</div>}
              {!open && <p class="tiny faint">Noch nicht freigeschaltet.</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
