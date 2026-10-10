# Review UX (Reviewer B, 10.10.2026)

## Funde

### F1 · MEDIUM · Wissen-als-Progression: Sauerstoff-Prozent leaken ohne Gasanalysator
- Ort: `src/ui/GlassView.tsx:376` (Ticker), `src/game/career.ts:155` (Jury-Brief zitiert Chronik roh), `src/ui/Notebook.tsx` Chronik-Tab
- Repro: Neues Spiel, ohne Käufe bis Schulfest-Jury. Ticker unter der Karte zeigt „Sauerstoff 2 %: …“, Jury-Brief: „Besonders beeindruckt hat uns: Sauerstoff 2 %: Eine Ozonschicht …“. Nur der Toast maskiert (career.ts:281).
- Zusätzlich: die Maskierung `replace(/\d+ %/, 'genug')` erzeugt „Die Luft im Glas enthält jetzt genug Sauerstoff“ schon bei 1 % (falsche Aussage, Landgang erst ab 2 %) und „Sauerstoff genug: Genug für Holz“.
- Vorschlag: eine Funktion `chronText(e)` (maskiert O₂-Zahlen ohne `gas`, Artennamen ohne `lupe`) für Ticker, Brief, Chronik und Toast; Maske als Wort („Die Luft wird sauerstoffreicher“) statt „genug“. Jury-Brief nur `breakthrough`/`species` zitieren, keine o2-Meilensteine.

### F2 · MEDIUM · Erster Wettbewerb rauscht vorbei, Spieler handelt nie
- Ort: `src/ui/Modals.tsx` Tutorial (setSpeedIndex(1)), `src/ui/GlassView.tsx` Tutorial-Effekt
- Repro: Lampe an → 10× gewählt → Schulfest (10 Tage) endet nach ~13 s Echtzeit. Kein Hinweis auf das einzige sinnvolle Werkzeug (Nährsalz, 3 Prisen im Dock), erst der Jury-Tipp nennt es. Ergebnis ohne Eingriff Platz 3–4.
- Vorschlag: Lernkarte „contest“ um einen Satz ergänzen („Tipp: Eine Prise Nährsalz dort, wo es grün ist“) und Nährsalz-Tool im Dock pulsieren lassen, bis einmal gedüngt wurde; Schulfest-Tempo auf max. 3× deckeln oder bei Lernkarte pausieren.

### F3 · HIGH · Ansicht „Wohlfühlzone“ ist fast überall rot, auch wo die Art blüht
- Ort: `src/sim/worker.ts` sendSnap (gz = 128 + G·160), Shader Modus 7 in `src/ui/renderer.ts`
- Repro: Mikroskop kaufen, Urflöckchen (59 % der Welt, Bestand steigt) wählen, Wohlfühlzone: die ganze Karte ist rot/„schlecht“ (Screenshot shots/rev/td-18). G ist an der Tragfähigkeit netto ≈ 0 oder negativ (Enge + Kill-the-Winner), also zeigt die Ansicht Dichte statt Eignung.
- Vorschlag: Für die Ansicht ein Eignungsmaß ohne Dichte-Terme liefern (g ohne crowd/KW minus Atmung/Grundtod), oder G relativ zum Maximum der Art normieren; Legende „ungeeignet ↔ ideal“.

### F4 · MEDIUM · In allen Overlay-Ansichten verschwindet die Küstenlinie
- Ort: `src/ui/renderer.ts` (Overlay-Mischung `col = mix(grey…, ov…, ovA)`)
- Repro: Temperatur/Regen/Nährstoffe/Wohlfühlzone wählen: Land und Meer sind nicht mehr unterscheidbar (td-01, td-09, td-18). Man weiß nicht, wo die Insel ist.
- Vorschlag: nach dem Overlay eine dünne Küstenkontur (|h − sea| < ε) und leichte Landaufhellung zeichnen.

### F5 · MEDIUM · Eine einzige Prise Nährsalz erscheint in der Nährstoff-Ansicht schon als „überdüngt“
- Ort: Shader Modus 4 (`nn = N/3`, Lila ab ~N 1,5), Dosis `amount: 60` in GlassView (r 4 → +1,2 je Feld)
- Repro: Bodenprobe-Set kaufen, eine Prise setzen, Nährstoffe-Ansicht: magenta Fleck mit Legende „überdüngt“ (td-09), obwohl die Blüte erst ab N 2,5 beginnt. Spieler lernt das Falsche (gezielt düngen wirkt wie Fehler).
- Vorschlag: Farbskala so, dass Lila erst ab N > 2,5 (Blüte) beginnt; Legende „karg · gut · überdüngt“ mit Marke.

### F6 · LOW · Werkzeuge ohne sichtbare Wirkung, solange pausiert
- Ort: `src/sim/worker.ts` cmd → nur sendSnap; Temperatur/Licht werden erst in `thermal()` beim nächsten Tick neu berechnet, Regen erst täglich
- Repro: Pause, Sonne verschieben, Temperatur-Ansicht: Wärmefleck bleibt am alten Ort. Wind drehen: nichts ändert sich (Hinweis „über einige Tage“ steht nur beim Wind).
- Vorschlag: nach `sun`/`thermo`/`cool`-Befehl `thermal(W)` direkt im Worker aufrufen; beim Sonnen-Werkzeug Hinweis „Läuft die Zeit, wandert die Wärme mit“.

### F7 · LOW · Gelände-Pinsel wirkt bei schnellem Strich kaum
- Ort: `src/ui/GlassView.tsx` terrain-Zweig (140-ms-Drossel je Anwendung)
- Repro: Strich über 30 % der Kartenbreite in ~0,3 s: nur 2 Anwendungen, 2 Krümel, kaum sichtbare Hebung (td-05).
- Vorschlag: nach zurückgelegter Strecke (alle ~2 Zellen) anwenden statt nach Zeit; Krümel je Anwendung bleibt.
