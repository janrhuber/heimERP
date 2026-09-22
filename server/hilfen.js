"use strict";
/* ================= Gemeinsame Server-Hilfen ================= */
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

/* Datenverzeichnis: in Produktion ausserhalb des Git-Checkouts (git clone --force!) */
const DATEN_DIR = path.resolve(process.env.DATEN_DIR || path.join(__dirname, "..", "Daten"));

const ERLAUBTE_ENDUNGEN = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/* identisch zu js/basis.js – gleiche Dateinamen in beiden Modi */
function sanitizeFilename(s) {
  return String(s || "").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").slice(0, 60) || "Beleg";
}

/* identisch zu js/wiederkehrend.js storeReceipt() – gleiche Dateinamen in beiden Modi.
   Liefert den Basisnamen OHNE Endung: JJMMTT_Beschreibung_Lieferant[_Typ] */
function belegBasisname(datum, beschreibung, lieferant, originalName) {
  const jjmmtt = String(datum || "").replace(/-/g, "").slice(2, 8);
  const typMatch = String(originalName || "").match(/quittung|rechnung|lieferschein|gutschrift|offerte|vertrag|beleg/i);
  let base = jjmmtt + "_" + sanitizeFilename(beschreibung).slice(0, 40).replace(/_+$/, "");
  if (lieferant) base += "_" + sanitizeFilename(lieferant).slice(0, 25).replace(/_+$/, "");
  if (typMatch) { const t = typMatch[0]; base += "_" + t[0].toUpperCase() + t.slice(1).toLowerCase(); }
  return base;
}

/* multer dekodiert originalname als latin1 → Umlaute reparieren */
function fixMulterName(name) {
  return Buffer.from(String(name || ""), "latin1").toString("utf8");
}

function etagFuer(inhalt) {
  return '"' + crypto.createHash("sha1").update(inhalt).digest("hex") + '"';
}

async function atomicWriteFile(pfad, inhalt) {
  const tmp = pfad + ".tmp";
  await fsp.writeFile(tmp, inhalt);
  await fsp.rename(tmp, pfad);
}

/* Path-Traversal-Guard: Ergebnis muss unter root bleiben */
function sichererPfad(root, ...segmente) {
  const ziel = path.resolve(root, ...segmente.map(String));
  if (ziel !== root && !ziel.startsWith(root + path.sep)) throw new Error("Ungültiger Pfad");
  return ziel;
}

/* Namenskollisionen wie im Ordner-Modus auflösen: base.ext, base_2.ext, … */
function eindeutigerDateiname(dir, base, ext) {
  let name = base + ext, n = 1;
  while (fs.existsSync(path.join(dir, name))) name = base + "_" + (++n) + ext;
  return name;
}

/* Endungs-Whitelist (iPhone sendet HEIC oft als octet-stream → Endung ist massgeblich) */
function pruefeEndung(dateiname) {
  const ext = path.extname(dateiname).toLowerCase();
  if (!ERLAUBTE_ENDUNGEN.includes(ext)) return null;
  return ext;
}

/* ================= Zugangsweg =================
   Der oeffentliche Nginx-vhost setzt "X-Zugang: extern" und ueberschreibt dabei
   einen vom Client mitgeschickten Header – faelschbar ist er also nicht. Beim
   direkten Zugriff aus dem Heimnetz auf Port 3000 fehlt er.

   Das ist die zweite Verteidigungslinie: Nginx sperrt die internen Pfade
   bereits, aber wenn diese Config einmal fehlerhaft ausgerollt wird, haelt
   diese Pruefung hier trotzdem. */
function istExtern(req) {
  return String(req.get("X-Zugang") || "").trim().toLowerCase() === "extern";
}

/* 404 statt 403: von aussen soll gar nicht erkennbar sein, dass es die
   Endpunkte gibt – dasselbe Verhalten wie die Nginx-Sperre davor. */
function nurIntern(req, res, next) {
  if (istExtern(req)) return res.status(404).end();
  next();
}

module.exports = {
  DATEN_DIR, ERLAUBTE_ENDUNGEN, MAX_UPLOAD_BYTES,
  sanitizeFilename, belegBasisname, fixMulterName, etagFuer, atomicWriteFile,
  sichererPfad, eindeutigerDateiname, pruefeEndung,
  istExtern, nurIntern,
};
