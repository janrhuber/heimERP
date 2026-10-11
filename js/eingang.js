"use strict";
/* ================= Eingang: Belege von unterwegs =================
   Hochgeladen wird auf der eigenen Seite hochladen.html (von aussen die
   einzige). Hier, zu Hause, wird abgearbeitet: ansehen, als Eintrag
   übernehmen, löschen. Jede Datei kommt als eigener Posten an; was
   zusammengehört (z. B. zwei Seiten einer Rechnung), wird hier ausgewählt
   und als EIN Eintrag übernommen. */

let egListe = [];             // zuletzt geladene Eingang-Posten
const egAuswahl = new Set();  // angehakte Posten für die Sammelübernahme

function initEingangUI() {
  $("btnSammelBuchen").onclick = () => uebernehmeEingang([...egAuswahl]);
  $("btnSammelAufheben").onclick = () => {
    egAuswahl.clear();
    for (const c of document.querySelectorAll("[data-egwahl]")) c.checked = false;
    zeigeAuswahl();
  };
}

async function ladeEingang() {
  try { egListe = await (await apiFetch("/api/eingang")).json(); }
  catch { egListe = []; }
  renderEingang();
}

const egDatum = p => p.datum || (p.eingereicht || "").slice(0, 10);

function renderEingang() {
  const nachEingang = (x, y) => String(x.eingereicht).localeCompare(String(y.eingereicht));
  /* Arbeitsliste: was am längsten liegt, zuerst. Erledigte: neueste zuerst. */
  const offene = egListe.filter(p => p.status === "OFFEN").sort(nachEingang);
  const erledigte = egListe.filter(p => p.status === "ERLEDIGT").sort(nachEingang).reverse();

  /* Auswahl überlebt das Neuladen, aber nur für Posten, die noch offen sind */
  for (const id of [...egAuswahl]) if (!offene.some(p => p.id === id)) egAuswahl.delete(id);

  const karten = $("egKarten");
  karten.innerHTML = "";
  for (const p of offene) karten.appendChild(egKarte(p, offene.length > 1));
  $("egListeEmpty").classList.toggle("hidden", offene.length > 0);
  $("egSammelHinweis").classList.toggle("hidden", offene.length < 2);
  $("egAnzahl").textContent = offene.length ? "(" + offene.length + ")" : "";
  $("tabEingang").textContent = "📥 Eingang" + (offene.length ? " (" + offene.length + ")" : "");
  zeigeAuswahl();

  const eb = $("egErledigtBody");
  eb.innerHTML = "";
  for (const p of erledigte.slice(0, 50)) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${escapeHtml(egDatum(p))}</td>` +
      `<td>${escapeHtml(p.beschreibung || "")}</td>` +
      `<td>${escapeHtml(p.lieferant || "")}</td>` +
      `<td class="num">${p.betrag == null ? "–" : chf(p.betrag)}</td>` +
      `<td><button class="small danger" data-egdel="${p.id}" title="Aus dem Eingang entfernen">🗑</button></td>`;
    eb.appendChild(tr);
  }
  $("egErledigtAnzahl").textContent = erledigte.length;
  $("egErledigtWrap").classList.toggle("hidden", erledigte.length === 0);
}

function zeigeAuswahl() {
  const n = egAuswahl.size;
  $("egSammel").classList.toggle("hidden", n < 2);
  $("egSammelText").textContent = n + " Belege ausgewählt";
  for (const k of document.querySelectorAll(".eg-karte")) k.classList.toggle("gewaehlt", egAuswahl.has(k.dataset.id));
}

function egKarte(p, waehlbar) {
  const el = document.createElement("article");
  el.className = "eg-karte";
  el.dataset.id = p.id;
  const datei = (p.datei || "").split("/").pop();
  const istBild = /\.(jpe?g|png|webp)$/i.test(datei);
  const endung = (datei.split(".").pop() || "").toUpperCase();
  const vorschau = istBild
    ? `<img loading="lazy" alt="Beleg ${escapeHtml(p.beschreibung || "")}" src="/api/eingang/datei/${encodeURIComponent(p.id)}">`
    : `<span>📄 ${escapeHtml(endung)}</span>`;

  el.innerHTML =
    `<button class="eg-bild" data-egdatei="${p.id}" title="Beleg gross anzeigen">${vorschau}</button>` +
    `<div>` +
      `<div class="eg-kopf"><strong>${escapeHtml(p.beschreibung || "Ohne Beschreibung")}</strong>` +
        `<span class="muted">${escapeHtml(egDatum(p))}</span></div>` +
      (p.lieferant ? `<div class="eg-text">${escapeHtml(p.lieferant)}</div>` : "") +
      (p.betrag == null
        ? `<div class="eg-betrag fehlt">Betrag nicht angegeben – steht auf dem Beleg</div>`
        : `<div class="eg-betrag">CHF ${chf(p.betrag)}</div>`) +
      `<div class="eg-aktionen">` +
        `<button class="small ok" data-egbuchen="${p.id}">Als Eintrag übernehmen</button>` +
        `<button class="small danger" data-egdel="${p.id}">Löschen</button>` +
        (waehlbar
          ? `<label class="eg-wahl"><input type="checkbox" data-egwahl="${p.id}"${egAuswahl.has(p.id) ? " checked" : ""}> auswählen</label>`
          : "") +
      `</div>` +
    `</div>`;
  return el;
}

/* Eingang-Posten ins Erfassungsformular übernehmen – einen oder mehrere als
   EINEN Eintrag. Die Belege werden als echte Dateien nachgeladen, damit sie
   über den normalen Speicherweg in Belege/<Jahr>/ landen und dort das übliche
   Namensschema bekommen – der Eingang ist nur die Zwischenablage. */
async function uebernehmeEingang(ids) {
  const posten = egListe.filter(x => ids.includes(x.id))
    .sort((x, y) => String(x.eingereicht).localeCompare(String(y.eingereicht)));
  if (!posten.length) return;

  const files = [];
  try {
    for (const x of posten) {
      const r = await apiFetch("/api/eingang/datei/" + encodeURIComponent(x.id));
      const blob = await r.blob();
      files.push(new File([blob], (x.datei || "Beleg").split("/").pop(), { type: blob.type }));
    }
  } catch (e) { alert("Datei konnte nicht geladen werden: " + e.message); return; }

  /* Angaben zusammenführen: Beträge addieren, Texte ohne Wiederholung,
     frühestes Datum (das Rechnungsdatum steht auf der ersten Seite) */
  const einmal = liste => [...new Set(liste.filter(Boolean))];
  const betraege = posten.map(x => x.betrag).filter(b => b != null);
  const betrag = betraege.length ? Math.round(betraege.reduce((s, b) => s + b, 0) * 100) / 100 : null;
  const daten = posten.map(x => x.datum).filter(Boolean).sort();

  resetForm();
  aktiveEingangIds = posten.map(x => x.id); // nach resetForm setzen – das nullt es
  $("fDatum").value = daten[0] || todayISO();
  $("fBeschreibung").value = einmal(posten.map(x => x.beschreibung)).join(", ");
  $("fLieferant").value = einmal(posten.map(x => x.lieferant)).join(", ");
  if (betrag != null) $("fBetrag").value = betrag;
  $("fStatus").value = "OFFEN";
  pendingFiles.push(...files);
  renderBelegPreview();
  $("formTitle").textContent = posten.length > 1
    ? posten.length + " Belege aus dem Eingang als einen Eintrag übernehmen"
    : "Beleg aus Eingang übernehmen";
  $("btnAbbrechen").classList.remove("hidden");
  egAuswahl.clear();
  zeigeAuswahl();
  showTab("Erfassen");
  $("formTitle").scrollIntoView({ behavior: "smooth", block: "start" });
  ($("fBeschreibung").value ? (betrag == null ? $("fBetrag") : null) : $("fBeschreibung"))?.focus();
}

async function loescheEingang(id) {
  const p = egListe.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Beleg «${p.beschreibung || "ohne Beschreibung"}» aus dem Eingang löschen?\nDie Datei im Eingang wird mitgelöscht.`)) return;
  try { await apiFetch("/api/eingang/" + encodeURIComponent(id), { method: "DELETE" }); }
  catch (e) { alert("Fehler: " + e.message); return; }
  await ladeEingang();
}

