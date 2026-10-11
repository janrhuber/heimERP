"use strict";
/* ================= Test-Helfer =================
   Startet die App gegen ein frisches, temporäres Datenverzeichnis – nie
   gegen echte Daten. node --test führt jede Testdatei in einem eigenen
   Prozess aus, darum genügt ein Server pro Datei. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");

const NAME = "Tester";
const PASSWORT = "nur-fuer-tests";

/* DATEN_DIR muss stehen, bevor app.js (und damit hilfen.js) geladen wird */
async function starteServer() {
  const datenDir = fs.mkdtempSync(path.join(os.tmpdir(), "heimerp-test-"));
  process.env.DATEN_DIR = datenDir;
  fs.writeFileSync(path.join(datenDir, "benutzer.json"),
    JSON.stringify([{ name: NAME, hash: bcrypt.hashSync(PASSWORT, 4) }]));
  fs.writeFileSync(path.join(datenDir, "ausgaben.csv"), "ID;Datum\n1;2026-01-01\n");
  fs.writeFileSync(path.join(datenDir, "einstellungen.json"), "{}");

  const app = require("../app");
  const server = await new Promise(res => { const s = app.listen(0, "127.0.0.1", () => res(s)); });
  const url = "http://127.0.0.1:" + server.address().port;

  return {
    url,
    datenDir,
    async stop() {
      await new Promise(res => server.close(res));
      fs.rmSync(datenDir, { recursive: true, force: true });
    },
    /* Angemeldeter Client. extern=true simuliert den Weg über den
       öffentlichen Proxy, der "X-Zugang: extern" setzt. */
    async anmelden({ extern = false } = {}) {
      const r = await fetch(url + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: NAME, passwort: PASSWORT }),
      });
      if (r.status !== 200) throw new Error("Login fehlgeschlagen: " + r.status);
      const cookie = r.headers.get("set-cookie").split(";")[0];
      return client(url, { cookie, extern });
    },
    anonym({ extern = false } = {}) {
      return client(url, { cookie: null, extern });
    },
  };
}

function client(url, { cookie, extern }) {
  const kopf = extra => {
    const h = Object.assign({}, extra);
    if (cookie) h.Cookie = cookie;
    if (extern) h["X-Zugang"] = "extern";
    return h;
  };
  return {
    get: (p, opt = {}) => fetch(url + p, { headers: kopf(opt.headers) }),
    delete: p => fetch(url + p, { method: "DELETE", headers: kopf() }),
    post: (p, body, headers) => fetch(url + p, { method: "POST", headers: kopf(headers), body }),
    put: (p, body, headers) => fetch(url + p, { method: "PUT", headers: kopf(headers), body }),
  };
}

/* Formular wie aus dem Browser: ein Beleg plus Felder */
function beleg(felder = {}, dateiname = "rechnung.pdf") {
  const fd = new FormData();
  const standard = { beschreibung: "Ersatz Boiler", lieferant: "Sanitär Muster", betrag: "420.50", datum: "2026-03-14" };
  for (const [k, v] of Object.entries(Object.assign(standard, felder))) {
    if (v !== undefined) fd.append(k, v);
  }
  fd.append("datei", new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), dateiname);
  return fd;
}

module.exports = { starteServer, beleg, NAME };
