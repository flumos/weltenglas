// Kategorien-Katalog (Konzept 4.5): alles aus der Engine messbar.
// Punkte je Kategorie: s = 100 · clamp((x − x0)/(xref − x0))^γ
import type { Metrics } from '../sim/metrics.ts';
import { B_FOREST, B_RAIN, B_TAIGA, B_ICE, B_DESERT, B_REEF } from '../sim/params.ts';

export interface StressResult { resistance: number; resilience: number; speciesKept: number; score: number }
export interface CatCtx { m: Metrics; stress?: StressResult | null }

export interface Category {
  id: string; name: string; short: string; desc: string;
  x: (c: CatCtx) => number; x0: number; xref: number; gamma: number;
  /** Instrument, ohne das die Live-Vorschau „?“ zeigt */
  needs?: string;
  /** Text für den Messwert */
  fmt: (x: number) => string;
  tip: string;
}

const frac = (m: Metrics, ids: number[]) => ids.reduce((a, i) => a + m.biomeFrac[i], 0);

export const CATEGORIES: Record<string, Category> = {
  green: {
    id: 'green', name: 'Grünste Welt', short: 'Grün', desc: 'Pflanzen- und Plankton-Biomasse je Feld, mal Klarheit des Wassers.',
    x: ({ m }) => m.green, x0: 0.5, xref: 1.35, gamma: 1.2, fmt: x => `${x.toFixed(2)} Grün je Feld`,
    tip: 'Mehr Licht und eine Prise Nährsalz dort, wo es grün ist. Aber Vorsicht: Zu viel Dünger trübt das Wasser.',
  },
  colorful: {
    id: 'colorful', name: 'Buntestes Meer', short: 'Bunt', desc: '0,6 · etablierte Arten + 0,4 · Hill-Vielfalt (wie ausgewogen die Arten sind).',
    x: ({ m }) => 0.6 * m.species + 0.4 * m.hill, x0: 2, xref: 10, gamma: 1, needs: 'lupe', fmt: x => `Vielfaltswert ${x.toFixed(1)}`,
    tip: 'Vielfalt braucht Unterschiede: warme und kalte Zonen, Inseln, Meeresarme. Schiebe die Sonne aus der Mitte, dann entstehen Nischen.',
  },
  foodweb: {
    id: 'foodweb', name: 'Fressen und gefressen werden', short: 'Nahrung', desc: 'Ernährungsstufen, Biomasse der Tiere und ein Bonus für Räuber.',
    x: ({ m }) => m.levels * 10 + 2 * Math.sqrt(m.graz) + 3 * Math.sqrt(m.pred),
    x0: 80, xref: 150, gamma: 1.3, fmt: x => `${x.toFixed(0)} Nahrungspunkte`,
    tip: 'Weidegänger brauchen viel Plankton, Räuber viele Weidegänger. Ein reiches, warmes Meer trägt mehr Stufen.',
  },
  landscapes: {
    id: 'landscapes', name: 'Vielfalt der Landschaften', short: 'Landschaften', desc: 'Anzahl Biome mit mindestens 3 % Fläche, dazu wie gleichmäßig sie verteilt sind.',
    x: ({ m }) => m.biomeKinds + 0.6 * m.biomeHill, x0: 6, xref: 11.2, gamma: 1.5, fmt: x => `${x.toFixed(1)} Landschaftspunkte`,
    tip: 'Gebirge machen Regen auf der einen und Steppe auf der anderen Seite. Wind vom Meer auf die Berge lenken!',
  },
  rainforest: {
    id: 'rainforest', name: 'Regenwald', short: 'Wald', desc: 'Fläche von Wald und Regenwald (Regenwald zählt doppelt).',
    x: ({ m }) => (m.biomeFrac[B_FOREST] + m.biomeFrac[B_TAIGA] * 0.6 + 2 * m.biomeFrac[B_RAIN]) * 100, x0: 0, xref: 10, gamma: 0.6,
    fmt: x => `${x.toFixed(1)} % Waldfläche`, tip: 'Wälder brauchen Holz (ab 8 % Sauerstoff), Wärme und viel Regen. Regenwald wächst nur, wo es über 22 °C und nass ist.',
  },
  icewold: {
    id: 'icewold', name: 'Eiswelt', short: 'Eis', desc: 'Eisfläche plus Leben, das die Kälte liebt.',
    x: ({ m }) => m.biomeFrac[B_ICE] * 100 + Math.max(0, m.extremeCold - 4) * 2.5 + m.species * 0.4, x0: 0, xref: 40, gamma: 0.85,
    fmt: x => `${x.toFixed(0)} Frostpunkte`, tip: 'Sonne an den Rand und schwächer drehen: Am anderen Ende friert es. Langsam abkühlen, sonst stirbt alles.',
  },
  sturdy: {
    id: 'sturdy', name: 'Felsenfest', short: 'Felsenfest', desc: 'Die Jury kühlt eine Kopie deines Glases 36 Stunden um 9 °C ab: Widerstand, Erholung, Artenerhalt.',
    x: ({ stress }) => stress ? stress.score : 0, x0: 25, xref: 97, gamma: 0.85, fmt: x => `${x.toFixed(0)} Stresstest-Punkte`,
    tip: 'Eine Thermostat-Heizplatte hält die Grundtemperatur, wenn es kalt wird. Viele Arten fangen den Schock besser ab.',
  },
  bigstep: {
    id: 'bigstep', name: 'Der große Schritt', short: 'Schritt', desc: 'Höchste Komplexitätsstufe des Lebens plus Sauerstoff in der Luft.',
    x: ({ m }) => m.kMax * 12 + m.zMax * 30 + Math.min(20, Math.sqrt(m.landAnimals)) + Math.min(21, m.o2) * 0.8, x0: 85, xref: 100, gamma: 1,
    fmt: x => `${x.toFixed(0)} Komplexitätspunkte`, tip: 'Komplexe Zellen brauchen Sauerstoff. Viel Licht, viel Plankton – und Geduld.',
  },
  hot: {
    id: 'hot', name: 'Hitzekünstler', short: 'Hitze', desc: 'Höchste Wohlfühltemperatur einer etablierten Art, dazu Artenzahl.',
    x: ({ m }) => Math.max(0, m.extremeHot - 22) * 4 + m.species, x0: 4, xref: 50, gamma: 0.85, fmt: x => `${x.toFixed(0)} Hitzepunkte`,
    tip: 'Gefälle sind Trittsteine: eine heiße Zone neben einer milden. Sprünge töten, Rampen formen.',
  },
  deepsea: {
    id: 'deepsea', name: 'Tiefsee', short: 'Tiefsee', desc: 'Leben in Meeresfeldern mit weniger als 10 % Licht.',
    x: ({ m }) => m.deep, x0: 5, xref: 900, gamma: 0.7, fmt: x => `${x.toFixed(0)} Tiefsee-Biomasse`,
    tip: 'Schattenliebende Arten entstehen am dunklen Rand. Sonne nicht zu groß machen.',
  },
  // ---------- Akt 2
  continents: {
    id: 'continents', name: 'Kontinente', short: 'Kontinente', desc: 'Landmassen, Leben an Land und Landarten.',
    x: ({ m }) => m.continents * 6 + Math.sqrt(m.landBio) * 0.6 + m.landSpecies * 2.5, x0: 10, xref: 110, gamma: 0.9,
    fmt: x => `${x.toFixed(0)} Kontinentpunkte`, tip: 'Vulkane heben Land, Meeresarme trennen es. Getrennte Länder bekommen eigene Arten.',
  },
  web: {
    id: 'web', name: 'Nahrungsnetz', short: 'Netz', desc: 'Zahl der Fraßbeziehungen zwischen Arten, dazu Ernährungsstufen.',
    x: ({ m }) => m.links * 3 + m.levels * 8, x0: 8, xref: 70, gamma: 0.85, fmt: x => `${x.toFixed(0)} Netzpunkte`,
    tip: 'Viele kleine Arten neben großen: Jede Größe hat ihre Beute. Land und Meer haben getrennte Netze.',
  },
  exotic: {
    id: 'exotic', name: 'Exotik', short: 'Exotik', desc: 'Wie weit sich das Leben von der Startkultur entfernt hat.',
    x: ({ m }) => m.exotic * 12 + m.species * 0.8, x0: 8, xref: 75, gamma: 0.85, fmt: x => `${x.toFixed(0)} Exotikpunkte`,
    tip: 'Extreme Orte erzeugen seltsame Arten: heiß, kalt, trocken, dunkel. Die UV-Lampe hilft beim Ausprobieren.',
  },
  balance: {
    id: 'balance', name: 'Gleichgewicht', short: 'Gleichgewicht', desc: 'Räuber vorhanden und ihr Bestand schwankt über 10 Tage wenig.',
    x: ({ m }) => (m.pred > 0.5 ? 40 + 60 * Math.max(0, 1 - m.predCV / 0.6) : m.pred * 40) + Math.min(20, m.levels * 5), x0: 10, xref: 110, gamma: 1,
    fmt: x => `${x.toFixed(0)} Gleichgewichtspunkte`, tip: 'Deckung durch Wald und Gras schützt Beute. Große, verbundene Lebensräume dämpfen Schwankungen.',
  },
  giants: {
    id: 'giants', name: 'Riesen', short: 'Riesen', desc: 'Größte Körpergröße eines Tiers, dazu der höchste Baum.',
    x: ({ m }) => m.zMax * 70 + m.landZMax * 30, x0: 10, xref: 90, gamma: 0.9, fmt: x => `${x.toFixed(0)} Größenpunkte`,
    tip: 'Große Tiere brauchen Sauerstoff und höhere Stufen. Kühle Welten begünstigen große Körper.',
  },
  mind: {
    id: 'mind', name: 'Der denkende Funke', short: 'Funke', desc: 'Höchste Stufe, Tiere an Land und Klugheit.',
    x: ({ m }) => m.kMax * 15 + (m.landAnimals > 1 ? 15 : 0) + m.zMax * 15, x0: 40, xref: 120, gamma: 0.9,
    fmt: x => `${x.toFixed(0)} Funkenpunkte`, tip: 'Nervensysteme entstehen bei beweglichen Tieren unter Jagddruck. Klugheit lohnt sich an Land mit viel Deckung.',
  },
  // ---------- Akt 3
  development: {
    id: 'development', name: 'Entwicklung', short: 'Entwicklung', desc: 'Höchste Ära einer Kultur und ihr Wissen.',
    x: ({ m }) => m.era * 15 + Math.min(30, m.knowledge / 7) + Math.min(10, m.settlements * 3), x0: 0, xref: 110, gamma: 0.9,
    fmt: x => `${x.toFixed(0)} Entwicklungspunkte`, tip: 'Kulturen brauchen Überschuss (Vegetation), Rohstoffe (Berge) und genug Bevölkerung.',
  },
  peace: {
    id: 'peace', name: 'Frieden zweier Völker', short: 'Frieden', desc: 'Mindestens zwei Siedlungen, die nicht streiten.',
    x: ({ m }) => (m.settlements >= 2 ? 50 : m.settlements * 15) + 50 * (1 - m.conflict) * (m.settlements >= 2 ? 1 : 0.2), x0: 10, xref: 100, gamma: 1,
    fmt: x => `${x.toFixed(0)} Friedenspunkte`, tip: 'Knappheit macht Streit. Genug Nahrung und Abstand zwischen den Siedlungen helfen.',
  },
  culture: {
    id: 'culture', name: 'Kultur', short: 'Kultur', desc: 'Bevölkerung, Ehrfurcht und Wissen aller Kulturen.',
    x: ({ m }) => Math.min(40, Math.sqrt(m.pop) * 1.2) + m.awe * 30 + Math.min(30, m.knowledge / 6), x0: 5, xref: 95, gamma: 0.9,
    fmt: x => `${x.toFixed(0)} Kulturpunkte`, tip: 'Gütige Wunder (eine Prise Nährsalz, Sonne) im Sichtfeld einer Siedlung stärken die Ehrfurcht.',
  },
  index: {
    id: 'index', name: 'Anbetungsindex', short: 'Index', desc: '0,30 Entwicklung + 0,25 Stabilität + 0,20 Vielfalt + 0,25 Ehrfurcht.',
    x: ({ m, stress }) => {
      const dev = Math.min(1, (m.era * 15 + Math.min(30, m.knowledge / 7)) / 105);
      const stab = stress ? stress.score / 100 : 0.5;
      const div = Math.min(1, (0.6 * m.species + 0.4 * m.hill) / 18);
      const awe = Math.min(1, m.awe * (1 - 0.5 * m.fear) + (m.settlements ? 0.1 : 0));
      return 100 * (0.30 * dev + 0.25 * stab + 0.20 * div + 0.25 * awe);
    },
    x0: 10, xref: 90, gamma: 1, fmt: x => `Index ${x.toFixed(0)}`, tip: 'Alles zählt: Entwicklung, Stabilität, Vielfalt und eine Kultur, die das Gesicht ehrt statt fürchtet.',
  },
};

export function catScore(cat: Category, ctx: CatCtx) {
  const x = cat.x(ctx);
  const t = Math.min(1, Math.max(0, (x - cat.x0) / (cat.xref - cat.x0)));
  return { x, s: 100 * Math.pow(t, cat.gamma) };
}

export function stars(points: number) { return points >= 85 ? 3 : points >= 65 ? 2 : points >= 40 ? 1 : 0; }
export function medal(points: number) { return points >= 85 ? 'Gold' : points >= 70 ? 'Silber' : points >= 55 ? 'Bronze' : ''; }

export const _biomeRefs = { B_DESERT, B_REEF };
