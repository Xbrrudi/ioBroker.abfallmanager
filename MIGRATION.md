# Umstellung von abfallmanager auf wastemanager

Die Umbenennung erzeugt einen neuen Adapter und einen neuen Namespace. Ein Update von `abfallmanager` über Admin benennt vorhandene Instanzen **nicht** um. Es gibt keine automatische Migration und keine migrationsbedingte Löschung. Die alte Version `iobroker.abfallmanager@0.21.7` bleibt für den Rückweg installiert bzw. auf npm verfügbar. Die neue Version erst nach ihrer Veröffentlichung verwenden; die Versionsnummer in diesem PR ist noch nicht zur Veröffentlichung freigegeben.

## Datensicherung und neue Instanz

1. Vollständiges ioBroker-Backup erstellen und die Wiederherstellbarkeit prüfen. Zusätzlich jedes alte Instanzobjekt `system.adapter.abfallmanager.N` als JSON exportieren und alle VIS-2-Projekte über deren Exportfunktion sichern. Ursprüngliche ICS-Dateien ebenfalls behalten. Migration zuerst in einer Kopie/Testinstallation prüfen.
2. Alte Instanz stoppen/deaktivieren. Neue Instanz aus dem veröffentlichten `iobroker.wastemanager`-Paket anlegen und ebenfalls stoppen/deaktivieren. Die neue Instanz darf während der Übertragung nicht laufen. Die Nummer `M` kann von `N` abweichen; eine Zuordnung je Instanz notieren. Keine alte Instanz und keine alten Datenpunkte löschen.
3. Im exportierten alten Instanzobjekt den **vollständigen `native`-Inhalt** sichern und in das `native`-Feld von `system.adapter.wastemanager.M` kopieren. Dafür den Objekteditor im Admin-Expertenmodus verwenden; nur das `native`-Feld des neuen, gestoppten Instanzobjekts ersetzen. `_id`, `common`, Host-Zuordnung, Version und andere Metadaten der neuen Instanz erhalten. Nicht das vollständige alte Objekt unter neuer ID importieren. Anschließend das neue Objekt erneut exportieren und `native` mit dem alten Export vergleichen.
4. Vor dem ersten Start in der **neuen Kopie** `native.autoCleanup=false` setzen und diese eine beabsichtigte Abweichung dokumentieren. `icsText`, `manualEntries` (auch älteres JSON-Stringformat), `importedEntries`, `bins`, `daysBefore`, `hideHour`, `retentionDays` und zusätzliche eigene native Einstellungen unverändert übernehmen. `importedEntries` ist ein abgeleiteter Bestand; Quelle der Berechnung sind `icsText` und `manualEntries`. Kein erneuter ICS-Import ist erforderlich.
5. Neue Instanz starten. Termine im Admin prüfen und `status.imported`, `status.manual`, `status.warnings`, `schedule.json` und `next.*` mit der alten Sicherung vergleichen. `display.*` hängt vom aktuellen Datum und Zeitfenster ab. `bins.<id>.image` und Bildpfade in `display.json` zeigen jetzt auf `/adapter/wastemanager/…`. Bei deaktivierter Bereinigung müssen auch Alttermine erhalten bleiben. Keine Bereinigung auslösen.
6. Vor einer späteren Reaktivierung von `autoCleanup` ausdrücklich entscheiden, ob abgelaufene Termine gemäß der übernommenen Aufbewahrung entfernt werden dürfen. Die vorhandene Bereinigung läuft bereits beim Start und nach dem Tageswechsel; sie ist keine Migration. Wer alle gespeicherten Termine behalten will, lässt sie deaktiviert. Der ursprüngliche Wert ist im unveränderten alten Export gesichert.

Eine Instanzkopie erhält Termine und Konfiguration, aber verschiebt keine historischen State-Werte, History-/SQL-Daten oder benutzerdefinierten `common.custom`-Einstellungen von Datenpunkten. Die alten Objekte bleiben erhalten. Solche Zusatzkonfigurationen bei Bedarf separat am neuen Datenpunkt einrichten.

## VIS-2 und andere Referenzen

In einer **Kopie des exportierten Projekts** ausschließlich die unten genannten Kennungen anpassen und unter einem neuen Projektnamen importieren. Originalprojekt als Rückweg behalten. Kein globales Ersetzen des deutschen Anzeigenamens „Abfallmanager“.

| Bisher | Neu |
| --- | --- |
| `tplAbfallmanagerBin` (Widget `tpl`) | `tplWastemanagerBin` |
| `abfallmanager` (Widget `widgetSet`/`visSet`) | `wastemanager` |
| `vis2AbfallmanagerWidgets` (falls gespeichert) | `vis2WastemanagerWidgets` |
| `abfallmanager.N` (Widget `data.instance`) | `wastemanager.M` |
| `system.adapter.abfallmanager.N` (falls als Instanz gespeichert) | `system.adapter.wastemanager.M` |
| `abfallmanager.N.<Datenpunkt>` | `wastemanager.M.<Datenpunkt>` |
| `/adapter/abfallmanager/…` | `/adapter/wastemanager/…` |
| `/widgets/abfallmanager/…` | `/widgets/wastemanager/…` |

