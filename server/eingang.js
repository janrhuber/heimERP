"use strict";
/* ================= Eingang: Belege von unterwegs =================
   Der einzige schreibende Teil, der von aussen erreichbar ist. Gedacht für
   den Moment beim Handwerker oder im Baumarkt: Rechnung abfotografieren,
   kurz beschriften, fertig. Die Zuordnung zu Kategorie, Steueranteil und
   Projekt passiert später zu Hause. */
const path = require("path");
const fsp = require("fs/promises");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const {
  DATEN_DIR, MAX_UPLOAD_BYTES,
  sanitizeFilename, fixMulterName, atomicWriteFile, sichererPfad,
  eindeutigerDateiname, pruefeEndung, nurIntern,
} = require("./hilfen");
const { requireAuth } = require("./auth");

const EINGANG_DATEI = path.join(DATEN_DIR, "eingang.json");
const EINGANG_DIR = path.join(DATEN_DIR, "Eingang");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

/* Schreibzugriffe auf eingang.json serialisieren (ein Prozess, aber parallele Requests) */
let schreibKette = Promise.resolve();
function mitSchreibsperre(fn) {
  const p = schreibKette.then(fn, fn);
  schreibKette = p.then(() => {}, () => {});
  return p;
}

async function ladeListe() {
  try { return JSON.parse(await fsp.readFile(EINGANG_DATEI, "utf8")); }
  catch { return []; }
}

async function speichereListe(liste) {
  await atomicWriteFile(EINGANG_DATEI, JSON.stringify(liste, null, 2));
}

const router = express.Router();

/* Von aussen erreichbar – das ist der Zweck der Übung. */
router.post("/api/eingang", requireAuth, upload.single("datei"), async (req, res, next) => {
  try {
    const beschreibung = String(req.body.beschreibung || "").trim();
    const lieferant = String(req.body.lieferant || "").trim().slice(0, 80);
    if (!beschreibung) return res.status(400).json({ fehler: "Beschreibung fehlt" });
    if (!req.file) return res.status(400).json({ fehler: "Keine Datei erhalten" });

    /* Betrag ist optional: unterwegs zählt, dass der Beleg gesichert ist.
       Negative Beträge sind Gutschriften (z. B. Rückerstattung). */
    let betrag = null;
    if (String(req.body.betrag || "").trim() !== "") {
      const b = parseFloat(req.body.betrag);
      if (!isFinite(b) || Math.abs(b) > 1000000) {
        return res.status(400).json({ fehler: "Ungültiger Betrag" });
      }
      betrag = Math.round(b * 100) / 100;
    }

    /* Datum optional, Standard ist heute – unterwegs will niemand tippen. */
    const datum = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.datum || ""))
      ? req.body.datum
      : new Date().toISOString().slice(0, 10);

    const original = fixMulterName(req.file.originalname);
    const ext = pruefeEndung(original);
    if (!ext) return res.status(400).json({ fehler: "Dateityp nicht erlaubt (PDF, JPG, PNG, HEIC, WEBP)" });

    await fsp.mkdir(EINGANG_DIR, { recursive: true });
    const base = sanitizeFilename(datum.replace(/-/g, "").slice(2)) + "_" +
                 sanitizeFilename(beschreibung) +
                 (lieferant ? "_" + sanitizeFilename(lieferant) : "");
    const dateiname = eindeutigerDateiname(EINGANG_DIR, base, ext);
    await fsp.writeFile(path.join(EINGANG_DIR, dateiname), req.file.buffer);

    const posten = {
      id: crypto.randomBytes(8).toString("hex"),
      eingereicht: new Date().toISOString(),
      /* Name kommt aus der Session, nie aus dem Formular */
      name: req.session.benutzer.name,
      datum,
      betrag,
      lieferant,
      beschreibung: beschreibung.slice(0, 200),
      datei: "Eingang/" + dateiname,
      status: "OFFEN",
      eintragId: "",
    };
    await mitSchreibsperre(async () => {
      const liste = await ladeListe();
      liste.push(posten);
      await speichereListe(liste);
    });
    res.json(posten);
  } catch (e) { next(e); }
});

/* Auch von aussen: du willst unterwegs sehen, was schon drin ist, damit du
   denselben Beleg nicht zweimal hochlädst. */
router.get("/api/eingang", requireAuth, async (req, res, next) => {
  try {
    res.json(await ladeListe());
  } catch (e) { next(e); }
});

router.get("/api/eingang/datei/:id", requireAuth, async (req, res, next) => {
  try {
    const posten = (await ladeListe()).find(p => p.id === req.params.id);
    if (!posten) return res.status(404).json({ fehler: "Nicht gefunden" });
    let datei;
    try { datei = sichererPfad(EINGANG_DIR, path.basename(posten.datei)); }
    catch { return res.status(400).json({ fehler: "Ungültiger Pfad" }); }
    res.sendFile(datei, { headers: { "Content-Disposition": "inline" } }, err => {
      if (err && !res.headersSent) res.status(404).json({ fehler: "Datei nicht gefunden" });
    });
  } catch (e) { next(e); }
});

/* Abarbeiten gehört zur Buchführung → nur aus dem Heimnetz. */
router.post("/api/eingang/:id/erledigt", nurIntern, requireAuth,
  express.json({ limit: "10kb" }), async (req, res, next) => {
    try {
      const ok = await mitSchreibsperre(async () => {
        const liste = await ladeListe();
        const posten = liste.find(p => p.id === req.params.id);
        if (!posten) return false;
        posten.status = "ERLEDIGT";
        posten.eintragId = String((req.body && req.body.eintragId) || "").slice(0, 40);
        await speichereListe(liste);
        return true;
      });
      if (!ok) return res.status(404).json({ fehler: "Nicht gefunden" });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.delete("/api/eingang/:id", nurIntern, requireAuth, async (req, res, next) => {
  try {
    const geloescht = await mitSchreibsperre(async () => {
      const liste = await ladeListe();
      const posten = liste.find(p => p.id === req.params.id);
      if (!posten) return null;
      await speichereListe(liste.filter(p => p.id !== req.params.id));
      return posten;
    });
    if (!geloescht) return res.status(404).json({ fehler: "Nicht gefunden" });
    try { await fsp.unlink(sichererPfad(EINGANG_DIR, path.basename(geloescht.datei))); } catch {}
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = { router };
