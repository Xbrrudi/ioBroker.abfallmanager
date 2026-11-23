# Prüfbericht – ioBroker Abfallmanager 0.21.3

Prüfdatum: 19. November 2026. Reparaturbasis: vorhandenes `iobroker.abfallmanager-0.21.2.tgz`, weiterbearbeitet unter `work/v0213/package`. Keine Neuimplementierung des Adapters.

## Ergebnis und notwendige Abgrenzung

Das installierbare Adapterpaket 0.21.3 enthält die reparierte SVG-Innendarstellung, pixelgenaue Bildflächen, einen festen gemeinsamen Anker und native Prozent-Defaults für neue Widgets. Die bestehenden Admin- und Termin-Funktionen bleiben unverändert.

**Der reproduzierte äußere Rahmensprung ist ein Fehler der Prozentumrechnung in VIS 2. Das Adapter-TGZ allein kann diesen Fehler auf betroffenen VIS-Seiten nicht vollständig beseitigen, ohne die ausdrücklich ausgeschlossene eigene Positionsumrechnung oder Eingriffe in fremde VIS-Dateien einzuführen.** Deshalb liegt eine separate, nachvollziehbare VIS-2-Quellkorrektur bei. Sie wird nicht automatisch installiert. Die Aussage „auf unverändertem VIS 2 vollständig repariert“ wäre für diese Fälle falsch.

## Tatsächliche Ursache des Positionsfehlers

Die Vererbung ist korrekt: Abfallmanager und das native Referenzwidget `BasicSvgShape` / `tplShapes` verwenden `VisRxWidget`. Beide rufen `super.renderWidgetBody(props)` auf. Die Basisklasse erzeugt das äußere Service-DIV und dessen Auswahlrahmen, Drag- und Resize-Handler. Im Widget gibt es keine zusätzliche Positionsberechnung und keinen äußeren Transform.

Der Fehler liegt im Host: `VisView.pxToPercent` dividiert beim Speichern einer Bewegung die Pixelposition durch `refView.current.clientHeight/clientWidth`. CSS-Prozentwerte absolut positionierter Elemente beziehen sich jedoch auf deren tatsächlichen Containing Block. Dieser kann eine andere Höhe bzw. Breite besitzen.

Zwei nachgewiesene Fälle:

1. Begrenzte Bildschirmfläche: Der Widget-Container ist beispielsweise 1000 × 600 Pixel groß, während VIS für die Umrechnung die größere Editorfläche benutzt.
2. Statische Grid-Seite mit automatischer Höhe und einer Mindesthöhe von 100vh: Die Ansicht ist höher als der positionierte Vorfahr, gegen den CSS die Widget-Prozentwerte auflöst.

Die produktive Seite wurde ausschließlich lesend untersucht. Dort läuft VIS 2.20.8. Gemessen wurden 1100 Pixel Höhe der statischen Grid-Ansicht und 946 Pixel Höhe des tatsächlichen Positionscontainers. Der vorhandene Prozentwert `top:49.79%` wird vom Browser gegen 946 Pixel ausgewertet; die Editor-Umrechnung verwendet die andere Höhe. Dies erklärt den Sprung des gesamten Rahmens. Es wurden keine produktiven Widgets bewegt oder verändert und keine Lizenzschlüssel gelesen.

In der isolierten Nachbildung desselben Verhältnisses sprang das Abfallmanager-Widget beim Loslassen um etwa 55–73 Pixel nach oben. Das native VIS-SVG-Referenzwidget sprang unter identischen Bedingungen ebenso. Pixelpositionen waren im ursprünglichen Vergleich stabil. Der Wechsel von SVG zu HTML konnte diesen Hostfehler nicht beheben.

Die separate VIS-Korrektur ermittelt den tatsächlichen CSS-Bezugscontainer: die begrenzte Fläche, die Ansicht selbst, wenn sie einen Containing Block bildet, oder deren `offsetParent`. Diese Maße werden für die Umrechnung verwendet. Gespeicherte Projektwerte und CSS-Positionierung werden nicht nachträglich verändert.

## Änderungen am Adapter

