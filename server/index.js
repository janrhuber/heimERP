"use strict";
/* ================= heimERP Server (Dual-Mode-Backend) =================
   Start:  node server/index.js
   Env:    PORT (Default 3000)
           DATEN_DIR (Default ../Daten – in Produktion /var/lib/heimerp/daten)

   Zugriffsmodell: was jemand darf, entscheidet der Weg, nicht das Konto.
   Über den öffentlichen Nginx-vhost kommt nur der Eingang durch (Beleg
   hochladen); Ausgabenliste, Belegablage und Einstellungen sind dort
   gesperrt. Aus dem Heimnetz direkt auf Port 3000 ist alles offen. */
const path = require("path");
const fs = require("fs");
const express = require("express");
const { DATEN_DIR } = require("./hilfen");
const auth = require("./auth");
const ausgaben = require("./ausgaben");
const belege = require("./belege");
const eingang = require("./eingang");

const PORT = parseInt(process.env.PORT, 10) || 3000;
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
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ fehler: "Serverfehler" });
});

app.listen(PORT, () => {
  console.log("heimERP-Server läuft auf Port " + PORT + ", Daten in " + DATEN_DIR);
});
