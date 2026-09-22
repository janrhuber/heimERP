"use strict";
/* ================= Ausgabenliste (CSV) und Einstellungen =================
   Nur aus dem Heimnetz erreichbar: nurIntern() liefert von aussen 404. */
const path = require("path");
const fsp = require("fs/promises");
const express = require("express");
const { DATEN_DIR, etagFuer, atomicWriteFile, nurIntern } = require("./hilfen");
const { requireAuth } = require("./auth");

const CSV_PFAD = path.join(DATEN_DIR, "ausgaben.csv");
const SETTINGS_PFAD = path.join(DATEN_DIR, "einstellungen.json");

const router = express.Router();

/* CSV wird als opake Bytefolge behandelt (express.raw, nie express.text):
   der Text-Parser würde das BOM strippen und die Excel-Kompatibilität brechen. */
router.get("/api/ausgaben", nurIntern, requireAuth, async (req, res, next) => {
  try {
    const bytes = await fsp.readFile(CSV_PFAD);
    res.set("ETag", etagFuer(bytes));
    res.type("text/csv; charset=utf-8").send(bytes);
  } catch (e) {
    if (e.code === "ENOENT") return res.status(404).json({ fehler: "Noch keine Daten" });
    next(e);
  }
});

/* If-Match schützt vor verlorenen Änderungen, wenn die App in zwei Fenstern
   offen ist – etwa Laptop und Tablet gleichzeitig. */
router.put("/api/ausgaben", nurIntern, requireAuth,
  express.raw({ type: ["text/csv", "text/plain"], limit: "5mb" }),
  async (req, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ fehler: "Leerer oder ungültiger Inhalt" });
      }
      let aktuell = null;
      try { aktuell = await fsp.readFile(CSV_PFAD); } catch {}
      if (aktuell !== null) {
        const ifMatch = req.get("If-Match");
        if (!ifMatch || ifMatch !== etagFuer(aktuell)) {
          return res.status(412).json({ fehler: "Konflikt: Daten wurden zwischenzeitlich geändert" });
        }
      }
      await atomicWriteFile(CSV_PFAD, req.body);
      res.json({ etag: etagFuer(req.body) });
    } catch (e) { next(e); }
  });

router.get("/api/einstellungen", nurIntern, requireAuth, async (req, res, next) => {
  try {
    const text = await fsp.readFile(SETTINGS_PFAD, "utf8");
    res.type("application/json").send(text);
  } catch (e) {
    if (e.code === "ENOENT") return res.status(404).json({ fehler: "Noch keine Einstellungen" });
    next(e);
  }
});

router.put("/api/einstellungen", nurIntern, requireAuth,
  express.json({ limit: "1mb" }),
  async (req, res, next) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ fehler: "Ungültiger Inhalt" });
      }
      await atomicWriteFile(SETTINGS_PFAD, JSON.stringify(req.body, null, 2));
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

module.exports = { router };
