"use strict";
/* Seite «Beleg hochladen»: von aussen wird nur sie ausgeliefert –
   die eigentliche App nicht, auch nicht verdeckt. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { starteServer } = require("./helfer");

let srv, aussen, innen;

before(async () => {
  srv = await starteServer();
  aussen = srv.anonym({ extern: true });
  innen = srv.anonym();
});

after(() => srv.stop());

test("von aussen: / ist die Hochladen-Seite", async () => {
  const r = await aussen.get("/");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Beleg hochladen/);
  assert.doesNotMatch(html, /tabErfassen|tabBudget|ausgaben\.csv/i, "App-Oberfläche darf nicht enthalten sein");
});

test("von aussen: nur die zwei Dateien der Seite (CSS steckt im HTML)", async () => {
  for (const p of ["/hochladen.html", "/js/hochladen.js"]) {
    assert.equal((await aussen.get(p)).status, 200, p);
  }
});

test("von aussen: App-Dateien gibt es nicht", async () => {
  for (const p of ["/heimERP.html", "/styles.css", "/js/app.js", "/js/basis.js", "/js/eingang.js",
                   "/README.md", "/LICENSE", "/server/app.js", "/Daten/ausgaben.csv", "/.gitignore"]) {
    assert.equal((await aussen.get(p)).status, 404, p);
  }
});

test("Cache-Busting-Parameter stört die Whitelist nicht", async () => {
  assert.equal((await aussen.get("/js/hochladen.js?v=20261011")).status, 200);
});

test("die Seite lädt nichts von Dritten", async () => {
  const html = await (await aussen.get("/")).text();
  assert.doesNotMatch(html, /https?:\/\//, "keine externen Adressen im HTML");
});

test("intern: / ist die volle App, Hochladen-Seite zusätzlich erreichbar", async () => {
  assert.match(await (await innen.get("/")).text(), /tabErfassen/);
  assert.equal((await innen.get("/hochladen.html")).status, 200);
  assert.equal((await innen.get("/js/app.js")).status, 200);
});

test("auch intern: Server-Code, Daten und Git-Interna werden nie ausgeliefert", async () => {
  for (const p of ["/server/app.js", "/server/package.json", "/Daten/ausgaben.csv", "/.gitignore", "/.git/config"]) {
    assert.equal((await innen.get(p)).status, 404, p);
  }
});
