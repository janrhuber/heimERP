# 001 — Zugangsmodell

| | |
|---|---|
| **Status** | Aktiv (v1.1.0) |
| **Code** | `server/hilfen.js` (`istExtern`, `nurIntern`), `server/app.js` (`EXTERN_DATEIEN`), alle Router |
| **Tests** | `server/test/zugang.test.js`, `server/test/hochladen-seite.test.js` |
| **Verwandt** | [002 — Eingang](002-eingang.md) |

## Zweck

Von aussen kann man **nur Belege hochladen** – nichts sehen, nichts ändern,
auch nicht die eigenen Uploads. Alles andere geht nur aus dem Heimnetz.

## Voraussetzungen

Nur Server-Modus. heimERP kennt keine Rollen: was jemand darf, entscheidet
der Weg, nicht das Konto.

## Verhalten

**Zugangsweg** bestimmen (`istExtern`): Header `X-Zugang` mit Wert `extern`
(Gross-/Kleinschreibung und Leerzeichen egal) → extern. Fehlt er oder hat
einen anderen Wert → intern.

| Weg | Wer setzt den Header | Ergebnis |
|---|---|---|
| öffentliche Adresse über den Reverse-Proxy | der Proxy, immer (`proxy_set_header`, überschreibt Mitgeschicktes) | extern |
| direkt im Heimnetz auf Port 3000 | niemand | intern |

**Sperren:** Endpunkte, die Daten zeigen oder verändern, beginnen mit
`nurIntern` und antworten von aussen mit **404** – nicht 403, damit nach
aussen nicht erkennbar ist, dass es sie gibt.

**Statische Dateien:** von aussen nur `EXTERN_DATEIEN` (`hochladen.html`,
`js/hochladen.js`); `/` liefert `hochladen.html`. Alles andere 404 – die App
wird nicht ausgeliefert, nicht bloss verdeckt.

### Matrix

| Pfad | extern | intern |
|---|---|---|
| `GET /` | Seite «Beleg hochladen» | volle App |
| `GET /api/status` | ✓ (`extern: true`) | ✓ (`extern: false`) |
| `POST /api/login`, `/api/logout` | ✓ | ✓ |
| `POST /api/eingang` | ✓ (angemeldet) | ✓ (angemeldet) |
| `GET /api/eingang`, `/api/eingang/datei/:id` | 404 | ✓ |
| `POST /api/eingang/:id/erledigt`, `DELETE /api/eingang/:id` | 404 | ✓ |
| `/api/ausgaben`, `/api/einstellungen`, `/api/belege…` | 404 | ✓ |
| `GET /api/version` | 404 | ✓ (ohne Anmeldung) |
| jede andere Datei | 404 | ✓ |
| `/server/…`, `/Daten/…`, `/.git…` | 404 | 404 |

### Schichten

Jede Sperre gibt es doppelt: als Whitelist im Reverse-Proxy und als
`nurIntern` bzw. `EXTERN_DATEIEN` in der App. Fällt eine durch einen
Konfigurationsfehler weg, hält die andere. Die Tests prüfen die App-Schicht
ohne Proxy.

Der Proxy lässt genau durch: `/`, `/hochladen.html`, `/js/hochladen.js`,
`/api/status`, `/api/login` (mit Rate-Limit), `/api/logout`,
`POST /api/eingang` (mit Rate-Limit).

## Randfälle

- Im eigenen WLAN über die öffentliche Adresse → trotzdem extern.
- Neue Datei für die Hochladen-Seite → an **zwei** Stellen freigeben (Proxy
  und `EXTERN_DATEIEN`), sonst 404.
- Zu grosse oder unlesbare Anfrage → `413` bzw. `400`, nie `500`.

## Offene Punkte

- [ ] Kein Upload-Kontingent pro Konto; begrenzt nur durch das Rate-Limit des Proxys
- [ ] Kein zweiter Faktor – vertretbar, weil von aussen ohnehin nur hochgeladen werden kann
