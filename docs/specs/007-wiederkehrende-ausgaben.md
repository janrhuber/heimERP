# 007 — Wiederkehrende Ausgaben

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/wiederkehrend.js` (`generateRecurring`, Vorlagen), `js/app.js` (`saveEntry`) |
| **Tests** | keine (Frontend) |
| **Verwandt** | [005 — Erfassen](005-erfassen-liste.md), [009 — Budget](009-budget-projekte.md) |

## Zweck

Was regelmässig kommt – Versicherung, Hypothekarzins, Serviceabo –, einmal
als Vorlage erfassen. Die fälligen Ausgaben stehen dann von selbst als
«geplant» in der Liste und müssen nur noch bestätigt werden.

## Voraussetzungen

Beide Modi. Im Server-Modus nur intern.

## Verhalten

**Vorlage anlegen:** im Erfassungsformular bei «Wiederholung» ein Intervall
wählen. Das Datumsfeld heisst dann «Nächste Fälligkeit», dazu kommt ein
optionales Enddatum; das Statusfeld verschwindet.

| Intervall | Abstand |
|---|---|
| monatlich | 1 Monat |
| vierteljährlich | 3 Monate |
| halbjährlich | 6 Monate |
| jährlich | 12 Monate |

**Erzeugen:** beim Laden der Daten und nach jedem Speichern einer Vorlage
entstehen für jede aktive Vorlage Einträge mit Status `GEPLANT` – ab der
nächsten Fälligkeit **bis Ende des laufenden Jahres**, höchstens bis zum
Enddatum. Die Vorlage merkt sich danach die nächste Fälligkeit; nichts wird
doppelt erzeugt.

**Tag im Monat:** die Vorlage merkt sich den Tag der ersten Fälligkeit. Gibt
es ihn in einem Monat nicht (31. im April, 30. im Februar), wird der letzte
Tag des Monats genommen – im Folgemonat wieder der ursprüngliche Tag.

**Bestätigen:** ✔ am geplanten Eintrag setzt ihn auf `OK`. Erst dann zählt er
in Jahresrechnung und Dossier. Betrag anpassen oder Beleg anhängen: ✏️.

**Vorlagen verwalten** (Tabelle unter dem Formular):

| Aktion | Wirkung |
|---|---|
| Haken «aktiv» entfernen | pausiert: es entstehen keine neuen Einträge; bestehende bleiben |
| Haken wieder setzen | holt alles nach, was seit der gemerkten Fälligkeit bis Ende Jahr fällig wäre |
| ✏️ Bearbeiten | noch nicht bestätigte geplante Einträge dieser Vorlage werden gelöscht und ab dem Datum im Formular («Nächste Fälligkeit») mit den neuen Angaben neu erzeugt; bestätigte bleiben. **Achtung:** siehe Offene Punkte |
| 🗑 Löschen | nach Rückfrage; noch nicht bestätigte geplante Einträge werden mitgelöscht, bestätigte bleiben |

## Daten & Schnittstellen

`vorlagen` in `einstellungen.json`:
`{ id, aktiv, intervall, naechste, tag, ende, kategorie, beschreibung, lieferant, betrag, pUnterhalt, pWert, notizen, projekt }`.
`intervall` ist `M`, `Q`, `H` oder `J`. Erzeugte Einträge tragen die ID der
Vorlage in der Spalte `VorlageID`.

## Randfälle

- Vorlage **und** Beleg angehängt → abgelehnt: Belege gehören an den einzelnen Eintrag
- Fälligkeit liegt in der Vergangenheit → alle Termine bis Ende Jahr entstehen auf einmal, auch die verpassten
- Jahreswechsel: Einträge fürs neue Jahr entstehen erst, wenn die App im neuen Jahr geöffnet wird
- Unbekanntes Intervall in alten Daten → wird wie jährlich behandelt
- Schutz gegen Endlosschleifen: höchstens 1000 Einträge pro Durchlauf

## Offene Punkte

- [ ] **Bearbeiten löscht die geplanten Einträge des laufenden Jahres.** Das
  Formular zeigt beim Bearbeiten die gemerkte nächste Fälligkeit – nach dem
  Erzeugen liegt sie meist schon im Folgejahr. Wer nur den Betrag ändert und
  speichert, verliert die noch offenen geplanten Einträge dieses Jahres, und
  bis zum Jahreswechsel entsteht nichts Neues. Abhilfe heute: das Datum beim
  Bearbeiten auf den nächsten noch offenen Termin zurückstellen
- [ ] Kein Blick über das Jahresende hinaus – das Budget fürs Folgejahr kennt wiederkehrende Ausgaben erst ab Januar
- [ ] Keine automatisierten Tests für die Datumsrechnung
