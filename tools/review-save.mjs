import { chromium } from 'playwright';
const out = 'shots/rev';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
const ev = (f, a) => page.evaluate(f, a);
const dismiss = async () => { for (let k = 0; k < 4; k++) for (const t of ['Verstanden', 'So soll sie heißen']) { const b = page.getByText(t, { exact: true }); if (await b.count()) await b.first().click().catch(() => {}); } };
const state = () => ev(() => { const { S } = window.__wg; const c = S.career.value; return { day: +S.day.value.toFixed(2), money: c?.money, cur: c?.current?.id, end: c?.current?.end, species: S.speciesList.value.filter(s => s.est).length, glass: c?.glass, scr: S.screen.value, w: S.meta.value?.w, names: S.registry.value.filter(r => r.est).map(r => r.name) }; });
await page.goto('http://localhost:4174/?dev=1'); await page.waitForTimeout(800);
await page.getByText('Neues Spiel').click(); await page.getByText("Los geht's").click();
for (let i = 0; i < 3; i++) await page.getByText('Weiter').first().click();
await page.getByRole('button', { name: /Tütchen 1/ }).click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Tütchen 2/ }).click(); await page.waitForTimeout(400);
await page.getByText('Ab auf den Schreibtisch').click(); await page.waitForTimeout(500);
await page.getByText('Lampe an').click(); await page.waitForTimeout(500); await dismiss();
await ev(async () => { await window.__wg.sim.advance(5); }); await page.waitForTimeout(1000); await dismiss();
const s1 = await state(); console.log('vor Reload', JSON.stringify({ ...s1, names: s1.names.length }));
await ev(async () => { await window.__wg.save.saveGame(); });
await page.waitForTimeout(500);
await page.reload(); await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/s-01-title-after-reload.png` });
await page.getByText('Weiterspielen').click(); await page.waitForTimeout(1500); await dismiss();
const s2 = await state(); console.log('nach Reload', JSON.stringify({ ...s2, names: s2.names.length }));
await page.screenshot({ path: `${out}/s-02-after-reload.png` });
// läuft die Zeit nach Reload? Tempo-Status
console.log('paused nach reload:', await ev(() => window.__wg.S.paused.value));
// Reload ohne explizites Speichern (nur Autosave/pagehide)
await ev(async () => { await window.__wg.sim.advance(1); });
await page.waitForTimeout(300);
await page.reload(); await page.waitForTimeout(1500);
await page.getByText('Weiterspielen').click(); await page.waitForTimeout(1500); await dismiss();
const s3 = await state(); console.log('nach Reload ohne Save', JSON.stringify({ day: s3.day, cur: s3.cur }));
// Schulfest beenden, Geld, Schale M kaufen + umziehen
await ev(async () => { await window.__wg.sim.advance(10); }); await page.waitForTimeout(10000);
await ev(() => { const { S, career } = window.__wg; S.patchCareer(c => { c.money += 200; }); career.buy('schaleM'); career.buy('pipette'); career.buy('kryo'); career.buy('lupe'); S.screen.value = 'shop'; });
await page.waitForTimeout(500);
page.on('dialog', d => d.accept());
const um = page.getByText('Umziehen'); console.log('Umziehen-Button:', await um.count());
if (await um.count()) { await um.first().click(); await page.waitForTimeout(3000); }
await dismiss();
const s4 = await state(); console.log('nach Umzug', JSON.stringify({ ...s4, names: s4.names.length }));
await page.screenshot({ path: `${out}/s-03-schaleM.png` });
await ev(async () => { await window.__wg.sim.advance(5); }); await page.waitForTimeout(1500); await dismiss();
await page.screenshot({ path: `${out}/s-04-schaleM-5d.png` });
// Kryo + Impfen erzeugt Duplikat?
const dup = await ev(async () => { const { S, sim } = window.__wg; const id = S.speciesList.value[0].id; const smp = await sim.sample(id); const { name, ...t } = smp; sim.sendCmd({ type: 'inoculate', traits: t, x: 10, y: 10, name }, true); await new Promise(r => setTimeout(r, 800)); return S.registry.value.filter(r => r.name === name).length; });
console.log('Einträge gleichen Namens nach Wiedereinsetzen:', dup);
// Export
const [dl] = await Promise.all([page.waitForEvent('download'), ev(() => window.__wg.save.exportFile())]);
const p = await dl.path(); const fs = await import('fs'); console.log('Export Bytes:', fs.statSync(p).size);
// Import über Titel
await ev(async () => { await window.__wg.save.wipeSave(); }); await page.reload(); await page.waitForTimeout(1000);
await page.locator('input[type=file]').setInputFiles(p); await page.waitForTimeout(3000);
const s5 = await state(); console.log('nach Import', JSON.stringify({ day: s5.day, money: s5.money, glass: s5.glass, w: s5.w, scr: s5.scr }));
console.log('errs:', errs.join('\n') || 'keine');
await browser.close();
