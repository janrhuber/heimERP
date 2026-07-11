# heimERP – Liegenschaftskosten & Steuerabzüge (Kanton Aargau)

Ein lokales Browser-Tool (keine Installation, kein Server, keine Cloud) zur Verwaltung
aller Ausgaben rund ums Haus – für die Steuererklärung und für das spätere Verkaufsdossier
(Grundstückgewinnsteuer).

## Start

1. `heimERP.html` mit **Microsoft Edge** oder **Google Chrome** öffnen (Doppelklick genügt).
   Firefox funktioniert nicht (kein lokaler Ordnerzugriff).
2. Oben rechts **«Datenordner wählen»** klicken und einen Ordner wählen/erstellen,
   z. B. `C:\git\heimERP\Daten`.
3. Beim nächsten Öffnen: **«Erneut verbinden»** klicken – fertig.

## Projektstruktur

```
heimERP.html          ← Einstiegspunkt (diese Datei öffnen)
styles.css            ← Layout
js/basis.js           ← Konstanten, Kategorien, CSV-Logik
js/speicher.js        ← Dateizugriff (Ordner, CSV, Belege)
js/wiederkehrend.js   ← wiederkehrende Ausgaben
js/app.js             ← Formular, Auswertungen, Bedienung
```

Die Dateien gehören zusammen – beim Weitergeben/Verschieben immer den ganzen Ordner nehmen.

## Was das Tool anlegt

```
Daten\
├── ausgaben.csv          ← alle Einträge, direkt mit Excel öffnenbar (Semikolon-getrennt, UTF-8)
├── einstellungen.json    ← Eigenmietwert & Pauschalsatz pro Jahr
└── Belege\
    ├── 2025\
    │   └── Ersatz_Boiler_Rechnung.pdf
    └── 2026\
        └── ...
```

Angehängte Rechnungen/Quittungen werden automatisch nach `Belege\<Jahr>\` **kopiert**,
sinnvoll umbenannt und im Eintrag verlinkt (Klick auf 📄 öffnet den Beleg).

## Funktionen

- **Erfassen:** Datum, Beschreibung, Handwerker/Lieferant, Kategorie, Betrag, Belege, Notizen.
- **Prozentuale Aufteilung** pro Eintrag:
  - **Abzug Unterhalt %** → werterhaltender Anteil, abziehbar in der Steuererklärung.
  - **Wertvermehrend %** → zählt beim Verkauf zu den Anlagekosten (Grundstückgewinnsteuer).
  - Der Rest gilt als «nicht steuerrelevant» (z. B. reine Lebenshaltung).
  - Kategorien setzen sinnvolle Vorschläge, die du pro Eintrag übersteuern kannst.
- **Wiederkehrende Ausgaben:** Im Formular bei «Wiederholung» ein Intervall wählen
  (monatlich bis jährlich, optional mit Enddatum) – fällige Ausgaben werden bis Ende Jahr
  automatisch als **«geplant»** in die Liste gestellt und müssen nur noch mit ✔ bestätigt
  werden (dabei Beleg anhängen). Geplante Einträge zählen **nicht** in Jahresrechnung und
  Verkaufsdossier, bis sie bestätigt sind. Vorlagen lassen sich pausieren, bearbeiten und löschen.
- **Budget & Ausgabenplanung:** Eigener Tab mit Jahresbudget pro Kategorie
  (inkl. laufende Kosten wie Hypothekarzinsen, Amortisation, Nebenkosten, Abos) –
  Budget eintragen, das Tool zeigt Ausgegeben / Geplant / Prognose / Verbleibend mit
  Fortschrittsbalken. Zusätzlich **Projekte** (z. B. «Badumbau») mit Budget über alle
  Jahre hinweg: beim Erfassen einfach das Projekt-Feld ausfüllen. Die geplanten Beträge
  stammen aus den wiederkehrenden bzw. im Voraus erfassten Ausgaben.
  Hinweis: Hypothekarzinsen zählen nicht zum Liegenschaftsunterhalt, sind aber in der
  Steuererklärung separat als Schuldzinsen abziehbar – die Jahresrechnung weist sie
  nachrichtlich aus.
- **Jahresrechnung:** Zusammenzug pro Steuerjahr mit Detailliste der abzugsfähigen Kosten
  (als Beilage zur Steuererklärung druckbar / als PDF speicherbar) inkl.
  **Vergleich effektive Kosten vs. Pauschalabzug**.
- **Dossier Grundstückgewinnsteuer:** alle wertvermehrenden Investitionen über sämtliche Jahre,
  druckbar – fürs Verkaufsdossier.

## Steuerliche Kurzübersicht Aargau (ohne Gewähr)

- **Werterhaltender Unterhalt** (Reparaturen, gleichwertiger Ersatz, Service, Sachversicherungen
  der Liegenschaft, Verwaltungskosten) ist vom steuerbaren Einkommen **abziehbar**.
- **Pauschalabzug statt effektiver Kosten:** jedes Jahr frei wählbar –
  in der Regel 20 % des Eigenmietwerts/Mietertrags (10 % bei Gebäuden bis 10 Jahre).
  Das Tool rechnet den Vergleich automatisch. **Achtung:** Sätze/Regeln können ändern
  (Stichwort Abschaffung Eigenmietwert) – im Zweifel aktuelle Wegleitung des Kantons prüfen.
- **Energiespar- und Umweltschutzmassnahmen** sind grundsätzlich wie Unterhalt abziehbar,
  auch wenn sie technisch wertvermehrend sind.
- **Wertvermehrende Investitionen** (Ausbau, Komfortsteigerung, Neubauten, Anbauten) sind
  **nicht** einkommenssteuerlich abziehbar – aber beim Verkauf als **Anlagekosten** anrechenbar
  und senken die **Grundstückgewinnsteuer**. Deshalb: auch diese Belege erfassen und
  **unbefristet aufbewahren**.
- **Gemischte Arbeiten** (z. B. Küche ersetzt und gleichzeitig vergrössert): prozentual aufteilen –
  genau dafür gibt es die beiden Prozentfelder.

## Datensicherung

Alles liegt als normale Dateien im Datenordner – einfach den ganzen Ordner
(z. B. `Daten\`) regelmässig sichern (OneDrive, externe Festplatte, …).
Die CSV kann jederzeit in Excel geöffnet werden; Änderungen dort bitte nur machen,
wenn heimERP geschlossen ist.
