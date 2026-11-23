# v0.21.4 – Mülltonnen-Widget

- SVG-Viewport verwendet 100 % der Widget-Rahmengröße statt fester Pixelabmessungen.
- Proportionale Skalierung über `preserveAspectRatio="xMinYMax meet"`, links unten im Rahmen.
- PNG-Tonnen behalten ihr Seitenverhältnis (`xMidYMid meet`).
- Bisherige binWidth/binHeight/binGap-Werte bleiben für bestehende Projekte als relative Größenverhältnisse erhalten.
- Keine Änderung an VIS 2, Widget-Außenposition, Admin oder ICS-Verarbeitung.

**Wichtig:** Die Position des äußeren VIS-2-Widget-Rahmens wird dadurch nicht geändert. Bei unterschiedlichen Bildschirmformaten muss die Position des Rahmens weiterhin zum Hintergrundbild passen.

Der Quellcode und das bereits ausgelieferte kompilierte Widget wurden synchron angepasst. Ein vollständiger Vite-Neubuild war in dieser Umgebung wegen fehlender npm-Abhängigkeiten nicht möglich.
