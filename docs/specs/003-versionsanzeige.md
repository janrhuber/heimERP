# 003 — Versionsanzeige

| | |
|---|---|
| **Status** | Aktiv (v1.2.0) |
| **Code** | `server/version.js`, `server/app.js` (`/api/version`), `js/app.js` (`zeigeVersion`), `heimERP.html` |
| **Tests** | `server/test/version.test.js` |
| **Verwandt** | [001 — Zugangsmodell](001-zugangsmodell.md) |

## Zweck

In der App sehen, welcher Stand läuft – Release-Nummer aus dem Git-Tag und
der Commit-Hash. Ein Stand zwischen zwei Releases ist sofort als solcher
erkennbar.

## Voraussetzungen

Server-Modus, nur intern. Die Seite «Beleg hochladen» zeigt **keine**
Version: sie nützt dort nichts und hilft beim gezielten Suchen nach bekannten
Lücken. Im Ordner-Modus gibt es keine Anzeige.

## Verhalten

Beim Start des Servers einmal `git describe --tags --long --match 'v[0-9]*'`
im Repo-Verzeichnis, Ergebnis wird gemerkt (ein Deployment startet den
Prozess ohnehin neu).

| `git describe` | Bedeutung | Anzeige |
|---|---|---|
| `v1.2.0-0-g1a2b3c4` | genau auf dem Release-Tag | `v1.2.0 (1a2b3c4)` |
| `v1.2.0-3-g9f8e7d6` | 3 Commits nach v1.2.0 | `v1.2.1-alpha.3 (9f8e7d6)` |
| kein Tag erreichbar | z. B. frisches Repo | `v0.0.0-alpha.<Anzahl Commits> (<hash>)` |
| kein Git (Archiv ohne `.git`) | – | `unbekannt` |

Die Alpha zählt auf die nächste Patch-Version hin, weil `1.2.0-alpha.3` nach
SemVer *vor* `1.2.0` läge. Kein `-dirty`-Zusatz: `npm install` beim Deployment
kann `package-lock.json` umschreiben.

**Anzeige:** im Kopf der App neben dem Titel, klein und grau; Vorabstände kursiv.

## Daten & Schnittstellen

| Methode | Pfad | extern | intern |
|---|---|---|---|
| GET | `/api/version` | 404 | ✓ (ohne Anmeldung, auch auf dem Login-Bildschirm) |

Antwort: `{ version, hash, release, anzeige }`.

## Randfälle

- `develop` ohne zurückgeführten Release-Merge kennt den Tag nicht → falsche
  Basis. Darum führt `/release` `main` nach dem Taggen zurück in `develop`.

## Offene Punkte

- keine
