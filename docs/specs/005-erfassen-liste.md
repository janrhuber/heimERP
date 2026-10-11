# 005 — Erfassen und Liste

| | |
|---|---|
| **Status** | Aktiv (v1.2.1) |
| **Code** | `js/app.js` (`saveEntry`, `startEdit`, `deleteEntry`, `renderList`), `js/basis.js` (`KATEGORIEN`) |
| **Tests** | keine (Frontend) |
| **Verwandt** | [004 — Speichermodi](004-speichermodi.md), [006 — Belegablage](006-belegablage.md), [007 — Wiederkehrende Ausgaben](007-wiederkehrende-ausgaben.md), [008 — Jahresrechnung](008-jahresrechnung.md) |

## Zweck

Jede Ausgabe rund ums Haus einmal erfassen – mit der Angabe, welcher Teil
davon in der Steuererklärung abziehbar ist und welcher beim Verkauf zählt.

## Voraussetzungen

Beide Modi. Im Server-Modus nur intern.

## Verhalten

**Felder:** Datum, Beschreibung, Handwerker/Lieferant, Kategorie, Betrag,
Abzug Unterhalt %, Wertvermehrend %, Projekt, Wiederholung, Status, Belege,
Notizen.

**Pflicht beim Speichern:** Datum, Beschreibung, Betrag ≠ 0. Negative Beträge
sind Gutschriften (z. B. Rückerstattung, Einspeisevergütung). Unterhalt % und
Wertvermehrend % dürfen zusammen höchstens 100 sein – sonst Meldung, nichts
gespeichert.

**Aufteilung:** jeder Eintrag hat zwei Prozentwerte.

| Anteil | Bedeutung |
|---|---|
| Abzug Unterhalt % | werterhaltend, in der Steuererklärung abziehbar ([008](008-jahresrechnung.md)) |
| Wertvermehrend % | zählt beim Verkauf zu den Anlagekosten ([010](010-dossier-grundstueckgewinnsteuer.md)) |
| Rest bis 100 % | nicht steuerrelevant |

Unter den Feldern steht laufend, wie viele Franken auf welchen Teil entfallen.

**Kategorie → Vorschlag:** die Kategorie setzt die beiden Prozentwerte; sie
lassen sich pro Eintrag übersteuern.

| Kategorie | Unterhalt % | Wertvermehrend % |
|---|---|---|
| Unterhalt / Reparatur | 100 | 0 |
| Ersatz gleichwertig (z. B. Heizung, Küche) | 100 | 0 |
| Energiesparmassnahme | 100 | 0 |
| Renovation gemischt | 50 | 50 |
| Neubau / Ausbau / Komfort (wertvermehrend) | 0 | 100 |
| Garten / Umgebung | 100 | 0 |
| Versicherungen / Gebühren Liegenschaft | 100 | 0 |
| Verwaltungskosten | 100 | 0 |
| Kauf-/Verkaufsnebenkosten | 0 | 100 |
| Hypothekarzinsen | 0 | 0 |
| Amortisation | 0 | 0 |
| Nebenkosten (Strom, Wasser, Heizung, Kehricht) | 0 | 0 |
| Abos & Kommunikation (Internet, TV, Alarm …) | 0 | 0 |
| Sonstiges / privat | 0 | 0 |

Massgeblich ist `KATEGORIEN` in `js/basis.js`.

**Status:**

| Status | Bedeutung | zählt in Jahresrechnung und Dossier |
|---|---|---|
| `OK` (Bestätigt) | ist bezahlt | ja |
| `GEPLANT` | erwartet, im Voraus erfasst | nein – nur im Budget als «geplant» |

**✔** in der Liste bestätigt einen geplanten Eintrag. Belege hängt man über
✏️ Bearbeiten an.

**Bearbeiten:** lädt den Eintrag ins Formular. Die Wiederholung ist dabei
gesperrt – ein Einzeleintrag bleibt ein Einzeleintrag. Bestehende Belege
lassen sich aus dem Eintrag lösen (die Datei bleibt im Ordner).

**Löschen:** nach Rückfrage. Belegdateien bleiben erhalten.

**Liste:** neueste zuerst; geplante Einträge sind markiert. Pro Eintrag ein
Hinweis zur Steuerwirkung:

| Anzeige | Bedingung |
|---|---|
| abzugsfähig | Unterhalt = 100 % |
| wertvermehrend | Wertvermehrend = 100 % |
| nicht relevant | beide 0 % |
| gemischt | alles andere; mit `*`, wenn ein nicht relevanter Rest bleibt |

**Filter:** Jahr, Status, Steuerwirkung, Kategorie, Projekt (auch «ohne
Projekt»), Volltext (Beschreibung, Lieferant, Notizen, Kategorie, Projekt).

| Filter Steuerwirkung | zeigt Einträge mit |
|---|---|
| abzugsfähig (Unterhalt) | Unterhalt > 0 % |
| wertvermehrend | Wertvermehrend > 0 % |
| gemischt | beiden Anteilen > 0 % |
| nicht steuerrelevant | beiden Anteilen = 0 % |

Unter der Liste: Anzahl, Total, Summe Abzug Unterhalt, Summe wertvermehrend
der **angezeigten** Einträge – und wie viele davon geplant sind.

## Daten & Schnittstellen

`ausgaben.csv`, siehe [004](004-speichermodi.md). Nach jedem Speichern wird
die ganze Liste nach Datum sortiert geschrieben.

## Randfälle

- Kategorie aus alten Daten, die es nicht mehr gibt → bleibt am Eintrag
  erhalten und erscheint im Filter; beim Bearbeiten steht sie als
  «… – bisherige» in der Auswahl und wird nur ersetzt, wenn bewusst eine andere
  gewählt wird
- Wiederholung gewählt → es entsteht eine Vorlage, kein Eintrag ([007](007-wiederkehrende-ausgaben.md))
- Summen der Liste zählen geplante Einträge mit; Jahresrechnung und Dossier nicht

## Offene Punkte

- [ ] Keine automatisierten Tests für die Frontend-Logik
- [ ] Ein gemischter Eintrag erscheint in zwei Filtern (abzugsfähig und wertvermehrend) – gewollt, aber die Summen der beiden Ansichten lassen sich deshalb nicht addieren
