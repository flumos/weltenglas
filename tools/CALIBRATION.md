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
