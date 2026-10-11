"use strict";
/* Versionsanzeige. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { starteServer } = require("./helfer");
const { ausDescribe } = require("../version");

test("genau auf dem Tag: Release-Version", () => {
  assert.deepEqual(ausDescribe("v1.1.0-0-g1a2b3c4"),
    { version: "1.1.0", hash: "1a2b3c4", release: true, anzeige: "v1.1.0 (1a2b3c4)" });
});

test("Commits nach dem Tag: alpha auf die nächste Patch-Version", () => {
  assert.deepEqual(ausDescribe("v1.1.0-3-g9f8e7d6"),
    { version: "1.1.1-alpha.3", hash: "9f8e7d6", release: false, anzeige: "v1.1.1-alpha.3 (9f8e7d6)" });
});

test("alpha zählt nicht rückwärts: liegt immer nach dem letzten Release", () => {
  // 1.0.0-alpha.N wäre nach SemVer KLEINER als 1.0.0 – genau das soll nicht passieren
  assert.equal(ausDescribe("v1.0.0-1-gabcdef1").version, "1.0.1-alpha.1");
  assert.equal(ausDescribe("v2.9.9-12-gabcdef1").version, "2.9.10-alpha.12");
});

test("unbrauchbare Ausgabe → null statt einer erfundenen Version", () => {
  assert.equal(ausDescribe(""), null);
  assert.equal(ausDescribe("release-2026"), null);
  assert.equal(ausDescribe("v1.0-0-gabc1234"), null);
});

let srv;
before(async () => { srv = await starteServer(); });
after(() => srv.stop());

test("GET /api/version: intern ohne Anmeldung, extern 404", async () => {
  const r = await srv.anonym().get("/api/version");
  assert.equal(r.status, 200);
  const v = await r.json();
  assert.match(v.anzeige, /^v\d+\.\d+\.\d+(-alpha\.\d+)? \([0-9a-f]{7,}\)$|^unbekannt$/);
  assert.equal((await srv.anonym({ extern: true }).get("/api/version")).status, 404);
});
