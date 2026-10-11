# 006 — Belegablage

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/wiederkehrend.js` (`storeReceipt`, `openReceipt`), `js/speicher-server.js`, `server/belege.js`, `server/hilfen.js` (`belegBasisname`, `sanitizeFilename`) |
| **Tests** | `server/test/zugang.test.js` (Zugriff); keine für das Namensschema |
| **Verwandt** | [002 — Eingang](002-eingang.md), [004 — Speichermodi](004-speichermodi.md), [005 — Erfassen](005-erfassen-liste.md) |

## Zweck

Rechnungen und Quittungen liegen geordnet neben den Daten, einheitlich
benannt und am Eintrag verlinkt. Belege für wertvermehrende Investitionen
müssen bis zum Verkauf des Hauses auffindbar bleiben.

## Voraussetzungen

Beide Modi. Im Server-Modus nur intern; was unterwegs hochgeladen wird,
landet zuerst im Eingang ([002](002-eingang.md)).

## Verhalten

Beim Speichern eines Eintrags wird jede angehängte Datei nach
`Belege/<Jahr>/` **kopiert**, umbenannt und als relativer Pfad am Eintrag
gespeichert. Das Jahr ist das des Eintrags.

**Namensschema:** `JJMMTT_Beschreibung[_Lieferant][_Typ].<ext>`

| Teil | Regel |
|---|---|
| `JJMMTT` | Datum des Eintrags |
| Beschreibung | bereinigt, höchstens 40 Zeichen |
| Lieferant | falls angegeben; bereinigt, höchstens 25 Zeichen |
| Typ | `Rechnung`, `Quittung`, `Lieferschein`, `Gutschrift`, `Offerte`, `Vertrag` oder `Beleg` – wenn das Wort im Original-Dateinamen vorkommt |
| Endung | vom Original |

Bereinigen heisst: die Zeichen `\ / : * ? " < > |` entfallen, Leerraum wird
zu `_`. Existiert der Name schon, wird `_2`, `_3` … angehängt – nichts wird
überschrieben.

**Diese Logik gibt es zweimal** und muss identisch bleiben: im Browser
(`storeReceipt` in `js/wiederkehrend.js`, `sanitizeFilename` in
`js/basis.js`) und auf dem Server (`belegBasisname`, `sanitizeFilename` in
`server/hilfen.js`). Sonst heissen dieselben Belege je nach Modus anders.

**Öffnen:** Klick auf 📄 öffnet den Beleg in einem neuen Tab.

**Lösen:** beim Bearbeiten entfernt × nur die Verknüpfung; die Datei bleibt.
Auch das Löschen eines Eintrags lässt die Dateien liegen.

## Daten & Schnittstellen

Spalte `Belege` in `ausgaben.csv`: Pfade wie `Belege/2026/260314_Ersatz_Boiler_Sanitär_Muster_Rechnung.pdf`,
getrennt mit `|`.

| Methode | Pfad | extern | intern |
|---|---|---|---|
| POST | `/api/belege` | 404 | ✓ – multipart: `datei`, `jahr`, `datum`, `beschreibung`, `lieferant`; Antwort `{ pfad }` |
| GET | `/api/belege/:jahr/:name` | 404 | ✓ |

Server: PDF, JPG, PNG, HEIC/HEIF, WEBP; höchstens 10 MB; `jahr` zwischen 1900
und 2200. Massgeblich ist die Dateiendung (iPhones senden HEIC oft ohne
brauchbaren Typ).

## Randfälle

- Pfad ausserhalb von `Belege/` in der Anfrage → `400` (Path-Traversal-Schutz)
- Datei im Ordner von Hand verschoben oder umbenannt → «Beleg nicht gefunden»; der Eintrag bleibt
- Ordner-Modus kennt keine Typ- oder Grössengrenze – es ist der eigene Ordner
- Vorlagen ([007](007-wiederkehrende-ausgaben.md)) können keine Belege tragen; sie gehören an den einzelnen bestätigten Eintrag

## Offene Punkte

- [ ] Gelöste oder verwaiste Belegdateien werden nie aufgeräumt
- [ ] Kein Test, der die beiden Namensschemata gegeneinander prüft
