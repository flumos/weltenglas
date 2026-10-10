// Schnellcheck Glas-Ansicht: neues Spiel → Instrumente kaufen → 40 Tage → Screenshots Desktop + Handy
// node tools/glass-shots.mjs <url> <ordner>
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5199/?dev=1', out = process.argv[3] ?? 'shots/redesign';
import { mkdirSync } from 'node:fs'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
async function run(pre, ctxOpts, mobile) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(pre + m.text()); });
  page.on('pageerror', e => errs.push(pre + 'pageerror: ' + e.message));
  const shot = async (n) => { await page.waitForTimeout(600); await page.screenshot({ path: `${out}/${pre}${n}.png` }); };
  const dismiss = async () => { for (let k = 0; k < 4; k++) { for (const t of ['Verstanden', 'So soll sie heißen', 'Weiter geht', 'Schließen']) { const b = page.getByText(t, { exact: false }); if (await b.count()) await b.first().click({ timeout: 500 }).catch(() => {}); } } };
  const ev = (f, a) => page.evaluate(f, a);
  await page.goto(url); await page.waitForTimeout(800);
  await page.getByText('Neues Spiel').click();
  await page.getByText("Los geht's").click();
  for (let i = 0; i < 3; i++) await page.getByText('Weiter').first().click();
  await page.getByRole('button', { name: /Tütchen 1/ }).click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Tütchen 2/ }).click(); await page.waitForTimeout(500);
  await page.getByText('Ab auf den Schreibtisch').click(); await page.waitForTimeout(500);
  await page.getByText('Lampe an').click(); await page.waitForTimeout(800);
  await dismiss();
  await shot('01-start');
  await ev(() => { const w = window.__wg; w.S.patchCareer(c => { for (const id of ['thermo', 'lupe', 'regen', 'hoehe', 'boden', 'logger', 'gas', 'mikro', 'arm', 'tageslicht', 'uhr', 'vent', 'vent8', 'kanne', 'pipette', 'kescher', 'deckel']) c.inv[id] = 1; c.inv.vulkan = 1; c.inv.salz = 3; for (const k of ['tools', 'contest', 'species', 'jury']) if (!c.cards.includes(k)) c.cards.push(k); }); });
  await ev(async () => { await window.__wg.sim.advance(6); });
  await page.waitForTimeout(1500); await dismiss(); await page.waitForTimeout(500); await dismiss();
  await shot('02-day9');
  return { page, ctx, shot, dismiss };
}
const d = await run('d-', { viewport: { width: 1440, height: 900 } });
{
  const p = d.page;
  await p.locator('.ctl').first().hover(); await d.shot('03-link');
  const bx = await p.locator('.mapwrap').boundingBox();
  await p.mouse.move(bx.x + bx.width * 0.45, bx.y + bx.height * 0.5); await d.shot('04-probe');
  await p.mouse.click(bx.x + bx.width * 0.45, bx.y + bx.height * 0.5); await d.shot('05-cell');
  await p.locator('.back').first().click().catch(() => {});
  await p.locator('.gv .sp').first().click().catch(() => {}); await p.waitForTimeout(800); await d.shot('06-species');
  await p.locator('.back').first().click().catch(() => {});
  await p.locator('.seg.views button', { hasText: 'Temperatur' }).click(); await d.shot('07-temp');
  await p.locator('.gv .tabs button', { hasText: 'Chronik' }).click(); await d.shot('08-chronik');
  await p.locator('.gv .tool', { hasText: 'Salz' }).click(); await d.shot('09-tool');
  await p.setViewportSize({ width: 1100, height: 760 }); await d.shot('10-small');
}
await d.ctx.close();
const m = await run('m-', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
{
  const p = m.page;
  for (const [t, n] of [['Werte', '03-werte'], ['Bedingungen', '04-bed'], ['Eingriff', '05-eingriff'], ['Menü', '06-menu']]) {
    await p.locator('.ptabs button', { hasText: t }).click(); await m.shot(n);
  }
  await p.locator('.ptabs button', { hasText: 'Menü' }).click();
  const bx = await p.locator('.mapwrap').boundingBox();
  await p.mouse.click(bx.x + bx.width * 0.5, bx.y + bx.height * 0.45); await p.waitForTimeout(600); await m.shot('07-cell');
}
await m.ctx.close();
await browser.close();
console.log(errs.join('\n') || 'keine Fehler');
