// Karriere & Story, Wettbewerb & Jury, Wirtschaft & Laden (Konzept 4.2)
import { batch } from '@preact/signals';
import * as S from './state.ts';
import * as sim from './simClient.ts';
import { CONTESTS, contestById, type Contest } from '../data/contests.ts';
import { CATEGORIES, catScore, stars } from '../data/categories.ts';
import { ITEMS, itemById, STARTER } from '../data/items.ts';
import { CARDS } from '../data/cards.ts';
import { JURY_LINES, KRAUSE } from '../data/story.ts';
import type { Metrics } from '../sim/metrics.ts';
import type { StressResult } from '../data/categories.ts';
import type { Career, ContestResult } from './state.ts';
import { saveGame } from './save.ts';
import { sfx } from './audio.ts';
import { START_TRAITS } from '../sim/world.ts';
import { ACHIEVEMENTS } from '../data/achievements.ts';

// ---------------------------------------------------------------- Helfer
export function hashf(...xs: (number | string)[]) {
  let h = 2166136261 >>> 0;
  for (const x of xs) {
    const s = String(x);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}
const gaussH = (...xs: (number | string)[]) => {
  const u1 = Math.max(1e-9, hashf(...xs, 'a')), u2 = hashf(...xs, 'b');
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};
export const fill = (s: string, c?: Career | null) => s.replace(/\{name\}/g, (c ?? S.career.value)?.name ?? 'Till').replace(/\{cur\}/g, S.cur.value);
export const fmtMoney = (v: number) => `${Math.round(v)} ${S.cur.value}`;

// ---------------------------------------------------------------- Karriere anlegen
export function newCareer(name: string, hero: 'boy' | 'girl'): Career {
  return {
    v: 1, name: name.trim() || 'Till', hero, act: 1, money: 0, currency: 'DM', rep: 0,
    inv: { ...STARTER }, glass: 'S', seed: (Date.now() % 100000) + 7,
    current: null, results: [], done: [], flags: {}, notes: [], freezer: [], cards: [], named: [],
    settings: { sound: true, music: true, reduced: false, gentle: false, scale: 1 },
    started: Date.now(), playMs: 0, day: 0,
  };
}

// ---------------------------------------------------------------- Lernkarten
export function showCard(id: string) {
  const c = S.career.value; if (!c || c.cards.includes(id) || !CARDS[id]) return;
  S.patchCareer(k => { k.cards.push(id); k.notes.push({ day: Math.floor(S.day.value), kind: 'card', title: CARDS[id].title, text: CARDS[id].text }); });
  S.modal.value = { kind: 'card', data: id };
}

// ---------------------------------------------------------------- Wissen (Konzept 4.7)
export const know = {
  temp: () => S.has('thermo'), species: () => S.has('lupe'), rain: () => S.has('regen'), height: () => S.has('hoehe'),
  nutr: () => S.has('boden'), data: () => S.has('logger'), o2: () => S.has('gas'), micro: () => S.has('mikro'),
  tree: () => S.has('baum'), rank: () => S.has('prognose'), culture: () => S.has('fernrohr'),
};
export function tempWord(T: number) { return T < -1 ? 'eisig' : T < 8 ? 'kalt' : T < 16 ? 'kühl' : T < 24 ? 'mild' : T < 30 ? 'warm' : 'heiß'; }
export function o2Word(o2: number) { return o2 < 0.5 ? 'kein Sauerstoff' : o2 < 2 ? 'kaum Sauerstoff' : o2 < 8 ? 'etwas Sauerstoff' : o2 < 16 ? 'viel Sauerstoff' : 'reiche Luft'; }
export function countWord(n: number) { return n <= 1 ? 'eine Sorte' : n <= 3 ? 'ein paar Sorten' : n <= 7 ? 'einige Sorten' : n <= 14 ? 'viele Sorten' : 'unzählige Sorten'; }

// ---------------------------------------------------------------- Kalender
export function contestsForAct(act: number) { return CONTESTS.filter(c => c.act === act); }
export function available(c: Career): Contest[] {
  const list = contestsForAct(c.act);
  const mains = list.filter(x => !x.optional && !x.finale);
  const out: Contest[] = [];
  // Hauptwettbewerbe nacheinander; der nächste offene ist wählbar, schon gespielte sind wiederholbar
  let open = true;
  for (const m of mains) {
    if (open) out.push(m);
    if (!c.done.includes(m.id)) open = false;
  }
  const mainsDone = mains.filter(m => c.done.includes(m.id)).length;
  for (const o of list.filter(x => x.optional)) if (mainsDone >= 2) out.push(o);
  const fin = list.find(x => x.finale);
  if (fin && mains.every(m => c.done.includes(m.id))) out.push(fin);
  return out;
}
export function attemptsOf(c: Career, id: string) { return c.results.filter(r => r.contest === id).length; }
export function bestOf(c: Career, id: string) { const r = c.results.filter(r => r.contest === id); return r.length ? Math.min(...r.map(x => x.place)) : 0; }

const RANDOM_EVENTS: Record<number, string[]> = { 1: ['hitze', 'lueften', 'strom', 'katze'], 2: ['hitze', 'lueften', 'strom', 'winter', 'heizstab'], 3: ['hitze', 'strom', 'winter', 'heizstab'] };
const STORY_EVENTS: Record<string, { day: number; id: string }> = {
  zoocup: { day: 9, id: 'saft' }, stadt: { day: 7, id: 'oma' }, finale1: { day: 14, id: 'murmel' }, land: { day: 12, id: 'winter' }, bund: { day: 15, id: 'heizstab' },
};

export function startContest(id: string) {
  const c = S.career.value!; const ct = contestById(id);
  const fee = ct.entry * (c.currency === 'EUR' ? 1 : 1);
  if (c.money < fee) return false;
  const attempt = attemptsOf(c, id) + 1;
  const start = Math.floor(S.day.value);
  const events: { day: number; id: string }[] = [];
  const story = STORY_EVENTS[id];
  if (story && attempt === 1) events.push({ day: start + story.day, id: story.id });
  if (!c.settings.gentle && id !== 'schulfest') {
    const pool = RANDOM_EVENTS[c.act];
    const nEv = Math.floor(hashf(c.seed, id, attempt, 'n') * 3); // 0–2
    for (let i = 0; i < nEv; i++) {
      const e = pool[Math.floor(hashf(c.seed, id, attempt, i) * pool.length)];
      const d = start + 3 + Math.floor(hashf(c.seed, id, attempt, i, 'd') * Math.max(1, ct.days - 5));
      if (!events.some(x => Math.abs(x.day - d) < 3)) events.push({ day: d, id: e });
    }
  }
  S.patchCareer(k => { k.money -= fee; k.current = { id, start, end: start + ct.days, attempt, events, entryPaid: true }; });
  sim.wantStress(ct.cats.some(x => x.id === 'sturdy' || x.id === 'index'));
  S.stress.value = null;
  if (ct.cats.some(x => x.id === 'sturdy' || x.id === 'index')) sim.runStress().then(r => { if (r) S.stress.value = r; });
  saveGame();
  return true;
}

// ---------------------------------------------------------------- Live-Wertung
export function evaluate(ct: Contest, m: Metrics, stress: StressResult | null) {
  const cats = ct.cats.map(({ id, w, ref }) => { const base = CATEGORIES[id]; const cat = ref ? { ...base, xref: base.x0 + (base.xref - base.x0) * ref } : base; const r = catScore(cat, { m, stress }); return { id, w, s: r.s, x: r.x }; });
  const points = cats.reduce((a, c) => a + c.w * c.s, 0);
  return { cats, points };
}
export function rivalField(c: Career, ct: Contest, attempt: number) {
  return ct.rivals.map(r => ({ name: r.name, desc: r.desc, points: Math.max(5, Math.min(99, r.mu + r.sigma * gaussH(c.seed, ct.id, attempt, r.id))) }));
}
export function liveStatus() {
  const c = S.career.value, m = S.metrics.value;
  if (!c || !c.current || !m) return null;
  const ct = contestById(c.current.id);
  const ev = evaluate(ct, m, S.stress.value);
  const unknown = ct.cats.some(x => { const n = CATEGORIES[x.id].needs; return n && !S.has(n); });
  const field = rivalField(c, ct, c.current.attempt);
  const place = 1 + field.filter(f => f.points > ev.points).length;
  return { ct, ...ev, stars: stars(ev.points), unknown, daysLeft: Math.max(0, c.current.end - S.day.value), place, field };
}

// ---------------------------------------------------------------- Jury
export async function judge(): Promise<ContestResult | null> {
  const c = S.career.value; if (!c || !c.current) return null;
  const ct = contestById(c.current.id);
  const m = await sim.getMetrics(); if (!m) return null;
  const needStress = ct.cats.some(x => x.id === 'sturdy' || x.id === 'index');
  const stress = needStress ? await sim.runStress() : null;
  const ev = evaluate(ct, m, stress);
  const field = rivalField(c, ct, c.current.attempt).map(f => ({ name: f.name, points: Math.round(f.points) }));
  const me = { name: c.name, points: Math.round(ev.points), me: true };
  const all = [...field, me].sort((a, b) => b.points - a.points);
  const place = all.findIndex(x => (x as { me?: boolean }).me) + 1;
  const prize = place <= 3 ? ct.prizes[place - 1] : 0;
  // Jury-Brief aus echten Daten
  const tier = ev.points >= 85 ? 'great' : ev.points >= 65 ? 'good' : ev.points >= 40 ? 'ok' : 'weak';
  const lines = JURY_LINES[tier];
  const opener = lines[Math.floor(hashf(c.seed, ct.id, c.current.attempt, 'l') * lines.length)];
  const facts: string[] = [];
  for (const x of ev.cats) facts.push(`${CATEGORIES[x.id].name}: ${CATEGORIES[x.id].fmt(x.x)}.`);
  const big = S.chronicle.value.filter(e => e.big && e.tick / 4 >= c.current!.start).slice(-1)[0];
  if (big) facts.push(`Besonders beeindruckt hat uns: ${big.text.replace(/^Durchbruch: /, '')}`);
  if (m.species >= 5 && know.species()) facts.push(`${m.species} Arten auf so kleinem Raum!`);
  const weakest = [...ev.cats].sort((a, b) => a.s - b.s)[0];
  const tip = CATEGORIES[weakest.id].tip;
  const letter = `${opener} ${facts.join(' ')}`;
  const result: ContestResult = {
    contest: ct.id, attempt: c.current.attempt, day: Math.floor(S.day.value), place, points: Math.round(ev.points), prize,
    cats: ev.cats.map(x => ({ id: x.id, s: Math.round(x.s), x: x.x })), field: all, letter, tip,
  };
  const pocket = c.act === 1 ? 5 : c.act === 2 ? 10 : 25;
  S.patchCareer(k => {
    k.results.push(result);
    if (!k.done.includes(ct.id)) k.done.push(ct.id);
    k.money += prize + pocket;
    k.rep += place === 1 ? 3 : place <= 3 ? 2 : 1;
    k.current = null;
    if (prize && ct.prizeItem && place === 1) k.inv[ct.prizeItem] = (k.inv[ct.prizeItem] ?? 0) + 1;
    if (ct.finale && place === 1) k.flags['won_' + ct.id] = true;
    k.notes.push({ day: result.day, kind: 'letter', title: `Jury-Brief · ${ct.name}`, text: `Platz ${place} mit ${result.points} Punkten. ${letter} Tipp: ${tip}` });
  });
  sim.wantStress(false);
  saveGame();
  return result;
}

/** Nach dem Finale: nächster Akt, wenn Podium erreicht */
export function canAdvanceAct(c: Career) {
  const fin = contestsForAct(c.act).find(x => x.finale)!;
  return c.results.some(r => r.contest === fin.id && r.place <= 3);
}

// ---------------------------------------------------------------- Laden
export function shopItems(c: Career) {
  return ITEMS.filter(i => i.act <= c.act && i.kind !== 'glass' || (i.kind === 'glass' && i.act <= c.act));
}
export function canBuy(c: Career, id: string) {
  const it = itemById(id);
  if (it.requires && !c.inv[it.requires]) return { ok: false, why: `braucht ${itemById(it.requires).name}` };
  if ((it.kind === 'instrument' || it.kind === 'device' || it.kind === 'glass') && c.inv[id]) return { ok: false, why: 'schon da' };
  if (it.id === 'vulkan' && (c.inv.vulkanUsed ?? 0) + (c.inv.vulkan ?? 0) >= (c.act === 1 ? 3 : 6)) return { ok: false, why: 'mehr geht nicht' };
  if (c.money < price(c, it.price)) return { ok: false, why: 'zu teuer' };
  return { ok: true, why: '' };
}
export function price(c: Career, p: number) { return c.currency === 'EUR' ? Math.max(1, Math.round(p * (c.act === 3 ? 1.2 : 0.8))) : p; }
export function buy(id: string) {
  const c = S.career.value!; const it = itemById(id);
  if (!canBuy(c, id).ok) return false;
  S.patchCareer(k => { k.money -= price(k, it.price); k.inv[id] = (k.inv[id] ?? 0) + (it.pack ?? 1); });
  sfx('buy');
  if (id === 'kryo') showCard('freezer');
  saveGame();
  return true;
}
export function krauseTip(c: Career) {
  const last = c.results[c.results.length - 1];
  const adv = KRAUSE.advice;
  if (last) {
    const weakest = [...last.cats].sort((a, b) => a.s - b.s)[0]?.id;
    const map: Record<string, [string, string][]> = {
      green: [['tageslicht', adv.light], ['arm', adv.light]], colorful: [['lupe', adv.species], ['arm', adv.light]],
      foodweb: [['mikro', adv.micro], ['tageslicht', adv.light]], landscapes: [['vent', adv.wind], ['spachtel', adv.shape], ['regen', adv.rain]],
      rainforest: [['vent', adv.wind], ['tageslicht', adv.light]], sturdy: [['heizplatte', adv.heat]], bigstep: [['gas', adv.o2], ['tageslicht', adv.light]],
    };
    for (const [item, txt] of map[weakest] ?? []) if (!c.inv[item]) return { item, text: txt };
  }
  for (const [item, key] of [['thermo', 'temp'], ['lupe', 'species'], ['regen', 'rain'], ['gas', 'o2'], ['mikro', 'micro']] as const) if (!c.inv[item]) return { item, text: adv[key] };
  return { item: '', text: adv.generic };
}

// ---------------------------------------------------------------- Akte
export async function enterAct(act: 2 | 3) {
  const c = S.career.value!;
  S.patchCareer(k => {
    k.act = act;
    if (act === 2 && k.currency === 'DM') { k.money = Math.round(k.money / 1.95583); k.currency = 'EUR'; k.flags.euro = true; }
  });
  if (act === 2) {
    sim.sendCmd({ type: 'ctl', patch: { maxK: 6, seasons: true, drift: true } });
    showCard('seasons');
  }
  if (act === 3) {
    sim.sendCmd({ type: 'ctl', patch: { maxK: 6, seasons: true, drift: true, cultures: true } });
    if (c.inv.schaleXL && c.glass !== 'XL') await moveGlass('XL');
  }
  saveGame();
}

export async function moveGlass(size: 'M' | 'L' | 'XL') {
  await sim.transplantTo(size, (S.career.value!.seed + size.charCodeAt(0)) >>> 0);
  S.patchCareer(k => { k.glass = size; });
  sim.refresh();
  saveGame();
}

/** Story-Fallback für Akt 3: Laborprobe einer denkenden Linie, abgeleitet vom stärksten Landtier */
export async function labSample() {
  const reg = S.registry.value;
  if (reg.some(r => r.alive && r.typus.k >= 6)) return false;
  const base = reg.filter(r => r.alive && r.typus.land && r.typus.role > 0).sort((a, b) => b.peak - a.peak)[0];
  const t = base ? { ...base.typus } : { ...START_TRAITS, role: 1, land: 1, mob: 0.7, dry: 0.3, hue: 30, z: 0.3, k: 4 };
  Object.assign(t, { k: 6, brain: 0.8, social: 0.6, mob: Math.max(0.62, t.mob), role: 1, land: 1 });
  let x = (S.meta.value?.w ?? 96) * 0.5, y = (S.meta.value?.h ?? 64) * 0.5;
  if (base) { const d = await sim.inspect(base.id); if (d && d.cx >= 0) { x = d.cx; y = d.cy; } }
  sim.sendCmd({ type: 'inoculate', traits: t, x, y, name: 'Denker', amount: 2.0 }, true);
  return true;
}

// ---------------------------------------------------------------- Tagesverarbeitung
export function onDayGame(d: sim.DayMsg) {
  const c = S.career.value; if (!c) return;
  if (Math.floor(d.day) !== c.day) S.patchCareer(k => { k.day = Math.floor(d.day); });
  // Chronik → Meldungen, Entdeckungsritual, Nachruf
  for (const e of d.chron) {
    if (e.kind === 'breakthrough' || (e.kind === 'species' && e.big)) {
      S.toast(e.text, 'big', { species: e.species, x: e.x, y: e.y }); sfx('discover');
      if (e.text.includes('Landgang!')) showCard('land');
      if (e.text.includes('Holz')) showCard('wood');
      if (e.species !== undefined && !c.named.includes(e.species) && !S.modal.value) S.modal.value = { kind: 'discovery', data: e.species };
    } else if (e.kind === 'species') {
      S.toast(know.species() ? e.text : 'Etwas Neues regt sich im Glas …', 'species', { species: e.species, x: e.x, y: e.y });
      if (!c.cards.includes('species') && e.species !== undefined && !S.modal.value) S.modal.value = { kind: 'discovery', data: e.species };
    } else if (e.kind === 'extinct') {
      S.toast(e.text, 'bad', { species: e.species });
      if (e.big && e.species !== undefined && !S.modal.value) S.modal.value = { kind: 'obituary', data: e.species };
      else showCard('extinct');
    } else if (e.kind === 'o2') {
      S.toast(know.o2() ? e.text : e.text.replace(/\d+ %/, 'genug'), e.big ? 'big' : 'info');
      if (e.text.includes('2 %')) showCard('o2');
    } else if (e.kind === 'plague') { S.toast(e.text, 'bad', { species: e.species }); showCard('plague'); }
    else if (e.kind === 'event' || e.kind === 'culture' || e.kind === 'biome' || e.kind === 'anagenesis') {
      S.toast(e.text, e.big ? 'big' : 'info', { x: e.x, y: e.y });
      if (e.kind === 'culture') showCard('culture');
    }
  }
  if (d.metrics.o2 > 13 && d.metrics.kMax <= 1 && !c.cards.includes('oxycat')) showCard('oxycat');
  if (d.metrics.clarity < 0.75 && !c.cards.includes('overdose')) showCard('overdose');
  // Wettbewerb: Ereignisse und Stichtag
  const cu = c.current;
  if (cu) {
    for (const ev of cu.events) {
      if (Math.floor(d.day) === ev.day && !c.flags[`ev_${cu.id}_${cu.attempt}_${ev.day}`]) {
        S.patchCareer(k => { k.flags[`ev_${cu.id}_${cu.attempt}_${ev.day}`] = true; });
        fireEvent(ev.id);
      }
    }
    if (d.day >= cu.end) {
      setSpeedIndex(-1);
      S.modal.value = null;
      S.screen.value = 'jury';
    }
  }
  for (const a of ACHIEVEMENTS) if (!c.flags['ach_' + a.id] && a.check(d.metrics, d.flags)) {
    S.patchCareer(k => { k.flags['ach_' + a.id] = Math.floor(d.day); });
    S.toast(`Erfolg: ${a.name}`, 'info');
  }
  if (Math.floor(d.day) % 5 === 0) saveGame();
}

export function fireEvent(id: string) {
  const m = S.meta.value;
  if (id === 'murmel') {
    const x = (m?.w ?? 96) * (0.3 + 0.4 * hashf(S.career.value!.seed, 'mx')), y = (m?.h ?? 64) * (0.3 + 0.4 * hashf(S.career.value!.seed, 'my'));
    sim.sendCmd({ type: 'meteor', x, y }, true); sfx('impact');
    return;
  }
  if (id === 'oma') {
    S.modal.value = { kind: 'oma' };
    return;
  }
  sim.sendCmd({ type: 'event', id }, true);
  sfx('event');
}
export async function omaHoliday() {
  S.locked.value = true;
  setSpeedIndex(-1);
  await sim.advance(5);
  S.locked.value = false;
  S.toast('Zurück von Oma! Fünf Tage sind vergangen.', 'info');
}

export function setSpeedIndex(i: number) {
  batch(() => {
    if (i < 0) { S.paused.value = true; sim.setTps(0); return; }
    S.speed.value = i; S.paused.value = false; sim.setTps(S.SPEEDS[i].tps);
  });
}
export function maxSpeedIndex() { return S.has('raffer') ? 3 : 2; }

export const fmtDay = (d: number) => `Tag ${Math.floor(d)}`;
export const glassYears = (d: number) => {
  const y = d; return y < 1000 ? `${Math.floor(y)} Mio. Glasjahre` : `${(y / 1000).toFixed(1)} Mrd. Glasjahre`;
};
