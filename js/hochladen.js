"use strict";
/* ================= Seite «Beleg hochladen» =================
   Eigenständig, ohne die übrigen App-Skripte: von aussen wird nur diese
   Seite ausgeliefert. Spricht ausschliesslich mit /api/status, /api/login,
   /api/logout und POST /api/eingang. */

const $ = id => document.getElementById(id);

function zeige(ansicht) {
  for (const v of ["Login", "Formular", "Fertig"]) $("view" + v).hidden = v !== ansicht;
  $("btnLogout").hidden = ansicht === "Login";
  document.body.classList.remove("startet");
  window.scrollTo(0, 0);
}

function fehler(text) { $("fehler").textContent = text || ""; }

/* ---------- Anmelden ---------- */

async function start() {
  let angemeldet = false;
  try {
    const st = await (await fetch("/api/status", { credentials: "same-origin" })).json();
    angemeldet = !!st.angemeldet;
  } catch {
    $("loginFehler").textContent = "Keine Verbindung zum Server. Bitte später nochmals versuchen.";
  }
  zeige(angemeldet ? "Formular" : "Login");
}

async function login(ev) {
  ev.preventDefault();
  $("loginFehler").textContent = "";
  let r;
  try {
    r = await fetch("/api/login", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: $("loginName").value.trim(), passwort: $("loginPasswort").value }),
    });
  } catch { $("loginFehler").textContent = "Keine Verbindung zum Server."; return; }
  $("loginPasswort").value = "";
  if (r.status === 401) { $("loginFehler").textContent = "Name oder Passwort stimmt nicht."; return; }
  if (r.status === 429) { $("loginFehler").textContent = "Zu viele Versuche. Bitte in 15 Minuten nochmals."; return; }
  if (!r.ok) { $("loginFehler").textContent = "Anmelden hat nicht geklappt (Fehler " + r.status + ")."; return; }
  zeige("Formular");
}

async function logout() {
  try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch {}
  location.reload();
}

/* ---------- Belege ----------
   Mehrere Fotos sind möglich: auf einmal aus der Galerie gewählt oder
   nacheinander fotografiert. Jedes wird im Eingang ein eigener Posten. */
const MAX_DATEIEN = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const ERLAUBT = /\.(pdf|jpe?g|png|heic|heif|webp)$/i; // wie der Server
let dateien = [];

const gleicheDatei = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

function nimmDateien() {
  const neu = [...$("datei").files];
  $("datei").value = ""; // sonst meldet der Browser dieselbe Datei kein zweites Mal
  fehler("");
  let zuGross = 0, falscherTyp = 0, zuViele = false;
  for (const d of neu) {
    if (!ERLAUBT.test(d.name)) { falscherTyp++; continue; }
    if (d.size > MAX_BYTES) { zuGross++; continue; }
    if (dateien.some(x => gleicheDatei(x, d))) continue;
    if (dateien.length >= MAX_DATEIEN) { zuViele = true; break; }
    dateien.push(d);
  }
  if (falscherTyp) fehler((falscherTyp === 1 ? "Eine Datei ist" : falscherTyp + " Dateien sind") + " weder Foto noch PDF und " + (falscherTyp === 1 ? "wurde" : "wurden") + " weggelassen.");
  else if (zuGross) fehler(zuGross === 1 ? "Eine Datei ist grösser als 10 MB und wurde weggelassen." : zuGross + " Dateien sind grösser als 10 MB und wurden weggelassen.");
  else if (zuViele) fehler("Höchstens " + MAX_DATEIEN + " Belege aufs Mal – den Rest bitte danach hochladen.");
  zeigeBelege(neu.length > 0);
}

/* Die Belege erscheinen im Papierstreifen – als Bild, oder bei PDF/HEIC
   (zeigen die meisten Browser nicht an) als Dateiname. */
