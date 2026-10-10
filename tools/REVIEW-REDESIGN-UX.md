# Review Redesign Glas-Ansicht · UX & Visual (10.10.2026)

Durchgespielt per Playwright (Neues Spiel → Prolog → Lampe an → Schulfest → Jury → Laden → alle Instrumente → Tag 57) auf Desktop 1440×900, Laptop 1100×720, iPhone 390×844 (isMobile, hasTouch).
Screenshots: `/private/tmp/claude-501/-Users-felix-pka/f6e5edd9-c8b5-4746-ba3d-5c57a2c33c40/scratchpad/review-ux/shots/` (Präfix d- = 1440, l- = 1100, m- = iPhone).
Hinweis: Während des Reviews kam Commit fdea68a (Nordmarke, Lerntexte, Lernkarte/Toasts am Handy nach unten). Die Läufe d2-/l2-/m2- sind auf diesem Stand; die Funde unten sind darauf geprüft, U6/U10 entsprechend angepasst.

## Funde

### U1 · HIGH · Glas Desktop/Laptop · Lernkarten liegen über Glas und rechter Spalte, Zeit läuft weiter
- Beobachtung: Die Lernkarte „Die Sonne" erscheint unten rechts (1045–1425 × 595–800 px bei 1440) und überdeckt die untere rechte Glas-Ecke sowie den Platz unter den Bedingungen. Währenddessen läuft das Glas mit 3× weiter; das Schulfest startet an Tag 2,5, die Wettbewerbs-Karte wartet in der Warteschlange hinter „Die Sonne". Wer liest, verliert 1–2 der 10 Schulfest-Tage. Im Laden verdeckt dieselbe Karte den Kaufen-Knopf des Mikroskops und die Ventilator-Karte. (`d-06-after-lamp.png`, `d-08-contest-start.png`, `d-11-salz.png`, `d-16-shop.png`)
- Vorschlag: In der Glas-Ansicht Lernkarten in die rechte Spalte unter „Bedingungen" andocken (dort ist bis Akt 2 fast immer Platz) statt fixed über dem Glas; Laden: Karte oben unter dem Krause-Banner einblenden. Solange eine Lernkarte offen ist, Tempo auf 1× deckeln oder pausieren.

### U2 · HIGH · Glas Desktop · Toasts landen unsichtbar hinter der Lernkarte
- Beobachtung: `.gv ~ .toasts` (bottom 96px, rechts) und `.card-learn` (bottom 100px, rechts) teilen sich exakt dieselbe Ecke; die Karte hat z-index 55, Toasts 50. Rückmeldungen wie „Wähle zuerst eine Art aus der Liste." (Klick auf Wohlfühlzone ohne Auswahl), „Dafür brauchst du …" oder Entdeckungs-Toasts schauen nur als 2–3 px Kante links neben der Karte hervor (`d-20-day55.png`, `d-22-view-Wohlfühlzone.png`, Ränder bei x≈1025, y≈720–800). Der Klick wirkt dadurch kaputt.
- Vorschlag: Toasts in der Glas-Ansicht oben mittig unter der Alarmzeile (über dem Glas, wie am Handy schon gelöst) ausgeben, oder die Toast-Säule über die Lernkarte schieben (bottom = Kartenhöhe + 12 px) und z-index über die Karte heben.

### U3 · HIGH · Glas Desktop 1440×900 · Bedingungen-Spalte schneidet Regler ab, ohne Scroll-Hinweis
- Beobachtung: Mit allen Geräten (Lampe, Tageslänge, Wind, Meeresspiegel, Deckel, Heizplatte, Kühlplatte, Mutationsrate) ist die rechte Spalte höher als der Platz. `.gv-side { scrollbar-width: none }` blendet die Scrollleiste aus, unten gibt es keinen Fade; ab „Deckel lüften" ist Schluss, Heizplatte/Kühlplatte/UV sind unsichtbar (`d-17-glass-all-inv.png`, „Fehlschläge"-Rest unter der Lernkarte bei y≈812). Wer die Heizplatte kauft, findet sie nicht.
- Vorschlag: Unten in der Spalte einen Verlauf-Fade + „mehr ▾" einblenden, solange `scrollTop + clientHeight < scrollHeight`; dünne Scrollleiste zulassen. Platz sparen: `.ctl .sub`-Erklärtexte nur bei Hover/Fokus zeigen (bei Lampe, Wind, Deckel stehen sie dauerhaft und kosten je ~30 px).

