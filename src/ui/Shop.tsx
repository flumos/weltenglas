// Zoohandlung Krause: Der Laden ist der Lehrplan (Konzept 7.1/3).
import * as S from '../game/state.ts';
import { ITEMS, itemById } from '../data/items.ts';
import { KRAUSE } from '../data/story.ts';
import { buy, canBuy, fill, fmtMoney, hashf, krauseTip, moveGlass, price } from '../game/career.ts';
import { Icon } from './icons.tsx';
import { Avatar } from './art.tsx';
import { GLASSES } from '../sim/params.ts';

export function Shop() {
  const c = S.career.value!;
  const tip = krauseTip(c);
  const hello = KRAUSE.hello[Math.floor(hashf(c.seed, c.results.length) * KRAUSE.hello.length)];
  const groups: [string, string][] = [['instrument', 'Messen · jedes Instrument beantwortet eine Frage'], ['device', 'Eingreifen'], ['consumable', 'Verbrauch'], ['glass', 'Schalen']];
  const visible = ITEMS.filter(i => i.act <= c.act);
  const glassOf: Record<string, 'M' | 'L' | 'XL'> = { schaleM: 'M', schaleL: 'L', schaleXL: 'XL' };
  return (
    <div class="page">
      <div class="page-head">
        <button class="iconbtn" onClick={() => S.screen.value = 'hub'}><Icon name="chevL" /></button>
        <h1 class="grow">Zoohandlung Krause</h1>
        <span class="pill"><Icon name="pig" size={18} />{fmtMoney(c.money)}</span>
      </div>
      <div class="card krause">
        <Avatar name="Herr Krause" hue={28} />
        <div class="grow"><p style="font-weight:600">{fill(hello)}</p><p class="muted small" style="margin-top:4px">{fill(tip.text)}{tip.item ? ` → ${itemById(tip.item).name}` : ''}</p></div>
      </div>
      {groups.map(([kind, title]) => {
        const items = visible.filter(i => i.kind === kind);
        if (!items.length) return null;
        return <>
          <div class="label" style="margin:20px 0 10px">{title}</div>
          <div class="shelf">
            {items.map(it => {
              const owned = c.inv[it.id] ?? 0;
              const cb = canBuy(c, it.id);
              const isOwnedTool = (it.kind !== 'consumable') && owned > 0;
              const glass = glassOf[it.id];
              return (
                <div class="card item" style={tip.item === it.id ? 'outline:2px solid var(--star)' : ''}>
                  <div class="top"><div class="ic"><Icon name={it.icon} /></div><div class="grow"><b>{it.name}</b><div class="small muted">{isOwnedTool ? 'im Besitz' : fmtMoney(price(c, it.price))}{it.kind === 'consumable' && owned ? ` · vorrätig: ${owned}` : ''}</div></div></div>
                  {it.question && <div class="q">„{it.question}“</div>}
                  <p class="small muted">{it.does}</p>
                  <span class="spacer" />
                  {glass && owned > 0 ? (
                    c.glass === glass ? <span class="small muted">Dein aktuelles Glas</span> :
                      <button class="btn small primary" onClick={async () => {
                        if (!confirm(`In die ${GLASSES[glass].name} umziehen? Deine Arten, die Luft und die Chronik ziehen mit, das Gelände ist neu.`)) return;
                        await moveGlass(glass); S.toast(`Umgezogen in die ${GLASSES[glass].name}!`, 'big'); S.screen.value = 'glass';
                      }}><Icon name="glass" size={16} />Umziehen</button>
                  ) : isOwnedTool ? <span class="small" style="color:var(--good);font-weight:600"><Icon name="check" size={16} /></span> :
                    <button class="btn small" disabled={!cb.ok} onClick={() => { if (buy(it.id)) S.toast(`${it.name} gekauft!`, 'info'); }}>{cb.ok ? <>Kaufen · {fmtMoney(price(c, it.price))}</> : cb.why}</button>}
                </div>
              );
            })}
          </div>
        </>;
      })}
      <div class="row" style="margin-top:24px"><button class="btn primary" onClick={() => S.screen.value = 'glass'}>Zum Glas<Icon name="right" size={18} /></button><button class="btn" onClick={() => S.screen.value = 'hub'}>Ins Zimmer</button></div>
    </div>
  );
}
