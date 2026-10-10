# Review Redesign Glas-Ansicht (Branch redesign/neon, Code)

Adversarialer Code-Review der neuen Glas-Ansicht gegen `main`. Funde nach Schweregrad, wichtigste zuerst (laufend angehängt).

---

## 1. HIGH · Lampenarm schluckt alle Werkzeug-Klicks in Lampennähe
**Datei:** src/ui/GlassView.tsx:674-682
**Was passiert:** Mit Lampenarm (`inv.arm`) setzt jedes `pointerdown` innerhalb von `max(4, w/24)` Feldern um den Lichtfleck `dragSun = true` – unabhängig vom gewählten Werkzeug. Danach `return`, auch beim `up`. Die Lampe steht standardmäßig in der Mitte, also genau dort, wo man düngt/Gelände formt. Szenario: Werkzeug „Salz“ gewählt, Tipp nahe der Lampe → statt einer Prise Salz wird die Lampe (minimal) verschoben, kein Salz, keine Rückmeldung. Gleiches für Vulkan, Gelände (Strich beginnt nicht), Kescher, Impfen. Im Prüfen-Modus lässt sich das Feld unter/um die Lampe nicht mehr untersuchen (Klick = Lampen-Drag). Altes Verhalten: Lampe nur mit eigenem Sonnen-Werkzeug ziehbar. `tl === 'sun'` ist jetzt toter Code (Werkzeug existiert nicht mehr).
**Vorschlag:** Greifen nur im Prüfen-Modus (`tl === 'look'`) und nur, wenn der Zeiger sich nach dem `down` tatsächlich bewegt (Schwelle ~0,5 Feld); reiner Klick ohne Bewegung = Feld prüfen. Bei anderen Werkzeugen nie greifen. `tl === 'sun'` entfernen.

## 2. MEDIUM · Neue-Arten-Meldungen erscheinen nirgends mehr
**Datei:** src/ui/GlassView.tsx (fehlende StatusChips), src/ui/Modals.tsx:179, src/game/career.ts:281
**Was passiert:** Entdeckungen werden als Toast der Art `'species'` gemeldet. `Toasts` filtert `kind !== 'species'` heraus, weil der alte GlassView sie als anklickbaren Chip (`StatusChips`, letzter species-Toast) gezeigt hat. Der neue GlassView rendert keinen solchen Chip mehr → „Neue Art entstanden“ / „Etwas Neues regt sich …“ ist nur noch versteckt im Chronik-Tab sichtbar, Klick-zur-Art entfällt.
**Vorschlag:** In der AlertLine (oder als eigener Chip) den letzten species-Toast anzeigen (mit `pickSpecies`), oder den Filter in `Toasts` entfernen.

## 3. MEDIUM · Hilfe-Fenster nicht mehr erreichbar, Hilfe nennt entfernte Tasten
**Datei:** src/ui/GlassView.tsx:591-602 (Menu), 631-643 (Tastatur); src/ui/Modals.tsx:139
**Was passiert:** Der einzige Einstieg zu `modal kind 'help'` war der Info-Knopf in der alten Kopfzeile. Im neuen Menü (Zimmer, Heft, Laden, Kalender, Foto, System) fehlt er → „So funktioniert dein Glas“ (die drei Regeln) ist unerreichbar. Zusätzlich wurden die Kürzel `s` (Sonne) und `w` (Wind) entfernt, die Hilfe listet sie aber weiter („S Sonne · W Wind … U Untersuchen“). Text „Werkzeug unten antippen … Oben stellst du das Tempo ein“ stimmt auch nicht mehr (Tempo jetzt unten).
**Vorschlag:** Menüpunkt „Hilfe“ (Icon `info`) ergänzen; Hilfetext an das neue Layout und die gültigen Kürzel anpassen (oder `s` = Lampen-Regler fokussieren, `w` = Wind an/aus als Kürzel nachrüsten).

