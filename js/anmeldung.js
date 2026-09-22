"use strict";
/* ================= Server-Modus: Anmeldung =================
   heimERP kennt keine Rollen. Was sichtbar ist, entscheidet der Zugangsweg:
   über den öffentlichen Proxy gibt es nur den Eingang, aus dem Heimnetz alles.
   Das Backend meldet das in /api/status als "extern". */

function zeigeLogin() {
  document.querySelectorAll("main > section").forEach(s => s.classList.add("hidden"));
  $("startHint").classList.add("hidden");
  document.querySelector(".tabs").classList.add("hidden");
  $("btnLogout").classList.add("hidden");
  $("viewLogin").classList.remove("hidden");
  setStatus(externerZugang ? "Beleg hochladen – bitte anmelden" : "Bitte anmelden", "");
}

async function login(ev) {
  ev.preventDefault();
  $("loginFehler").textContent = "";
  let r;
  try {
    r = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: $("loginName").value.trim(), passwort: $("loginPasswort").value }),
    });
  } catch (e) {
    $("loginFehler").textContent = "Verbindungsfehler: " + e.message;
    return;
  }
  if (r.status === 401) { $("loginFehler").textContent = "Name oder Passwort falsch."; return; }
  if (r.status === 429) { $("loginFehler").textContent = "Zu viele Versuche – bitte in 15 Minuten erneut."; return; }
  if (!r.ok) { $("loginFehler").textContent = "Fehler (HTTP " + r.status + ")."; return; }
  $("loginPasswort").value = "";
  await anmeldungErfolgreich(await r.json());
}

async function logout() {
  try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch {}
  location.reload(); // einfachster kompletter Zustands-Reset
}

async function anmeldungErfolgreich(benutzer) {
  currentUser = benutzer;
  $("viewLogin").classList.add("hidden");
  $("btnLogout").classList.remove("hidden");
  document.querySelector(".tabs").classList.remove("hidden");
  await wendeZugangAn();
}

/* Von aussen wird die Oberfläche gar nicht erst aufgebaut, statt Tabs
   anzubieten, die dann in 404 laufen. */
async function wendeZugangAn() {
  const voll = !externerZugang;

  for (const t of ["Erfassen", "Jahr", "Budget", "Verkauf"]) {
    $("tab" + t).classList.toggle("hidden", !voll);
  }
  $("tabEingang").classList.remove("hidden");

  if (voll) {
    showTab("Erfassen");
    try { await serverLoadAll(); }
    catch (e) { setStatus("Fehler beim Laden: " + e.message, "err"); }
  } else {
    showTab("Eingang");
    setStatus("Angemeldet als " + currentUser.name + " – Belege hochladen", "ok");
  }
  await ladeEingang();
}
