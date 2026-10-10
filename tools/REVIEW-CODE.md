# Review A · Code-Korrektheit (laufend)

## HIGH-0 · Softlock in Akt 2/3 ohne Geld
- Ort: src/game/career.ts:92 (`if (c.money < fee) return false`), src/data/contests.ts (alle Akt-2-Wettbewerbe Startgeld 10–25, Akt 3 30–50), einzige Einnahme = Preisgeld/Taschengeld nach einem Wettbewerb (career.ts:164).
- Szenario: Nach dem Euro-Umtausch kauft der Spieler Stammbaum-Software + Jury-Prognose + Zeitraffer und hat < 15 €. Kein Akt-2-Wettbewerb ist bezahlbar, es gibt kein Taschengeld ohne Wettbewerb → das Spiel kommt nie weiter (Säule 4 verletzt). In Akt 1 rettet nur, dass Schulfest/Stadtteil/Zoo-Cup 0 kosten.
- Fix: Startgeld auf `min(entry, money)` begrenzen oder erlassen, wenn das Geld nicht reicht („Herr Krause legt aus“); alternativ Taschengeld je X Glastage.

## HIGH-1 · Stresstest-Vorschau blockiert den Worker jeden Glastag
- Ort: src/sim/worker.ts:52 (`sendDay` → `stressTest(W)` wenn `wantStress`), gesetzt in src/game/career.ts:108 für sturdy/index (felsen, gleich, grandprix).
- Gemessen (tools/review-a-transplant.ts): stressTest 842 ms in Schale M, 3 391 ms in XL; ein normaler XL-Tag kostet 462 ms. Beim Grand Prix (index, 50 Tage, typ. XL) dauert jeder Glastag ≥ 3,9 s unabhängig vom Tempo; Befehle/Snapshots hängen solange (Worker synchron). Auch `advance` (Oma, Dev) zahlt das je Tag.
- Zusätzlich: jeder Befehl mit `wantDay=true` (Wasser, Nährsalz, Vulkan, Kescher, Impfen, Sonne loslassen, Deckel) ruft `sendDay` → erneut ein kompletter Stresstest → 0,8–3,4 s Verzögerung pro Klick in diesen Wettbewerben.
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

## MEDIUM-5 · Nach Neuladen mitten in Felsenfest/Gleichgewicht/Grand Prix bleibt die Stresstest-Vorschau leer
- Ort: src/ui/App.tsx:28–36 (`continueGame` setzt `wantStress` im frischen Worker nicht neu), career.ts:108.
- Verifiziert (tools/review-a-save.mjs): vor Reload `stress=35`, nach Reload + 5 Glastagen `stress=null` → Kategorie sturdy/index rechnet live mit 0, Sterne/Prognose falsch (die Jury selbst rechnet korrekt).
- Fix: in `continueGame` nach `initWorld`: wenn `current` sturdy/index enthält → `sim.wantStress(true)` + einmal `runStress()`.

## MEDIUM-6 · „Weiter zu Akt 2/3“ ist auch mitten in einem laufenden Akt-1/2-Wettbewerb klickbar
- Ort: src/ui/Calendar.tsx (Karte erscheint bei `advance && c.act < 3`, unabhängig von `c.current`), career.ts:225.
- Szenario: Finale gewonnen, danach optionalen Akt-1-Wettbewerb gestartet, dann Akt 2 betreten → Währung wird mitten im Wettbewerb auf Euro umgestellt, das DM-Preisgeld wird 1:1 als Euro ausgezahlt (≈ doppelter Wert); Ereignis-Pool/maxK wechseln mitten in der Saison.
- Fix: Aktwechsel nur ohne `current` anbieten.

## LOW-1 · Puffer-Pool nach Umziehen dauerhaft unbrauchbar
- Ort: src/sim/worker.ts:32/98 – nach Transplant liegen bis zu 3 Puffer alter Größe im Pool, `snapshot()` verwirft sie und allokiert jedes Mal neu; zurückgegebene neue Puffer werden wegen `pool.length < 3` nicht mehr aufgenommen.
- Fix: bei `transplant`/`init` `pool.length = 0`; beim `ret` nur passende Größe annehmen.

## LOW-2 · Umzugs-Chronikeintrag wird nie gemeldet; Kontinentaldrift stoppt nach Umzug
- Ort: src/sim/worker.ts:117 (`chronSent = W.chronicle.length` nach dem `chron(...)` in transplant.ts:51); transplant.ts:10 erzeugt Hotspots mit vx=vy=0 trotz `ctl.drift`.
- Fix: `chronSent` vor dem Transplant merken; Hotspot-Geschwindigkeiten übernehmen bzw. neu würfeln, wenn `drift`.

## LOW-3 · Klick-Zelle weicht nahe Küsten vom gezeichneten Bild ab
- Ort: src/ui/renderer.ts `warp()` (bis ~0,8 Zellen Versatz) vs. src/ui/MapCanvas.tsx `toGrid` (ungewarpt).
- Szenario: Nährsalz auf sichtbares Meer direkt an der Küste landet in einer Landzelle (und umgekehrt), Zell-Info zeigt ein anderes Biom als unter dem Finger.
- Fix: Warp schwächer (≤0,4) oder dieselbe Warp-Funktion in JS auf die Zeigerkoordinate anwenden.

## LOW-4 · Sonne ziehen erzeugt in Akt 3 dutzende „Wunder“
- Ort: src/sim/sim.ts `case 'sun'` → `registerWonder` bei jedem Drag-Befehl (alle 60 ms, GlassView.tsx:433); `st.wonders` summiert ungedeckelt (culture.ts) → ein paar Sekunden Ziehen kippt `kind = wonders >= fears` dauerhaft, `wonderLog` (300) wird mit Sonne geflutet.
- Fix: Wunder nur beim Loslassen (`wantDay`-Befehl) bzw. höchstens 1 Sonnen-Wunder je Glastag.

## LOW-5 · Autosave verwirft parallele Speicherwünsche
- Ort: src/game/save.ts:13 (`if (saving) return`).
- Szenario: Kauf (buy → saveGame) während ein Tages-Autosave läuft → Kauf erst beim nächsten Autosave (bis 5 Glastage) gesichert; Tab geschlossen → Kauf/Geld weg.
- Fix: `pending`-Flag setzen und nach Abschluss erneut speichern.
