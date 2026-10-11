# Betrieb — heimERP (Server-Modus)

Dieses Repo ist öffentlich. Hostnamen, Adressen und Zugangsdaten der eigenen
Installation gehören **nicht** hierher, sondern ins Infrastruktur-Repo
(Inventar, Proxy-Config, Deploy-Skript). Unten stehen dafür Platzhalter.

## Zugänge

| Wo | Adresse | Was geht |
|---|---|---|
| unterwegs | `https://<domain>` | nur Belege hochladen |
| Heimnetz | `http://<host>:3000` | volle App |
| ohne Server | `heimERP.html` lokal öffnen | Ordner-Modus, nur Edge/Chrome |

Auch im eigenen WLAN führt die öffentliche Adresse über den Proxy – die App
gibt es dort nie ([Spec 001](specs/001-zugangsmodell.md)). Zum Arbeiten die
interne Adresse.

## Benutzer

heimERP kennt keine Rollen; jedes Konto darf intern alles.

```bash
cd <app_path>
DATEN_DIR=<daten_dir> node server/benutzer-cli.js liste
DATEN_DIR=<daten_dir> node server/benutzer-cli.js add <Name>
DATEN_DIR=<daten_dir> node server/benutzer-cli.js passwort <Name>
DATEN_DIR=<daten_dir> node server/benutzer-cli.js entfernen <Name>
```

Änderungen wirken sofort, ohne Neustart. Sessions gelten 30 Tage.

## Reverse-Proxy

Der Proxy vor der App muss

- bei jeder Anfrage `X-Zugang: extern` **setzen** (nicht durchreichen),
- `X-Forwarded-For` auf die echte Client-IP setzen (die App vertraut genau
  einem Hop; sonst zählt das Login-Rate-Limit falsch),
- nur die Pfade aus [Spec 001](specs/001-zugangsmodell.md) durchlassen und
  alles andere mit 404 beantworten,
- Uploads bis mindestens 10 MB zulassen.

## Branches und Releases

Gearbeitet wird auf `develop`, `main` ist der produktive Stand. Ein Release
läuft über `/release <X.Y.Z>`: Tests, Changelog, Tag, Datensicherung, Deploy
(zuerst die App, dann der Proxy), Prüfung von aussen und innen.

Welcher Stand läuft, zeigt die App intern im Kopf
([Spec 003](specs/003-versionsanzeige.md)).

## Daten und Sicherung

```
<daten_dir>/
├── ausgaben.csv          Einträge · Semikolon · UTF-8 mit BOM (Excel)
├── einstellungen.json    Einstellungen, Budget, Vorlagen
├── eingang.json          hochgeladene, noch nicht übernommene Belege
├── benutzer.json         Benutzer mit bcrypt-Hash
├── .session-geheimnis    Session-Secret
├── .sitzungen/           Sessions
├── Belege/<Jahr>/        abgelegte Belege
└── Eingang/              Dateien zum Eingang
```

Das Datenverzeichnis liegt ausserhalb des Git-Checkouts. Vor jedem Deployment
sichern (`/release` tut das); zusätzlich gehört es in die regelmässige
Sicherung des Servers – Belege für wertvermehrende Investitionen müssen bis
zum Verkauf des Hauses aufbewahrt werden.

## Wenn etwas nicht geht

`/debug <Symptom>` geht die Schichten von aussen nach innen durch. Häufig:

| Symptom | Ursache |
|---|---|
| Alte Oberfläche nach einem Release | Cache; `?v=` nicht hochgezählt oder Browser neu laden (Strg+F5) |
| Von aussen 404 auf eine neue Datei | fehlt in der Whitelist (Proxy **und** `EXTERN_DATEIEN`) |
| Login intern klappt, Sitzung hält nicht | Cookie `secure`: intern über `http://`, nicht `https://` |
| «Zu viele Versuche» | Rate-Limit: 10 Fehlversuche pro 15 Minuten und IP |
