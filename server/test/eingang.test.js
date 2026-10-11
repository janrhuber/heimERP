"use strict";
/* Beleg hochladen: Validierung und was die Antwort verrät. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { starteServer, beleg, NAME } = require("./helfer");

let srv, aussen, innen;

before(async () => {
  srv = await starteServer();
  aussen = await srv.anmelden({ extern: true });
  innen = await srv.anmelden();
});

after(() => srv.stop());

async function posten(pred) {
  return (await (await innen.get("/api/eingang")).json()).find(pred);
}

test("gültiger Upload: Antwort verrät nur ok, nichts vom Posten", async () => {
  const r = await aussen.post("/api/eingang", beleg());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test("Posten wird mit allen Angaben gespeichert, Datei liegt im Eingang", async () => {
  await aussen.post("/api/eingang", beleg({ beschreibung: "Dachrinne flicken", lieferant: "Spengler Beispiel" }));
  const p = await posten(x => x.beschreibung === "Dachrinne flicken");
  assert.equal(p.name, NAME, "Konto kommt aus der Session");
  assert.equal(p.betrag, 420.5);
  assert.equal(p.datum, "2026-03-14");
  assert.equal(p.status, "OFFEN");
  assert.match(p.datei, /^Eingang\/260314_Dachrinne_flicken_Spengler_Beispiel/);
  assert.ok(fs.existsSync(path.join(srv.datenDir, p.datei)));
});

test("minimal: nur das Foto", async () => {
  const r = await aussen.post("/api/eingang",
    beleg({ beschreibung: undefined, lieferant: "Nur Foto AG", betrag: undefined, datum: undefined }));
  assert.equal(r.status, 200, await r.text());
  const p = await posten(x => x.lieferant === "Nur Foto AG");
  assert.equal(p.beschreibung, "");
  assert.equal(p.betrag, null, "fehlender Betrag bleibt leer, wird nicht 0");
  assert.match(p.datum, /^\d{4}-\d{2}-\d{2}$/, "ohne Datum gilt heute");
  assert.match(p.datei, /^Eingang\/\d{6}_Beleg_Nur_Foto_AG/, "ohne Beschreibung heisst die Datei Beleg");
});

test("Gutschrift: negativer Betrag ist erlaubt", async () => {
  await aussen.post("/api/eingang", beleg({ beschreibung: "Rückerstattung", betrag: "-80" }));
  assert.equal((await posten(x => x.beschreibung === "Rückerstattung")).betrag, -80);
});

test("gleiche Angaben zweimal: zweite Datei überschreibt die erste nicht", async () => {
  await aussen.post("/api/eingang", beleg({ beschreibung: "Doppelt" }));
  await aussen.post("/api/eingang", beleg({ beschreibung: "Doppelt" }));
  const liste = (await (await innen.get("/api/eingang")).json()).filter(x => x.beschreibung === "Doppelt");
  assert.equal(liste.length, 2);
  assert.notEqual(liste[0].datei, liste[1].datei);
});

test("abgelehnt: Betrag keine Zahl", async () => {
  const r = await aussen.post("/api/eingang", beleg({ betrag: "viel" }));
  assert.equal(r.status, 400);
  assert.match((await r.json()).fehler, /Betrag/);
});

test("abgelehnt: ohne Datei", async () => {
  const fd = new FormData();
  fd.append("beschreibung", "ohne Datei");
  assert.equal((await aussen.post("/api/eingang", fd)).status, 400);
});

test("abgelehnt: Dateityp ausserhalb der Whitelist", async () => {
  const r = await aussen.post("/api/eingang", beleg({}, "virus.exe"));
  assert.equal(r.status, 400);
  assert.match((await r.json()).fehler, /Dateityp/);
});

test("Beschreibung aus dem Formular kann keinen Pfad unterschieben", async () => {
  await aussen.post("/api/eingang", beleg({ beschreibung: "../../etc/passwd", lieferant: "..\\..\\x" }));
  const p = await posten(x => x.beschreibung.includes("passwd"));
  const dateiname = p.datei.replace(/^Eingang\//, "");
  assert.ok(!/[\\/]/.test(dateiname), "Trennzeichen im Dateinamen: " + p.datei);
  const ziel = path.resolve(srv.datenDir, p.datei);
  assert.ok(ziel.startsWith(path.resolve(srv.datenDir, "Eingang") + path.sep), "ausserhalb Eingang: " + ziel);
  assert.ok(fs.existsSync(ziel));
});

test("intern: übernehmen markiert als erledigt, löschen entfernt Posten und Datei", async () => {
  await aussen.post("/api/eingang", beleg({ beschreibung: "Zum Erledigen" }));
  const p = await posten(x => x.beschreibung === "Zum Erledigen");
  const r = await innen.post(`/api/eingang/${p.id}/erledigt`, JSON.stringify({ eintragId: "abc" }),
    { "Content-Type": "application/json" });
  assert.equal(r.status, 200);
  const danach = await posten(x => x.id === p.id);
  assert.equal(danach.status, "ERLEDIGT");
  assert.equal(danach.eintragId, "abc");

  assert.equal((await innen.delete(`/api/eingang/${p.id}`)).status, 200);
  assert.equal(await posten(x => x.id === p.id), undefined);
  assert.ok(!fs.existsSync(path.join(srv.datenDir, p.datei)), "Datei ist mitgelöscht");
});
