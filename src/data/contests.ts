// Wettbewerbe der Karriere (Konzept 3.4, 4.6). Daten statt Code.

export interface Rival { id: string; name: string; desc: string; mu: number; sigma: number }
export interface Contest {
  id: string; act: 1 | 2 | 3; name: string; place: string;
  cats: { id: string; w: number; ref?: number }[];
  days: number; prizes: [number, number, number]; entry: number;
  rivals: Rival[]; optional?: boolean; prizeItem?: string; finale?: boolean;
  jury: string[]; intro: string;
}

const R = (id: string, name: string, desc: string, mu: number, sigma: number): Rival => ({ id, name, desc, mu, sigma });

export const CONTESTS: Contest[] = [
  // ------------------------------------------------ Akt 1 · Kinderzimmer
  {
    id: 'schulfest', act: 1, name: 'Schulfest', place: 'Grundschule am Deich', cats: [{ id: 'green', w: 1 }], days: 10,
    prizes: [40, 25, 15], entry: 0, jury: ['Dr. Kiemen'],
    intro: 'Beim Schulfest stellen alle Kinder ihre Gläser aus. Dr. Kiemen sucht die grünste Welt.',
    rivals: [R('konstantin', 'Konstantin von Bülow', 'hat eine teure Lampe', 58, 5), R('mia', 'Mia Sommer', 'liebt bunte Gläser', 44, 8), R('jonas', 'Jonas aus der 4b', 'gießt zu viel', 30, 10), R('lea', 'Lea Petersen', 'gibt sich Mühe', 38, 8), R('ben', 'Ben Krüger', 'hat sein Glas vergessen', 22, 6)],
  },
  {
    id: 'stadtteil', act: 1, name: 'Stadtteilfest', place: 'Deichviertel', cats: [{ id: 'colorful', w: 1 }], days: 21,
    prizes: [60, 40, 25], entry: 0, jury: ['Dr. Kiemen', 'Frau Olsen vom Bürgerverein'],
    intro: 'Das Stadtteilfest sucht das bunteste Meer: viele Arten, gut gemischt.',
    rivals: [R('mia', 'Mia Sommer', 'Vielfalts-Expertin', 62, 6), R('konstantin', 'Konstantin von Bülow', 'grün, aber eintönig', 46, 6), R('lea', 'Lea Petersen', 'hat ein Tümpelglas', 40, 9), R('emre', 'Emre Yilmaz', 'züchtet Krebse', 34, 8), R('ben', 'Ben Krüger', 'diesmal dabei', 24, 7)],
  },
  {
    id: 'zoocup', act: 1, name: 'Zoohandlungs-Cup', place: 'Zoohandlung Krause', cats: [{ id: 'foodweb', w: 1, ref: 1.2 }], days: 28,
    prizes: [100, 60, 40], entry: 0, jury: ['Herr Krause'],
    intro: 'Herr Krause will sehen, wer ein echtes Nahrungsnetz baut: Fressen und gefressen werden.',
    rivals: [R('emre', 'Emre Yilmaz', 'züchtet Krebse', 60, 7), R('konstantin', 'Konstantin von Bülow', 'kauft Futtertiere', 55, 6), R('mia', 'Mia Sommer', 'viele Arten', 48, 8), R('lea', 'Lea Petersen', '', 36, 9), R('jonas', 'Jonas aus der 4b', '', 28, 9)],
  },
  {
    id: 'stadt', act: 1, name: 'Stadtmeisterschaft', place: 'Rathaus', cats: [{ id: 'landscapes', w: 0.75 }, { id: 'green', w: 0.25, ref: 1.3 }], days: 28,
    prizes: [130, 80, 50], entry: 5, jury: ['Dr. Kiemen', 'Bürgermeisterin Hansen', 'Herr Krause'],
    intro: 'Die Stadtmeisterschaft wertet die Vielfalt der Landschaften: Meere, Steppen, Grasland, Wälder.',
    rivals: [R('konstantin', 'Konstantin von Bülow', 'hat einen Lampenarm', 66, 5), R('mia', 'Mia Sommer', 'Vielfalt!', 62, 6), R('emre', 'Emre Yilmaz', '', 50, 8), R('lea', 'Lea Petersen', '', 42, 8), R('gym', 'AG Gymnasium Nord', 'Schüler-AG', 56, 7)],
  },
  {
    id: 'sonder', act: 1, name: 'Sonderpreis des Heimatvereins', place: 'Stadthalle', cats: [{ id: 'rainforest', w: 1 }], days: 28, optional: true,
    prizes: [80, 50, 30], entry: 5, prizeItem: 'heizplatte', jury: ['Herr Petersen vom Heimatverein'],
    intro: 'Ein Sonderpreis für den schönsten Wald. Hauptpreis: eine Thermostat-Heizplatte!',
    rivals: [R('konstantin', 'Konstantin von Bülow', '', 60, 7), R('gym', 'AG Gymnasium Nord', '', 50, 8), R('mia', 'Mia Sommer', '', 44, 8), R('lea', 'Lea Petersen', '', 34, 8)],
  },
  {
    id: 'felsen', act: 1, name: 'Wintercup', place: 'Eissporthalle', cats: [{ id: 'sturdy', w: 0.7 }, { id: 'colorful', w: 0.3, ref: 2.5 }], days: 21, optional: true,
    prizes: [70, 45, 25], entry: 5, jury: ['Dr. Kiemen'],
    intro: 'Der Wintercup testet, wie felsenfest dein Glas ist: Die Jury kühlt eine Kopie ab.',
    rivals: [R('konstantin', 'Konstantin von Bülow', 'hat eine Heizplatte', 68, 6), R('emre', 'Emre Yilmaz', '', 52, 8), R('mia', 'Mia Sommer', '', 50, 8), R('ben', 'Ben Krüger', '', 30, 8)],
  },
  {
    id: 'finale1', act: 1, name: 'Finale „Junge Forscher“', place: 'Landesmuseum', cats: [{ id: 'bigstep', w: 0.6, ref: 1.04 }, { id: 'colorful', w: 0.4, ref: 2.7 }], days: 42, finale: true,
    prizes: [200, 120, 80], entry: 10, prizeItem: 'schaleM', jury: ['Dr. Kiemen', 'Prof. Albers vom Museum', 'Herr Krause'],
    intro: 'Das große Finale der jungen Forscher: Wer bringt das Leben den größten Schritt voran?',
    rivals: [R('konstantin', 'Konstantin von Bülow', 'der ewige Rivale', 72, 5), R('mia', 'Mia Sommer', '', 66, 6), R('gym', 'AG Gymnasium Nord', '', 60, 7), R('emre', 'Emre Yilmaz', '', 54, 7), R('lea', 'Lea Petersen', '', 46, 8)],
  },
  // ------------------------------------------------ Akt 2 · Keller
  {
    id: 'land', act: 2, name: 'Landesmeisterschaft', place: 'Kiel', cats: [{ id: 'continents', w: 0.7, ref: 1.6 }, { id: 'landscapes', w: 0.3, ref: 0.9 }], days: 35,
    prizes: [180, 110, 70], entry: 15, jury: ['Dr. Ilse Brand', 'Prof. Albers'],
    intro: 'Die Landesmeisterschaft wertet Kontinente: Landmassen und das Leben darauf.',
    rivals: [R('konstantin', 'Konstantin von Bülow', 'jetzt mit Datenlogger', 68, 5), R('mia', 'Mia Sommer', '', 62, 6), R('nils', 'Nils Hartmann (Lübeck)', '', 58, 7), R('gym', 'AG Gymnasium Nord', '', 52, 7), R('sara', 'Sara Lind (Flensburg)', '', 48, 8)],
  },
  {
    id: 'bund', act: 2, name: 'Bundeswettbewerb', place: 'Berlin', cats: [{ id: 'web', w: 0.8, ref: 5.0 }, { id: 'foodweb', w: 0.2, ref: 1.3 }], days: 35,
    prizes: [240, 150, 90], entry: 20, jury: ['Dr. Ilse Brand', 'Dr. Okafor (Bundesjury)'],
    intro: 'Beim Bundeswettbewerb zählt das Nahrungsnetz: Wer frisst wen, und wie viele Fäden hat das Netz?',
    rivals: [R('konstantin', 'Konstantin von Bülow', '', 70, 5), R('anna', 'Anna Weiß (München)', 'Biologie-Olympiade', 68, 6), R('mia', 'Mia Sommer', '', 62, 6), R('nils', 'Nils Hartmann', '', 56, 7), R('tom', 'Tom Becker (Köln)', '', 50, 8)],
  },
  {
    id: 'exotik', act: 2, name: 'Exotik-Cup', place: 'Tropenhaus Hamburg', cats: [{ id: 'exotic', w: 0.7, ref: 1.4 }, { id: 'hot', w: 0.3, ref: 1.15 }], days: 28, optional: true,
    prizes: [150, 90, 50], entry: 15, prizeItem: 'kuehlplatte', jury: ['Kurator Dr. Feld'],
    intro: 'Der Exotik-Cup sucht das seltsamste Leben. Hauptpreis: eine Kühlplatte für Eiszeiten.',
    rivals: [R('anna', 'Anna Weiß', '', 64, 6), R('konstantin', 'Konstantin von Bülow', '', 60, 6), R('mia', 'Mia Sommer', '', 58, 7), R('tom', 'Tom Becker', '', 46, 8)],
  },
  {
    id: 'gleich', act: 2, name: 'Gleichgewichts-Preis', place: 'Naturkundemuseum', cats: [{ id: 'balance', w: 0.7, ref: 1.45 }, { id: 'sturdy', w: 0.3 }], days: 30,
    prizes: [200, 120, 70], entry: 15, jury: ['Dr. Ilse Brand', 'Prof. Albers'],
    intro: 'Räuber und Beute im Gleichgewicht: Die Jury misst, wie ruhig die Bestände schwanken – und schockt eine Kopie.',
    rivals: [R('mia', 'Mia Sommer', 'ruhige Gläser', 70, 5), R('anna', 'Anna Weiß', '', 64, 6), R('konstantin', 'Konstantin von Bülow', '', 60, 6), R('nils', 'Nils Hartmann', '', 54, 7)],
  },
  {
    id: 'riesen', act: 2, name: 'Riesen-Pokal', place: 'Tierpark', cats: [{ id: 'giants', w: 1, ref: 1.3 }], days: 28, optional: true,
    prizes: [140, 90, 50], entry: 10, jury: ['Tierpark-Direktor Möller'],
    intro: 'Größe zählt: Wer hat die größten Tiere und die höchsten Bäume?',
    rivals: [R('konstantin', 'Konstantin von Bülow', '', 66, 6), R('tom', 'Tom Becker', '', 58, 7), R('anna', 'Anna Weiß', '', 54, 7)],
  },
  {
    id: 'finale2', act: 2, name: 'Bundesfinale „Der denkende Funke“', place: 'Berlin', cats: [{ id: 'mind', w: 0.6, ref: 1.35 }, { id: 'web', w: 0.4, ref: 5.1 }], days: 45, finale: true,
    prizes: [400, 240, 150], entry: 25, prizeItem: 'schaleXL', jury: ['Dr. Okafor', 'Prof. Albers', 'Dr. Ilse Brand'],
    intro: 'Das Bundesfinale: Wessen Glas bringt Nervensysteme hervor – oder gar den ersten Gedanken?',
    rivals: [R('konstantin', 'Konstantin von Bülow', 'der ewige Rivale', 74, 5), R('anna', 'Anna Weiß', '', 70, 5), R('mia', 'Mia Sommer', '', 66, 6), R('nils', 'Nils Hartmann', '', 58, 7)],
  },
  // ------------------------------------------------ Akt 3 · Labor & Weltbühne
  {
    id: 'em', act: 3, name: 'Europameisterschaft', place: 'Kopenhagen', cats: [{ id: 'development', w: 0.7, ref: 1.35 }, { id: 'colorful', w: 0.3, ref: 3.7 }], days: 40,
    prizes: [600, 350, 200], entry: 40, jury: ['Prof. Lindqvist (Uppsala)', 'Dr. Okafor'],
    intro: 'Die Europameisterschaft wertet Entwicklung: Wie weit sind die Kulturen in deinem Glas?',
    rivals: [R('lindqvist', 'Team Uppsala', '', 66, 6), R('konstantin', 'Konstantin von Bülow', 'jetzt Laborleiter', 70, 5), R('duarte', 'Isabela Duarte (Lissabon)', '', 62, 7), R('anna', 'Anna Weiß', '', 60, 7)],
  },
  {
    id: 'frieden', act: 3, name: 'Preis „Frieden zweier Völker“', place: 'Den Haag', cats: [{ id: 'peace', w: 0.7, ref: 1.2 }, { id: 'culture', w: 0.3, ref: 1.5 }], days: 40,
    prizes: [500, 300, 180], entry: 30, jury: ['Botschafterin Moreau', 'Prof. Lindqvist'],
    intro: 'Zwei Völker in einem Glas, die nicht streiten. Kannst du Frieden möglich machen?',
    rivals: [R('duarte', 'Isabela Duarte', '', 64, 6), R('mia', 'Mia Sommer', 'jetzt Ökologin', 68, 6), R('tanaka', 'Dr. Aiko Tanaka (Osaka)', '', 62, 7)],
  },
  {
    id: 'kultur', act: 3, name: 'Kultur-Cup', place: 'Wien', cats: [{ id: 'culture', w: 0.8, ref: 1.6 }, { id: 'landscapes', w: 0.2, ref: 0.8 }], days: 35, optional: true,
    prizes: [450, 260, 150], entry: 30, jury: ['Prof. Hofer'],
    intro: 'Der Kultur-Cup misst Bevölkerung, Ehrfurcht und Wissen.',
    rivals: [R('tanaka', 'Dr. Aiko Tanaka', '', 64, 6), R('konstantin', 'Konstantin von Bülow', '', 62, 6), R('lindqvist', 'Team Uppsala', '', 60, 7)],
  },
  {
    id: 'grandprix', act: 3, name: 'Grand Prix der Welten', place: 'Genf', cats: [{ id: 'index', w: 1, ref: 1.4 }], days: 50, finale: true,
    prizes: [2000, 1000, 500], entry: 50, jury: ['Die Weltjury'],
    intro: 'Der Grand Prix der Welten. Gewertet wird alles: Entwicklung, Stabilität, Vielfalt und Ehrfurcht.',
    rivals: [R('konstantin', 'Konstantin von Bülow', 'der ewige Rivale', 72, 5), R('tanaka', 'Dr. Aiko Tanaka', '', 70, 5), R('duarte', 'Isabela Duarte', '', 66, 6), R('lindqvist', 'Team Uppsala', '', 64, 6), R('mia', 'Mia Sommer', '', 62, 6)],
  },
];

export const contestById = (id: string) => CONTESTS.find(c => c.id === id)!;
