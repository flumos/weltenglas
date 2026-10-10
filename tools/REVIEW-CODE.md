# Review A · Code-Korrektheit (laufend)

## HIGH-1 · Stresstest-Vorschau blockiert den Worker jeden Glastag
- Ort: src/sim/worker.ts:52 (`sendDay` → `stressTest(W)` wenn `wantStress`), gesetzt in src/game/career.ts:108 für sturdy/index (felsen, gleich, grandprix).
- Gemessen (tools/review-a-transplant.ts): stressTest 842 ms in Schale M, 3 391 ms in XL; ein normaler XL-Tag kostet 462 ms. Beim Grand Prix (index, 50 Tage, typ. XL) dauert jeder Glastag ≥ 3,9 s unabhängig vom Tempo; Befehle/Snapshots hängen solange (Worker synchron). Auch `advance` (Oma, Dev) zahlt das je Tag.
- Fix: Vorschau nur alle 3–5 Tage oder nur bei Pause/auf Anfrage; Kopien kleiner (nur B/T/N + Stämme) bzw. Schock mit weniger Ticks.

## HIGH-2 · Umziehen in Akt 3 löscht alle Kulturen
- Ort: src/sim/transplant.ts:21 (`W.settlements = []`), auslösbar über Shop „Umziehen“ (src/ui/Shop.tsx) jederzeit in Akt 3 (Schale L/XL kaufbar).
- Szenario: Akt 3, zwei Siedlungen in Ära 3, Spieler kauft Biosphären-Schale XL und zieht um → Siedlungen, Wissen, Ehrfurcht, sawFace-Fortschritt weg; development/peace/culture fallen auf 0 mitten im Wettbewerb.
- Fix: Siedlungen mit skalierten x/y übernehmen (und `wonderLog` behalten) oder Umziehen sperren/warnen, solange Siedlungen existieren.

## MEDIUM-1 · Angezeigte Startgelder/Preise ≠ abgerechnete in Akt 2/3
- Ort: src/ui/Calendar.tsx (zeigt `price(c, ct.entry)` / `price(c, p)`), src/game/career.ts:91/147 (bucht `ct.entry` / `ct.prizes` unskaliert), Modals ContestInfo zeigt unskaliert.
- Szenario: Akt 3 Grand Prix: Kalender „Startgeld 60 €, Preise 2400/…“, abgebucht werden 50, ausgezahlt 2000. Akt 2 Bundesfinale: angezeigt 320 €, gezahlt 400. Button-Disable nutzt den skalierten Wert → bei Geld zwischen beiden Werten falsch gesperrt/erlaubt.
- Fix: eine Quelle: `startContest`/`judge` ebenfalls `price()` verwenden (oder Anzeige unskaliert).

## MEDIUM-2 · Lernkarte überschreibt blockierende Dialoge (Oma-Ferien gehen verloren)
- Ort: src/game/career.ts:50 (`showCard` setzt `S.modal` bedingungslos), :320 (Oma als Modal), :302 (Stichtag setzt `modal=null`).
- Szenario: Oma-Dialog offen, Zeit läuft weiter (fireEvent pausiert nicht), am nächsten Tag stirbt eine Art → `showCard('extinct')` ersetzt den Oma-Dialog → Ferien finden nie statt; ebenso kann eine Entdeckung (nicht wegklickbar) verdrängt werden, und solange eine Karte offen ist, werden alle Entdeckungsrituale übersprungen (`!S.modal.value`).
- Fix: Karten in eine Warteschlange, wenn ein Modal offen ist; `fireEvent('oma')` pausiert (`setSpeedIndex(-1)`).

## MEDIUM-3 · Vulkanstein wird verbraucht, obwohl kein Vulkan entsteht
- Ort: src/sim/sim.ts `case 'hotspot'` (`if (W.hotspots.length >= 6) break;`), src/ui/GlassView.tsx:440 zieht den Stein trotzdem ab.
- Szenario: Akt 2 erlaubt 6 gekaufte Steine (career.ts:194), Welt hat 3 Start-Hotspots + Ereignis „heizstab“ fügt welche hinzu → ab 6 Hotspots verschwinden gekaufte Steine wirkungslos (Transplant übernimmt ebenfalls ≥3).
- Fix: Limit im UI prüfen (meta.hotspots.length) bzw. Limit an Kaufgrenze koppeln; Stein nur bei Erfolg abziehen.

## MEDIUM-4 · Umziehen tötet sofort mehrere Arten
- Ort: src/sim/transplant.ts:42–46 (gleichmäßige Dichte über den ganzen Lebensraum inkl. kalter Berge/Wüsten, Tiere ohne Beute vor Ort).
- Gemessen: Seed 4, Tag 120, Umzug in M: 5 von 28 Arten sterben binnen 10 Tagen (Chronik „ausgestorben“, ggf. Nachruf-Dialoge).
- Fix: Dichte nach ähnlicher Temperatur/Feuchte wie im alten Verbreitungsgebiet gewichten (z. B. Faktor tpcRaw(T, topt, sig)), Tiere nur wo Beute liegt.
