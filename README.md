# ioBroker Abfallmanager

Native Konfiguration für ioBroker Admin 8 (GUI API 2). Das Installationspaket enthält die fertig gebauten React-Komponenten und deren Module-Federation-Manifest. Auf dem ioBroker-System ist kein Frontend-Build erforderlich.

**Wichtige Grenze:** Der nachgewiesene Prozent-Rahmensprung liegt in der VIS-2-Containerumrechnung. Das Adapterpaket repariert die SVG-Darstellung, Größe und Anker sowie neue Prozent-Defaults. Für betroffene VIS-2-Seiten ist zusätzlich die separat mitgelieferte VIS-2-Korrektur erforderlich; das TGZ verändert den fremden VIS-Adapter nicht automatisch. Siehe TESTBERICHT.md und compat/README.md.

## Voraussetzungen und Installation

Getestet mit Admin 8.3.5, js-controller 7.2.5 und Node.js 22.23.5. Admin 8.3.5 setzt mindestens Node.js 22.19.0 voraus.

Das Paket über die ioBroker-Installation aus einer lokalen Datei installieren, beispielsweise im ioBroker-Verzeichnis:

```
npm install /pfad/iobroker.abfallmanager-0.21.7.tgz --omit=dev
iobroker upload abfallmanager
iobroker add abfallmanager
```

Bei vorhandener Instanz den letzten Befehl auslassen und die Instanz neu starten. Die bestehende Instanzkonfiguration bleibt erhalten. Bei einem Update werden keine Standardtermine importiert.

## Bedienung

Im Reiter „Allgemein / ICS“ eine ICS-Datei wählen. Die Vorschau zeigt neue Termine, Duplikate und Konflikte. Konflikte entstehen bei gleicher Tonne am gleichen Tag oder bei geänderter Abholung mit gleicher UID. Bei Konflikten Überschreiben, Überspringen oder Ergänzen wählen. Die nächste Entscheidung kann auf alle Konflikte angewendet werden. Exakte Duplikate werden übersprungen. Import bestätigen übernimmt Termine in den Admin-Entwurf. Weitere Dateien können anschließend ergänzt werden. Erst „Speichern“ bzw. „Speichern und schließen“ im Admin schreibt dauerhaft in die Instanzkonfiguration.

„Termine / Korrekturen“ zeigt importierte und manuelle Termine gemeinsam, chronologisch sortiert. Hinzufügen, Bearbeiten/Verschieben und bestätigtes Löschen ändern ebenfalls zunächst nur den Entwurf. Nach 25 Zeilen kann zur nächsten Seite gewechselt werden; die Komponente erzeugt keinen eigenen Scrollbereich. Frühere manuelle Streichungen und Verschiebungen bleiben sichtbar und wirksam.

Die automatische Bereinigung läuft beim Start und am ersten Minuten-Takt nach dem lokalen Kalenderwechsel. Standardwert 1 entfernt eine Abholung am Folgetag. 0 entfernt sie bereits am Abholtag, 7 nach sieben Kalendertagen. `autoCleanup=false` deaktiviert die Automatik. Der Datenpunkt `cleanup.trigger` ermöglicht eine ausdrücklich angeforderte sofortige Bereinigung. Die Bereinigung schreibt dauerhaft und erhält andere Einstellungen.

ICS unterstützt einzelne VEVENT-Termine mit Datum oder Datum/Uhrzeit, gefaltete Zeilen und maskierte Texte. Die Abholung gehört immer zum in DTSTART angegebenen Kalendertag. Wiederholungsregeln (RRULE) werden mit einer verständlichen Importfehlermeldung abgewiesen; sie müssen als Einzeltermine exportiert werden. Maximal 5 MB je Datei.

## VIS 2

Das native Widget erscheint automatisch unter „Abfallmanager“. Es verwendet Module Federation mit einem ES-Modul-Einstieg und die bestehende VIS-Verbindung. Es liest weiterhin den Datenpunkt `abfallmanager.N.display.json`; die unveränderte Adapterlogik bestimmt das Zeitfenster und die Ausblendung ab 18 Uhr.

Die vier vorhandenen transparenten Fotografie-PNGs werden in einem SVG ausgegeben. SVG-Viewport und ViewBox besitzen dieselben Pixelabmessungen. Tonnenbreite 120 und Tonnenhöhe 185 ergeben daher eine Bildfläche von 120 × 185 CSS-Pixeln. Die äußere Rahmengröße vergrößert diese Bildfläche nicht. Ein zu kleiner Rahmen begrenzt den Inhalt; er lässt sich im normalen VIS-Editor vergrößern.

Die erste sichtbare Tonne beginnt links bei x=0, alle stehen auf derselben Grundlinie. Weitere sichtbare Tonnen folgen rechts mit dem eingestellten Abstand. Reihenfolge: Restabfall, Wertstoff, Bio, Papier. Ausgeblendete Tonnen belegen keinen Platz.

Neue Widgets erhalten über `visDefaultStyle` die Werte left/top 0 %, width 60 % und height 35 %. Bestehende Styles werden nicht migriert oder überschrieben. Auch vorhandene Pixelwerte bleiben erhalten. Die innere SVG-Darstellung verändert weder den äußeren Rahmen noch dessen Drag-/Resize-Verhalten.

Schatten, Beschriftung, Schriftgröße/-farbe, Abstand, Tonnenmaße, Instanz und Leerdarstellung bleiben konfigurierbar. Bestehende VIS-Datenpunkte und Assets bleiben verfügbar.

## Entwicklung und Tests

```
npm ci
npm ci --prefix src-admin
npm run build:admin
npm ci --prefix src-widgets-jsvite
npm run build:widgets
npm test
npm run check
npm run preflight:widgets
npm pack
```

Browser- und Controller-Integrationstests verwenden ausschließlich eine separate Testinstallation. Dazu `IOBROKER_TEST_ROOT` auf deren Verzeichnis setzen; dort müssen Admin 8.3.5 auf 127.0.0.1:18081, js-controller 7.2.5 und die Abfallmanager-Testinstanz eingerichtet sein. Diese Tests verändern deren Konfiguration. `npm run test:browser` und `npm run test:controller` ausführen. Testergebnisse landen in `TEST_OUTPUT_DIR` oder `test-results/`.

Siehe TESTBERICHT.md für ausgeführte Prüfungen und Einschränkungen.

## Veröffentlichung

Nach Freigabe und Merge den passenden Versions-Tag auf den Release-Commit in `main` setzen und zu GitHub übertragen. Der Workflow `release.yml` prüft Versionen, Tests, Builds, Schema und Paketinhalt. GitHub Actions veröffentlicht das geprüfte Tarball per npm Trusted Publishing und hängt es danach an das GitHub-Release an.

Bei einem Teilfehler in GitHub Actions **Re-run failed jobs** verwenden, damit die erfolgreichen Jobs und das bereits geprüfte Tarball desselben Laufs wiederverwendet werden. Ist die Version bereits auf npm vorhanden, wird die Integrität mit dem geprüften Tarball verglichen.

## Changelog

### 0.21.7

- `@iobroker/testing` auf `^6.3.0` aktualisiert (E0036).
- Unzulässiges Versionsfeld auf oberster Ebene der `io-package.json` entfernt (E1105).
- Veröffentlichung auf npm und GitHub per getaggtem GitHub-Actions-Workflow eingerichtet.
