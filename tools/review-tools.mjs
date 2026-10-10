import { chromium } from 'playwright';
const out = 'shots/rev', mobile = process.argv[2] === 'mobile';
const pre = mobile ? 'tm-' : 'td-';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
const ev = (f, a) => page.evaluate(f, a);
let n = 0; const shot = async (t) => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/${pre}${String(n++).padStart(2, '0')}-${t}.png` }); };
const dismiss = async () => { for (let k = 0; k < 4; k++) for (const t of ['Verstanden', 'So soll sie heißen']) { const b = page.getByText(t, { exact: true }); if (await b.count()) await b.first().click().catch(() => {}); } };
await page.goto('http://localhost:4174/?dev=1'); await page.waitForTimeout(800);
await page.getByText('Neues Spiel').click(); await page.getByText("Los geht's").click();
for (let i = 0; i < 3; i++) await page.getByText('Weiter').first().click();
await page.getByRole('button', { name: /Tütchen 1/ }).click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Tütchen 2/ }).click(); await page.waitForTimeout(400);
await page.getByText('Ab auf den Schreibtisch').click(); await page.waitForTimeout(500);
await page.getByText('Lampe an').click(); await page.waitForTimeout(500); await dismiss();
await page.locator('.seg button').first().click(); // Pause
await ev(async () => { await window.__wg.sim.advance(30); }); await page.waitForTimeout(2000); await page.waitForTimeout(9000); await shot('after30'); await ev(() => { window.__wg.S.screen.value = 'glass'; }); await page.waitForTimeout(800); await dismiss();
await ev(() => { const { S, career } = window.__wg; S.patchCareer(c => { c.money = 2000; }); for (const id of ['thermo','lupe','regen','hoehe','boden','logger','gas','mikro','arm','tageslicht','uhr','vent','vent8','kanne','vulkan','spachtel','kruemel','salz','pipette','kryo','kescher','uv','heizplatte','deckel','starter','tuempel']) career.buy(id); });
await dismiss();
const map = page.locator('.mapwrap canvas.fx2');
const box = await map.boundingBox();
const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
const meta = () => ev(() => { const m = window.__wg.S.meta.value; return { lamp: m.ctl.lamp, lx: +m.ctl.lampX.toFixed(2), wind: m.ctl.wind, windOn: m.ctl.windOn, sea: +m.sea.toFixed(3), hs: m.hotspots.length, thermo: m.ctl.thermo, uv: m.ctl.uv, lid: m.ctl.lid }; });
const res = [];
const tool = async (name) => { await page.locator('.dock .tool', { hasText: name }).click(); await page.waitForTimeout(300); await dismiss(); };
// Sonne ziehen
await tool('Sonne'); let a = at(0.5, 0.5), b = at(0.25, 0.35);
const before = await meta();
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
await page.waitForTimeout(400); res.push('Sonne ' + JSON.stringify(before) + ' -> ' + JSON.stringify(await meta())); await shot('sun');
// Wind
await tool('Wind'); const nw = page.locator('.compass button', { hasText: /^NW$/ }); if (await nw.count()) await nw.click(); await page.waitForTimeout(300); res.push('Wind ' + JSON.stringify(await meta())); await shot('wind');
// Wasser
await tool('Wasser'); await page.getByText('Nachfüllen').click(); await page.waitForTimeout(300); res.push('Wasser ' + JSON.stringify(await meta())); await shot('water');
// Vulkan
await tool('Vulkan'); a = at(0.7, 0.6); await page.mouse.click(a.x, a.y); await page.waitForTimeout(300); res.push('Vulkan ' + JSON.stringify(await meta())); await shot('volcano');
// Gelände
await tool('Gelände'); a = at(0.3, 0.7); b = at(0.6, 0.7); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 20 }); await page.mouse.up();
await page.waitForTimeout(500); res.push('Gelände krümel=' + await ev(() => window.__wg.S.career.value.inv.kruemel)); await shot('terrain');
// Nährsalz
await tool('Nährsalz'); a = at(0.4, 0.4); await page.mouse.click(a.x, a.y); res.push('Salz=' + await ev(() => window.__wg.S.career.value.inv.salz)); await shot('dose');
// Kescher
await tool('Kescher'); a = at(0.45, 0.5); await page.mouse.click(a.x, a.y); await page.waitForTimeout(300); await shot('net');
// Geräte
await tool('Geräte'); await shot('gear');
const gearBtns = page.locator('.sheet-tool button.btn');
for (let i = 0; i < await gearBtns.count(); i++) await gearBtns.nth(i).click().catch(() => {});
await page.waitForTimeout(300); res.push('Geräte ' + JSON.stringify(await meta())); await shot('gear2');
// Untersuchen + Kryo
await tool('Untersuchen'); a = at(0.5, 0.5); await page.mouse.click(a.x, a.y); await page.waitForTimeout(500); await shot('cell');
const row = page.locator('.sp-row:visible').first(); await row.click(); await page.waitForTimeout(800); await shot('species');
const frz = page.getByText('Probe einfrieren'); if (await frz.count()) { await frz.click(); await page.waitForTimeout(500); }
res.push('Freezer=' + await ev(() => window.__wg.S.career.value.freezer.length));
// Impfen
await tool('Impfen'); await shot('inoc');
const fb = page.locator('.sheet-tool button', { hasText: 'Tag' }).first(); if (await fb.count()) await fb.click();
a = at(0.2, 0.2); await page.mouse.click(a.x, a.y); await page.waitForTimeout(400);
res.push('Freezer nach Impfen=' + await ev(() => window.__wg.S.career.value.freezer.length));
const tp = page.locator('.sheet-tool button', { hasText: 'Tümpelprobe' }); if (await tp.count()) { await tp.click(); a = at(0.15, 0.5); await page.mouse.click(a.x, a.y); }
await page.waitForTimeout(400); res.push('Tümpel=' + await ev(() => window.__wg.S.career.value.inv.tuempel));
// Ansichten
for (const v of ['Temperatur', 'Regen', 'Höhe', 'Nährstoffe', 'Arten', 'Wohlfühlzone']) { await page.locator('.views button', { hasText: v }).click(); await page.waitForTimeout(600); await shot('view-' + v); }
await page.locator('.views button', { hasText: 'Biome' }).click();
await ev(async () => { await window.__wg.sim.advance(3); }); await page.waitForTimeout(800); await dismiss(); await shot('after');
console.log(res.join('\n')); console.log('errs:', errs.join('\n') || 'keine');
await browser.close();
