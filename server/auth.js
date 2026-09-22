"use strict";
/* ================= Anmeldung und Sessions =================
   Anders als vereinERP kennt heimERP keine Rollen: es gibt nur dich (und wer
   sonst Zugang haben soll). Was jemand darf, entscheidet nicht das Konto,
   sondern der Weg – siehe nurIntern() in hilfen.js. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { DATEN_DIR, istExtern } = require("./hilfen");

const BENUTZER_DATEI = path.join(DATEN_DIR, "benutzer.json");
/* Dummy-Hash: bcrypt-Vergleich läuft auch bei unbekanntem Namen → kein Timing-Leck */
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 12);

/* Bei jedem Login frisch gelesen → CLI-Änderungen wirken ohne Neustart */
function ladeBenutzer() {
  try { return JSON.parse(fs.readFileSync(BENUTZER_DATEI, "utf8")); }
  catch { return []; }
}

/* Persistiertes Secret: sonst würde jeder PM2-Neustart alle Sessions ungültig machen */
function sessionSecret() {
  const datei = path.join(DATEN_DIR, ".session-geheimnis");
  try { return fs.readFileSync(datei, "utf8"); }
  catch {
    const s = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(datei, s, { mode: 0o600 });
    return s;
  }
}

function sessionMiddleware() {
  return session({
    store: new FileStore({
      path: path.join(DATEN_DIR, ".sitzungen"),
      ttl: 30 * 24 * 3600,
      retries: 1,
      logFn: () => {},
    }),
    secret: sessionSecret(),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: "heimerp.sid",
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      /* "auto": extern hinter dem HTTPS-Proxy gesetzt, im Heimnetz über
         http://<ip>:3000 nicht – sonst käme man intern nie hinein. */
      secure: "auto",
      maxAge: 30 * 24 * 3600 * 1000,
    },
  });
}

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { fehler: "Zu viele Anmeldeversuche – bitte in 15 Minuten erneut." },
});

function requireAuth(req, res, next) {
  if (req.session && req.session.benutzer) return next();
  res.status(401).json({ fehler: "Nicht angemeldet" });
}

const router = express.Router();

/* Das Frontend richtet seine Oberfläche nach "extern": von aussen zeigt es
   direkt nur die Upload-Maske, statt volle Tabs anzubieten, die dann ins
   Leere laufen. */
router.get("/api/status", (req, res) => {
  const b = req.session && req.session.benutzer;
  res.json({
    server: true,
    angemeldet: !!b,
    benutzer: b || null,
    extern: istExtern(req),
  });
});

router.post("/api/login", loginLimit, express.json({ limit: "10kb" }), (req, res) => {
  const { name, passwort } = req.body || {};
  const benutzer = ladeBenutzer().find(b => b.name === String(name || "").trim());
  const ok = bcrypt.compareSync(String(passwort || ""), benutzer ? benutzer.hash : DUMMY_HASH);
  if (!benutzer || !ok) return res.status(401).json({ fehler: "Name oder Passwort falsch" });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ fehler: "Session-Fehler" });
    req.session.benutzer = { name: benutzer.name };
    res.json(req.session.benutzer);
  });
});

router.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = { sessionMiddleware, requireAuth, router };
