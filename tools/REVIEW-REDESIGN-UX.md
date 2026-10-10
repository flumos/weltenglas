# Review Redesign Glas-Ansicht · UX & Visual (10.10.2026)

Durchgespielt per Playwright (Neues Spiel → Prolog → Lampe an → Schulfest → Jury → Laden → alle Instrumente → Tag 57) auf Desktop 1440×900, Laptop 1100×720, iPhone 390×844 (isMobile, hasTouch).
Screenshots: `/private/tmp/claude-501/-Users-felix-pka/f6e5edd9-c8b5-4746-ba3d-5c57a2c33c40/scratchpad/review-ux/shots/` (Präfix d- = 1440, l- = 1100, m- = iPhone).

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
