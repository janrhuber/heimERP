---
description: Bug beheben – Regressionstest zuerst
argument-hint: <Bug-Beschreibung oder Issue-Nr.>
---

Behebe folgenden Bug: $ARGUMENTS

1. **Unklarheiten klären**: Erwartetes vs. tatsächliches Verhalten eindeutig? Modus (Ordner/Server), Zugangsweg (extern/intern)? Sonst nachfragen.
2. **Branch**: von `develop` abzweigen, `fix/<kebab-case>`.
3. **Reproduzieren**:
   - **Server**: fehlschlagenden Test in `server/test/` schreiben, ausführen, Fehlschlag belegen.
   - **Frontend** (keine automatisierten Tests): Reproduktionsschritte im Browser aufschreiben und den Fehler zeigen, bevor etwas geändert wird.
4. **Ursache finden, minimal-invasiv beheben**: Nur die Ursache fixen, keine Umbauten nebenbei. Prüfen, ob die Ursache auch in der doppelten Logik steckt (`js/basis.js` ↔ `server/hilfen.js`).
5. **Tests ausführen**: neuer Test grün, alle bestehenden weiter grün (`cd server && npm test`). Frontend: Reproduktionsschritte erneut durchgehen.
6. **Sicherheitsbezug?** Betrifft der Bug das Zugangsmodell (`docs/specs/001-zugangsmodell.md`), dem User ausdrücklich sagen, was von aussen erreichbar war und seit wann.
7. **Spec prüfen**: Betroffene Spec in `docs/specs/` nachführen, falls das dokumentierte Verhalten falsch war. Eintrag unter **Unreleased → Fixed** (bzw. **Security**) in `docs/specs/changelog.md`.
8. **Cache-Busting**: bei geänderten CSS/JS-Dateien `?v=` hochzählen.

Abschluss: Commit `fix(<bereich>): …` (Englisch, imperativ, kein KI-Hinweis; Issue-Nr. referenzieren, falls vorhanden), Merge in `develop` mit `--no-ff`. Dringender Fix für Produktion → danach `/release` mit Patch-Version.
