# 011 — Anmeldung und Benutzer

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `server/auth.js`, `server/benutzer-cli.js`, `js/anmeldung.js`, `js/hochladen.js` |
| **Tests** | `server/test/zugang.test.js` (ohne Anmeldung kein Zugriff) |
| **Verwandt** | [001 — Zugangsmodell](001-zugangsmodell.md) |

## Zweck

Im Server-Modus sieht niemand Daten ohne Anmeldung – auch nicht im Heimnetz.

## Voraussetzungen

Nur Server-Modus. heimERP kennt **keine Rollen**: jedes Konto darf intern
alles. Was von aussen geht, bestimmt allein der Zugangsweg
([001](001-zugangsmodell.md)).

## Verhalten

- Anmelden mit Name und Passwort, in der App und auf der Seite «Beleg hochladen»
- Geprüft wird immer per bcrypt, auch bei unbekanntem Namen (Dummy-Hash) – die
  Antwortzeit verrät nicht, ob es ein Konto gibt
- Nach dem Login wird die Sitzung neu erzeugt (keine Session-Fixation)
- `benutzer.json` wird bei jedem Login frisch gelesen → Änderungen per CLI
  wirken sofort, ohne Neustart
- Abmelden beendet die Sitzung und lädt die Seite neu
- Läuft die Sitzung ab, führt die nächste Anfrage (`401`) zurück zum Login

**Sitzungen:** Dateien in `.sitzungen/`, 30 Tage gültig, bei jeder Nutzung
verlängert. Das Secret liegt in `.session-geheimnis` und überlebt Neustarts.
Cookie `heimerp.sid`: `httpOnly`, `sameSite=lax`, `secure: "auto"` – über
HTTPS von aussen gesetzt, über HTTP im Heimnetz nicht (sonst käme man intern
nie hinein).

**Rate-Limit:** 10 Anmeldeversuche pro 15 Minuten und IP, danach `429`. Die
IP ist die des Clients, wie sie der Proxy meldet (die App vertraut genau
einem Hop). Der Proxy sollte zusätzlich begrenzen.

**Benutzer verwalten** – nur auf der Kommandozeile des Servers:

```bash
DATEN_DIR=<daten_dir> node server/benutzer-cli.js liste
DATEN_DIR=<daten_dir> node server/benutzer-cli.js add <Name>
DATEN_DIR=<daten_dir> node server/benutzer-cli.js passwort <Name>
DATEN_DIR=<daten_dir> node server/benutzer-cli.js entfernen <Name>
```

Passwörter haben mindestens 8 Zeichen und werden als bcrypt-Hash (Kosten 12)
gespeichert.

## Daten & Schnittstellen

`benutzer.json` (nur für den Besitzer lesbar): `[{ name, hash }]`.

| Methode | Pfad | extern | intern |
|---|---|---|---|
| GET | `/api/status` | ✓ | ✓ – `{ server, angemeldet, benutzer, extern }` |
| POST | `/api/login` | ✓ | ✓ – `{ name, passwort }`; `401` falsch, `429` zu viele Versuche |
| POST | `/api/logout` | ✓ | ✓ – angemeldet |

## Randfälle

- Kein Konto angelegt → niemand kann sich anmelden; zuerst `add`
- Konto entfernt → bestehende Sitzungen dieses Kontos laufen weiter, bis sie ablaufen
- Passwort geändert → bestehende Sitzungen bleiben ebenfalls gültig

## Offene Punkte

- [ ] Kein Weg, alle Sitzungen eines Kontos sofort zu beenden (ausser `.sitzungen/` zu leeren)
- [ ] Kein zweiter Faktor
- [ ] Keine Tests für Login, Rate-Limit und Sitzungsdauer
