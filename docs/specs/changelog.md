# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen
nach [SemVer](https://semver.org/lang/de/). Neue Einträge zuerst unter
**Unreleased**, beim Release in eine Version umgewandelt (siehe `/release`).

## [Unreleased]

## [1.2.0] – 2026-10-11

### Added
- Eingang als Arbeitsliste: offene Belege als Karten mit Vorschau, älteste zuerst
- Mehrere Belege auswählen und zusammen als einen Eintrag übernehmen
  (z. B. zwei Seiten derselben Rechnung)
- Versionsanzeige im Kopf der App (nur intern): `v1.2.0 (hash)` auf einem
  Release, `v1.2.1-alpha.N (hash)` für Stände dazwischen
- Dokumentation unter `docs/`: Betrieb, Specs, Changelog

### Changed
- Hochgeladen wird nur noch auf der Seite «Beleg hochladen»; das zweite
  Upload-Formular in der App entfällt

## [1.1.0] – 2026-10-11

### Added
- Eigene Seite «Beleg hochladen» für unterwegs; mehrere Belege aufs Mal
- Tests mit `node:test` (`cd server && npm test`)

### Changed
- Beschreibung beim Hochladen ist freiwillig
- Proxy nach aussen als Whitelist statt einzelner Sperren

### Security
- Von aussen wurde die ganze App ausgeliefert und nur verdeckt; jetzt gibt es
  dort nur noch die Hochladen-Seite
- Die Eingangsliste und ihre Dateien waren mit Anmeldung von aussen abrufbar;
  jetzt nur noch intern
- Zu grosse oder kaputte Anfragen ergaben `500` mit Stacktrace statt `413`/`400`

## [1.0.0] – 2026-10-11

Erste getaggte Version: Ordner- und Server-Modus, Erfassen, wiederkehrende
Ausgaben, Jahresrechnung, Budget, Dossier Grundstückgewinnsteuer, Eingang.
