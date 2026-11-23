# Migration auf 0.20.0

`native.icsText`, `native.manualEntries`, `native.bins`, Anzeige- und Bereinigungsoptionen bleiben erhalten. Manuelle Termine werden sowohl als Array als auch im früheren JSON-Stringformat gelesen. Eine spätere bestätigte Bearbeitung speichert sie als Array. Keine manuelle Neuerfassung nötig.

Die iframe-basierten Importseiten entfallen. Beide Admin-Reiter verwenden dieselben vorhandenen Daten. Beim reinen Öffnen der Konfiguration wird nichts gespeichert. Die vorhandene automatische Bereinigung bleibt aktiv, sofern sie nicht zuvor deaktiviert wurde; die konfigurierte Aufbewahrungsdauer wird berücksichtigt.

Bearbeitete ICS-Einträge behalten ihre UID und Kalendermetadaten. Eine ausdrücklich gewählte Tonnenart wird als `X-ABFALLMANAGER-TYPE` im betreffenden VEVENT gespeichert. Beim Ändern des Datums wird der Termin zu einem ganztägigen Abfuhrtermin normalisiert.

## Migration auf 0.21.3

Keine Projektmigration: bereits gespeicherte Widget-Styles bleiben erhalten. Nur neu angelegte Widgets erhalten die Prozent-Defaults aus dem nativen VIS-Katalog. Die SVG-Bildflächen bleiben bei den konfigurierten Pixelmaßen; ein zu kleiner Rahmen kann im VIS-Editor vergrößert werden. Admin- und Terminlogik bleiben bitgleich. Die Grenze bezüglich der separaten VIS-Containerkorrektur ist in TESTBERICHT.md dokumentiert.
