---
description: Fehler diagnostizieren – nicht beheben
argument-hint: <Symptom>
---

Diagnostiziere folgendes Problem: $ARGUMENTS

**Nichts ändern** – weder Code noch Server noch Daten. Ziel ist eine belegte Ursache, nicht ein Fix.

Hostnamen, Adressen und Pfade der Installation stehen bewusst nicht in diesem (öffentlichen) Repo, sondern im Infrastruktur-Repo `server-setup` (`ansible/inventory.yml`, Host `heimerp`; nginx-Config unter `nginx-configs/`).

1. **Einordnen**: Modus (Ordner/Server), Zugangsweg (extern über die öffentliche Adresse / intern direkt auf Port 3000), Browser/Gerät, seit wann. Fehlt etwas davon, nachfragen.
2. **Schicht für Schicht vom Nutzer nach innen**, jeweils mit Beleg:
   - **CDN/Proxy davor**: DNS-Auflösung, Cache-Status der betroffenen Datei (alte CSS/JS aus dem Cache?), passender `?v=`?
   - **nginx**: Whitelist in der Site-Config; Access- und Error-Log der Site; direkt am Proxy testen mit `curl -sk --resolve <domain>:443:127.0.0.1 …`
   - **App**: `pm2 list`, `pm2 logs heimerp --lines 100 --nostream`; direkt testen auf `http://127.0.0.1:3000`, mit und ohne Header `X-Zugang: extern`
   - **Daten**: `DATEN_DIR` – Datei vorhanden, Rechte, BOM der CSV (`head -c3 | od -c`)
3. **Reproduzieren** – möglichst als `node:test`-Fall in `server/test/` (nicht committen, nur zur Diagnose) oder als curl-Sequenz.
4. **Mit der Spec abgleichen**: Was sagt die betroffene Spec in `docs/specs/`? Ist es ein Bug (Code weicht ab) oder fehlende/falsche Spec?

Ergebnis: Ursache mit Belegen (Befehl + Ausgabe), betroffene Datei und Zeile, Einschätzung Bug vs. Spec-Lücke, Vorschlag für den Fix. Umsetzung erst auf Anweisung über `/bugfix`.
