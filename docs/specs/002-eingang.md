# 002 — Eingang und Seite «Beleg hochladen»

| | |
|---|---|
| **Status** | Aktiv (v1.2.0) |
| **Code** | `server/eingang.js`, `hochladen.html`, `js/hochladen.js`, `js/eingang.js`, `js/app.js` (Erledigen beim Speichern) |
| **Tests** | `server/test/eingang.test.js`, `server/test/hochladen-seite.test.js` |
| **Verwandt** | [001 — Zugangsmodell](001-zugangsmodell.md) |

## Zweck

Beim Handwerker oder im Baumarkt: Rechnung fotografieren, fertig. Der Beleg
ist gesichert; Kategorie, Steueranteil und Projekt kommen zu Hause dazu.

## Voraussetzungen

Nur Server-Modus. Hochladen: angemeldet, von überall. Ansehen und
Abarbeiten: nur intern ([001](001-zugangsmodell.md)).

## Verhalten

### Hochladen (`hochladen.html`)

Eigenständige Seite mit eigenem CSS; lädt keine anderen App-Skripte und
nichts von Dritten. Von aussen ist sie die einzige Seite, intern zusätzlich
unter `/hochladen.html` erreichbar (Link im Tab «Eingang») – das Formular gibt
es nur einmal.

1. Nicht angemeldet → Name und Passwort; angemeldet → Formular
2. Formular einspaltig fürs Handy:

| Feld | Pflicht | Hinweis |
|---|---|---|
| Belege (Foto/PDF) | mind. 1 | grosse Fläche zuoberst; bis 10 aufs Mal, auf einmal gewählt oder nacheinander hinzugefügt; einzeln entfernbar |
| Was war das? | nein | Beschreibung, max. 200 Zeichen |
| Handwerker oder Laden | nein | max. 80 Zeichen |
| Betrag | nein | nur bei einem einzelnen Beleg; negativ = Gutschrift |
| Datum auf dem Beleg | nein | leer → heute |

3. **Mehrere Belege:** jeder wird einzeln gesendet (eine Anfrage pro Datei) und
   ein eigener Posten. Die Angaben gelten für alle. Bricht es ab, bleiben nur
   die noch nicht gesendeten stehen – ein zweiter Versuch sendet nichts doppelt
4. Falscher Dateityp, über 10 MB oder dieselbe Datei zweimal → schon bei der
   Auswahl weggelassen, mit Meldung
5. `401` (Sitzung abgelaufen) → zurück zum Login mit Hinweis

### Speichern (`POST /api/eingang`, multipart)

| Feld | Regel |
|---|---|
| `datei` | Pflicht. PDF, JPG, PNG, HEIC/HEIF, WEBP; max. 10 MB |
| `beschreibung` | freiwillig, max. 200 Zeichen |
| `lieferant` | freiwillig, max. 80 Zeichen |
| `betrag` | freiwillig; leer → `null` (nicht 0); Betrag bis ± 1 000 000, auf Rappen gerundet |
| `datum` | `JJJJ-MM-TT`, sonst heute |

Antwort bei Erfolg: nur `{ "ok": true }`. Fehler: `400` mit `{ "fehler": "…" }`.

Datei landet in `Eingang/` als `<JJMMTT>_<Beschreibung>[_<Lieferant>].<ext>`,
ohne Beschreibung `<JJMMTT>_Beleg…` (bereinigt, bei Kollision `_2`, `_3` …).

### Abarbeiten (intern, Tab «Eingang»)

1. Arbeitsliste: offene Posten als Karten, **älteste zuerst**, mit Vorschau des
   Belegs, Beschreibung, Lieferant, Betrag (oder Hinweis, dass er fehlt)
2. **Als Eintrag übernehmen:** öffnet das Erfassungsformular vorausgefüllt
   (Datum, Beschreibung, Lieferant, Betrag, Status *offen*, Datei als Beleg)
3. **Zusammen übernehmen:** gehören mehrere Posten zur selben Rechnung (z. B.
   zwei Seiten), werden sie angehakt («auswählen») und als **ein** Eintrag
   übernommen: alle Dateien als Belege, Beträge addiert, Beschreibung und
   Lieferant ohne Wiederholung zusammengesetzt, frühestes Datum
4. Beim Speichern werden alle übernommenen Posten als `ERLEDIGT` markiert, mit
   Verweis auf die ID des Eintrags. Die Belege liegen dann nach dem üblichen
   Namensschema in `Belege/<Jahr>/`
5. Abbrechen verwirft die Übernahme; die Posten bleiben offen
6. **Löschen** entfernt Posten und Datei aus dem Eingang

## Daten & Schnittstellen

`eingang.json`: Liste von Posten
`{ id, eingereicht, name, datum, betrag, lieferant, beschreibung, datei, status, eintragId }`.
`name` ist das Konto aus der Session, `status` ist `OFFEN` oder `ERLEDIGT`.

| Methode | Pfad | extern | intern |
|---|---|---|---|
| POST | `/api/eingang` | ✓ | ✓ |
| GET | `/api/eingang` | 404 | ✓ |
| GET | `/api/eingang/datei/:id` | 404 | ✓ |
| POST | `/api/eingang/:id/erledigt` | 404 | ✓ |
| DELETE | `/api/eingang/:id` | 404 | ✓ |

Schreibzugriffe auf `eingang.json` laufen hintereinander (Promise-Kette), weil
parallele Requests sonst Posten überschreiben könnten.

## Randfälle

- Pfad in Beschreibung oder Lieferant (`../../x`) → Trennzeichen werden
  entfernt, Datei bleibt in `Eingang/`
- Gleiche Angaben zweimal → zweite Datei bekommt `_2`, nichts wird überschrieben
- PDF oder HEIC → statt Bildvorschau Dateiname bzw. Typ

## Offene Punkte

- [ ] Von aussen ist nicht sichtbar, was schon im Eingang liegt – bewusst
  ([001](001-zugangsmodell.md)); doppelt Hochgeladenes wird zu Hause gelöscht
- [ ] Keine automatisierten Tests für die Frontend-Logik
