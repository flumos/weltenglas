import { useEffect, useState } from 'preact/hooks';
import * as S from '../game/state.ts';
import * as sim from '../game/simClient.ts';
import { loadGame, hasSave, saveGame, wipeSave, importFile } from '../game/save.ts';
import { onDayGame, setSpeedIndex } from '../game/career.ts';
import { ambient, unlockAudio } from '../game/audio.ts';
import { Prolog } from './Prolog.tsx';
import { GlassView } from './GlassView.tsx';
import { Hub } from './Hub.tsx';
import { Shop } from './Shop.tsx';
import { Calendar } from './Calendar.tsx';
import { Jury } from './Jury.tsx';
import { Notebook } from './Notebook.tsx';
import { ActIntro, Ending } from './Story.tsx';
import { Modals, Toasts } from './Modals.tsx';
import { Icon } from './icons.tsx';
import { TitleArt } from './art.tsx';

sim.onDay(onDayGame);

function applyTheme() {
  const t = localStorageGet('wg.theme');
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
export function localStorageGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
export function localStorageSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* privat */ } }

export async function continueGame() {
  const b = await loadGame(); if (!b) return false;
  S.career.value = b.career;
  S.chronicle.value = b.world.chronicle.slice(-500);
  S.hist.value = b.world.hist.slice(-400);
  await sim.initWorld({ world: b.world, chronFrom: b.world.chronicle.length });
  const cu = b.career.current;
  if (cu && ['felsen', 'gleich', 'grandprix'].includes(cu.id)) { sim.wantStress(true); sim.runStress().then(r => { if (r) S.stress.value = r; }); }
  S.screen.value = cu ? 'glass' : 'hub';
  return true;
}

function Title() {
  const [save, setSave] = useState<boolean | null>(null);
  useEffect(() => { hasSave().then(setSave); }, []);
  const onImport = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    try { await importFile(f); await continueGame(); } catch (err) { alert('Diese Datei konnte nicht geladen werden.'); }
  };
  return (
    <div class="title-screen">
      <div class="card title-card">
        <div class="title-orb"><TitleArt /></div>
        <h1>Weltenglas</h1>
        <p class="muted" style="margin:10px 0 24px">Eine Welt in einer Glasschale, in der Evolution passiert – und du gewinnst Wettbewerbe, ohne je ein Lebewesen zu steuern.</p>
        <div class="col">
          {save && <button class="btn primary" onClick={() => { unlockAudio(); continueGame(); }}><Icon name="play" size={18} />Weiterspielen</button>}
          <button class={`btn ${save ? '' : 'primary'}`} onClick={async () => {
            unlockAudio();
            if (save && !confirm('Neues Spiel beginnen? Dein bisheriger Spielstand wird überschrieben.')) return;
            await wipeSave(); S.screen.value = 'prolog';
          }}><Icon name="sparkle" size={18} />Neues Spiel</button>
          <label class="btn ghost small" style="cursor:pointer"><Icon name="upload" size={16} />Spielstand-Datei laden<input type="file" accept="application/json,.json" hidden onChange={onImport} /></label>
        </div>
        <p class="tiny faint" style="margin-top:18px">Ein Spiel über Bedingungen statt Befehle. Wissenschaftlich inspiriert, spielerisch beschleunigt.</p>
      </div>
    </div>
  );
}

export function App() {
  const scr = S.screen.value;
  useEffect(() => {
    applyTheme();
    const vis = () => {
      if (document.visibilityState === 'hidden') { if (S.career.value) { setSpeedIndex(-1); saveGame(); } }
    };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', () => { if (S.career.value) saveGame(); });
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);
  useEffect(() => {
    const t = setInterval(() => { if (S.career.value && !S.paused.value) S.patchCareer(c => { c.playMs += 10000; }); }, 10000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { ambient(scr === 'glass' || scr === 'hub'); }, [scr]);
  return (
    <>
      {scr === 'title' && <Title />}
      {scr === 'prolog' && <Prolog />}
      {scr === 'glass' && <GlassView />}
      {scr === 'hub' && <Hub />}
      {scr === 'shop' && <Shop />}
      {scr === 'calendar' && <Calendar />}
      {scr === 'jury' && <Jury />}
      {scr === 'notebook' && <Notebook />}
      {scr === 'act' && <ActIntro />}
      {scr === 'ending' && <Ending />}
      <Modals />
      <Toasts />
    </>
  );
}
