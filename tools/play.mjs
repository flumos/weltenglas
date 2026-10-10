// Längerer Rundgang mit Dev-Haken: Schulfest → Jury → Laden → Kalender → Stadtteilfest
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:4173/?dev=1', out = process.argv[3] ?? 'shots';
const mobile = process.argv[4] === 'mobile', dark = process.argv[5] === 'dark';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: dark ? 'dark' : 'light' } : { viewport: { width: 1440, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
const pre = mobile ? 'm-' : dark ? 'd-' : '';
const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/${pre}${n}.png` }); };
const dismiss = async () => { for (let k = 0; k < 4; k++) { for (const t of ['Verstanden', 'So soll sie heißen']) { const b = page.getByText(t); if (await b.count()) await b.first().click().catch(() => {}); } } };
const ev = (f) => page.evaluate(f);
await page.goto(url); await page.waitForTimeout(800);
await page.getByText('Neues Spiel').click();
await page.getByText("Los geht's").click();
for (let i = 0; i < 3; i++) await page.getByText('Weiter').first().click();
await page.getByRole('button', { name: /Tütchen 1/ }).click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Tütchen 2/ }).click(); await page.waitForTimeout(500);
await page.getByText('Ab auf den Schreibtisch').click(); await page.waitForTimeout(500);
await page.getByText('Lampe an').click(); await page.waitForTimeout(800);
await dismiss();
// schnell bis kurz vor den Stichtag
await ev(async () => { const w = window.__wg; await w.sim.advance(3); });
await page.waitForTimeout(500); await dismiss();
await shot('10-schulfest');
await ev(async () => { const w = window.__wg; await w.sim.advance(9); });
await page.waitForTimeout(1500); await dismiss();
await page.waitForTimeout(6000);
await shot('11-jury');
// Laden
const b = page.getByText('Zur Zoohandlung'); if (await b.count()) await b.first().click();
await page.waitForTimeout(500); await dismiss();
await shot('12-shop');
await ev(() => { const w = window.__wg; w.S.patchCareer(c => { c.money += 400; }); });
for (const n of ['Thermometer-Karte', 'Lupe', 'Mikroskop', 'Lampenarm', 'Tageslichtlampe', 'Ventilator', 'Regenmesser', 'Datenlogger', 'Gasanalysator', 'Bodenprobe-Set', 'Höhenkarte']) {
  const card = page.locator('.item', { hasText: n }).first();
  const btn = card.getByRole('button', { name: /Kaufen/ }); if (await btn.count()) await btn.click().catch(() => {});
}
await dismiss();
await shot('13-shop-bought');
await page.getByText('Zum Glas').first().click(); await page.waitForTimeout(800); await dismiss();
await ev(async () => { const w = window.__wg; await w.sim.advance(40); });
await page.waitForTimeout(1500); await dismiss();
await shot('14-day55');
// Art auswählen
const row = page.locator('.gv .sp:visible').first(); if (await row.count()) await row.click();
await page.waitForTimeout(1200); await dismiss();
await shot('15-species');
for (const v of ['Temperatur', 'Regen', 'Höhe', 'Arten']) { await page.locator('.seg.views button', { hasText: v === 'Arten' ? 'Leben' : v }).click(); await page.waitForTimeout(700); await shot('16-view-' + v); }
await page.locator('.seg.views button', { hasText: 'Biome' }).click();
// Notizbuch
if (mobile) await page.locator('.ptabs button', { hasText: 'Menü' }).click();
await page.locator('.gv .menu .tool', { hasText: 'Heft' }).click({ force: true }); await page.waitForTimeout(600); await shot('17-album');
await page.getByRole('button', { name: 'Chronik' }).click(); await shot('18-chronik');
await page.getByRole('button', { name: 'Daten' }).click(); await shot('19-daten');
await page.locator('.page-head .iconbtn').click(); await page.waitForTimeout(400);
await page.locator('.brand-mark').click(); await page.waitForTimeout(600); await shot('20-hub');
await page.getByText('Kalender').first().click(); await page.waitForTimeout(500); await shot('21-calendar');
console.log(errs.join('\n') || 'keine Fehler');
await browser.close();
