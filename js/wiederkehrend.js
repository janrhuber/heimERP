"use strict";
/* ================= Wiederkehrende Ausgaben ================= */
function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); } // m = 1-12

function addMonthsISO(iso, months, tag) {
  let y = parseInt(iso.slice(0, 4)), m = parseInt(iso.slice(5, 7)), d = parseInt(iso.slice(8, 10));
  m += months;
  y += Math.floor((m - 1) / 12);
  m = ((m - 1) % 12) + 1;
  d = Math.min(tag || d, daysInMonth(y, m));
  return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}

/* Erzeugt fällige Ausgaben bis Ende des laufenden Jahres als «geplant» */
async function generateRecurring() {
  if (!dirHandle) return 0;
  const horizon = new Date().getFullYear() + "-12-31";
  let created = 0, guard = 0;
  for (const t of settings.vorlagen) {
    if (!t.aktiv) continue;
    while (t.naechste && t.naechste <= horizon && (!t.ende || t.naechste <= t.ende) && guard++ < 1000) {
      entries.push({
        id: uid(), datum: t.naechste, jahr: parseInt(t.naechste.slice(0, 4)),
        kategorie: t.kategorie, beschreibung: t.beschreibung, lieferant: t.lieferant,
        betrag: t.betrag, pUnterhalt: t.pUnterhalt, pWert: t.pWert,
        belege: [], notizen: t.notizen, status: "GEPLANT", vorlage: t.id, projekt: t.projekt || "",
      });
      t.naechste = addMonthsISO(t.naechste, INTERVALLE[t.intervall] ? INTERVALLE[t.intervall][1] : 12, t.tag);
      created++;
    }
  }
  if (created) {
    entries.sort((a, b) => a.datum < b.datum ? -1 : 1);
    await saveCSV();
    await saveSettings();
  }
  return created;
}

function renderVorlagen() {
  const body = $("vorlagenBody");
  body.innerHTML = "";
  for (const t of settings.vorlagen) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td><input type="checkbox" style="width:auto" data-vaktiv="${t.id}" ${t.aktiv ? "checked" : ""} title="aktiv / pausiert"></td>` +
      `<td>${escapeHtml(t.beschreibung)}<br><span class="muted">${escapeHtml(t.kategorie)}</span></td>` +
      `<td>${escapeHtml(t.lieferant)}</td>` +
      `<td class="num">${chf(t.betrag)}</td>` +
      `<td class="num">${t.pUnterhalt} %</td>` +
      `<td class="num">${t.pWert} %</td>` +
      `<td>${INTERVALLE[t.intervall] ? INTERVALLE[t.intervall][0] : t.intervall}</td>` +
      `<td>${t.aktiv ? (t.naechste || "–") : '<span class="muted">pausiert</span>'}</td>` +
      `<td>${t.ende || "–"}</td>` +
      `<td style="white-space:nowrap"><button class="small" data-vedit="${t.id}">✏️</button> ` +
      `<button class="small danger" data-vdel="${t.id}">🗑</button></td>`;
    body.appendChild(tr);
  }
  $("vorlagenEmpty").classList.toggle("hidden", settings.vorlagen.length > 0);
}

function startEditVorlage(id) {
  const t = settings.vorlagen.find(x => x.id === id);
  if (!t) return;
  resetForm();
  editVorlageId = id;
  $("formTitle").textContent = "Vorlage bearbeiten";
  $("btnAbbrechen").classList.remove("hidden");
  $("fDatum").value = t.naechste || todayISO();
  $("fBeschreibung").value = t.beschreibung;
  $("fLieferant").value = t.lieferant;
  $("fBetrag").value = t.betrag;
  $("fNotizen").value = t.notizen;
  const ki = KATEGORIEN.findIndex(k => k.name === t.kategorie);
  $("fKategorie").value = ki >= 0 ? ki : KATEGORIEN.length - 1;
  $("fUnterhalt").value = t.pUnterhalt;
  $("fWert").value = t.pWert;
  $("fProjekt").value = t.projekt || "";
  $("fWiederholung").value = t.intervall;
  $("fEnde").value = t.ende || "";
  wiederholungChanged();
  updateAnteilInfo();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteVorlage(id) {
  const t = settings.vorlagen.find(x => x.id === id);
  if (!t) return;
  const geplante = entries.filter(e => e.vorlage === id && e.status === "GEPLANT").length;
  if (!confirm(`Vorlage «${t.beschreibung}» löschen?\n` +
      (geplante ? geplante + " noch nicht bestätigte geplante Einträge werden mitgelöscht.\n" : "") +
      "Bereits bestätigte Einträge bleiben erhalten.")) return;
  settings.vorlagen = settings.vorlagen.filter(x => x.id !== id);
  entries = entries.filter(e => !(e.vorlage === id && e.status === "GEPLANT"));
  await saveSettings();
  await saveCSV();
  renderAll();
}

async function toggleVorlage(id, aktiv) {
  const t = settings.vorlagen.find(x => x.id === id);
  if (!t) return;
  t.aktiv = aktiv;
  await saveSettings();
  if (aktiv) await generateRecurring();
  renderAll();
}

async function confirmEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e || e.status !== "GEPLANT") return;
  e.status = "OK";
  await saveCSV();
  renderAll();
}

function geplantHint(list, elId) {
  const el = $(elId);
  if (!list.length) { el.classList.add("hidden"); return; }
  const sum = list.reduce((s, e) => s + e.betrag, 0);
  el.classList.remove("hidden");
  el.textContent = `ℹ Enthält nur bestätigte Einträge. ${list.length} geplante Einträge ` +
    `(CHF ${chf(sum)}) sind noch nicht berücksichtigt – in der Liste mit ✔ bestätigen.`;
}

async function saveCSV() {
  await writeFileText(CSV_NAME, toCSV());
  setStatus("✔ Gespeichert: " + dirHandle.name + " (" + entries.length + " Einträge)", "ok");
}

async function saveSettings() {
  await writeFileText(SETTINGS_NAME, JSON.stringify(settings, null, 2));
}

/* Beleg in Belege/<Jahr>/ kopieren, gibt relativen Pfad zurück */
async function storeReceipt(file, jahr, beschreibung) {
  const belegRoot = await dirHandle.getDirectoryHandle(BELEG_DIR, { create: true });
  const yearDir = await belegRoot.getDirectoryHandle(String(jahr), { create: true });
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot) : "";
  let base = sanitizeFilename(beschreibung) + "_" + sanitizeFilename(file.name.slice(0, dot >= 0 ? dot : undefined));
  let name = base + ext, n = 1;
  while (true) {
    try { await yearDir.getFileHandle(name); name = base + "_" + (++n) + ext; }
    catch { break; }
  }
  const fh = await yearDir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(file);
  await w.close();
  return BELEG_DIR + "/" + jahr + "/" + name;
}

async function openReceipt(relPath) {
  try {
    const parts = relPath.split("/");
    let dh = dirHandle;
    for (let i = 0; i < parts.length - 1; i++) dh = await dh.getDirectoryHandle(parts[i]);
    const fh = await dh.getFileHandle(parts[parts.length - 1]);
    const file = await fh.getFile();
    window.open(URL.createObjectURL(file), "_blank");
  } catch {
    alert("Beleg nicht gefunden:\n" + relPath + "\n\nWurde die Datei verschoben oder umbenannt?");
  }
}
