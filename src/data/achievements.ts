// Erfolge aus Messwerten (Konzept 8)
import type { Metrics } from '../sim/metrics.ts';
export interface Ach { id: string; name: string; desc: string; check: (m: Metrics, f: Record<string, number>) => boolean }
export const ACHIEVEMENTS: Ach[] = [
  { id: 'seven', name: 'Sieben auf einen Streich', desc: '7 Arten gleichzeitig im Glas.', check: m => m.species >= 7 },
  { id: 'twenty', name: 'Arche', desc: '20 Arten gleichzeitig im Glas.', check: m => m.species >= 20 },
  { id: 'land', name: 'Landgang', desc: 'Leben ist an Land gegangen.', check: m => m.landBio > 5 },
  { id: 'forest', name: 'Waldmacher', desc: 'Ein erster Wald ist gewachsen.', check: (_m, f) => !!f.forest },
  { id: 'oxycat', name: 'Sauerstoffkatastrophe überlebt', desc: 'Komplexe Zellen bei über 13 % Sauerstoff.', check: m => m.kMax >= 2 && m.o2 > 13 },
  { id: 'pred', name: 'Fressen und gefressen werden', desc: 'Drei Ernährungsstufen auf einmal.', check: m => m.levels >= 3 },
  { id: 'nerve', name: 'Funke', desc: 'Ein Nervensystem ist entstanden.', check: m => m.kMax >= 5 },
  { id: 'mind', name: 'Etwas denkt', desc: 'Intelligenz (Stufe 6).', check: m => m.kMax >= 6 },
  { id: 'city', name: 'Erste Siedlung', desc: 'Eine Kultur hat sich gegründet.', check: m => m.settlements >= 1 },
  { id: 'face', name: 'Sie sehen dich', desc: 'Eine Kultur hat das Gesicht entdeckt.', check: (_m, f) => !!f.sawFace },
  { id: 'peace', name: 'Friedensstifter', desc: 'Zwei Siedlungen ohne Streit.', check: m => m.settlements >= 2 && m.conflict < 0.1 },
  { id: 'hill10', name: 'Ausgewogen', desc: 'Effektive Artenzahl (Hill) über 10.', check: m => m.hill >= 10 },
];
