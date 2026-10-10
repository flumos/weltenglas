import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const ev = (f, a) => page.evaluate(f, a);
await page.goto('http://localhost:4174/?dev=1'); await page.waitForTimeout(800);
await page.getByText('Neues Spiel').click(); await page.getByText("Los geht's").click();
for (let i = 0; i < 3; i++) await page.getByText('Weiter').first().click();
await page.getByRole('button', { name: /Tütchen 1/ }).click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Tütchen 2/ }).click(); await page.waitForTimeout(400);
await page.getByText('Ab auf den Schreibtisch').click(); await page.waitForTimeout(500);
await page.getByText('Lampe an').click(); await page.waitForTimeout(500);
const r = await ev(async () => {
  const { S, career } = window.__wg; const out = [];
  S.patchCareer(c => { c.current = null; });
  for (const act of [1, 2, 3]) {
    S.patchCareer(c => { c.act = act; c.money = 0; c.done = []; c.currency = act > 1 ? 'EUR' : 'DM'; });
    const av = career.available(S.career.value);
    out.push(`Akt ${act}, Geld 0, nichts gespielt: ${av.map(x => x.id + '(' + career.price(S.career.value, x.entry) + ')').join(', ')} → startbar: ${av.filter(x => career.price(S.career.value, x.entry) <= 0).map(x => x.id).join(',') || 'KEINER'}`);
    const all = career.contestsForAct(act).filter(x => !x.optional && !x.finale).map(x => x.id);
    S.patchCareer(c => { c.done = all; });
    const av2 = career.available(S.career.value);
    out.push(`Akt ${act}, Geld 0, alle Haupt gespielt: startbar: ${av2.filter(x => career.price(S.career.value, x.entry) <= 0).map(x => x.id).join(',') || 'KEINER'}`);
  }
  // Startgeld-Prüfung in startContest selbst
  S.patchCareer(c => { c.act = 1; c.money = 3; c.done = ['schulfest', 'stadtteil', 'zoocup']; c.currency = 'DM'; });
  out.push('startContest(stadt) mit 3 DM: ' + career.startContest('stadt'));
  S.patchCareer(c => { c.current = null; c.act = 2; c.money = 12; c.currency = 'EUR'; c.done = []; });
  const fee = career.price(S.career.value, 15);
  out.push(`Akt 2 land: angezeigt ${fee} €, startContest mit 12 €: ${career.startContest('land')} (entry roh 15)`);
  return out;
});
console.log(r.join('\n')); console.log('errs', errs.join('\n') || 'keine');
await browser.close();
