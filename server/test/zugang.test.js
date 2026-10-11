"use strict";
/* Zugangsmodell: von aussen nur Hochladen, intern alles.
   Das ist die zweite Schicht hinter der Nginx-Whitelist – diese Tests
   stellen sicher, dass sie auch hält, wenn die Proxy-Config fehlt. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { starteServer, beleg } = require("./helfer");

let srv, intern, extern, postenId;

before(async () => {
  srv = await starteServer();
  intern = await srv.anmelden();
  extern = await srv.anmelden({ extern: true });
  assert.equal((await extern.post("/api/eingang", beleg())).status, 200);
  postenId = (await (await intern.get("/api/eingang")).json())[0].id;
});

after(() => srv.stop());

/* [Pfad, erwartet intern, erwartet extern] – immer angemeldet */
const MATRIX = [
  ["/api/eingang", 200, 404],
  ["/api/eingang/datei/:id", 200, 404],
  ["/api/ausgaben", 200, 404],
  ["/api/einstellungen", 200, 404],
  ["/api/belege/2026/x.pdf", 404, 404], // intern 404 = Datei fehlt, nicht gesperrt
];

for (const [pfad, erwartetIntern, erwartetExtern] of MATRIX) {
  test(`GET ${pfad}: intern ${erwartetIntern}, extern ${erwartetExtern}`, async () => {
    const p = pfad.replace(":id", postenId);
    assert.equal((await intern.get(p)).status, erwartetIntern, "intern");
    assert.equal((await extern.get(p)).status, erwartetExtern, "extern");
  });
}

test("von aussen lässt sich nichts abarbeiten oder überschreiben", async () => {
  assert.equal((await extern.post(`/api/eingang/${postenId}/erledigt`, "{}",
    { "Content-Type": "application/json" })).status, 404);
  assert.equal((await extern.delete(`/api/eingang/${postenId}`)).status, 404);
  assert.equal((await extern.put("/api/ausgaben", "x", { "Content-Type": "text/csv" })).status, 404);
  assert.equal((await extern.post("/api/belege", beleg())).status, 404);
  const liste = await (await intern.get("/api/eingang")).json();
  assert.equal(liste.find(p => p.id === postenId).status, "OFFEN");
});

test("/api/status meldet den Zugangsweg", async () => {
  assert.equal((await (await srv.anonym().get("/api/status")).json()).extern, false);
  assert.equal((await (await srv.anonym({ extern: true }).get("/api/status")).json()).extern, true);
});

test("X-Zugang: Schreibweise und Leerzeichen egal, anderer Wert zählt als intern", async () => {
  const mit = wert => fetch(srv.url + "/api/status", { headers: { "X-Zugang": wert } }).then(r => r.json());
  assert.equal((await mit(" EXTERN ")).extern, true);
  assert.equal((await mit("intern")).extern, false);
});

test("ohne Anmeldung: kein Hochladen, keine Daten – weder intern noch extern", async () => {
  assert.equal((await srv.anonym({ extern: true }).post("/api/eingang", beleg())).status, 401);
  assert.equal((await srv.anonym().post("/api/eingang", beleg())).status, 401);
  assert.equal((await srv.anonym().get("/api/ausgaben")).status, 401);
  assert.equal((await srv.anonym().get("/api/eingang")).status, 401);
});

/* Zu grosse oder kaputte Anfragen sind Fehler des Clients (4xx), kein
   Serverfehler mit Stacktrace im Log. Geprüft an einem Endpunkt ohne
   Rate-Limit, damit kein 429 das Ergebnis verdeckt. */
test("zu grosse Anfrage → 413, kaputtes JSON → 400, nie 500", async () => {
  const gross = await intern.post(`/api/eingang/${postenId}/erledigt`,
    JSON.stringify({ eintragId: "x".repeat(20000) }), { "Content-Type": "application/json" });
  assert.equal(gross.status, 413);
  assert.match((await gross.json()).fehler, /zu gross/i);

  const kaputt = await intern.post(`/api/eingang/${postenId}/erledigt`,
    "{ das ist kein json", { "Content-Type": "application/json" });
  assert.equal(kaputt.status, 400);
});
