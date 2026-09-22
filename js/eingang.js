"use strict";
/* ================= Eingang: Belege von unterwegs =================
   Von aussen ist das die einzige verfügbare Funktion. Zu Hause kommt die
   Übernahme ins Erfassungsformular dazu. */

let egDatei = null; // fürs Hochladen gewählte Datei
let egListe = [];   // zuletzt geladene Eingang-Posten

function initEingangUI() {
  $("btnEgDatei").onclick = () => $("egDateiInput").click();
  $("egDateiInput").onchange = () => {
    egDatei = $("egDateiInput").files[0] || null;
    $("egDateiName").textContent = egDatei ? egDatei.name : "";
    $("egDateiInput").value = "";
  };
  $("btnEingangSenden").onclick = sendeEingang;
  $("egDatum").value = todayISO();
}

async function sendeEingang() {
  const beschreibung = $("egBeschreibung").value.trim();
  if (!beschreibung) { alert("Bitte kurz beschreiben, worum es geht."); return; }
  if (!egDatei) { alert("Bitte den Beleg anhängen (Foto oder PDF)."); return; }

  /* Betrag ist bewusst optional: unterwegs zählt, dass der Beleg gesichert
     ist. Fehlt er, wird er zu Hause beim Übernehmen ergänzt. */
  const betragRoh = $("egBetrag").value.trim();
  if (betragRoh !== "" && !isFinite(parseFloat(betragRoh))) {
    alert("Der Betrag ist keine gültige Zahl."); return;
  }

  const fd = new FormData();
  fd.append("beschreibung", beschreibung);
  fd.append("lieferant", $("egLieferant").value.trim());
  fd.append("datum", $("egDatum").value || "");
  if (betragRoh !== "") fd.append("betrag", betragRoh);
  fd.append("datei", egDatei, egDatei.name);

  $("btnEingangSenden").disabled = true;
  try { await apiFetch("/api/eingang", { method: "POST", body: fd }); }
  catch (e) { alert("Fehler beim Hochladen: " + e.message); return; }
  finally { $("btnEingangSenden").disabled = false; }

  $("egBeschreibung").value = "";
  $("egLieferant").value = "";
  $("egBetrag").value = "";
  $("egDatum").value = todayISO();
  egDatei = null;
  $("egDateiName").textContent = "";
  await ladeEingang();
  alert("✔ Beleg gesichert.");
}

async function ladeEingang() {
  try { egListe = await (await apiFetch("/api/eingang")).json(); }
  catch { egListe = []; }
  renderEingang();
}

function renderEingang() {
  const offene = egListe.filter(p => p.status === "OFFEN");
  const body = $("egListeBody");
  body.innerHTML = "";

  for (const p of [...egListe].reverse()) {
    const erledigt = p.status === "ERLEDIGT";
    const tr = document.createElement("tr");
    if (erledigt) tr.className = "geplant";
    tr.innerHTML =
      `<td>${escapeHtml(p.datum || (p.eingereicht || "").slice(0, 10))}</td>` +
      `<td>${escapeHtml(p.beschreibung)}</td>` +
      `<td>${escapeHtml(p.lieferant || "")}</td>` +
      `<td class="num">${p.betrag == null ? "–" : chf(p.betrag)}</td>` +
      `<td><span class="beleg-link" data-egdatei="${p.id}">📄 ${escapeHtml((p.datei || "").split("/").pop())}</span></td>` +
      `<td>${erledigt ? '<span class="badge nix">übernommen</span>' : '<span class="badge geplant">offen</span>'}</td>` +
      (externerZugang ? "" :
        `<td style="white-space:nowrap">` +
          (erledigt ? "" : `<button class="small ok" data-egbuchen="${p.id}" title="Als Eintrag übernehmen">→ Eintrag</button> `) +
          `<button class="small danger" data-egdel="${p.id}">🗑</button></td>`);
    body.appendChild(tr);
  }

  $("egListeEmpty").classList.toggle("hidden", egListe.length > 0);
  $("tabEingang").textContent = "📥 Eingang" + (offene.length ? " (" + offene.length + ")" : "");
  /* Aktionsspalte nur zu Hause – von unterwegs gibt es nichts zu tun */
  document.querySelectorAll(".eg-aktion").forEach(el => el.classList.toggle("hidden", externerZugang));
}

/* Zu Hause: Eingang-Posten ins Erfassungsformular übernehmen.
   Der Beleg wird als echte Datei nachgeladen, damit er über den normalen
   Speicherweg in Belege/<Jahr>/ landet und dort das übliche Namensschema
   bekommt – der Eingang ist nur die Zwischenablage. */
async function uebernehmeEingang(id) {
  const p = egListe.find(x => x.id === id);
  if (!p) return;
  let file;
  try {
    const r = await apiFetch("/api/eingang/datei/" + encodeURIComponent(id));
    const blob = await r.blob();
    file = new File([blob], (p.datei || "Beleg").split("/").pop(), { type: blob.type });
  } catch (e) { alert("Datei konnte nicht geladen werden: " + e.message); return; }

  resetForm();
  aktiveEingangId = id; // nach resetForm setzen – das nullt es
  $("fDatum").value = p.datum || todayISO();
  $("fBeschreibung").value = p.beschreibung;
  $("fLieferant").value = p.lieferant || "";
  if (p.betrag != null) $("fBetrag").value = p.betrag;
  $("fStatus").value = "OFFEN";
  pendingFiles.push(file);
  renderBelegPreview();
  $("formTitle").textContent = "Beleg aus Eingang übernehmen";
  $("btnAbbrechen").classList.remove("hidden");
  showTab("Erfassen");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loescheEingang(id) {
  const p = egListe.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Eingang «${p.beschreibung}» löschen?\nDie Datei wird mitgelöscht.`)) return;
  try { await apiFetch("/api/eingang/" + encodeURIComponent(id), { method: "DELETE" }); }
  catch (e) { alert("Fehler: " + e.message); return; }
  await ladeEingang();
}

/* Nach dem Speichern eines übernommenen Belegs den Eingang als erledigt
   markieren – sonst taucht derselbe Beleg beim nächsten Mal wieder auf. */
async function markiereEingangErledigt(eintragId) {
  if (!aktiveEingangId) return;
  const id = aktiveEingangId;
  aktiveEingangId = null;
  try {
    await apiFetch("/api/eingang/" + encodeURIComponent(id) + "/erledigt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eintragId: eintragId || "" }),
    });
  } catch { /* nicht kritisch – der Posten bleibt sonst offen stehen */ }
  await ladeEingang();
}

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-egdatei],[data-egbuchen],[data-egdel]");
  if (!el) return;
  if (el.dataset.egdatei) window.open("/api/eingang/datei/" + encodeURIComponent(el.dataset.egdatei), "_blank");
  else if (el.dataset.egbuchen) uebernehmeEingang(el.dataset.egbuchen);
  else if (el.dataset.egdel) loescheEingang(el.dataset.egdel);
});
