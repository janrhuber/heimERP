"use strict";
/* ================= Belegablage: Upload und Anzeige =================
   Die fertige Ablage unter Belege/<Jahr>/ ist Teil der Buchführung und damit
   nur aus dem Heimnetz erreichbar. Was von unterwegs hochgeladen wird, geht
   nicht hierhin, sondern in den Eingang (eingang.js). */
const path = require("path");
const fsp = require("fs/promises");
const express = require("express");
const multer = require("multer");
const {
  DATEN_DIR, MAX_UPLOAD_BYTES,
  belegBasisname, fixMulterName, sichererPfad, eindeutigerDateiname, pruefeEndung, nurIntern,
} = require("./hilfen");
const { requireAuth } = require("./auth");

const BELEG_ROOT = path.join(DATEN_DIR, "Belege");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

const router = express.Router();

router.post("/api/belege", nurIntern, requireAuth, upload.single("datei"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ fehler: "Keine Datei erhalten" });
    const jahr = parseInt(req.body.jahr, 10);
    if (!Number.isInteger(jahr) || jahr < 1900 || jahr > 2200) {
      return res.status(400).json({ fehler: "Ungültiges Jahr" });
    }
    const original = fixMulterName(req.file.originalname);
    const ext = pruefeEndung(original);
    if (!ext) return res.status(400).json({ fehler: "Dateityp nicht erlaubt (PDF, JPG, PNG, HEIC, WEBP)" });

    const dir = sichererPfad(DATEN_DIR, "Belege", String(jahr));
    await fsp.mkdir(dir, { recursive: true });
    /* gleiche Namensgebung wie storeReceipt im Ordner-Modus */
    const base = belegBasisname(req.body.datum, req.body.beschreibung || "", req.body.lieferant || "", original);
    const name = eindeutigerDateiname(dir, base, ext);
    await fsp.writeFile(path.join(dir, name), req.file.buffer);
    res.json({ pfad: "Belege/" + jahr + "/" + name });
  } catch (e) { next(e); }
});

router.get("/api/belege/:jahr/:name", nurIntern, requireAuth, (req, res) => {
  let datei;
  try { datei = sichererPfad(BELEG_ROOT, req.params.jahr, req.params.name); }
  catch { return res.status(400).json({ fehler: "Ungültiger Pfad" }); }
  res.sendFile(datei, { headers: { "Content-Disposition": "inline" } }, err => {
    if (err && !res.headersSent) res.status(404).json({ fehler: "Beleg nicht gefunden" });
  });
});

module.exports = { router, upload };
