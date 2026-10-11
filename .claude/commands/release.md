---
description: Release – develop nach main, taggen, deployen, verifizieren
argument-hint: <X.Y.Z>
---

Erstelle das Release $ARGUMENTS. Jeder Schritt muss gelingen, bevor der nächste beginnt. Bei einem Fehler anhalten und melden – nichts überspringen.

Hostname, öffentliche Adresse und Pfade der Installation stehen bewusst nicht in diesem (öffentlichen) Repo. Sie kommen aus dem Infrastruktur-Repo `C:\git\server-setup`: `ansible/inventory.yml`, Host `heimerp` (`ansible_host`, `domain`, `app_path`, `daten_dir`). Unten stehen dafür `<host>`, `<domain>`, `<app_path>`, `<daten_dir>`.

**Vorbedingungen prüfen**

1. Version ist gültiges SemVer und grösser als der letzte Tag (`git tag --sort=-v:refname | head -1`). Passt die Stufe (Patch/Minor/Major) zu den Einträgen unter **Unreleased**? Breaking Change (Datenformat, API) = Major. Sonst nachfragen.
2. Auf `develop`, Arbeitsbaum sauber, `develop` auf dem Stand von `origin/develop`.
3. `cd server && npm test` – alles grün.
4. `docs/specs/changelog.md` hat Einträge unter **Unreleased**. Leer → anhalten.
5. **Öffentliches Repo**: `git diff <letzter-tag>..develop` enthält keine Namen, Adressen, IP-Nummern, Hostnamen oder echten Beträge/Belege. Fund → anhalten.

**Release vorbereiten (auf develop)**

6. Version in `server/package.json` setzen.
7. Changelog: **Unreleased** → `## [X.Y.Z] – <heutiges Datum>`, neues leeres **Unreleased** darüber.
8. Haben sich seit dem letzten Tag CSS- oder JS-Dateien geändert (`git diff --name-only <letzter-tag>..develop -- '*.css' 'js/'`), aber `?v=` in `heimERP.html` / `hochladen.html` nicht? Dann auf heutiges Datum hochzählen (`YYYYMMDD`), bei einem zweiten Release am selben Tag `-2`, `-3` … anhängen. **Alle** Verweise einer Seite gemeinsam hochzählen – sonst mischt der Cache alte und neue Skripte.
9. Commit `chore(release): vX.Y.Z`.

**Zusammenführen und taggen**

10. `git checkout main && git merge --no-ff develop -m "Release vX.Y.Z"`
11. Annotierter Tag: `git tag -a vX.Y.Z -m "<Changelog-Abschnitt dieser Version>"`
12. **`main` zurück in `develop`**: `git checkout develop && git merge --ff-only main`. Ohne diesen Schritt kennt `develop` den Tag nicht, und die Versionsanzeige findet dort keine Version.
13. Dem User zeigen, was gepusht wird (`git log origin/main..main --oneline`), **Bestätigung einholen**, dann `git push origin main develop vX.Y.Z`.

**Deployen** (aus `C:\git\server-setup`)

14. Daten sichern: `ssh root@<host> 'tar czf /root/daten-vor-vX.Y.Z.tar.gz -C $(dirname <daten_dir>) daten'`, Grösse prüfen. Zeilenzahl von `ausgaben.csv` notieren (falls vorhanden).
15. Liegen in `server-setup` noch nicht ausgerollte Änderungen an der nginx-Config oder am Proxy-Snippet von heimERP? Mit dem User klären.
16. **Zuerst die App**: `.\scripts\deploy.ps1 -Service heimerp -SkipTerraform`. **Nie** mit `2>&1` aufrufen.
17. **Danach der Proxy**, falls in 15 Änderungen vorlagen: `.\scripts\deploy.ps1 -Service nginx-proxy -SkipTerraform`. Die umgekehrte Reihenfolge bricht die öffentliche Seite.

**Verifizieren** – Ergebnis jeder Prüfung zeigen, am besten mit `curl -s -o /dev/null -w '%{http_code}'` in Bash.

18. Server läuft den Tag: `git describe --tags` in `<app_path>`; intern `GET /api/version` meldet `vX.Y.Z` ohne `alpha`.
19. Öffentlich (`https://<domain>`): `/api/status` mit `extern: true`; `/` ist die Seite «Beleg hochladen»; `/heimERP.html`, `/js/app.js`, `/styles.css`, `/README.md`, `GET /api/eingang`, `/api/ausgaben`, `/api/version` → 404; `POST /api/eingang` ohne Login → 401.
20. Intern (`http://<host>:3000`): `/api/status` mit `extern: false`; `/` ist die volle App; `/api/ausgaben` → 401.
21. Ausgelieferte CSS/JS tragen den aktuellen `?v=`.
22. Daten unversehrt: Zeilenzahl von `ausgaben.csv` wie in Schritt 14.

Abschluss: kurzer Bericht mit Version, Commits seit dem letzten Release, Prüfergebnissen und Name des Backups. Zurück auf `develop` wechseln.
