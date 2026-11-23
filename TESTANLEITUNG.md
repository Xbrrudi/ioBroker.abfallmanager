# Testanleitung

Die automatisierten Tests liegen in `test/`. `npm test` prüft Import, Konflikte, CRUD, Migration, Aufbewahrung, Kalendergrenzen und den täglichen Adapter-Timer. `npm run check` prüft JavaScript-Syntax, jsonConfig gegen das originale Admin-8.3.5-Schema und das GUI-API-2-Manifest.

Die Dateien `test/fixtures/grevesmuehlen.ics` und `grevesmuehlen-konflikte.ics` sind ausdrücklich synthetische Grevesmühlen-Testkalender. Ihre Daten sind keine amtlichen Abfuhrtermine.

Browser- und Controller-Tests sind in README.md beschrieben. Nur in einer separaten Testinstallation ausführen, da sie die Testinstanzkonfiguration verändern.