## 4. MEDIUM · Biomasse als exakte Zahl ohne Messgerät (Wissens-Maskierung)
**Datei:** src/ui/GlassView.tsx:174 (WorldState, `known: true`), 458 (MiniStrip)
**Was passiert:** Biomasse wird immer als genaue Zahl (z. B. „12.345“) gezeigt, bei Datenlogger sogar mit %-Trend – ohne jedes Instrument. Alle anderen Werte (Arten, O₂, Temperatur) fallen ohne Gerät auf Worte zurück; der alte GlassView zeigte gar keine Biomasse. Verstößt gegen „was kein Messgerät hat, zeigt nur Worte“. Ähnlich: Landschaften-Tab (BiomeList, :240-241) zeigt exakte Prozent je Biom und Land/Meer-% ohne Instrument (alt: nur relative Balken).
**Vorschlag:** Biomasse ohne Instrument als Wort („kaum Leben / etwas / viel / üppig“), Zahl erst mit passendem Gerät (z. B. Datenlogger oder Lupe); BiomeList-Prozente nur mit Höhenkarte/Regenmesser oder als Balken ohne Zahl.

## 5. MEDIUM · Bedingungen bleiben während „Ferien bei Oma“ (S.locked) bedienbar
**Datei:** src/ui/GlassView.tsx:489-550 (Conditions), 743
**Was passiert:** Bei `S.locked` werden nur Werkzeuge und Tempo deaktiviert und das Glas entsättigt. Das neue rechte Panel (Lampe, Tageslänge, Wind, Meeresspiegel, Deckel, Heizplatte, Kühlplatte, UV) bleibt voll aktiv; im alten Layout steckten diese Regler hinter den (gesperrten) Werkzeug-Knöpfen. Szenario: Während `sim.advance(5)` läuft, dreht der Spieler den Wind; der Befehl landet in der Worker-Warteschlange und greift nach der Rückkehr – die UI suggeriert aber, man könne während der Abwesenheit eingreifen. Auch „Ablassen/Nachfüllen“ ruft `sfx` und Befehle ab.
**Vorschlag:** `<fieldset disabled={S.locked.value}>` um Conditions (bzw. `disabled` an Range/Buttons/Switches), Panel optisch dimmen.

> Verifiziert zu Fund 1 (Playwright, 1440×900, Glas S, Lampenarm): Werkzeug Salz, Klick 2 Felder neben der Lampe → `inv.salz` bleibt 5, Lampe springt von x 0,50 auf 0,52. Klick weit weg → Salz 4. Prüfen-Klick nahe Lampe → `cellInfo` bleibt null. Am Handy (gedreht) ist ein Tipp in die Glasmitte bei S, M und XL ebenfalls wirkungslos.

## 6. MEDIUM · Regler springen beim Ziehen zurück, solange die Zeit läuft
**Datei:** src/ui/GlassView.tsx:480-485 (Range), 507-541 (Tageslänge, Windstärke, Heizplatte, Kühlplatte, UV)
**Was passiert:** `Range` ist kontrolliert (`value={ctl.x}`) und aktualisiert nur bei `change`. GlassView (und Conditions) rendern bei jedem Snapshot neu (`S.meta`), Preact schreibt dabei `dom.value` auf den alten Wert zurück. Während des Ziehens springt der Daumen also mehrmals pro Sekunde zurück (die Spurfüllung `--p` aber nicht, weil der Style-String gleich bleibt) → Daumen und Füllung laufen auseinander, Endwert hängt davon ab, ob zwischen letztem Move und Loslassen ein Snapshot kam. Verifiziert: Tageslänge 12 → per input auf 18 gesetzt, 1,5 s bei 10× → `value` wieder „12“, kein Befehl gesendet. Nur die Lampe hat mit `lampLocal` einen lokalen Zwischenzustand.
**Vorschlag:** Lokalen Zustand in `Range` selbst halten (`const [loc, setLoc] = useState<number|null>(null)`, `value={loc ?? value}`, onInput setLoc, onChange senden + setLoc(null)), dann gilt es für alle Regler.

