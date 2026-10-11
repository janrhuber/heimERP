"use strict";
/* ================= heimERP Express-App =================
   Aufbau der App ohne listen(). Gestartet wird über index.js (PM2),
   die Tests binden die App selbst an einen freien Port.
   DATEN_DIR muss gesetzt sein, BEVOR dieses Modul geladen wird – hilfen.js
   liest ihn beim ersten require.

   Zugriffsmodell: was jemand darf, entscheidet der Weg, nicht das Konto.
   Über den öffentlichen Nginx-vhost gibt es nur die Seite «Beleg hochladen»;
   die eigentliche App, Ausgaben, Belegablage, Einstellungen und auch die
   Eingangsliste gibt es dort nicht. Aus dem Heimnetz direkt auf Port 3000
   ist alles offen. */
const path = require("path");
const fs = require("fs");
const express = require("express");
const { DATEN_DIR, istExtern } = require("./hilfen");
const auth = require("./auth");
const ausgaben = require("./ausgaben");
const belege = require("./belege");
const eingang = require("./eingang");

const REPO_ROOT = path.join(__dirname, "..");

for (const d of ["", "Belege", "Eingang", ".sitzungen"]) {
  fs.mkdirSync(path.join(DATEN_DIR, d), { recursive: true });
}

const app = express();
/* Genau EIN vertrauenswuerdiger Hop: der Nginx-Proxy.
   Voraussetzung: Nginx setzt X-Forwarded-For auf $remote_addr (die echte
   Client-IP aus CF-Connecting-IP) und haengt NICHT die Kette an. Sonst landet
   hier die Cloudflare-Edge-IP und das Login-Rate-Limit zaehlt pro Edge statt
   pro Angreifer. Siehe nginx-configs/cloudflare-realip.conf im server-setup. */
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "same-origin");
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  next();
});

app.use(auth.sessionMiddleware());
app.use(auth.router);
app.use(ausgaben.router);
app.use(belege.router);
app.use(eingang.router);

/* Von aussen gibt es nur die Seite «Beleg hochladen». Die eigentliche App –
   heimERP.html und ihre Skripte – wird gar nicht erst ausgeliefert, nicht
   bloss verdeckt. Zweite Schicht hinter der Nginx-Whitelist. API-Routen sind
   oben schon behandelt; was hier ankommt, ist statisch.
   Kein styles.css: die Seite bringt ihr CSS im HTML mit. */
const EXTERN_DATEIEN = new Set(["/hochladen.html", "/js/hochladen.js"]);
app.use((req, res, next) => {
  if (!istExtern(req)) return next();
  if (req.path === "/") return res.sendFile(path.join(REPO_ROOT, "hochladen.html"));
  if (EXTERN_DATEIEN.has(req.path)) return next();
  res.status(404).end();
});

/* Statische App ausliefern – Server-Code, Daten und Git-Interna nie */
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.startsWith("/server") || p.startsWith("/daten") || p.startsWith("/.") || p.includes("/.git")) {
    return res.status(404).end();
  }
  next();
});
app.use(express.static(REPO_ROOT, { index: "heimERP.html" }));

/* zentrale Fehlerbehandlung */
app.use((err, req, res, next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ fehler: "Datei zu gross (max. 10 MB)" });
  }
  /* Fehler des Clients, nicht des Servers: zu grosser oder unlesbarer
     Request-Body. Ohne diese Zeilen gäbe es 500 und einen Stacktrace im Log –
     jeder könnte das Log mit einer zu grossen Anfrage füllen. */
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ fehler: "Anfrage zu gross" });
  }
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ fehler: "Ungültige Anfrage" });
  }
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ fehler: "Serverfehler" });
});

module.exports = app;
