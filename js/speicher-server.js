"use strict";
/* ================= Server-Modus: Dateizugriff via API =================
   Spiegelt die Schnittstelle aus speicher.js (readFileText / writeFileText /
   storeReceipt / openReceipt), damit app.js nicht wissen muss, welcher Modus
   gerade läuft. */

async function apiFetch(pfad, optionen) {
  const r = await fetch(pfad, Object.assign({ credentials: "same-origin" }, optionen));
  if (r.status === 401) {
    currentUser = null;
    zeigeLogin();
    const err = new Error("Nicht angemeldet");
    err.status = 401;
    throw err;
  }
  if (!r.ok) {
    let msg = "HTTP " + r.status;
    try { const j = await r.json(); if (j && j.fehler) msg = j.fehler; } catch {}
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return r;
}

async function serverReadFileText(name) {
  const pfad = name === CSV_NAME ? "/api/ausgaben"
             : name === SETTINGS_NAME ? "/api/einstellungen" : null;
  if (!pfad) throw new Error("Unbekannte Datei: " + name);
  let r;
  try { r = await apiFetch(pfad); }
  catch (e) {
    if (e.status === 404) { // erste Nutzung: Datei existiert noch nicht (wie im Ordner-Modus)
      if (name === CSV_NAME) csvEtag = null;
      return null;
    }
    throw e;
  }
  if (name === CSV_NAME) csvEtag = r.headers.get("ETag");
  return await r.text();
}

async function serverWriteFileText(name, text) {
  if (name === CSV_NAME) {
    const kopf = { "Content-Type": "text/csv" };
    if (csvEtag) kopf["If-Match"] = csvEtag;
    let r;
    try {
      r = await apiFetch("/api/ausgaben", { method: "PUT", headers: kopf, body: text });
    } catch (e) {
      if (e.status === 412) {
        setStatus("⚠ Konflikt – Seite neu laden", "err");
        alert("Die Daten wurden in einem anderen Fenster geändert.\n" +
              "Bitte Seite neu laden – die letzte Änderung wurde NICHT gespeichert.");
      }
      throw e;
    }
    csvEtag = (await r.json()).etag;
  } else if (name === SETTINGS_NAME) {
    await apiFetch("/api/einstellungen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: text,
    });
  } else {
    throw new Error("Unbekannte Datei: " + name);
  }
}

async function serverStoreReceipt(file, jahr, datum, beschreibung, lieferant) {
  const fd = new FormData();
  fd.append("jahr", jahr);
  fd.append("datum", datum || "");
  fd.append("beschreibung", beschreibung);
  fd.append("lieferant", lieferant || "");
  fd.append("datei", file, file.name);
  const r = await apiFetch("/api/belege", { method: "POST", body: fd });
  return (await r.json()).pfad; // "Belege/<Jahr>/<Name>" – gleiches Format wie Ordner-Modus
}

function serverOpenReceipt(relPath) {
  /* gespeichert als "Belege/<Jahr>/<Name>" → Route ist unter /api/belege/ verwurzelt */
  const teile = relPath.split("/").slice(1).map(encodeURIComponent);
  window.open("/api/belege/" + teile.join("/"), "_blank");
}

/* Gegenstück zu loadAll() aus speicher.js */
async function serverLoadAll() {
  const csv = await serverReadFileText(CSV_NAME);
  entries = csv ? parseCSV(csv) : [];
  const st = await serverReadFileText(SETTINGS_NAME);
  if (st) { try { settings = Object.assign(settings, JSON.parse(st)); } catch {} }
  if (!Array.isArray(settings.vorlagen)) settings.vorlagen = [];
  if (!settings.budgets || typeof settings.budgets !== "object") settings.budgets = {};
  if (!settings.projektBudgets || typeof settings.projektBudgets !== "object") settings.projektBudgets = {};
  const created = await generateRecurring();
  setStatus("✔ Angemeldet als " + currentUser.name + " (" + entries.length + " Einträge" +
            (created ? ", " + created + " neu geplant" : "") + ")", "ok");
  $("startHint").classList.add("hidden");
  renderAll();
}
