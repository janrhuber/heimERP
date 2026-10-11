---
description: npm-Abhängigkeiten prüfen (Sicherheit, Aktualität)
---

Prüfe die Abhängigkeiten des Backends. **Nichts automatisch aktualisieren.**

1. `cd server && npm audit` und `npm outdated`.
2. Je Fund einordnen:
   - **Sicherheitslücke**: betrifft sie einen Pfad, der von aussen erreichbar ist? Von aussen kommen nur `POST /api/login` und `POST /api/eingang` (multer!) durch – siehe `docs/specs/001-zugangsmodell.md`. Danach Dringlichkeit bewerten, nicht nach dem npm-Schweregrad allein.
   - **Veraltet**: Patch/Minor vs. Major. Bei Major: Changelog des Pakets lesen und konkret benennen, was bricht.
3. Vorschlag als Tabelle: Paket, aktuell → Ziel, Grund, Risiko, betroffene Dateien.
4. Erst nach Bestätigung: Branch `chore/deps-<datum>`, aktualisieren, `npm test`, Commit `chore(deps): …`, Eintrag unter **Unreleased** im Changelog.

Neue Pakete werden hier nie hinzugefügt – nur bestehende geprüft. Das Frontend hat keine Abhängigkeiten und soll keine bekommen.