- SVG-Ausgabe innerhalb einer normalen `vis-widget-body`; die äußere VIS-Struktur bleibt unangetastet.
- SVG-Viewport und ViewBox haben identische numerische Abmessungen. Eine SVG-Einheit entspricht einem CSS-Pixel. Kein automatisches Vergrößern durch eine größere äußere Widgetfläche.
- Bildfläche bei den Standardwerten: exakt 120 × 185 CSS-Pixel. Ein kleinerer äußerer Rahmen begrenzt den Inhalt; der native VIS-Editor kann ihn vergrößern.
- Die vorhandenen vier fotorealistischen PNG-Freisteller bleiben unverändert und werden als SVG-Image-Elemente eingebunden. Ihre Alphakanäle sind erhalten.
- Jede erste sichtbare Tonne beginnt bei x=0 und auf derselben Grundlinie. Weitere Tonnen folgen rechts mit dem konfigurierten Abstand. Stabile Reihenfolge: Restabfall, Wertstoff, Bio, Papier. Keine Leerplätze für ausgeblendete Tonnen.
- Neue Widgets erhalten über den offiziellen `visDefaultStyle`-Katalog left/top `0%`, width `60%`, height `35%`, position `absolute`. Der native VIS-Katalog übernimmt und speichert diese Werte. Keine eigene Prozentumrechnung im Widget.
- Keine automatische Migration bereits gespeicherter Pixel- oder Prozentwerte. Bestehende Projektpositionen und Rahmenmaße werden nicht überschrieben.
- Widget-ID `tplAbfallmanagerBin`, Gruppe „Abfallmanager“, Federation-Name, ES-Modul-Registrierung und Datenpunkt-Abonnements bleiben kompatibel.

## Unveränderte Funktionen

SHA-256-Dateivergleiche bestätigen: `main.js`, sämtliche Dateien in `lib/` und der gesamte Admin-Bereich sind bitgleich mit der funktionierenden Version 0.20.0. Der erneut ausgeführte Admin-Build erzeugt ebenfalls bitgleiche Dateien.

ICS-Import, Konfliktbehandlung, manuelle Korrekturen, Bereinigung, Einstellungen und die Steuerung über `display.json` wurden nicht umgebaut. Der Standard von zwei Tagen Vorlauf und Ausblenden ab 18 Uhr bleibt erhalten.

## Testumgebungen und Ergebnisse

Separate lokale Installation mit Node.js 22.23.5, js-controller 7.2.5 und Admin 8.3.5. VIS 2.20.11 wurde für die erste Prüfung verwendet; die Positionsdiagnose wurde zusätzlich mit der auf dem produktiven System beobachteten Version 2.20.8 wiederholt. Browser: Chromium über Playwright. Keine Mocks für die praktischen Editorprüfungen.

- 30 automatisierte Tests erfolgreich: vorhandene Termin-/Adaptertests sowie Widget-Lifecycle, Abonnementwechsel, verspätete Antworten, fehlerhafte Daten, Maße, Anker, Prozent-Defaults und unveränderte bestehende Styles.
- 14 Admin-Browserprüfungen erfolgreich: Importvorschau, Verwerfen, Duplikate, alle Konfliktvarianten, Bearbeiten/Verschieben/Löschen, Speichern und Neuladen sowie Seitennavigation.
- Sechs Controllerprüfungen erfolgreich: reale Startbereinigung, Datenpunkte, sieben Tage Aufbewahrung, deaktivierte Automatik und expliziter Bereinigungstrigger. Keine adaptereigenen Warnungen oder Fehler während dieser Prüfungen.
- Zehn Widget-Browserprüfungen erfolgreich: automatische Gruppe/Registrierung, alle vier einzelnen Tonnen, gemeinsamer Anker, vier gleichzeitige Tonnen, Live-Wechsel, Maße 120 × 185 und 80 × 140, Abstand, Schatten/Text, native Rahmenvergrößerung ohne Mitvergrößerung der Bilder, Transparenz, neue Prozentwerte und Browser-Ladefehlerprüfung. Die DOM-Geometrie von Editor und Runtime wurde ebenfalls verglichen.
- Admin-Build, Widget-Build, JavaScript-Syntaxprüfung, originales Admin-8.3.5-jsonConfig-Schema und Paket-Preflight erfolgreich. Der Adapter besteht aus unmittelbar ausführbarem JavaScript; ein zusätzlicher Adapter-Transpiler ist nicht erforderlich.
- Das finale Paket wurde aus der Tar-Datei installiert und sein Inhalt gegen die neu gebauten Artefakte geprüft. Der zugehörige Installationsnachweis wird mitgeliefert.