## 7. LOW · Lampen-Anzeige bleibt auf altem Wert hängen
**Datei:** src/ui/GlassView.tsx:491-504
**Was passiert:** `lampLocal` wird bei `input` gesetzt und nur bei `change` zurückgesetzt. Zieht man den Regler weg und wieder auf den Ausgangswert, feuert kein `change` → `lampLocal` bleibt dauerhaft gesetzt. Spätere Änderungen von außen (Stromausfall-Ereignis, Tutorial „Lampe an“, Laden eines Spielstands im selben Mount) werden in Wert und Regler nicht mehr angezeigt. Verifiziert: danach `sun I=0.3` gesendet → Anzeige bleibt „60 %“.
**Vorschlag:** Mit Fund 6 lösen; zusätzlich `onPointerUp`/`onBlur` → `setLampLocal(null)`.

## 8. LOW · Gesamte Glas-Ansicht rendert bei jedem Snapshot neu
**Datei:** src/ui/GlassView.tsx:620-621 (`const meta = S.meta.value` im Wurzel-Component)
**Was passiert:** Nur für das Seitenverhältnis liest `GlassView` `S.meta.value`. `S.meta` wird bei jedem Snapshot gesetzt (bis 10/s bei 30×, plus alle 60 ms beim Lampe-Ziehen und bei jedem Befehl). Damit rendert der komplette Baum neu (WorldState mit 4× `h.map` über 160 Tage, SpeciesList mit `registry.find` je Zeile = O(n²), Conditions, ContestBox mit `liveStatus()` inkl. `evaluate` + `rivalField`). Der alte GlassView hing nicht an `S.meta`. Ursache auch für das Zurückspringen der Regler (Fund 6).
**Vorschlag:** Seitenverhältnis über `useComputed(() => meta ? meta.w/meta.h : 1.5)` bzw. eigenes Kind-Component für die Bühne; dann rendert die Wurzel nur bei echten Größenwechseln.

## 9. LOW · Toasts und Lernkarten liegen am Handy über dem Glas und schlucken Tipps
**Datei:** src/ui/style.css:342-343
**Was passiert:** Am Handy (≤900 px) stehen `.toasts` und `.card-learn` fest bei `top: 56px` – genau über dem oberen Glasrand (hochkantes Glas beginnt bei ~62 px). Verifiziert (390×844, XL): Tipp ins Glas oben rechts trifft den Toast „Umgezogen in die Biosphären-Schale …“ statt der Karte; der Toast verschwindet, `showAt` springt ggf. zu einem Ort, das Feld wird nicht geprüft.
**Vorschlag:** Toasts am Handy über der Tab-Leiste (unten) oder `pointer-events: none` außer auf einem kleinen Schließen-Bereich; Lernkarte als Blatt über der Tab-Leiste.

## 10. LOW · Handy: Windrichtungen passen nicht zum gedrehten Glas
**Datei:** src/ui/GlassView.tsx:486-519 (DIR_SHORT/DIR_ORDER), 733 (rotate 90deg)
**Was passiert:** Am Handy ist die Welt um 90° im Uhrzeigersinn gedreht: Welt-Nord liegt rechts, Welt-West oben. Die Wind-Knöpfe beschriften weiter N/O/S/W bezogen auf die Welt. „Wind aus N“ weht am Handy sichtbar von rechts nach links; die Schlieren im Glas zeigen das auch. Für Spieler, die „N = oben“ erwarten, ist der Wind-Regler am Handy irreführend (Regenschatten hinter Bergen landet „falsch“).
**Vorschlag:** Am Handy die Beschriftung mitdrehen (Pfeile statt Himmelsrichtungen, Pfeil-Icons um 90° rotiert) oder Richtungen als „von oben/rechts …“ relativ zum Bildschirm anzeigen.

