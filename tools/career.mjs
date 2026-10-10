// Ganze Karriere im Browser durchspielen (Dev-Haken): node tools/career.mjs <url> <outdir>
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:4173/?dev=1', out = process.argv[3] ?? 'shots';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
const ev = (f, a) => page.evaluate(f, a);
const dismiss = async () => { for (let k = 0; k < 5; k++) for (const t of ['Verstanden', 'So soll sie heißen', 'Abfahren']) { const b = page.getByText(t, { exact: true }); if (await b.count()) await b.first().click().catch(() => {}); } };
await page.goto(url); await page.waitForTimeout(800);
await page.getByText('Neues Spiel').click(); await page.getByText("Los geht's").click();
for (let i = 0; i < 3; i++) await page.getByText('Weiter').first().click();
await page.getByRole('button', { name: /Tütchen 1/ }).click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Tütchen 2/ }).click(); await page.waitForTimeout(400);
await page.getByText('Ab auf den Schreibtisch').click(); await page.waitForTimeout(400);
await page.getByText('Lampe an').click(); await page.waitForTimeout(600); await dismiss();
await ev(async () => { await window.__wg.sim.advance(2); }); await page.waitForTimeout(800); await dismiss();
const log = [];
const buyAll = async () => ev(() => { const { career, S } = window.__wg; for (const id of ['thermo', 'lupe', 'tageslicht', 'arm', 'vent', 'regen', 'gas', 'mikro', 'logger', 'boden', 'hoehe', 'heizplatte', 'uhr', 'kanne', 'vent8', 'baum', 'prognose', 'raffer', 'fernrohr']) career.buy(id); window.__wg.sim.sendCmd({ type: 'sun', I: S.career.value.inv.tageslicht ? 0.85 : 0.6 }); });
for (let round = 0; round < 40; round++) {
  const st = await ev(() => { const { S, career } = window.__wg; const c = S.career.value; return { act: c.act, cur: c.current?.id ?? null, av: career.available(c).map(x => x.id), done: c.done, money: c.money, scr: S.screen.value, ended: !!c.ended }; });
  if (st.scr === 'ending') break;
  if (!st.cur) {
    const next = st.av.find(id => !st.done.includes(id)) ?? null;
    if (!next) { log.push(`Akt ${st.act}: nichts offen, done=${st.done}`); break; }
    const ok = await ev((id) => { const { career, S } = window.__wg; S.patchCareer(c => { c.money += 60; }); return career.startContest(id); }, next);
    if (!ok) { log.push('Start fehlgeschlagen ' + next); break; }
    await ev(() => { window.__wg.S.screen.value = 'glass'; });
  }
  const days = await ev(() => { const { S } = window.__wg; return Math.max(0, S.career.value.current.end - S.day.value); });
  await buyAll();
  await ev(async (d) => { await window.__wg.sim.advance(Math.ceil(d) + 0.25); }, days);
  await page.waitForTimeout(1200); await dismiss();
  // Jury abwarten
  await page.waitForSelector('.jury-card', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(9000);
  const res = await ev(() => { const r = window.__wg.S.career.value.results.at(-1); return r ? `${r.contest}: Platz ${r.place} (${r.points} P.) ${r.cats.map(c => c.id + '=' + c.s).join(',')}` : 'kein Ergebnis'; });
  const m = await ev(() => { const m = window.__wg.S.metrics.value; return `Tag ${Math.floor(m.day)} k=${m.kMax} Arten=${m.species} Siedl=${m.settlements} Ära=${m.era} O2=${m.o2.toFixed(1)}`; });
  log.push(res + ' | ' + m);
  if (round % 3 === 0) await page.screenshot({ path: `${out}/c-${round}.png` });
  // Aktwechsel?
  const adv = page.getByText('Weiter: ein neues Kapitel'); const epi = page.getByText('Zum Epilog');
  if (await epi.count()) { await epi.first().click(); await page.waitForTimeout(500); for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /Weiter/ }).first().click().catch(() => {}); await page.screenshot({ path: `${out}/c-ending.png` }); log.push('EPILOG'); break; }
  if (await adv.count()) {
    await adv.first().click(); await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/c-act-${round}.png` });
    await page.getByText("Los geht's").click(); await page.waitForTimeout(1500);
    log.push('→ Akt gewechselt');
    await ev(() => { window.__wg.S.screen.value = 'glass'; }); await page.waitForTimeout(800); await dismiss();
  } else {
    await ev(() => { window.__wg.S.screen.value = 'glass'; }); await page.waitForTimeout(400); await dismiss();
  }
  // Finale verloren? Dann nochmal antreten lassen (Wiederholung)
  await ev(() => { const { S, career } = window.__wg; const c = S.career.value; const fin = career.contestsForAct(c.act).find(x => x.finale); if (c.done.includes(fin.id) && !career.canAdvanceAct(c)) S.patchCareer(k => { k.done = k.done.filter(x => x !== fin.id); }); });
}
await page.screenshot({ path: `${out}/c-final.png` });
console.log(log.join('\n'));
console.log('Fehler:', errs.join('\n') || 'keine');
await browser.close();