### Praktische Positionsmatrix

Je Variante wurden Abfallmanager und natives VIS-SVG-Referenzwidget auf derselben Art von Seite verglichen: drei Bewegungen und eine Größenänderung. Gemessen wurden der äußere Rahmen während des Ziehens und nach dem Loslassen sowie die gespeicherten CSS-Einheiten.

| Host-Konfiguration | Unverändertes VIS | Separater VIS-Containerfix |
|---|---|---|
| Absolute Seite mit übereinstimmendem Bezugscontainer | stabil | stabil |
| Begrenzte Bildschirmfläche mit Prozentwerten | Fehler reproduziert, beide Widgets | bestanden: 3 Bewegungen + Resize je Widget |
| Grid-Seite mit abweichender Mindesthöhe und Prozentwerten | Fehler reproduziert, beide Widgets | bestanden: 3 Bewegungen + Resize je Widget |

Unter VIS 2.20.8 wurden in allen sechs Vergleichsfällen nach dem separaten Hostfix die drei Bewegungen und die Größenänderung bestanden. Positionsabweichung nach Loslassen: maximal 0,08 Pixel, Resize-Abweichung unter 1 Pixel; die vier äußeren CSS-Einheiten bleiben Prozentwerte. Die Rohmesswerte stehen in den JSON-Protokollen des Prüfnachweis-Archivs. Die vollständigen Testprotokolle unterscheiden ausdrücklich zwischen unverändertem und testweise korrigiertem VIS. Ein erfolgreicher Test des Hostfixes darf nicht als Erfolg des alleinigen Adapterpakets ausgelegt werden.

## Grenzen und noch offene Praxistests

- Die lokale VIS-Testinstallation besitzt keine VIS-Lizenz. Ein uneingeschränkter lizenzierter Runtime-Abnahmetest auf der produktiven Hausfoto-Seite bleibt offen. Die Lizenzprüfung wurde nicht umgangen. Der lokale Runtime-DOM konnte regulär geladen und vermessen werden; daraus wird keine Lizenzfreigabe abgeleitet.
- Auf dem produktiven System wurden keine Installation, kein Drag-/Resize-Test und keine Projektmigration vorgenommen. Die dort gespeicherten Positionen sind unverändert.
- Die separate VIS-Korrektur ist ein Fixvorschlag für das fremde VIS-Projekt, kein vom VIS-Projekt veröffentlichter Release. Vor einer Freigabe als vollständig behobene Gesamtlösung muss dieser Hostfehler in der verwendeten VIS-Version korrigiert und dort abgenommen werden.
- Geerbte Repository-Platzhalter in den Adapter-Metadaten wurden nicht erfunden ersetzt. Vor einer Veröffentlichung ist die tatsächliche Repository-Adresse einzutragen.
- Externe Hinweise der Testumgebung – etwa fehlendes Windows-`wmic` oder die fehlende VIS-Lizenz – sind nicht mit adaptereigenen Startfehlern gleichzusetzen.

## Quellen und Referenz

- Offizielles natives SVG-Referenzwidget: https://github.com/ioBroker/ioBroker.vis-2/blob/v2.20.8/packages/iobroker.vis-2/src-vis/src/Vis/Widgets/Basic/BasicSvgShape.tsx
- VIS-Containerumrechnung: https://github.com/ioBroker/ioBroker.vis-2/blob/v2.20.8/packages/iobroker.vis-2/src-vis/src/Vis/visView.tsx
- Native Widgetstruktur und Module Federation: https://github.com/ioBroker/ioBroker.vis-2-widgets-react-template

Die beigelegte Quellkorrektur wurde zusätzlich mit `git apply --check` gegen den offiziellen Tag v2.20.8 geprüft. Die praktische Wirkung wurde am getrennten VIS-Testbuild geprüft, nicht an der produktiven Installation.