### U4 · HIGH · Glas Laptop 1100×720 · Werkzeug-Anleitung fehlt, Labels kleben, Werte abgeschnitten
- Beobachtung (alle in `l-*.png`):
  - Die Media-Query `max-width:1180px` blendet `.topts > span` aus. Mit gewähltem Salz steht unten nur „× Fertig" – der Satz „Tippe, wohin eine Prise Nährsalz soll …" fehlt genau beim ersten Eingriff des Erstspielers (`l-11-salz.png`). Gleiches gilt für Gelände (Anheben/Absenken ohne Erklärung) und Impfen.
  - Werkzeug- und Menü-Dock: Beschriftungen laufen ineinander („VulkanGeländeKescherImpfen", „Laden Kalender" ohne Abstand; `.tool` Kalender läuft über) (`l-14-cell.png`, `l-20-day55.png`).
  - Feld-Detail links: `.kvgrid` zweispaltig in 250 px – „Temperatur 15.5 °C" und „Bodenfeuchte 58 %" werden rechts abgeschnitten („15.!", „°(") (`l-20-day55.png`, `l-14-cell.png`: „kü", „feuch").
  - Ansichten-Leiste bricht um, „Wohlfühlzone" steht allein in einer zweiten Zeile der Pille (`l-08-contest-start.png`).
- Vorschlag: Unter 1180 px den Werkzeug-Hinweis nicht ausblenden, sondern als kleine Zeile über dem Glas (Platz der Alarmzeile, wenn leer) oder als Tooltip-Chip am Cursor zeigen. Dock unter 1180 px nur Icons + `title`/aria-label, oder Tool-Labels auf 9 px mit `overflow:hidden; text-overflow:ellipsis`. Feld-Detail `.kvgrid` unter 280 px Spaltenbreite einspaltig. Ansichten-Leiste `flex-wrap: nowrap` + horizontal scrollbar wie am Handy.

### U5 · MEDIUM · Glas, Feld-Detail, Wettbewerb-Modal, Jury · Dezimalpunkt statt Komma
- Beobachtung: Messwerte links sind deutsch formatiert („7,9 % O₂", „15,0 °C"), aber Feld-Detail/Probe zeigen „21.5 °C", „Nährstoffe 0.53", Wettbewerb-Modal „0.27 Grün je Feld", Jury „1.04 Grün je Feld" (`d-20-day55.png`, `d-13-contest-modal.png`, `d-15-jury.png`). Zusätzlich bricht „°C" im Feld-Detail in eine eigene Zeile.
- Vorschlag: Ein Helfer `fmtNum(x, digits)` (`toLocaleString('de-DE')`) für `cellRows` (GlassView.tsx:358–362) und `CATEGORIES[*].fmt`; Wert+Einheit mit `&nbsp;`/`white-space:nowrap` zusammenhalten.

### U6 · HIGH · Glas iPhone · Lernkarte verdeckt das Eingriff-Dock, Blätter schrumpfen das Glas zur Briefmarke
- Beobachtung (Stand fdea68a): Die Lernkarte sitzt jetzt unten (bottom 84 px, ~225 px hoch) und liegt exakt über dem Eingriff-Blatt. Die Karte „Dein erster Wettbewerb" sagt „Du findest sie [das Nährsalz] unten bei den Eingriffen (am Handy unter „Eingriff")" – tippt man auf „Eingriff", ist das Dock komplett unter der Karte, der Tap auf „Salz" landet auf der Karte (Playwright: „card-learn intercepts pointer events") (`m2-10-eingriff.png`, `m2-11-salz.png`). Die Karte „Die Sonne" sagt am Handy „rechts unter „Bedingungen"" – rechts gibt es dort nichts. Toasts sitzen ebenfalls bei bottom 84 px, also wieder hinter der Karte (vgl. U2). Unabhängig davon schrumpft das Glas bei offenem Werte-/Bedingungen-Blatt auf ca. 200×300 px bzw. 170×250 px (`m2-17-glass-all-inv.png`, `m2-18-bed.png`).
- Vorschlag: Ist ein Blatt offen, Lernkarte oben über dem Glas (bzw. als einklappbarer Chip) zeigen, sonst unten; nie über dem aktiven Blatt. Toasts immer auf der jeweils anderen Seite als die Karte. Gerätespezifische Lerntexte („rechts" vs. „Tab Bedingungen") per `phone`-Flag statt Klammer-Zusätzen. Blätter als Bottom-Sheet über das Glas legen statt es zu verkleinern.

