// Erzähltexte: Prolog, Akte, Figuren. {name} = Spielername, {cur} = Währung.

export const PROLOG = [
  { who: 'Anzeige', text: '„ERSCHAFFE EINE WELT IN DEINEM KINDERZIMMER! Das WELTENGLAS – mit echtem Urmeer und echten Lebenskeimen. Nur 9,90 DM!“', art: 'ad' },
  { who: '', text: 'Herbst 1994. {name} schüttelt das Sparschwein. Es klimpert genau genug.', art: 'pig' },
  { who: '', text: 'Zwei Wochen später steht ein Paket vor der Tür: eine Glasschale mit Gesteinsboden, eine kleine Lampe und zwei Tütchen.', art: 'box' },
];

export const ACTS = {
  1: { title: 'Akt 1 · Kinderzimmer', age: 'Kind', place: 'Kinderzimmer', year: 1994, text: 'Ein Schreibtisch, eine Lampe, ein Glas. Und eine ganze Welt darin.' },
  2: { title: 'Akt 2 · Keller', age: 'Jugendlicher', place: 'Hobbykeller', year: 2002, text: 'Acht Jahre später. Der Keller ist jetzt dein Labor, auf dem Röhrenmonitor laufen Kurven. Und es gibt Euro statt Mark.' },
  3: { title: 'Akt 3 · Labor & Weltbühne', age: 'Erwachsen', place: 'Forschungslabor', year: 2016, text: 'Dein eigenes Labor. Die Welt im Glas ist alt geworden – und etwas darin hat angefangen zu denken.' },
} as const;

export const KRAUSE = {
  hello: [
    'Moin, {name}! Na, wie geht\'s dem Glas?',
    'Ah, mein bester Kunde. Schau dich um.',
    'Du schon wieder. Gut so. Wissen ist das beste Futter.',
  ],
  advice: {
    temp: 'Du rätst bei der Temperatur? Mit einer Thermometer-Karte siehst du, wo es warm ist.',
    species: 'Wie viele Arten hast du eigentlich? Mit der Lupe kannst du sie zählen und benennen.',
    rain: 'Wo regnet es in deinem Glas? Der Regenmesser zeigt es dir.',
    o2: 'Sauerstoff ist der Schlüssel zum Land. Der Gasanalysator sagt dir genau, wie viel.',
    micro: 'Warum wächst eine Art hier und nicht dort? Das Mikroskop verrät dir die Gründe.',
    light: 'Mehr Licht, mehr Leben. Aber pass auf die Hitze auf.',
    heat: 'Wenn es kalt wird, hält eine Heizplatte dein Glas warm. Felsenfest!',
    wind: 'Der Wind bringt den Regen. Mit einem Ventilator bestimmst du, woher.',
    shape: 'Berge machen Regen auf der einen Seite und Steppe auf der anderen. Ein Formspachtel wirkt Wunder.',
    generic: 'Geduld ist das wichtigste Werkzeug. Das gibt\'s aber nicht zu kaufen.',
  },
} as const;

export const JURY_LINES = {
  great: ['Eine erstaunliche Welt.', 'So etwas habe ich lange nicht gesehen.', 'Hier stimmt einfach alles.'],
  good: ['Eine gute Arbeit, man sieht die Mühe.', 'Das Glas lebt, und wie!', 'Solide und spannend.'],
  ok: ['Ein Anfang ist gemacht.', 'Da steckt mehr drin.', 'Nicht schlecht, aber noch nicht rund.'],
  weak: ['Das Glas braucht noch Zeit.', 'Hier ist noch viel Platz für Leben.', 'Nächstes Mal wird es besser.'],
};

export const ENDING = [
  'Im Glas blinken Lichter. Kurz, lang, kurz. Eine Botschaft – an dich.',
  'Du schaltest die Lampe dreimal an und aus. Die Lichter antworten.',
  'Jahre später steht {name} in einer Zoohandlung und sieht ein Kind, das sein Sparschwein schüttelt.',
  '{name} kauft ein kleines Weltenglas und legt es dem Kind in die Hand. „Pass gut auf sie auf. Sie sehen dich.“',
];

export const TIPS_BY_CAUSE: Record<string, string> = {
  'Licht': 'Lampe heller, oder Schattenarten fördern.',
  'Nährstoff': 'Eine Prise Nährsalz gezielt dorthin.',
  'zu warm': 'Sonne schwächer oder weiter weg, langsamer ändern.',
  'zu kalt': 'Sonne näher, Thermostat-Heizplatte, sanfte Übergänge als Zuflucht.',
  'Sauerstoff': 'Mehr Licht und Pflanzen, weniger Dünger. Notfalls Deckel lüften.',
  'Gift': 'Weniger Dünger. Für frühe Einzeller: Zu viel Sauerstoff ist Gift.',
  'gefressen': 'Deckung durch Wald und Gras, mehr Lebensraum.',
  'Hunger': 'Mehr Beute: Licht und Nährstoffe fürs Plankton.',
  'Seuche': 'Vielfalt fördern – die Art war zu dicht.',
  'Trockenheit': 'Wind vom Meer auf die Berge lenken, damit es regnet.',
  'falscher Ort': 'Meeresspiegel und Gelände langsamer ändern.',
};
