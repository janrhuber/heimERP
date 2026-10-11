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

## Noch ohne Spec

Die fachlichen Teile der App sind bisher nur im [README](../../README.md)
beschrieben: Erfassen und Liste, wiederkehrende Ausgaben, Jahresrechnung mit
Steuerabzug, Budget, Dossier Grundstückgewinnsteuer, Belegablage und die
beiden Speichermodi. Wer dort etwas ändert, legt zuerst die Spec an (`/feature`).
