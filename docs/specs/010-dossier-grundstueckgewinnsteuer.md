# 010 — Dossier Grundstückgewinnsteuer

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/app.js` (`renderVerkauf`) |
| **Tests** | keine (Frontend) |
| **Verwandt** | [005 — Erfassen](005-erfassen-liste.md), [006 — Belegablage](006-belegablage.md), [008 — Jahresrechnung](008-jahresrechnung.md) |

## Zweck

Wertvermehrende Investitionen sind in der Steuererklärung nicht abziehbar,
zählen aber beim Verkauf des Hauses zu den Anlagekosten und senken die
Grundstückgewinnsteuer. Das Dossier sammelt sie über alle Jahre – damit beim
Verkauf, vielleicht Jahrzehnte später, nichts fehlt.

## Voraussetzungen

Beide Modi. Im Server-Modus nur intern.

## Verhalten

Tab «Dossier Grundstückgewinnsteuer». Aufgeführt sind alle **bestätigten**
Einträge mit Wertvermehrend > 0 %, über sämtliche Jahre, nach Datum:

| Spalte | Inhalt |
|---|---|
| Datum, Beschreibung, Lieferant | vom Eintrag |
| Betrag | ganzer Betrag |
| Anteil | Wertvermehrend % |
| Anrechenbar | Betrag × Wertvermehrend % |
| Beleg | Verknüpfung zur Datei |

Darunter: «Total anrechenbare Anlagekosten». Gibt es geplante Einträge mit
wertvermehrendem Anteil, steht ein Hinweis mit Anzahl und Summe darüber – sie
zählen erst nach dem Bestätigen.

**Drucken / PDF:** wie in der Jahresrechnung.

## Daten & Schnittstellen

Keine eigenen. Das Dossier entsteht immer neu aus den Einträgen.

## Randfälle

- Gemischter Eintrag (z. B. 50/50) → nur der wertvermehrende Teil ist anrechenbar; der andere steht in der Jahresrechnung
- Gutschriften mit wertvermehrendem Anteil (z. B. Fördergeld) mindern das Total
- Kategorie «Kauf-/Verkaufsnebenkosten» ist mit 100 % wertvermehrend vorbelegt und erscheint damit hier

## Offene Punkte

- [ ] Der Kaufpreis selbst und der Verkaufspreis werden nicht erfasst – das Dossier liefert nur die Investitionen, nicht die Steuerrechnung
- [ ] Keine Prüfung, ob zu jedem Eintrag ein Beleg vorhanden ist – beim Verkauf sind sie nötig