### U7 · HIGH · Glas iPhone · Wettbewerbs-Prognose fehlt, Lernkarte verweist auf unsichtbare Sterne
- Beobachtung: Die mobile Kopfzeile zeigt nur „9 T | Schulfest · Grünste …" (`m-08-contest-start.png`, `m-11-salz.png`); Sterne/Punkte/Prognose sind ab 900 px nicht mehr zu sehen (`.vs` und `.place span` ausgeblendet, `.score` wird von der Pillenbreite gequetscht). Die Lernkarte „Dein erster Wettbewerb" sagt aber: „Oben siehst du die Sterne". Ohne Wettbewerb wird „Kein Wettbewerb" zu „Kein…" bzw. ganz vom zweizeiligen Knopf „Stadtteilfest starten" verdrängt (`m-17-glass-all-inv.png`).
- Vorschlag: Mobile Pille: Tage · Kurzname · 3 Mini-Sterne (bzw. „Platz 2.") in fester Breite rechts, Kategorie-Text weglassen. Ohne Wettbewerb: „Frei · Stadtteilfest ›" als eine Zeile. Text der Lernkarte am Handy auf „Tippe oben auf den Wettbewerb …" anpassen oder die Sterne garantieren.

### U8 · MEDIUM · Glas iPhone · Werte-Blatt: Name und Wort-Wert überlappen, Mini-Leiste kürzt Wörter
- Beobachtung: Im Werte-Blatt (2-spaltiges Raster, `.gv-side .metrics`) kollidiert vor dem Gasanalysator „Sauerstoff" mit dem Wort-Wert „kaum Sauerstoff" → „Sauerstkaum Sauerstoff" (`m-14-cell.png`). Die Mini-Leiste unter dem Glas kürzt die Wort-Werte auf „eine So…", „kein Sa…" (`m-06-after-lamp.png`, `m-08-contest-start.png`) – gerade die Anfangswerte sind so unlesbar.
- Vorschlag: Im 2-Spalten-Raster Name und Wert untereinander (Name 10 px oben, Wert darunter) statt nebeneinander. Mini-Leiste: kurze Wortformen („1 Sorte", „kein O₂", „kühl") oder `font-size` 11 px + zweizeilig erlauben.

### U9 · MEDIUM · Glas iPhone · Touch-Ziele deutlich unter 44 px
- Beobachtung (gemessen per getBoundingClientRect in `m-18-bed.png`): Windrichtungen N…NW je 31×21 px (Schrift 9,5 px), Schalter Deckel/Heizplatte 32×18 px, Schieberegler 16 px hoch mit 14-px-Knopf, „‹ Liste" 55×24 px, Zimmer-Logo 22×22 px, Tempo-Knopf 40×32 px, Ansichten-Pillen 28 px hoch, „Verstanden" 32 px hoch.
- Vorschlag: Unter 900 px: `.dirs button` min-height 36 px (Raster 4×2 + „aus" statt 9 in einer Reihe), `.sw` 44×26, Range-Höhe 32 px mit 22-px-Thumb, `.back` padding 10 px, `.seg.views button` height 34, `.pspeed` 44×36.

### U10 · LOW · Glas iPhone · Himmelsrichtungen und gedrehtes Glas
- Beobachtung: Seit fdea68a gibt es eine Nordmarke; am Handy steht das „N" am rechten Glasrand (`m2-11-salz.png`), weil das Glas um 90° gedreht ist. Der Wind-Regler „N/NO/O…" ist damit konsistent, aber wer „Wind aus N" wählt, erwartet intuitiv Wind von oben. Die Nordmarke ist 9–10 px grau und leicht zu übersehen.
- Vorschlag: Nordmarke etwas kräftiger (Cyan, 11 px, kleiner Pfeil), und im Wind-Regler am Handy einen Mini-Kompass mit Pfeil zeigen, der mit dem Glas mitdreht, statt reiner Buchstabenreihe.

### U11 · MEDIUM · Glas alle Geräte · Erster Wettbewerb: „Punkte 0" und leere Sterne, obwohl die Welt wächst
- Beobachtung: Während des Schulfests steigt Biomasse (mit „ZÄHLT"-Badge) von 858 auf 2.375, die Kopfzeile zeigt aber durchgehend „Punkte ▭ 0" und drei leere Sterne „Jury jetzt" (`d-08-contest-start.png`, `d-14-cell.png`, `p-31-toast-nocard.png`); das Modal zeigt „0.27 Grün je Feld … 0". Bei der Jury stehen dann plötzlich 38–58 Punkte. Der Erstspieler bekommt keine Rückmeldung, ob sein Nährsalz etwas bringt.
- Vorschlag: Den Punkte-Balken ab dem ersten Grün sichtbar füllen (z. B. Rohwert relativ zur Gegner-Spanne statt erst ab Schwelle), Delta nach einem Eingriff kurz einblenden („+4"); bis die Jury-Skala greift, statt „0" ein Wort („fängt an", „wird grüner").

### U12 · MEDIUM · Jury Desktop + iPhone · Podest-Namen ragen über die Kästen, Sterne widersprechen dem Platz
- Beobachtung: Bei Platz 2/3 steht der Name oberhalb bzw. auf der Oberkante des niedrigen Kastens („Till" wird von der lila Kante durchgestrichen, „Jonas aus der 4b", „Konstantin von Bülow" ragen heraus) (`p-33-jury.png`, `m2-15-jury.png`, `d-15-jury.png`). Inhaltlich: Platz 1 mit 58 P. bekommt „1 Stern + Bronze-Schleife", Platz 3 mit 38 P. „0 Sterne" – zwei Bewertungssysteme (Platz und Sterne/Schleife) widersprechen sich für ein Kind.
- Vorschlag: Podest-Kästen mit `min-height` je Platz so, dass Name+Punkte immer innen liegen (Name in den Kasten, nicht darüber), oder Name unter das Podest. Schleife an den Platz koppeln (Gold/Silber/Bronze) und Sterne als „Qualität deines Glases" getrennt benennen („Glas-Note ★☆☆").

### U13 · MEDIUM · Glas Desktop + iPhone · Vor dem Tutorial-Start „Kein Wettbewerb · Freies Spiel"
- Beobachtung: Direkt nach „Lampe an" (Tag 1–2) steht oben „Kein Wettbewerb – Freies Spiel. Im Kalender wartet der nächste." mit primärem Knopf „Schulfest starten" (`d-06-after-lamp.png`, `m-06-after-lamp.png`); an Tag 2,5 startet das Tutorial das Schulfest dann selbst. „Freies Spiel" ist für den Erstspieler falsch und lädt zum Klick in den Kalender ein, mitten im Tutorial.
- Vorschlag: Solange `flags.tutorial < 3`: Kopfzeile „Gleich: Schulfest · startet in 1 Tag" ohne Knöpfe; Knopf „Schulfest starten" erst nach dem ersten Wettbewerb anbieten.

### U14 · MEDIUM · Kopfzeile, Wettbewerb-Modal, Kalender · Formel-Sprache statt Kindersprache
- Beobachtung: „Zählt: Pflanzen- und Plankton-Biomasse je Feld, mal Klarheit des Wassers" (Kopfzeile, `d-08-contest-start.png`), „0.27 Grün je Feld", Kalender „0,6 · etablierte Arten + 0,4 · Hill-Vielfalt (wie ausgewogen die Arten sind)" und „Vielfalt der Landschaften (75 %)" (`p-35-calendar.png`). Ein 10-jähriger Held/Spieler versteht „Hill-Vielfalt", „etabliert", Gewichtungen nicht; in der 1100-px-Kopfzeile wird der Satz ohnehin auf „Pflanzen- und Plankton-Bi…" gekürzt.
- Vorschlag: Kurzsatz für Kopfzeile/Kalender („Viel Grün, klares Wasser" / „Viele Arten, keine dominiert"), die Formel nur im Wettbewerb-Modal unter „Wie rechnet die Jury?" aufklappbar. Messgröße als „Grün-Wert 0,9" statt „Grün je Feld".

### U15 · LOW · Glas Desktop · Feld-Detail bleibt nach Jury/Laden stehen, Artenliste verschwindet
- Beobachtung: Ein im Schulfest angetipptes Feld („Fels, Feld 52·25") ist an Tag 17 und Tag 57 nach Jury, Laden und Rückkehr immer noch links offen (`d-17-glass-all-inv.png`, `d-20-day55.png`); die Artenliste ist dahinter versteckt. Der Erstspieler sieht nach dem Laden-Besuch (Lupe gekauft!) nicht die neuen Artennamen, sondern ein altes Feld.
- Vorschlag: `S.cellInfo` und `S.selectedSpecies` beim Verlassen der Glas-Ansicht (`leaveGlass`) zurücksetzen; nach dem Kauf der Lupe den Tab „Arten" aktiv schalten.

### U16 · MEDIUM · Glas Desktop + Laptop (Akt II) · Art-Detail: Gründe-Liste abgeschnitten, Überschrift passt nicht
- Beobachtung: Nach Antippen einer Art füllt das Porträt (104 px) + Lateinname den unteren linken Kasten; „Warum wächst sie hier?" ist bei 1440×900 nach drei Zeilen abgeschnitten (vierter Grund halb sichtbar, Scrollleiste unsichtbar) (`a2-02-species.png`), bei 1100×720 sieht man nur noch Porträt und Namen, keinen einzigen Grund (`a2-04-species-1100.png`). Zudem stehen beim häufigsten Plankton (Bestand steigt) nur rote Pfeile („zu kalt", „zu wenig Licht", „Nährstoffe knapp") unter der Überschrift „Warum wächst sie hier?" – das liest sich widersprüchlich.
- Vorschlag: Bei ausgewählter Art „Zustand der Welt" links einklappen (nur Kopfzeile mit 4 Mini-Werten) oder Porträt auf 64 px verkleinern; Scroll-Fade wie in U3. Überschrift neutral „Was hilft · was bremst", grüne Gründe zuerst; wenn nur bremsende Gründe: Satz „Sie wächst trotzdem, weil sie hier kaum Konkurrenz hat" o. ä.

### U17 · MEDIUM · Glas Laptop (Akt II) · Ansicht „Wohlfühlzone" macht die Karte fast schwarz
- Beobachtung: Mit Mikroskop, Art ausgewählt, Ansicht Wohlfühlzone: Land und Meer werden nahezu einheitlich dunkel, keine Rot/Grün-Flächen erkennbar, nur die Populations-Punkte bleiben (`a2-04-species-1100.png`); Legende „ungeeignet ↔ ideal" verspricht Farben. (Ergänzt REVIEW-UX F3, dort war es überall rot.)
- Vorschlag: Skala auf die Spanne der aktuellen Art normieren (min/max der Eignung im Glas), Mitte nicht `#1a1f29` (= Hintergrund), sondern ein sichtbares Grau; Küstenlinie im Overlay erhalten.

### U18 · LOW · Glas alle Geräte · Kontrast der Hilfetexte auf Dunkelgrund
- Beobachtung: `--faint #55657c` auf `#03060c` ergibt ca. 3,3:1, genutzt für 10–11-px-Texte: `.hint`, `.ctl .sub` (Regler-Erklärungen), `.ph small` („wirken auf die ganze Welt"), `.metric .off` („genau: Gasanalysator"), Nordmarke. In `d-06-after-lamp.png` sind „Verlaufskurven zeigt der Datenlogger" und die Lampen-Erklärung kaum lesbar; gerade das sind die Erklärungen für Erstspieler. Der Jury-Brief hat zudem einen fehlenden Satztrenner: „Neue Art: Berglindmümmler (frisst Pflanzen) 27 Arten auf so kleinem Raum!" (`a2-02`-Lauf, Jury).
- Vorschlag: `--faint` für Text auf ≥ #6f8299 (≈ 4,5:1) anheben bzw. für erklärende Texte `--muted` nehmen und `--faint` nur für Dekor (Trennlinien, Zähler) behalten. Im Jury-Brief Highlights mit „. " verbinden.
