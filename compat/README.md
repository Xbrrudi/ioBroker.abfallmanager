# Getrennter VIS-2-Kompatibilitätsfix

Dieser Patch gehört zum VIS-2-Quellprojekt und wird vom Adapter weder installiert noch automatisch angewendet. Er verändert keine Projektdateien und keine gespeicherten Widgetpositionen.

Der reproduzierte Rahmensprung entsteht in `VisView.pxToPercent`: Der Editor verwendet `refView.clientHeight/clientWidth`. Das kann von dem CSS-Containing-Block abweichen, gegen den der Browser die Prozentwerte des absoluten Widgets auflöst. Beispiele sind die begrenzte Bildschirmfläche und eine statische Grid-Seite mit `height:auto` und `min-height:100vh` über einem kleineren positionierten Editorcontainer.

Der Patch ermittelt den wirklichen CSS-Bezugscontainer und benutzt dessen Abmessungen bei der Umrechnung. Die Positionierung bleibt damit vollständig in VIS 2. Das Abfallmanager-Widget überschreibt keine Drag-Handler, keine äußeren CSS-Werte und keine globalen VIS-Funktionen.

Quelle: ioBroker/ioBroker.vis-2, `packages/iobroker.vis-2/src-vis/src/Vis/visView.tsx`. Der Patch wurde gegen den offiziellen Quellstand geprüft; der passende Testbuild wird im Prüfbericht angegeben. Er ist ein separater Fixvorschlag für VIS 2, kein freigegebenes Update des fremden Adapters.

Solange eine VIS-2-Installation den falschen Bezugscontainer benutzt, kann das Adapter-TGZ allein den Prozent-Rahmensprung nicht vollständig beheben. Eine solche Zusage würde eine verbotene eigene Positionsumrechnung im Widget oder einen automatischen Eingriff in fremde VIS-Dateien voraussetzen. Beides enthält das Paket nicht.
