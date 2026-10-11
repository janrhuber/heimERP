# Specs — heimERP

Index der Feature-Specs. Die Versionshistorie steht in
[changelog.md](changelog.md), der Betrieb in [../betrieb.md](../betrieb.md).

Neue Spec: [_template.md](_template.md) kopieren, nächste freie Nummer,
Zeile hier ergänzen.

| # | Spec | Inhalt | Code | Status |
|---|---|---|---|---|
| 001 | [Zugangsmodell](001-zugangsmodell.md) | extern/intern, `X-Zugang`, Whitelist, Schichten | `server/hilfen.js`, `server/app.js` | Aktiv |
| 002 | [Eingang und «Beleg hochladen»](002-eingang.md) | unterwegs hochladen, zu Hause als Eintrag übernehmen | `server/eingang.js`, `hochladen.html`, `js/eingang.js` | Aktiv |
| 003 | [Versionsanzeige](003-versionsanzeige.md) | Release-Tag und Commit im App-Kopf | `server/version.js` | Aktiv |
| 004 | [Speichermodi und Datenformat](004-speichermodi.md) | Ordner- und Server-Modus, Moduswahl, CSV-Spalten, Konfliktschutz | `js/speicher*.js`, `server/ausgaben.js` | Aktiv |
| 005 | [Erfassen und Liste](005-erfassen-liste.md) | Felder, Aufteilung Unterhalt/wertvermehrend, Kategorien, Status, Filter | `js/app.js`, `js/basis.js` | Aktiv |
| 006 | [Belegablage](006-belegablage.md) | Ablage unter `Belege/<Jahr>/`, Namensschema, Anzeige | `js/wiederkehrend.js`, `server/belege.js` | Aktiv |
| 007 | [Wiederkehrende Ausgaben](007-wiederkehrende-ausgaben.md) | Vorlagen, Intervalle, automatisch geplante Einträge | `js/wiederkehrend.js` | Aktiv |
| 008 | [Jahresrechnung und Pauschalvergleich](008-jahresrechnung.md) | abzugsfähige Kosten pro Steuerjahr, effektiv vs. Pauschale | `js/app.js` | Aktiv |
| 009 | [Budget und Projekte](009-budget-projekte.md) | Jahresbudget pro Kategorie, Projekte über mehrere Jahre | `js/app.js` | Aktiv |
| 010 | [Dossier Grundstückgewinnsteuer](010-dossier-grundstueckgewinnsteuer.md) | wertvermehrende Investitionen über alle Jahre | `js/app.js` | Aktiv |
| 011 | [Anmeldung und Benutzer](011-anmeldung-benutzer.md) | Login, Sitzungen, Rate-Limit, Benutzer-CLI | `server/auth.js` | Aktiv |