## 11. LOW · „Zählt“-Markierung fehlt für alle Akt-3-Wettbewerbe
**Datei:** src/ui/GlassView.tsx:103-108 (CAT_METRIC)
**Was passiert:** `CAT_METRIC` kennt `development`, `peace`, `culture`, `index` nicht. In Europameisterschaft, Frieden, Kultur-Cup und Grand Prix erscheinen keine „zählt“-Badges/Tab-Punkte (nur der Nebenanteil `colorful`/`landscapes` wird markiert) – genau im Akt, in dem der Spieler am meisten Orientierung braucht.
**Vorschlag:** Zuordnung ergänzen (z. B. development→species, index→species/o2, culture/peace→species) oder für Kategorien ohne Messwert den Hinweis in der Wettbewerbs-Box selbst geben.

## 12. LOW · Alarmzeile verrät Überdüngung ohne Bodenprobe-Set
**Datei:** src/ui/GlassView.tsx:397
**Was passiert:** „Wasser trüb · Algenblüte durch zu viele Nährstoffe“ erscheint ohne Instrument. Laut Laden ist genau das die Funktion des Bodenprobe-Sets („Nährstoff-Ansicht und Warnungen bei Überdüngung“). Der alte Chip sagte nur „Wasser trüb“.
**Vorschlag:** `why` nur mit `know.nutr()`, sonst ohne Ursache oder „Ursache: Bodenprobe-Set“.

## 13. LOW · Tutorial-Texte und Puls-Hinweis passen nicht zum neuen Layout
**Datei:** src/data/cards.ts:5, 11; src/ui/GlassView.tsx:575; style.css:331-332
**Was passiert:** Lernkarte „Dein erster Wettbewerb“ verweist auf „Nährsalz (unten im Dock)“; das Werkzeug heißt jetzt „Salz“, am Handy liegt es im geschlossenen Blatt „Eingriff“. Der Puls (`.tool.pulse` auf Salz während Schulfest) ist am Handy unsichtbar, weil `.tools` nur bei offenem Eingriff-Blatt angezeigt wird – der wichtigste Tutorial-Hinweis fehlt also auf dem Handy. „Werkzeuge“-Karte: „Unten liegen deine Werkzeuge“ stimmt am Handy nur nach Öffnen des Tabs.
**Vorschlag:** Während `schulfest && !flags.dosed` auch den Tab „Eingriff“ pulsieren lassen; Kartentexte auf „Salz“ bzw. „Tab Eingriff“ anpassen.

## 14. LOW · Art-Porträt läuft über den Kopfbereich hinaus
**Datei:** src/ui/style.css:188 (`.gv .spcard-head`), Regel `.spcard-head > svg` aus main entfernt
**Was passiert:** Die alte Regel gab dem SVG `position:absolute; inset:0; 100 %` und dem Kopf `overflow:hidden; position:relative`. Neu fehlt beides: Das Porträt-SVG (viewBox 200×120, `slice`) nimmt die volle Breite (~260 px) und damit ~156 px Höhe ein, der Kopf ist nur 104 px hoch → Hintergrund und Punkte ragen unter Titel und Lateinnamen (sichtbar in shots/redesign/d-06-species.png).
**Vorschlag:** `.gv .spcard-head { position: relative; overflow: hidden; } .gv .spcard-head > svg { position: absolute; inset: 0; width: 100%; height: 100%; }`.

## 15. LOW · Epilog-Statistik verliert ihr Layout (CSS-Kollision)
**Datei:** src/ui/style.css (Regeln `.stat-grid`, `.stat` entfernt); src/ui/Story.tsx:49-53
**Was passiert:** Mit dem alten Glas-CSS wurden `.stat-grid`/`.stat` gelöscht, der Ende-Bildschirm (Story.tsx, Epilog) nutzt sie aber weiter. Die vier Kennzahlen (Glastage, Arten, Siege, Spielzeit) erscheinen als ungestylte Blöcke untereinander statt als 2×2-Raster.
**Vorschlag:** `.stat-grid`/`.stat` (neutral, im neuen Look) wieder aufnehmen oder Story.tsx auf `.kvgrid`/`.kv` umstellen.
