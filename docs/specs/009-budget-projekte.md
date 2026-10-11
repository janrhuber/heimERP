# 009 — Budget und Projekte

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/app.js` (`renderBudget`, `budgetSums`, `updateProjektliste`) |
| **Tests** | keine (Frontend) |
| **Verwandt** | [005 — Erfassen](005-erfassen-liste.md), [007 — Wiederkehrende Ausgaben](007-wiederkehrende-ausgaben.md) |

## Zweck

Sehen, was das Haus im Jahr kostet und kosten wird – pro Kategorie, inklusive
der laufenden Kosten wie Hypothekarzinsen, Nebenkosten und Abos. Dazu
Projekte wie ein Badumbau, die sich über mehrere Jahre ziehen.

## Voraussetzungen

Beide Modi. Im Server-Modus nur intern.

## Verhalten

### Budget nach Kategorie (pro Jahr)

Tab «Budget», Auswahl des Jahrs. Pro Kategorie eine Zeile; das Budget wird
direkt in der Tabelle eingetragen und sofort gespeichert.

| Spalte | Rechnung |
|---|---|
| Budget | eingetragener Betrag für dieses Jahr |
| Ausgegeben | Summe der bestätigten Einträge des Jahres |
| Geplant | Summe der geplanten Einträge des Jahres |
| Prognose | Ausgegeben + Geplant |
| Verbleibend | Budget − Prognose; rot, wenn negativ. Ohne Budget leer |
| Auslastung | Balken Prognose ÷ Budget; ab 90 % gelb, über 100 % rot |

Angezeigt werden alle Standardkategorien, dazu jede Kategorie, die in
Einträgen oder im Budget dieses Jahres vorkommt. Darunter die Totale und oben
dieselben fünf Zahlen als Kennzahlen.

Die geplanten Beträge stammen aus wiederkehrenden Ausgaben
([007](007-wiederkehrende-ausgaben.md)) und aus Einträgen, die mit Status
«geplant» im Voraus erfasst wurden.

### Projekte (über alle Jahre)

Ein Projekt ist ein Name im Feld «Projekt» eines Eintrags. Es entsteht, sobald
ein Eintrag es nennt, oder wird im Budget-Tab angelegt. Beim Erfassen schlägt
das Feld die bekannten Projekte vor.

| Spalte | Rechnung |
|---|---|
| Budget | eingetragener Betrag fürs ganze Projekt |
| Ausgegeben / Geplant | Summen aller Einträge mit diesem Projekt, **über alle Jahre** |
| Verbleibend | Budget − Ausgegeben − Geplant |
| Auslastung | wie oben |

🗑 entfernt ein Projekt aus der Budgetliste – nur angeboten, solange kein
Eintrag es verwendet.

**Drucken / PDF:** wie in der Jahresrechnung.

## Daten & Schnittstellen

In `einstellungen.json` ([004](004-speichermodi.md)):
`budgets: { "<Jahr>": { "<Kategorie>": "<CHF>" } }`,
`projektBudgets: { "<Projekt>": "<CHF>" }`. Ein geleertes Budgetfeld löscht
den Eintrag.

## Randfälle

- Gutschriften mindern «Ausgegeben»
- Projektname ist ein freier Text: «Badumbau» und «Bad-Umbau» sind zwei Projekte
- Budget 0 oder leer → kein Balken, «Verbleibend» leer
- Das Budget ist unabhängig von der Steuerwirkung – auch nicht steuerrelevante Kosten zählen

## Offene Punkte

- [ ] Projekte lassen sich nicht umbenennen oder zusammenlegen
- [ ] Ein Projekt mit Einträgen, aber ohne Budget, lässt sich nicht aus der Liste ausblenden
- [ ] Budget des Folgejahrs: wiederkehrende Ausgaben erscheinen dort erst ab Januar ([007](007-wiederkehrende-ausgaben.md))
