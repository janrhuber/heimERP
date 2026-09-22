"use strict";
/* ================= Benutzerverwaltung (CLI) =================
   node server/benutzer-cli.js add <Name>
   node server/benutzer-cli.js passwort <Name>
   node server/benutzer-cli.js entfernen <Name>
   node server/benutzer-cli.js liste
   DATEN_DIR wie beim Server setzen (Default ../Daten).

   heimERP kennt keine Rollen: wer angemeldet ist, darf von unterwegs Belege
   hochladen und aus dem Heimnetz alles. Den Unterschied macht der Weg, nicht
   das Konto. */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const { DATEN_DIR } = require("./hilfen");

const DATEI = path.join(DATEN_DIR, "benutzer.json");

function lade() {
  try { return JSON.parse(fs.readFileSync(DATEI, "utf8")); }
  catch { return []; }
}

function speichere(liste) {
  fs.mkdirSync(DATEN_DIR, { recursive: true });
  fs.writeFileSync(DATEI, JSON.stringify(liste, null, 2), { mode: 0o600 });
}

function frage(text) {
  return new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(text, antwort => { rl.close(); res(antwort); });
  });
}

async function neuesPasswort(text) {
  const pw = await frage(text);
  if (pw.length < 8) { console.error("✖ Passwort muss mindestens 8 Zeichen haben."); process.exit(1); }
  return bcrypt.hashSync(pw, 12);
}

function usage() {
  console.log("Verwendung:\n" +
    "  node server/benutzer-cli.js add <Name>\n" +
    "  node server/benutzer-cli.js passwort <Name>\n" +
    "  node server/benutzer-cli.js entfernen <Name>\n" +
    "  node server/benutzer-cli.js liste");
  process.exit(1);
}

async function main() {
  const [befehl, name] = process.argv.slice(2);
  const liste = lade();
  switch (befehl) {
    case "liste":
      if (!liste.length) console.log("Keine Benutzer. (" + DATEI + ")");
      for (const b of liste) console.log("  " + b.name);
      break;
    case "add": {
      if (!name) usage();
      if (liste.some(b => b.name === name)) { console.error("✖ Benutzer existiert schon."); process.exit(1); }
      const hash = await neuesPasswort("Passwort für " + name + ": ");
      liste.push({ name, hash });
      speichere(liste);
      console.log("✔ " + name + " angelegt in " + DATEI);
      break;
    }
    case "passwort": {
      if (!name) usage();
      const b = liste.find(x => x.name === name);
      if (!b) { console.error("✖ Benutzer nicht gefunden."); process.exit(1); }
      b.hash = await neuesPasswort("Neues Passwort für " + name + ": ");
      speichere(liste);
      console.log("✔ Passwort geändert.");
      break;
    }
    case "entfernen": {
      if (!name) usage();
      if (!liste.some(x => x.name === name)) { console.error("✖ Benutzer nicht gefunden."); process.exit(1); }
      speichere(liste.filter(x => x.name !== name));
      console.log("✔ " + name + " entfernt.");
      break;
    }
    default: usage();
  }
}

main();
