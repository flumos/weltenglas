// Zoohandlung Krause (Konzept 4.4): Messen und Eingreifen. Preise in DM (Akt 1), ab Akt 2 in Euro.

export type ItemKind = 'instrument' | 'device' | 'consumable' | 'glass';
export interface Item {
  id: string; name: string; kind: ItemKind; price: number; act: 1 | 2 | 3;
  question?: string; does: string; unlocks?: string; max?: number; pack?: number; requires?: string; icon: string;
}

export const ITEMS: Item[] = [
  // ---------- Messen: jedes Instrument beantwortet eine Frage
  { id: 'thermo', name: 'Thermometer-Karte', kind: 'instrument', price: 8, act: 1, question: 'Wo ist es warm, wo kalt?', does: 'Temperatur-Ansicht und genaue Gradzahlen.', unlocks: 'temp', icon: 'thermo' },
  { id: 'lupe', name: 'Lupe', kind: 'instrument', price: 12, act: 1, question: 'Welche Arten sind das?', does: 'Artenkarten mit Rolle und Größe, Artenzahl, Arten-Ansicht.', unlocks: 'species', icon: 'lens' },
  { id: 'regen', name: 'Regenmesser', kind: 'instrument', price: 15, act: 1, question: 'Wo regnet es?', does: 'Regen- und Bodenfeuchte-Ansicht, Windpfeile.', unlocks: 'rain', icon: 'rain' },
  { id: 'hoehe', name: 'Höhenkarte', kind: 'instrument', price: 15, act: 1, question: 'Wie hoch ist das Land, wie tief das Meer?', does: 'Höhen-Ansicht mit Höhenlinien.', unlocks: 'height', icon: 'mountain' },
  { id: 'boden', name: 'Bodenprobe-Set', kind: 'instrument', price: 18, act: 1, question: 'Was fehlt dem Boden, dem Wasser?', does: 'Nährstoff-Ansicht und Warnungen bei Überdüngung.', unlocks: 'nutr', icon: 'flask' },
  { id: 'logger', name: 'Datenlogger', kind: 'instrument', price: 30, act: 1, question: 'Was ist passiert, während ich weg war?', does: 'Verlaufskurven im Heft und in der Artenliste.', unlocks: 'data', icon: 'chart' },
  { id: 'gas', name: 'Gasanalysator', kind: 'instrument', price: 35, act: 1, question: 'Wie viel Sauerstoff hat die Luft?', does: 'Sauerstoff der Luft in Prozent.', unlocks: 'o2', icon: 'gauge' },
  { id: 'mikro', name: 'Mikroskop', kind: 'instrument', price: 45, act: 1, question: 'Warum wächst sie hier?', does: 'Gründe-Liste, Wohlfühlkurve, Eigenschaften, Ansicht „Wohlfühlzone“.', unlocks: 'micro', icon: 'micro' },
  { id: 'baum', name: 'Stammbaum-Software', kind: 'instrument', price: 60, act: 2, question: 'Wer stammt von wem ab?', does: 'Stammbaum im Heft mit „Vergleichen“.', unlocks: 'tree', icon: 'tree' },
  { id: 'prognose', name: 'Jury-Prognose', kind: 'instrument', price: 80, act: 2, question: 'Wo stehe ich genau?', does: 'Live-Platzierung gegen die Rivalen statt Sterne.', unlocks: 'rank', icon: 'podium' },
  { id: 'fernrohr', name: 'Kulturfernrohr', kind: 'instrument', price: 150, act: 3, question: 'Was denken sie über mich?', does: 'Ehrfurcht, Furcht und Wissen jeder Siedlung.', unlocks: 'culture', icon: 'scope' },
  // ---------- Eingreifen
  { id: 'arm', name: 'Lampenarm', kind: 'device', price: 15, act: 1, does: 'Die Sonne frei über die Schale ziehen.', icon: 'sun' },
  { id: 'tageslicht', name: 'Tageslichtlampe', kind: 'device', price: 35, act: 1, does: 'Sonne bis 100 % statt 60 %.', icon: 'bulb' },
  { id: 'uhr', name: 'Zeitschaltuhr', kind: 'device', price: 10, act: 1, does: 'Tageslänge 6–18 Stunden einstellen.', icon: 'clock' },
  { id: 'vent', name: 'Ventilator', kind: 'device', price: 20, act: 1, does: 'Windrichtung wählen (4 Richtungen).', icon: 'wind' },
  { id: 'vent8', name: 'Profi-Ventilator', kind: 'device', price: 30, act: 1, requires: 'vent', does: 'Alle 8 Windrichtungen und Windstärke.', icon: 'wind' },
  { id: 'kanne', name: 'Gießkanne + Pipette', kind: 'device', price: 10, act: 1, does: 'Meeresspiegel heben und senken.', icon: 'drop' },
  { id: 'vulkan', name: 'Vulkanstein', kind: 'consumable', price: 25, act: 1, pack: 1, max: 3, does: 'Ein neuer Vulkan: hebt Land, düngt, wärmt.', icon: 'volcano' },
  { id: 'spachtel', name: 'Formspachtel', kind: 'device', price: 30, act: 1, does: 'Gelände anheben und absenken (verbraucht Erdkrümel).', icon: 'shovel' },
  { id: 'kruemel', name: 'Erdkrümel', kind: 'consumable', price: 3, act: 1, pack: 10, does: '10 Krümel für den Formspachtel.', requires: 'spachtel', icon: 'dots' },
  { id: 'salz', name: 'Nährsalz', kind: 'consumable', price: 3, act: 1, pack: 3, does: '3 Prisen Dünger.', icon: 'salt' },
  { id: 'pipette', name: 'Proben-Pipette', kind: 'device', price: 15, act: 1, does: 'Proben nehmen und Arten einsetzen.', icon: 'pipette' },
  { id: 'kryo', name: 'Kryo-Box', kind: 'device', price: 40, act: 1, requires: 'pipette', does: '3 Röhrchen, um Arten einzufrieren.', icon: 'snow' },
  { id: 'kescher', name: 'Kescher', kind: 'device', price: 5, act: 1, does: 'Leben in einer Region abfischen oder roden.', icon: 'net' },
  { id: 'uv', name: 'UV-Lampe „Mutator“', kind: 'device', price: 60, act: 1, does: 'Mutationsrate ×0,5 bis ×4.', icon: 'uv' },
  { id: 'heizplatte', name: 'Thermostat-Heizplatte', kind: 'device', price: 90, act: 1, does: 'Hält die Grundtemperatur, auch wenn das Zimmer kalt wird.', icon: 'heat' },
  { id: 'deckel', name: 'Lüftungsdeckel', kind: 'device', price: 20, act: 1, does: 'Deckel lüften: Zimmerluft mit 21 % Sauerstoff strömt ins Glas.', icon: 'lid' },
  { id: 'starter', name: 'Starterkultur', kind: 'consumable', price: 5, act: 1, pack: 1, does: 'Frische Urflöckchen fürs Meer – für den Neuanfang.', icon: 'seed' },
  { id: 'tuempel', name: 'Tümpelprobe', kind: 'consumable', price: 30, act: 1, pack: 1, does: 'Wilde Vielfalt: drei Arten aus einem echten Tümpel.', icon: 'pond' },
  { id: 'schaleM', name: 'Schale M', kind: 'glass', price: 80, act: 1, does: 'Größere Welt: 128×80 Felder. Deine Arten ziehen mit um.', icon: 'glass' },
  { id: 'kuehlplatte', name: 'Kühlplatte', kind: 'device', price: 150, act: 2, does: 'Kühlt die ganze Welt: Eiszeiten und Gletscher.', icon: 'cold' },
  { id: 'raffer', name: 'Zeitraffer-Modul', kind: 'device', price: 70, act: 2, does: 'Tempo 30×.', icon: 'fast' },
  { id: 'schaleL', name: 'Panorama-Schale L', kind: 'glass', price: 220, act: 2, does: 'Riesige Welt: 160×100 Felder.', icon: 'glass' },
  { id: 'schaleXL', name: 'Biosphären-Schale XL', kind: 'glass', price: 600, act: 3, does: 'Die größte Welt: 192×120 Felder.', icon: 'glass' },
];

export const itemById = (id: string) => ITEMS.find(i => i.id === id)!;

/** Start-Inventar aus dem Paket (Comic-Anzeige) */
export const STARTER: Record<string, number> = { salz: 3 };
