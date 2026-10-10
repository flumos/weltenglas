// Namensgenerator für Arten (Konzept 8): deutsch, verspielt, aus Rolle, Farbe und Nische,
// dazu ein lateinischer Heftname. Deterministisch über hash01.
import { hash01 } from './math.ts';
import type { Traits } from './types.ts';

const pick = <T>(arr: readonly T[], r: number) => arr[Math.floor(r * arr.length) % arr.length];

function colorWord(hue: number) {
  const h = ((hue % 360) + 360) % 360;
  if (h < 20 || h >= 340) return ['Rot', 'Rubin', 'Purpur'];
  if (h < 45) return ['Glut', 'Kupfer', 'Rost'];
  if (h < 70) return ['Gold', 'Gelb', 'Bernstein'];
  if (h < 160) return ['Grün', 'Moos', 'Lind'];
  if (h < 200) return ['Türkis', 'Jade', 'Petrol'];
  if (h < 260) return ['Blau', 'Azur', 'Kobalt'];
  if (h < 300) return ['Violett', 'Flieder', 'Lila'];
  return ['Rosa', 'Pink', 'Magenta'];
}

function suffix(t: Traits, r: number) {
  if (t.role === 0) {
    if (!t.land) return t.z > 0.25 ? pick(['tang', 'kelp', 'wedel'], r) : pick(['alge', 'plankton', 'flöckchen', 'schwebe', 'perle', 'glimmer'], r);
    if (t.z > 0.62) return pick(['baum', 'krone', 'stamm', 'riese'], r);
    if (t.z > 0.32) return pick(['busch', 'farn', 'kraut', 'strauch'], r);
    return pick(['moos', 'halm', 'gras', 'flaum', 'teppich'], r);
  }
  if (t.role === 1) {
    if (t.land) return t.z > 0.5 ? pick(['grasser', 'weider', 'stapfer'], r) : pick(['hüpfer', 'mümmler', 'krabbler', 'knabberer'], r);
    return t.z > 0.4 ? pick(['schnecke', 'weidling', 'schaber'], r) : pick(['floh', 'wimperling', 'knabberer', 'tänzer'], r);
  }
  if (t.land) return pick(['jäger', 'pirscher', 'greifer', 'lauerer'], r);
  return pick(['schnapper', 'räuber', 'fänger', 'stachler'], r);
}

function prefix(t: Traits, ref: Traits | null, r: number, r2: number) {
  const opts: string[] = [];
  if (t.k >= 6) opts.push('Denk', 'Weis', 'Sinn');
  if (t.topt > 27) opts.push('Glut', 'Hitze', 'Sonnen');
  if (t.topt < 12) opts.push('Frost', 'Eis', 'Kälte');
  if (t.land && t.dry > 0.45) opts.push('Sand', 'Dürre', 'Staub');
  if (t.z > 0.75) opts.push('Riesen', 'Groß');
  if (t.z < 0.05 && !t.land) opts.push('Zwerg', 'Winz');
  if (t.mob > 0.6) opts.push('Flink', 'Wusel', 'Sause');
  if (t.def > 0.45) opts.push('Panzer', 'Stachel', 'Schild');
  if (t.aff > 0.6 && !t.land) opts.push('Schatten', 'Dämmer', 'Tiefen');
  if (ref && t.topt - ref.topt > 3) opts.push('Wärme');
  const colors = colorWord(t.hue);
  if (opts.length === 0 || r2 < 0.45) return pick(colors, r);
  return pick(opts, r);
}

const GENUS = [
  ['Planctula', 'Algina', 'Phycella', 'Thalassia', 'Glaucina'],      // Meer-Produzent
  ['Muscula', 'Graminea', 'Filicella', 'Arborella', 'Herbina'],       // Land-Produzent
  ['Copepella', 'Ciliata', 'Rotifera', 'Daphnula'],                   // Meer-Weidegänger
  ['Saltator', 'Rodentula', 'Herbivora', 'Pascula'],                  // Land-Weidegänger
  ['Raptorella', 'Hydrina', 'Medusula', 'Captor'],                    // Meer-Räuber
  ['Venatrix', 'Insidia', 'Felicula', 'Predatrix'],                   // Land-Räuber
];
const EPI = ['ignea', 'glacialis', 'viridis', 'caerulea', 'aurea', 'rubra', 'velox', 'gigantea', 'minima', 'armata',
  'umbrosa', 'aridica', 'litoralis', 'montana', 'pelagica', 'sapiens', 'vulgaris', 'mira', 'lucida', 'tenax'];

function epithet(t: Traits, r: number) {
  if (t.k >= 6) return 'sapiens';
  if (t.topt > 27) return 'ignea';
  if (t.topt < 12) return 'glacialis';
  if (t.z > 0.75) return 'gigantea';
  if (t.def > 0.45) return 'armata';
  if (t.mob > 0.6) return 'velox';
  if (t.land && t.dry > 0.45) return 'aridica';
  return pick(EPI, r);
}

export function makeName(t: Traits, ref: Traits | null, seed: number, id: number, taken: Set<string>) {
  const r1 = hash01(seed, id, 11), r2 = hash01(seed, id, 23), r3 = hash01(seed, id, 37), r4 = hash01(seed, id, 41);
  const base = prefix(t, ref, r1, r2);
  const suf = suffix(t, r3);
  let name = base + suf;
  if (base.endsWith(suf[0]) || base.toLowerCase().endsWith(suf.slice(0, 2))) name = base + '-' + suf;
  name = name[0].toUpperCase() + name.slice(1);
  if (taken.has(name)) {
    const alt = ['Klein', 'Ufer', 'Berg', 'Tal', 'Insel', 'Nord', 'Süd', 'Ost', 'West', 'Hoch', 'Spät', 'Früh'];
    for (let i = 0; i < alt.length; i++) {
      const cand = alt[(Math.floor(r4 * alt.length) + i) % alt.length] + name.toLowerCase();
      if (!taken.has(cand)) { name = cand; break; }
    }
    let k = 2; const b = name; while (taken.has(name)) name = `${b} ${['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][Math.min(6, k - 2)]}${k > 8 ? k : ''}`, k++;
  }
  const g = GENUS[t.role * 2 + (t.land ? 1 : 0)];
  const latin = `${pick(g, r2)} ${epithet(t, r4)}`;
  return { name, latin };
}

export function settlementName(seed: number, id: number) {
  const a = ['Lum', 'Ka', 'Ori', 'Te', 'Mo', 'Sa', 'Ve', 'Na', 'Ul', 'Ri', 'Ae', 'Dor'];
  const b = ['ra', 'ven', 'thi', 'lo', 'ma', 'sen', 'ki', 'da', 'nor', 'el'];
  const c = ['', 'n', 'th', 's', 'm', 'ra'];
  return pick(a, hash01(seed, id, 3)) + pick(b, hash01(seed, id, 5)) + pick(c, hash01(seed, id, 7));
}
