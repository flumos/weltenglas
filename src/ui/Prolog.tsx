// Prolog (Konzept 3.3): Comic-Anzeige, Sparschwein, Paket, Tütchen 1 „Urmeer“, Tütchen 2 „Lebenskeime“.
import { useState } from 'preact/hooks';
import * as S from '../game/state.ts';
import * as sim from '../game/simClient.ts';
import { newCareer, fill, setSpeedIndex } from '../game/career.ts';
import { PROLOG } from '../data/story.ts';
import { MapCanvas } from './MapCanvas.tsx';
import { Icon } from './icons.tsx';
import { sfx } from '../game/audio.ts';
import { saveGame } from '../game/save.ts';

export function Prolog() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Till');
  const [hero, setHero] = useState<'boy' | 'girl'>('boy');
  const [sea, setSea] = useState(false);
  const [life, setLife] = useState(false);
  const [busy, setBusy] = useState(false);

  if (step === 0) return (
    <div class="prolog"><div class="card prolog-card col" style="gap:16px">
      <div class="label">Bevor es losgeht</div>
      <h2>Wer bist du?</h2>
      <label class="col" style="gap:6px"><span class="small muted">Dein Name</span>
        <input value={name} maxLength={18} onInput={e => setName((e.target as HTMLInputElement).value)} style="height:48px;border-radius:12px;border:1px solid var(--line);padding:0 14px;background:var(--card2)" /></label>
      <div class="seg" style="align-self:flex-start">
        <button class={hero === 'boy' ? 'on' : ''} onClick={() => setHero('boy')}>Junge</button>
        <button class={hero === 'girl' ? 'on' : ''} onClick={() => setHero('girl')}>Mädchen</button>
      </div>
      <button class="btn primary" onClick={() => { S.career.value = newCareer(name, hero); setStep(1); }}>Los geht's<Icon name="right" size={18} /></button>
    </div></div>
  );
  if (step <= PROLOG.length) {
    const p = PROLOG[step - 1];
    return (
      <div class="prolog"><div class="card prolog-card col" style="gap:18px">
        {p.art === 'ad' ? <div class="ad">{fill(p.text)}</div> : <p style="font-size:19px;line-height:1.55">{fill(p.text)}</p>}
        {p.art === 'pig' && <div style="font-size:15px" class="muted">Taschengeld: 9,90 DM. Genau richtig.</div>}
        <button class="btn primary" onClick={() => setStep(step + 1)}>Weiter<Icon name="right" size={18} /></button>
      </div></div>
    );
  }
  const pourSea = async () => {
    if (sea || busy) return;
    setBusy(true); sfx('place');
    const c = S.career.value!;
    await sim.initWorld({ opts: { size: 'S', seed: c.seed }, seedLife: false });
    sim.sendCmd({ type: 'ctl', patch: { lamp: 0.05 } });
    setSea(true); setBusy(false);
  };
  const pourLife = () => {
    if (!sea || life) return;
    sfx('discover');
    sim.sendCmd({ type: 'seedLife' }, true);
    setLife(true);
  };
  return (
    <div class="prolog"><div class="card prolog-card col" style="gap:16px;max-width:720px">
      <div class="label">Das Paket</div>
      <h2>{!sea ? 'Kipp Tütchen 1 in die Schale.' : !life ? 'Jetzt Tütchen 2: die Lebenskeime.' : 'Fertig! Jetzt fehlt nur noch Licht.'}</h2>
      <div class="bowl" onClick={() => (!sea ? pourSea() : pourLife())}>
        {sea ? <div class="mapwrap" style="border-radius:28px;box-shadow:none;position:absolute;inset:0"><MapCanvas small /></div>
          : <svg viewBox="0 0 300 200" style="position:absolute;inset:0;width:100%;height:100%"><rect width="300" height="200" fill="#8f877a" /><path d="M40 120c30-40 70-30 110-50s90 10 110 40-60 60-120 50-120 0-100-40z" fill="#a49b8c" /><circle cx="120" cy="90" r="20" fill="#b4ab9c" /><circle cx="200" cy="120" r="14" fill="#9c9385" /></svg>}
        <div class="hint">{!sea ? 'Tippe hier, um das Urmeer einzugießen' : !life ? 'Tippe, um die Lebenskeime einzustreuen' : ''}</div>
      </div>
      <div class="packets">
        <button class={`packet ${sea ? 'used' : ''}`} onClick={pourSea} disabled={sea}>Tütchen 1<br /><span class="small muted">„Urmeer“</span></button>
        <button class={`packet ${life ? 'used' : ''}`} onClick={pourLife} disabled={!sea || life}>Tütchen 2<br /><span class="small muted">„Lebenskeime“</span></button>
      </div>
      <p class="small muted">{!sea ? 'Wasser und Mineralien füllen die Senken. Was herausragt, wird Land.' : !life ? 'Das Wasser füllt die Senken, Inseln bleiben stehen. Noch ist alles kahl.' : 'Winzige Urflöckchen treiben im Meer. Ohne Licht werden sie nicht wachsen.'}</p>
      {life && <button class="btn primary" onClick={() => {
        sim.sendCmd({ type: 'ctl', patch: { lamp: 0 } });
        setSpeedIndex(-1);
        S.screen.value = 'glass';
        S.patchCareer(c => { c.flags.tutorial = 1; });
        saveGame();
      }}>Ab auf den Schreibtisch<Icon name="right" size={18} /></button>}
    </div></div>
  );
}
