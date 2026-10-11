---
description: Feature/Änderung nach dem Spec-Workflow umsetzen
argument-hint: <Beschreibung der Änderung>
---

Setze folgende Änderung nach dem Projekt-Workflow um: $ARGUMENTS

1. **Unklarheiten klären**: BEVOR irgendetwas geschrieben wird: Sind Anforderungen, Randfälle, Fehlerverhalten, Namen oder Datenformate unklar? Dann konkrete Rückfragen stellen (AskUserQuestion) statt Annahmen zu treffen. Nichts erfinden – was nicht aus Anforderung, Code oder Spec ableitbar ist, wird gefragt.
2. **Zugang prüfen**: Wird ein Endpunkt, eine Datei oder eine Ansicht neu oder anders erreichbar? Dann gilt `docs/specs/001-zugangsmodell.md`: standardmässig **nur intern** (`nurIntern`). Etwas von aussen erreichbar zu machen, braucht die ausdrückliche Zustimmung des Users und eine Freigabe an zwei Stellen (`EXTERN_DATEIEN` in `server/app.js` und nginx in `server-setup`).
3. **Branch**: von `develop` abzweigen, `feature/<kebab-case>`.
4. **Spec anpassen**: Passende Spec in `docs/specs/` über den Index (`README.md`) finden oder neue aus `_template.md` anlegen (`NNN-kurzname.md`, nächste freie Nummer). Nur die betroffene Spec lesen. Aussagen gegen den Code prüfen, bevor sie in die Spec kommen.
5. **Plan bestätigen lassen**: Kurzen Umsetzungsplan zeigen (betroffene Dateien, Vorgehen, Testfälle, ob neue npm-Pakete nötig wären) und bestätigen lassen, BEVOR Code geändert wird.
6. **Tests schreiben**: Serveränderungen zuerst als Test in `server/test/` (`node:test`, über `test/helfer.js` – nie gegen echte Daten). Frontend-Änderungen: Prüfschritte für den Browser notieren.
7. **Umsetzen**: Doppelte Logik (`js/basis.js` ↔ `server/hilfen.js`) an beiden Stellen gleich ändern. Bei geänderten CSS/JS-Dateien `?v=` in `heimERP.html` und `hochladen.html` hochzählen.
8. **Tests ausführen**: `cd server && npm test` – alles grün. Fehlschläge ehrlich melden und beheben, nicht wegdiskutieren. Prüfen, ob ein neuer Test auch rot wird, wenn das Feature fehlt.
9. **Doku nachführen**: Spec (Status, Abweichungen, Index-Zeile), `docs/specs/changelog.md` unter **Unreleased**; `docs/betrieb.md` / `README.md`, falls Aufbau oder Bedienung betroffen sind. Neue Weichenstellung → ADR in `docs/specs/adr.md`.

Abschluss: Conventional Commit (Englisch, imperativ, kein KI-Hinweis), Merge in `develop` mit `--no-ff`, Branch löschen. Nicht deployen – das macht `/release`.