/* Nach dem Speichern eines übernommenen Eintrags die Posten als erledigt
   markieren – sonst tauchen dieselben Belege beim nächsten Mal wieder auf. */
async function markiereEingangErledigt(eintragId) {
  if (!aktiveEingangIds) return;
  const ids = aktiveEingangIds;
  aktiveEingangIds = null;
  try {
    for (const id of ids) {
      await apiFetch("/api/eingang/" + encodeURIComponent(id) + "/erledigt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eintragId: eintragId || "" }),
      });
    }
  } catch { /* nicht kritisch – der Posten bleibt sonst offen stehen */ }
  await ladeEingang();
}

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-egdatei],[data-egbuchen],[data-egdel]");
  if (!el) return;
  if (el.dataset.egdatei) window.open("/api/eingang/datei/" + encodeURIComponent(el.dataset.egdatei), "_blank");
  else if (el.dataset.egbuchen) uebernehmeEingang([el.dataset.egbuchen]);
  else if (el.dataset.egdel) loescheEingang(el.dataset.egdel);
});

document.addEventListener("change", ev => {
  const id = ev.target.dataset && ev.target.dataset.egwahl;
  if (!id) return;
  if (ev.target.checked) egAuswahl.add(id); else egAuswahl.delete(id);
  zeigeAuswahl();
});
