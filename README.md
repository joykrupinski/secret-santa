# 🎄 Familien-Wichteln 2026

Statische Weihnachts-Website, auf der jede Person über ihren **persönlichen Link** erfährt,
wen sie beschenkt – mit Geschenk zum Schütteln, Trommelwirbel, Konfetti, Glöckchen-Melodie
und Countdown bis Heiligabend. Funktioniert auf Handy, Tablet und Computer.

## So bleibt es geheim

- Jede Person hat eine eigene Seite unter `wichtel/<zufallscode>.html`.
- Der Name des Wichtelpartners ist **verschlüsselt** in der Seite. Den Schlüssel gibt es
  nur im persönlichen Link (der Teil hinter dem `#`). Ein Blick in den Quelltext oder ins
  Repo verrät also nichts.
- Die Zuordnung wird nirgends gespeichert – nur die Links (in `generator/links.txt`,
  wird nicht committet).
- Wichtig: Wer einen fremden Link öffnet, sieht dessen Partner. Also jedem nur seinen
  eigenen Link schicken – und fremde Links nicht anklicken. 😉

## Online stellen (GitHub Pages)

1. Im Repo: **Settings → Pages → Build and deployment → Deploy from a branch**
2. Branch auswählen (z. B. `main` nach dem Mergen) und Ordner `/ (root)`, speichern.
3. Nach 1–2 Minuten läuft die Seite unter
   `https://joykrupinski.github.io/secret-santa/`.

Die `basis_url` in `generator/teilnehmer.json` muss zu dieser Adresse passen.

## Neu auslosen / Namen ändern

1. `generator/teilnehmer.json` anpassen:
   - `teilnehmer`: alle Namen
   - `ausnahmen`: Paare, die sich nicht ziehen sollen, z. B. `[["Mama", "Papa"]]`
   - `budget`, `datum`: optional, werden auf den Seiten angezeigt
2. `python3 generator/generate.py` ausführen (nur Python 3, keine Pakete nötig).
3. Neue Links aus der Ausgabe verschicken – **alte Links funktionieren dann nicht mehr.**
4. Änderungen committen und pushen.
