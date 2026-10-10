import { chromium } from 'playwright';
const out = 'shots/rev', mobile = process.argv[2] === 'mobile', dark = process.argv[3] === 'dark';
const pre = (mobile ? 'm' : 'd') + (dark ? 'D' : 'L') + '-';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: dark ? 'dark' : 'light' } : { viewport: { width: 1440, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
let n = 0; const shot = async (t) => { await page.screenshot({ path: `${out}/${pre}${String(n++).padStart(2, '0')}-${t}.png` }); };
await page.goto('http://localhost:4174/'); await page.waitForTimeout(800);
await page.getByText('Neues Spiel').click(); await page.getByText("Los geht's").click();
for (let i = 0; i < 3; i++) await page.getByText('Weiter').first().click();
await page.getByRole('button', { name: /Tütchen 1/ }).click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Tütchen 2/ }).click(); await page.waitForTimeout(400);
await page.getByText('Ab auf den Schreibtisch').click(); await page.waitForTimeout(600);
await shot('tutorial');
await page.getByText('Lampe an').click(); await page.waitForTimeout(800);
await shot('lampcard');
const log = [];
const t0 = Date.now();
let sawJury = false;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(2500);
  const modal = await page.evaluate(() => { const m = document.querySelector('.scrim .modal, .card-learn'); return m ? m.innerText.slice(0, 80).replace(/\n/g, ' | ') : ''; });
  const top = await page.evaluate(() => document.querySelector('.topbar')?.innerText.replace(/\n/g, ' ') ?? document.body.innerText.slice(0, 80).replace(/\n/g, ' '));
  log.push(`${((Date.now() - t0) / 1000).toFixed(0)}s modal=[${modal}] top=[${top}]`);
  if (i === 1) { const b = page.getByRole('button', { name: '10×' }); if (await b.count()) await b.click(); }
  if (i % 4 === 0) await shot('t' + i);
  // wie ein Spieler: Karten bestätigen, Entdeckung benennen
  for (const t of ['Verstanden', 'So soll sie heißen']) { const b = page.getByText(t, { exact: true }); if (await b.count()) { await shot('modal-' + t.slice(0, 5)); await b.first().click().catch(() => {}); } }
  if (await page.locator('.jury-card').count()) { sawJury = true; await page.waitForTimeout(9000); await shot('jury'); break; }
}
console.log(log.join('\n'));
console.log('jury:', sawJury, 'errs:', errs.join('\n') || 'keine');
await browser.close();