function zeigeBelege(neuGelegt) {
  const vorschau = $("belegVorschau");
  vorschau.innerHTML = "";
  const n = dateien.length;
  $("belegLeer").hidden = n > 0;
  vorschau.hidden = n === 0;
  $("btnSenden").textContent = knopfText();
  /* Ein Betrag passt nur zu einem einzelnen Beleg */
  $("feldBetrag").hidden = n > 1;
  $("mehrHinweis").hidden = n <= 1;
  if (n > 1) $("betrag").value = "";
  if (!n) return;

  const liste = document.createElement("div");
  liste.className = n === 1 ? "bilder eins" : "bilder";
  dateien.forEach((datei, i) => {
    const stueck = document.createElement("div");
    stueck.className = "stueck";
    if (/^image\/(jpeg|png|webp|gif)$/.test(datei.type)) {
      const img = document.createElement("img");
      img.alt = "Beleg " + (i + 1);
      img.src = URL.createObjectURL(datei);
      img.onload = () => URL.revokeObjectURL(img.src);
      stueck.append(img);
    } else {
      const d = document.createElement("div");
      d.className = "datei";
      d.textContent = "📄 " + datei.name;
      stueck.append(d);
    }
    const weg = document.createElement("button");
    weg.type = "button";
    weg.className = "weg";
    weg.textContent = "×";
    weg.setAttribute("aria-label", "Beleg " + (i + 1) + " entfernen");
    weg.addEventListener("click", ev => { ev.preventDefault(); dateien.splice(i, 1); fehler(""); zeigeBelege(false); });
    stueck.append(weg);
    liste.append(stueck);
  });
  vorschau.append(liste);

  if (n < MAX_DATEIEN) {
    const w = document.createElement("span");
    w.className = "mehr-fotos";
    w.textContent = "+ Weiteren Beleg hinzufügen";
    vorschau.append(w);
  }
  if (neuGelegt) {
    const b = $("beleg");
    b.classList.remove("gelegt"); void b.offsetWidth; b.classList.add("gelegt");
  }
}

function knopfText() {
  return dateien.length > 1 ? dateien.length + " Belege hochladen" : "Beleg hochladen";
}

async function hochladen(ev) {
  ev.preventDefault();
  fehler("");
  if (!dateien.length) { fehler("Bitte zuerst den Beleg fotografieren."); $("datei").focus(); return; }
  const betrag = $("betrag").value.replace(",", ".").replace(/[’'\s]/g, "").trim();
  if (betrag !== "" && !isFinite(parseFloat(betrag))) { fehler("Der Betrag ist keine Zahl."); $("mehr").open = true; $("betrag").focus(); return; }

  /* Eine Anfrage pro Beleg: bleibt unter der Grössengrenze des Servers,
     und bricht die Verbindung ab, ist klar, welche schon angekommen sind. */
  const knopf = $("btnSenden");
  const gesamt = dateien.length;
  let gesendet = 0, meldung = "", abgelaufen = false;
  knopf.disabled = true;
  while (dateien.length) {
    const datei = dateien[0];
    knopf.textContent = gesamt > 1 ? `Beleg ${gesendet + 1} von ${gesamt} wird gesendet …` : "Wird gesendet …";
    const fd = new FormData();
    fd.append("beschreibung", $("beschreibung").value.trim());
    fd.append("lieferant", $("lieferant").value.trim());
    fd.append("datum", $("datum").value || "");
    if (gesamt === 1 && betrag !== "") fd.append("betrag", betrag);
    fd.append("datei", datei, datei.name);

    let r;
    try { r = await fetch("/api/eingang", { method: "POST", credentials: "same-origin", body: fd }); }
    catch { meldung = "Keine Verbindung."; break; }
    if (r.status === 401) { abgelaufen = true; break; }
    if (!r.ok) {
      meldung = r.status === 429 || r.status === 503
        ? "Zu viele auf einmal – bitte in einer Minute nochmals."
        : "Hochladen hat nicht geklappt (Fehler " + r.status + ").";
      try { const j = await r.json(); if (j && j.fehler) meldung = j.fehler; } catch {}
      break;
    }
    dateien.shift(); // angekommen – bei einem zweiten Versuch nicht nochmals senden
    gesendet++;
  }
  knopf.disabled = false;
  zeigeBelege(false);

  if (abgelaufen) {
    $("loginFehler").textContent = (gesendet ? gesendet + " von " + gesamt + " gesichert. " : "") +
      "Bitte nochmals anmelden – deine Sitzung ist abgelaufen.";
    zeige("Login");
    return;
  }
  if (dateien.length) {
    const rest = dateien.length;
    fehler(gesendet
      ? `${gesendet} von ${gesamt} gesichert. ${rest === 1 ? "Einer ist" : rest + " sind"} NICHT gesichert: ${meldung.replace(/\.$/, "")}. Bitte nochmals versuchen.`
      : (gesamt > 1 ? "Noch nichts gesichert: " : "Der Beleg wurde NICHT gesichert: ") + meldung);
    return;
  }

  $("fertigTitel").textContent = gesamt > 1 ? gesamt + " Belege gesichert" : "Gesichert";
  zeige("Fertig");
}

function nochmal() {
  dateien = [];
  zeigeBelege(false);
  for (const id of ["beschreibung", "lieferant", "betrag", "datum"]) $(id).value = "";
  $("mehr").open = false;
  zeige("Formular");
}

$("loginForm").addEventListener("submit", login);
$("formular").addEventListener("submit", hochladen);
$("btnLogout").addEventListener("click", logout);
$("btnNochmal").addEventListener("click", nochmal);
$("datei").addEventListener("change", nimmDateien);
start();
