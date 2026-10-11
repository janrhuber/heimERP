# 008 — Jahresrechnung und Pauschalvergleich

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/app.js` (`renderJahr`), `js/wiederkehrend.js` (`geplantHint`) |
| **Tests** | keine (Frontend) |
| **Verwandt** | [005 — Erfassen](005-erfassen-liste.md), [010 — Dossier](010-dossier-grundstueckgewinnsteuer.md) |

## Zweck

Pro Steuerjahr die abzugsfähigen Liegenschaftskosten zusammenziehen – als
Beilage zur Steuererklärung – und zeigen, ob sich der Abzug der effektiven
Kosten oder der Pauschalabzug mehr lohnt.

Das Tool ersetzt keine Steuerberatung. Massgebend sind die geltenden Gesetze
und die Wegleitung des Kantons; Sätze und Regeln können ändern.

## Voraussetzungen

Beide Modi. Im Server-Modus nur intern.

## Verhalten

Tab «Jahresrechnung», Auswahl des Steuerjahrs. Es zählen nur **bestätigte**
Einträge dieses Jahres. Gibt es geplante, steht ein Hinweis mit Anzahl und
Summe darüber.

**Kennzahlen:**

| Kennzahl | Rechnung |
|---|---|
| Total Ausgaben | Summe der Beträge |
| Abzugsfähig (Unterhalt) | Summe Betrag × Unterhalt % |
| Wertvermehrend (Verkauf) | Summe Betrag × Wertvermehrend % |
| Nicht steuerrelevant | Total − Abzugsfähig − Wertvermehrend |

**Detailliste:** alle Einträge mit Unterhalt > 0 %, mit Datum, Beschreibung,
Lieferant, Betrag, Anteil, Abzug in Franken und Belegen. Summe darunter:
«Total Liegenschaftsunterhalt».

**Hypothekarzinsen:** gehören nicht zum Liegenschaftsunterhalt, sind aber
separat als Schuldzinsen abziehbar. Gibt es Einträge der Kategorie
«Hypothekarzinsen», wird ihre Summe nachrichtlich ausgewiesen.

**Pauschalvergleich:** pro Jahr werden der Eigenmietwert (bzw. Mietertrag)
und der Pauschalsatz eingetragen und gespeichert.

| Satz | gedacht für |
|---|---|
| 20 % (Vorgabe) | Gebäude älter als 10 Jahre |
| 10 % | Gebäude bis 10 Jahre |

Pauschale = Eigenmietwert × Satz. Ist ein Eigenmietwert eingetragen, zeigt die
App beide Beträge, die Differenz und welcher Abzug für dieses Jahr
vorteilhafter ist. Sind die effektiven Kosten nicht höher als die Pauschale,
gilt die Pauschale als vorteilhafter. Die Wahl ist jedes Jahr neu möglich.

**Drucken / PDF:** der Browser druckt nur die Jahresrechnung – Kopf, Tabs,
Knöpfe und Hinweise sind im Druck ausgeblendet.

## Daten & Schnittstellen

`eigenmietwert` und `pauschalSatz` in `einstellungen.json`, je pro Jahr
([004](004-speichermodi.md)). Die Rechnung selbst wird nicht gespeichert –
sie entsteht immer neu aus den Einträgen.

## Randfälle

- Kein Eigenmietwert eingetragen → kein Vergleich
- Gutschriften (negative Beträge) mindern Total und Abzug
- Eintrag mit 0 % Unterhalt → zählt im Total, erscheint aber nicht in der Detailliste
- Das Jahr eines Eintrags ist das seines Datums – massgebend für die Zuordnung, nicht das Rechnungs- oder Zahlungsdatum, falls diese abweichen

## Offene Punkte

- [ ] Energiespar- und Umweltschutzmassnahmen sind steuerlich wie Unterhalt abziehbar, auch wenn sie den Wert vermehren – die App bildet das nur über die Vorgabe der Kategorie ab (100 % Unterhalt), nicht als eigene Regel
- [ ] Sätze und Regeln (Stichwort Abschaffung des Eigenmietwerts) sind fest im Formular hinterlegt und müssten bei einer Gesetzesänderung angepasst werden
- [ ] Keine automatisierten Tests für die Rechnung
