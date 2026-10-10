# Kalibrierung Weltenglas (Fork, 10.10.2026)

Werkzeuge: `tools/gates.ts seed days lamp lamp2day lamp2 act2day act3day` (JSON-Zeile mit Tag der Durchbrüche),
`tools/gates.sh "args" seeds…` parallel, `python3 tools/summ.py` Zusammenfassung. Parameter-Experimente ohne Dateiänderung per `PX='{"key":wert}'`.

## Funde
1. **Slot-Hunger:** 61 % aller Mutationen und 64 % der Durchbrüche fielen weg, weil die 48 Stamm-Slots voll waren. → `makeRoom()` in evo.ts: räumt kleinste gescheiterte Mutanten, Durchbrüche haben Vorrang (0 % verlorene Durchbrüche).
2. **Seltene Typen erstickten an der Seuche der Elternart:** Kill-the-Winner rechnete Neuheiten (noch nicht etabliert) zur Dichte der Elternart. → Neuheiten haben eigenen Seuchen-Pool (bio.ts). Weidegänger 7/8 bis Tag 30, Räuber 6/8 bis Tag 60.
3. **Stufen ohne Vorteil:** Stufe 3 vs. 2 war netto +2 % (fO-Halbsättigung, Atmungskosten). → klare Leiter muK/effK, kCost 0,08.
4. **O₂ lief auf 30 %:** → Oxidation über 18 % (`o2Fire`, `o2FireK`), Gleichgewicht ~18,5–19 %.
5. **Mutanten scheitern strukturell:** Einzelne Mutanten (15 % einer Zelle) setzen sich gegen Kill-the-Winner-Koexistenz und Diffusion kaum durch; Tier-Merkmale blieben über 300 Tage eingefroren. → `lineageLeaps()` (evo.ts): einmal je Glastag kann die *Front* einer Gruppe (Rolle × Lebensraum) eine Gründerpopulation (25 % ihres Bestands, überall) mit Stufe +1 bzw. Klugheit +0,22/Gemeinschaft +0,18 abspalten (`pLeap`, `pLeapHigh` ab Stufe 4, `pBrainLeap`). Durchbruch-Mutanten starten größer (`jumpStartFrac`), Tiere mutieren je Zuwachs öfter (`consMutBoost`).
   Stand (8 Seeds, long7): Akt-1-Gates alle erfüllt bis auf Artenzahl (24–32 an Tag 100); Stufe 5 bis Tag 260 5/8, Stufe 6 bis Tag 330 3/8 (6/8 bis Tag 440).
6. **Performance:** G (Wachstumspotenzial) dort, wo ein Stamm nicht lebt und auch kein Nachbar, nur einmal je Glastag; Fraß-Präferenzmatrix je Tick vorberechnet; Beute nur über anwesende Produzenten; Feuchte-Schleife ohne Closures; Kronendach per LUT (`expNeg`). 17,4 → ~10 ms/Tick (unter Last 9–12 gemessen), Ergebnisse bitgleich.
7. **Kulturen:** Siedlungen blieben in Ära 1 hängen, wenn kein Berg im Territorium lag → Erz aus weiterem Umland (r+8) oder Wissen ≥ 2× Schwelle. Gründung schon ab Bestand 1,5 / Zelle 0,12. Ären `[0, 6, 20, 50, 110, 240]`, g = 0,03: Ära 2 ≈ +20 Tage, Ära 3 ≈ +35, Ära 4 („Sie sehen dich“) ≈ +55, Ära 5 ≈ +95.
8. **Laborprobe-Fallback scheiterte still:** `inoculate` → `addStrain` gibt bei voller Stamm-Tabelle −1 zurück. Mit `makeRoom(W, true)` (jetzt exportiert aus evo.ts) vor dem Einsetzen: Siedlung am Folgetag, Ära 2 nach ~14 Tagen.

## Werkzeuge
- `tools/gates.ts|.sh` + `tools/summ.py` — Gate-Zeitleiste je Seed
- `tools/steer.ts|.sh` — Steuerbarkeit je Akt-1-Kategorie (Lookahead-Spieler `look()` = probiert Eingriffe auf Kopie, wie die Live-Sterne)
- `tools/levers.ts|.sh` — Wirkung einzelner Hebel auf alle Kennzahlen
- `tools/career.ts` + `tools/career_report.py` — Rohwerte aller Kategorien an den Wettbewerbstagen (std/good), Empfehlung für ref-Multiplikatoren, Kultur-Zeitleiste inkl. Laborprobe
- Tests: `node --test tests/*.test.ts` (Determinismus, Fuzz, Regression)