Widget-Komponente `WasteBinWidget`, alle `data`-Optionen außer der Instanz und sämtliche `style`-Werte unverändert lassen. Das Layout, Tonnenmaße, Prozent-/Pixelpositionen und Größen ändern sich nicht. Eigene CSS-Selektoren `.abfallmanager-*` auf `.wastemanager-*` und gegebenenfalls eigene Übersetzungsschlüssel `abfallmanager_` auf `wastemanager_` umstellen. Auch Bindings, Sichtbarkeitsbedingungen, HTML-Widgets, Skripte, Aliase, Blockly sowie externe Dashboards auf alte Datenpunkt- und Asset-Pfade prüfen. Relative Datenpunktnamen und Tonnen-IDs (`rest`, `gelb`, `bio`, `papier`) bleiben gleich. Es gibt keine automatische Weiterleitung vom alten Namespace oder Widget-Typ.

Nach Installation/Upload des neuen Adapters VIS 2 neu starten und Browser neu laden, damit die neue Widget-Registrierung geladen wird. Im kopierten Projekt alle Tonnen, Instanzwechsel, Live-Updates, Leerdarstellung und Editorpositionen prüfen. Erst nach erfolgreicher Abnahme das neue Projekt verwenden. Die echte Projektmigration muss der Betreiber mit seinem Export prüfen; Unit-Tests ersetzen diese Abnahme nicht.

## Rückweg und Kompatibilität

Bei Problemen neue Instanz stoppen, ursprüngliches VIS-Projekt öffnen und alte Instanz wieder aktivieren. Änderungen, die seit dem Wechsel nur in der neuen Instanz erfasst wurden, vorher zusätzlich sichern und bei Bedarf kontrolliert zurückübertragen. Alte Instanz, alte Konfiguration und altes npm-Paket werden nicht gelöscht. Keine zwei Instanzen gleichzeitig dieselben Verbraucher steuern lassen.

`X-ABFALLMANAGER-TYPE` bleibt bewusst als gespeichertes ICS-Kompatibilitätsfeld les- und schreibbar. Bereits ausdrücklich zugewiesene Tonnenarten und UID-/Kalendermetadaten bleiben dadurch erhalten. Neue Kalender nennen im `PRODID` Waste Manager. Historische Hinweise folgen unverändert.

## English migration summary

This is a new adapter identity, not an in-place upgrade. Back up ioBroker, every old instance object and each VIS-2 project. Stop both instances; copy the complete old `native` object into a stopped new `wastemanager.M` instance, keeping the new instance's metadata. Compare exports, then set `autoCleanup=false` in the new copy before starting it, so startup cleanup cannot remove old dates. Keep the original setting in the backup and explicitly decide whether to re-enable cleanup later. ICS, manual entries (including legacy JSON strings), bin settings and all other native configuration survive this copy. Do not reimport ICS.

Migrate a copy of each VIS-2 project using the mapping above, preserving every style and other widget option. Update external state bindings and image paths too. Verify dates, counts, corrections and live display before switching projects. Old state history is not moved. There is no automatic namespace alias or old-widget redirect. Keep the old stopped instance, original project and `iobroker.abfallmanager@0.21.7` for rollback; nothing is automatically deleted. If rolling back, first back up any new changes made after the switch.

# Migration auf 0.20.0

`native.icsText`, `native.manualEntries`, `native.bins`, Anzeige- und Bereinigungsoptionen bleiben erhalten. Manuelle Termine werden sowohl als Array als auch im früheren JSON-Stringformat gelesen. Eine spätere bestätigte Bearbeitung speichert sie als Array. Keine manuelle Neuerfassung nötig.

Die iframe-basierten Importseiten entfallen. Beide Admin-Reiter verwenden dieselben vorhandenen Daten. Beim reinen Öffnen der Konfiguration wird nichts gespeichert. Die vorhandene automatische Bereinigung bleibt aktiv, sofern sie nicht zuvor deaktiviert wurde; die konfigurierte Aufbewahrungsdauer wird berücksichtigt.

Bearbeitete ICS-Einträge behalten ihre UID und Kalendermetadaten. Eine ausdrücklich gewählte Tonnenart wird als `X-ABFALLMANAGER-TYPE` im betreffenden VEVENT gespeichert. Beim Ändern des Datums wird der Termin zu einem ganztägigen Abfuhrtermin normalisiert.

## Migration auf 0.21.3

Keine Projektmigration: bereits gespeicherte Widget-Styles bleiben erhalten. Nur neu angelegte Widgets erhalten die Prozent-Defaults aus dem nativen VIS-Katalog. Die SVG-Bildflächen bleiben bei den konfigurierten Pixelmaßen; ein zu kleiner Rahmen kann im VIS-Editor vergrößert werden. Admin- und Terminlogik bleiben bitgleich. Die Grenze bezüglich der separaten VIS-Containerkorrektur ist in TESTBERICHT.md dokumentiert.
