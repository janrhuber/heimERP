# 004 — Speichermodi und Datenformat

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/app.js` (Moduswahl beim Start), `js/speicher.js`, `js/speicher-server.js`, `js/basis.js` (CSV), `server/ausgaben.js` |
| **Tests** | `server/test/zugang.test.js` (Zugriff); keine für das Datenformat |
| **Verwandt** | [001 — Zugangsmodell](001-zugangsmodell.md), [006 — Belegablage](006-belegablage.md), [011 — Anmeldung](011-anmeldung-benutzer.md) |

## Zweck

Dieselbe App läuft entweder ganz ohne Server gegen einen lokalen Ordner oder
gegen das Backend in `server/`. Das Datenformat ist in beiden Modi identisch –
ein Ordner lässt sich auf den Server kopieren und umgekehrt.

## Voraussetzungen

Ordner-Modus: Edge oder Chrome (File System Access API); Firefox geht nicht.
Server-Modus: jeder aktuelle Browser, Anmeldung nötig.

## Verhalten

**Moduswahl beim Start:** die App fragt `/api/status`. Antwortet ein Backend
mit `{ "server": true }` → Server-Modus. Sonst (Datei lokal geöffnet,
statisches Hosting) → Ordner-Modus. Bis zur Entscheidung bleibt die
Oberfläche verdeckt (`body.startet`), damit nichts aufblitzt.

| | Ordner-Modus | Server-Modus |
|---|---|---|
| Daten liegen | im gewählten Ordner auf dem Gerät | in `DATEN_DIR` auf dem Server |
| Verbinden | «Datenordner wählen»; der Ordner wird in IndexedDB gemerkt, beim nächsten Mal «Erneut verbinden» (Berechtigung braucht einen Klick) | Anmelden |
| Lesen/Schreiben | direkt über die Dateisystem-API | `/api/ausgaben`, `/api/einstellungen` |
| Belege | werden in den Ordner kopiert | `POST /api/belege` |
| Eingang, Versionsanzeige | – | ja |

`js/speicher-server.js` spiegelt die Funktionen aus `js/speicher.js`
(`readFileText`, `writeFileText`, `storeReceipt`, `openReceipt`), damit der
Rest der App den Modus nicht kennen muss.

**Schutz vor verlorenen Änderungen (Server):** `GET /api/ausgaben` liefert ein
`ETag` (SHA-1 des Inhalts). `PUT` muss es als `If-Match` mitschicken; passt es
nicht mehr – die Daten wurden in einem anderen Fenster geändert –, antwortet
der Server mit `412`, und die App fordert zum Neuladen auf. Die letzte
Änderung ist dann **nicht** gespeichert.

## Daten & Schnittstellen

**`ausgaben.csv`** – Semikolon-getrennt, UTF-8 **mit BOM** (Excel liest so die
Umlaute richtig), Zeilenende CRLF, Felder mit `;`, `"` oder Zeilenumbruch in
Anführungszeichen. Sortiert nach Datum.

| Spalte | Inhalt |
|---|---|
| `ID` | eindeutige ID |
| `Datum` | `JJJJ-MM-TT` |
| `Jahr` | Steuerjahr des Eintrags |
| `Kategorie` | Name aus der Kategorienliste ([005](005-erfassen-liste.md)) |
| `Beschreibung`, `Lieferant` | Freitext |
| `Betrag_CHF` | zwei Nachkommastellen; negativ = Gutschrift |
| `Anteil_Unterhalt_Prozent`, `Anteil_Wertvermehrend_Prozent` | 0–100 |
| `Belege` | relative Pfade, getrennt mit `\|` |
| `Notizen` | Freitext |
| `Status` | `OK` oder `GEPLANT`; alles andere wird als `OK` gelesen |
| `VorlageID` | ID der Vorlage, aus der der Eintrag entstand ([007](007-wiederkehrende-ausgaben.md)) |
| `Projekt` | Projektname ([009](009-budget-projekte.md)) |

Die Reihenfolge der Spalten ist ein Vertrag (`CSV_HEADER` in `js/basis.js`).
Zeilen mit weniger als 9 Feldern werden beim Lesen übersprungen.

**`einstellungen.json`**: `{ eigenmietwert: {Jahr: CHF}, pauschalSatz: {Jahr: "20"|"10"}, vorlagen: […], budgets: {Jahr: {Kategorie: CHF}}, projektBudgets: {Projekt: CHF} }`.
Fehlende Teile werden beim Laden ergänzt.

| Methode | Pfad | extern | intern |
|---|---|---|---|
| GET | `/api/ausgaben` | 404 | ✓ – `404`, solange noch keine Daten existieren |
| PUT | `/api/ausgaben` | 404 | ✓ – `text/csv`, max. 5 MB, `If-Match` nötig, sobald die Datei existiert |
| GET | `/api/einstellungen` | 404 | ✓ – `404`, solange noch keine existieren |
| PUT | `/api/einstellungen` | 404 | ✓ – JSON, max. 1 MB |

Der Server behandelt die CSV als rohe Bytes (`express.raw`, nie
`express.text` – das würde das BOM entfernen) und schreibt atomar (temporäre
Datei, dann umbenennen).

## Randfälle

- Erste Nutzung: keine Dateien → leere Liste, Standard-Einstellungen
- Unlesbare `einstellungen.json` → Standardwerte bleiben, kein Abbruch
- CSV in Excel bearbeitet → nur bei geschlossener App; danach neu verbinden bzw. neu laden
- Leerer `PUT /api/ausgaben` → `400`, die bestehende Datei bleibt

## Offene Punkte

- [ ] Keine automatisierten Tests für `toCSV`/`parseCSV` (liegen im Frontend)
- [ ] Einstellungen haben keinen Konfliktschutz wie die CSV – das zuletzt gespeicherte Fenster gewinnt
