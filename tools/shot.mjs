// Playwright-Rundgang: node tools/shot.mjs <url> <outdir> [mobile]
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:4173/', out = process.argv[3] ?? 'shots', mobile = process.argv[4] === 'mobile';
const dark = process.argv[5] === 'dark';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: dark ? 'dark' : 'light' } : { viewport: { width: 1440, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${n}.png` }); };
await page.goto(url);
await page.waitForTimeout(800);
await shot('01-title');
await page.getByText('Neues Spiel').click();
await page.waitForTimeout(300);
await shot('02-name');
await page.getByText("Los geht's").click();
for (let i = 0; i < 3; i++) { await shot(`03-prolog${i}`); await page.getByText('Weiter').first().click(); }
await shot('04-bowl');
await page.getByRole('button', { name: /Tütchen 1/ }).click();
await page.waitForTimeout(1500);
await shot('05-sea');
await page.getByRole('button', { name: /Tütchen 2/ }).click();
await page.waitForTimeout(800);
await shot('06-life');
await page.getByText('Ab auf den Schreibtisch').click();
await page.waitForTimeout(800);
await shot('07-glass-dark');
await page.getByText('Lampe an').click();
await page.waitForTimeout(1500);
await shot('08-lamp');
// Lernkarte wegklicken, 10× laufen lassen
for (let k = 0; k < 3; k++) { const b = page.getByText('Verstanden'); if (await b.count()) await b.first().click(); }
await page.getByRole('button', { name: '10×' }).click();
await page.waitForTimeout(12000);
for (let k = 0; k < 3; k++) { const b = page.getByText('Verstanden'); if (await b.count()) await b.first().click().catch(() => {}); }
await shot('09-day10');
console.log(errs.join('\n') || 'keine Fehler');
await browser.close();
