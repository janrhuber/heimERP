"use strict";
/* ================= Formular ================= */
function wiederholungChanged() {
  const vorlage = $("fWiederholung").value !== "X";
  $("fEndeWrap").classList.toggle("hidden", !vorlage);
  $("fStatusWrap").classList.toggle("hidden", vorlage);
  document.querySelector('label[for="fDatum"]').textContent = vorlage ? "Nächste Fälligkeit" : "Datum";
}

function initForm() {
  const sel = $("fKategorie");
  KATEGORIEN.forEach((k, i) => {
    const o = document.createElement("option");
    o.value = i; o.textContent = k.name;
    sel.appendChild(o);
  });
  sel.onchange = () => {
    const k = KATEGORIEN[sel.value];
    $("fUnterhalt").value = k.u;
    $("fWert").value = k.w;
    updateAnteilInfo();
  };
  $("fDatum").value = todayISO();
  $("fUnterhalt").oninput = updateAnteilInfo;
  $("fWert").oninput = updateAnteilInfo;
  $("fBetrag").oninput = updateAnteilInfo;
  $("fWiederholung").onchange = wiederholungChanged;
  updateAnteilInfo();
}

function updateAnteilInfo() {
  const b = parseFloat($("fBetrag").value) || 0;
  const u = parseFloat($("fUnterhalt").value) || 0;
  const w = parseFloat($("fWert").value) || 0;
  if (u + w > 100) {
    $("anteilInfo").innerHTML = '<span style="color:var(--red)">⚠ Anteile über 100 %</span>';
    return;
  }
  const rest = 100 - u - w;
  $("anteilInfo").textContent =
    `Abzug ${chf(b*u/100)} · wertvermehrend ${chf(b*w/100)}` + (rest > 0 ? ` · nicht relevant ${chf(b*rest/100)}` : "");
}

function renderBelegPreview() {
  const ul = $("belegPreview");
  ul.innerHTML = "";
  pendingExisting.forEach((p, i) => {
    const li = document.createElement("li");
    const a = document.createElement("span");
    a.className = "beleg-link"; a.textContent = "📄 " + p.split("/").pop();
    a.onclick = () => openReceipt(p);
    const rm = document.createElement("button");
    rm.className = "small danger"; rm.textContent = "×"; rm.title = "Verknüpfung entfernen (Datei bleibt im Ordner)";
    rm.onclick = () => { pendingExisting.splice(i, 1); renderBelegPreview(); };
    li.append(a, rm);
    ul.appendChild(li);
  });
  pendingFiles.forEach((f, i) => {
    const li = document.createElement("li");
    li.textContent = "🆕 " + f.name + " ";
    const rm = document.createElement("button");
    rm.className = "small danger"; rm.textContent = "×";
    rm.onclick = () => { pendingFiles.splice(i, 1); renderBelegPreview(); };
    li.appendChild(rm);
    ul.appendChild(li);
  });
}

async function pickReceipts() {
  if (!dirHandle) { alert("Bitte zuerst den Datenordner verbinden."); return; }
  try {
    const handles = await window.showOpenFilePicker({ multiple: true });
    for (const h of handles) pendingFiles.push(await h.getFile());
    renderBelegPreview();
  } catch (e) { if (e.name !== "AbortError") alert("Fehler: " + e.message); }
}

function resetForm() {
  editId = null;
  editVorlageId = null;
  pendingFiles = []; pendingExisting = [];
  $("formTitle").textContent = "Neue Ausgabe erfassen";
  $("btnAbbrechen").classList.add("hidden");
  $("fDatum").value = todayISO();
  $("fBeschreibung").value = ""; $("fLieferant").value = "";
  $("fBetrag").value = ""; $("fNotizen").value = "";
  $("fProjekt").value = "";
  $("fKategorie").value = 0;
  $("fUnterhalt").value = KATEGORIEN[0].u; $("fWert").value = KATEGORIEN[0].w;
  $("fWiederholung").value = "X";
  $("fWiederholung").disabled = false;
  $("fEnde").value = "";
  $("fStatus").value = "OK";
  wiederholungChanged();
  renderBelegPreview(); updateAnteilInfo();
}

function startEdit(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  resetForm();
  editId = id;
  $("fStatus").value = e.status;
  $("fWiederholung").disabled = true; // Einzeleintrag bleibt Einzeleintrag
  $("formTitle").textContent = "Eintrag bearbeiten";
  $("btnAbbrechen").classList.remove("hidden");
  $("fDatum").value = e.datum;
  $("fBeschreibung").value = e.beschreibung;
  $("fLieferant").value = e.lieferant;
  $("fBetrag").value = e.betrag;
  $("fNotizen").value = e.notizen;
  $("fProjekt").value = e.projekt || "";
  const ki = KATEGORIEN.findIndex(k => k.name === e.kategorie);
  $("fKategorie").value = ki >= 0 ? ki : KATEGORIEN.length - 1;
  $("fUnterhalt").value = e.pUnterhalt;
  $("fWert").value = e.pWert;
  pendingFiles = [];
  pendingExisting = [...e.belege];
  renderBelegPreview(); updateAnteilInfo();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveEntry() {
  if (!dirHandle) { alert("Bitte zuerst den Datenordner verbinden."); return; }
  const datum = $("fDatum").value;
  const beschreibung = $("fBeschreibung").value.trim();
  const betrag = parseFloat($("fBetrag").value);
  const pU = parseFloat($("fUnterhalt").value) || 0;
  const pW = parseFloat($("fWert").value) || 0;
  if (!datum || !beschreibung || !isFinite(betrag) || betrag === 0) {
    alert("Bitte Datum, Beschreibung und Betrag ausfüllen (negativ = Gutschrift)."); return;
  }
  if (pU + pW > 100) { alert("Unterhalt % + wertvermehrend % dürfen zusammen max. 100 % sein."); return; }

  /* --- Vorlage (wiederkehrend) speichern --- */
  if ($("fWiederholung").value !== "X") {
    if (pendingFiles.length) { alert("Belege können erst beim Bestätigen der einzelnen Einträge angehängt werden."); return; }
    const t = {
      id: editVorlageId || uid(),
      aktiv: true,
      intervall: $("fWiederholung").value,
      naechste: datum,
      tag: parseInt(datum.slice(8, 10)),
      ende: $("fEnde").value || "",
      kategorie: KATEGORIEN[$("fKategorie").value].name,
      beschreibung,
      lieferant: $("fLieferant").value.trim(),
      betrag,
      pUnterhalt: pU, pWert: pW,
      notizen: $("fNotizen").value.trim(),
      projekt: $("fProjekt").value.trim(),
    };
    if (editVorlageId) {
      const i = settings.vorlagen.findIndex(x => x.id === editVorlageId);
      t.aktiv = settings.vorlagen[i].aktiv;
      settings.vorlagen[i] = t;
      // noch nicht bestätigte geplante Einträge neu erzeugen
      entries = entries.filter(e => !(e.vorlage === t.id && e.status === "GEPLANT"));
    } else settings.vorlagen.push(t);
    await saveSettings();
    const created = await generateRecurring();
    if (!created) await saveCSV(); // Löschungen trotzdem persistieren
    resetForm();
    renderAll();
    return;
  }

  const jahr = parseInt(datum.slice(0, 4));
  const belege = [...pendingExisting];
  for (const f of pendingFiles) belege.push(await storeReceipt(f, jahr, datum, beschreibung, $("fLieferant").value.trim()));

  const alt = editId ? entries.find(x => x.id === editId) : null;
  const obj = {
    id: editId || uid(),
    datum, jahr,
    kategorie: KATEGORIEN[$("fKategorie").value].name,
    beschreibung,
    lieferant: $("fLieferant").value.trim(),
    betrag,
    pUnterhalt: pU, pWert: pW,
    belege,
    notizen: $("fNotizen").value.trim(),
    status: $("fStatus").value,
    vorlage: alt ? alt.vorlage : "",
    projekt: $("fProjekt").value.trim(),
  };
  if (editId) {
    const i = entries.findIndex(x => x.id === editId);
    entries[i] = obj;
  } else entries.push(obj);
  entries.sort((a, b) => a.datum < b.datum ? -1 : 1);
  await saveCSV();
  resetForm();
  renderAll();
}

async function deleteEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  if (!confirm(`Eintrag «${e.beschreibung}» (${chf(e.betrag)} CHF) löschen?\nBelegdateien bleiben im Ordner erhalten.`)) return;
  entries = entries.filter(x => x.id !== id);
  await saveCSV();
  renderAll();
}

/* ================= Rendering ================= */
function statusBadge(e) {
  const rest = 100 - e.pUnterhalt - e.pWert;
  if (e.pUnterhalt === 100) return '<span class="badge unterhalt">abzugsfähig</span>';
  if (e.pWert === 100) return '<span class="badge wert">wertvermehrend</span>';
  if (e.pUnterhalt === 0 && e.pWert === 0) return '<span class="badge nix">nicht relevant</span>';
  return '<span class="badge gemischt">gemischt' + (rest > 0 ? " *" : "") + "</span>";
}

function belegLinks(e) {
  return e.belege.map(p =>
    `<span class="beleg-link" data-beleg="${p.replace(/"/g, "&quot;")}">📄 ${p.split("/").pop()}</span>`
  ).join("");
}

function renderList() {
  const jahrF = $("filterJahr").value;
  const statusF = $("filterStatus").value;
  const steuerF = $("filterSteuer").value;
  const katF = $("filterKategorie").value;
  const projF = $("filterProjekt").value;
  const txt = $("filterText").value.toLowerCase();
  const body = $("listBody");
  body.innerHTML = "";
  let shown = 0, sumB = 0, sumU = 0, sumW = 0, sumGeplant = 0;
  for (const e of [...entries].reverse()) {
    if (jahrF && String(e.jahr) !== jahrF) continue;
    if (statusF && e.status !== statusF) continue;
    if (katF && e.kategorie !== katF) continue;
    if (projF === "-" && e.projekt) continue;
    if (projF && projF !== "-" && e.projekt !== projF) continue;
    if (steuerF === "U" && !(e.pUnterhalt > 0)) continue;
    if (steuerF === "W" && !(e.pWert > 0)) continue;
    if (steuerF === "G" && !(e.pUnterhalt > 0 && e.pWert > 0)) continue;
    if (steuerF === "N" && (e.pUnterhalt > 0 || e.pWert > 0)) continue;
    if (txt && !(e.beschreibung + " " + e.lieferant + " " + e.notizen + " " + e.kategorie + " " + (e.projekt || "")).toLowerCase().includes(txt)) continue;
    shown++;
    sumB += e.betrag;
    sumU += e.betrag * e.pUnterhalt / 100;
    sumW += e.betrag * e.pWert / 100;
    if (e.status === "GEPLANT") sumGeplant++;
    const geplant = e.status === "GEPLANT";
    const tr = document.createElement("tr");
    if (geplant) tr.className = "geplant";
    tr.innerHTML =
      `<td>${e.datum}${geplant ? '<br><span class="badge geplant">geplant</span>' : ""}</td>` +
      `<td>${escapeHtml(e.beschreibung)}` +
        `${e.projekt ? '<br><span class="muted">📁 ' + escapeHtml(e.projekt) + "</span>" : ""}` +
        `${e.notizen ? '<br><span class="muted">' + escapeHtml(e.notizen) + "</span>" : ""}</td>` +
      `<td>${escapeHtml(e.lieferant)}</td>` +
      `<td class="muted">${escapeHtml(e.kategorie)}</td>` +
      `<td class="num">${chf(e.betrag)}</td>` +
      `<td class="num">${e.pUnterhalt} %</td>` +
      `<td class="num">${e.pWert} %</td>` +
      `<td>${statusBadge(e)}</td>` +
      `<td>${belegLinks(e)}</td>` +
      `<td class="no-print" style="white-space:nowrap">` +
        (geplant ? `<button class="small ok" data-ok="${e.id}" title="Eintrag bestätigen">✔</button> ` : "") +
        `<button class="small" data-edit="${e.id}">✏️</button> ` +
        `<button class="small danger" data-del="${e.id}">🗑</button></td>`;
    body.appendChild(tr);
  }
  $("emptyMsg").classList.toggle("hidden", shown > 0);
  $("emptyMsg").textContent = entries.length ? "Keine Einträge für diesen Filter." : "Noch keine Einträge.";
  $("listSummary").textContent = shown
    ? `${shown} Einträge · Total CHF ${chf(sumB)} · Abzug Unterhalt CHF ${chf(sumU)} · wertvermehrend CHF ${chf(sumW)}` +
      (sumGeplant ? ` · davon ${sumGeplant} geplant (in Auswertungen nicht gezählt)` : "")
    : "";
}

/* Kategorie- und Projekt-Filter füllen (Auswahl bleibt erhalten) */
function fillFilterSelects() {
  const kats = KATEGORIEN.map(k => k.name);
  for (const e of entries) if (e.kategorie && !kats.includes(e.kategorie)) kats.push(e.kategorie);
  const selK = $("filterKategorie");
  const prevK = selK.value;
  selK.innerHTML = '<option value="">Alle</option>';
  kats.forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    selK.appendChild(o);
  });
  if (prevK && [...selK.options].some(o => o.value === prevK)) selK.value = prevK;

  const projs = new Set(Object.keys(settings.projektBudgets));
  entries.forEach(e => { if (e.projekt) projs.add(e.projekt); });
  const selP = $("filterProjekt");
  const prevP = selP.value;
  selP.innerHTML = '<option value="">Alle</option><option value="-">(ohne Projekt)</option>';
  [...projs].sort().forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = "📁 " + n;
    selP.appendChild(o);
  });
  if (prevP && [...selP.options].some(o => o.value === prevP)) selP.value = prevP;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fillYearSelects() {
  const years = [...new Set(entries.map(e => e.jahr))].sort((a, b) => b - a);
  const cur = new Date().getFullYear();
  if (!years.includes(cur)) years.unshift(cur);
  for (const [selId, keepAll] of [["filterJahr", true], ["jahrSelect", false], ["budgetJahr", false]]) {
    const sel = $(selId);
    const prev = sel.value;
    sel.innerHTML = keepAll ? '<option value="">Alle Jahre</option>' : "";
    years.forEach(y => {
      const o = document.createElement("option");
      o.value = y; o.textContent = y;
      sel.appendChild(o);
    });
    if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  }
}

function renderJahr() {
  const jahr = $("jahrSelect").value;
  $("jahrTitel").textContent = "Jahresrechnung " + jahr + " – Liegenschaftskosten (Kanton Aargau)";
  $("emw").value = settings.eigenmietwert[jahr] ?? "";
  $("pauschalSatz").value = settings.pauschalSatz[jahr] ?? "20";

  geplantHint(entries.filter(e => String(e.jahr) === jahr && e.status === "GEPLANT"), "jahrGeplantHint");
  const list = entries.filter(e => String(e.jahr) === jahr && e.status !== "GEPLANT");
  let total = 0, unterhalt = 0, wert = 0;
  const body = $("jahrBody");
  body.innerHTML = "";
  for (const e of list) {
    total += e.betrag;
    unterhalt += e.betrag * e.pUnterhalt / 100;
    wert += e.betrag * e.pWert / 100;
    if (e.pUnterhalt > 0) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td>${e.datum}</td><td>${escapeHtml(e.beschreibung)}</td><td>${escapeHtml(e.lieferant)}</td>` +
        `<td class="num">${chf(e.betrag)}</td><td class="num">${e.pUnterhalt} %</td>` +
        `<td class="num"><b>${chf(e.betrag * e.pUnterhalt / 100)}</b></td>` +
        `<td>${belegLinks(e)}</td>`;
      body.appendChild(tr);
    }
  }
  $("kTotal").textContent = chf(total);
  $("kUnterhalt").textContent = chf(unterhalt);
  $("kWert").textContent = chf(wert);
  $("kNix").textContent = chf(total - unterhalt - wert);
  $("jahrTotal").textContent = chf(unterhalt);

  const hypo = list.filter(e => e.kategorie === "Hypothekarzinsen").reduce((s, e) => s + e.betrag, 0);
  $("hypoInfo").classList.toggle("hidden", hypo <= 0);
  if (hypo > 0) $("hypoInfo").textContent =
    `Nachrichtlich: Hypothekarzinsen CHF ${chf(hypo)} – nicht im Liegenschaftsunterhalt enthalten, ` +
    `aber in der Steuererklärung separat als Schuldzinsen abziehbar.`;

  const emw = parseFloat($("emw").value) || 0;
  const satz = parseInt($("pauschalSatz").value);
  const box = $("pauschaleBox");
  if (emw > 0) {
    const pausch = emw * satz / 100;
    const besser = unterhalt > pausch ? "effektive Kosten" : "Pauschalabzug";
    box.classList.remove("hidden");
    box.innerHTML =
      `<b>Vergleich effektiv vs. Pauschale:</b> effektive Unterhaltskosten <b>CHF ${chf(unterhalt)}</b> · ` +
      `Pauschalabzug (${satz} % von CHF ${chf(emw)}) = <b>CHF ${chf(pausch)}</b><br>` +
      `→ Für ${jahr} ist der Abzug der <b>${besser}</b> vorteilhafter ` +
      `(Differenz CHF ${chf(Math.abs(unterhalt - pausch))}). Die Wahl kann jedes Jahr neu getroffen werden.`;
  } else box.classList.add("hidden");
}

function renderVerkauf() {
  geplantHint(entries.filter(e => e.pWert > 0 && e.status === "GEPLANT"), "verkaufGeplantHint");
  const body = $("verkaufBody");
  body.innerHTML = "";
  let total = 0;
  for (const e of entries) {
    if (e.pWert <= 0 || e.status === "GEPLANT") continue;
    const v = e.betrag * e.pWert / 100;
    total += v;
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${e.datum}</td><td>${escapeHtml(e.beschreibung)}</td><td>${escapeHtml(e.lieferant)}</td>` +
      `<td class="num">${chf(e.betrag)}</td><td class="num">${e.pWert} %</td>` +
      `<td class="num"><b>${chf(v)}</b></td><td>${belegLinks(e)}</td>`;
    body.appendChild(tr);
  }
  $("verkaufTotal").textContent = chf(total);
}

/* ================= Rendering: Budget ================= */
function barHtml(spent, budget) {
  if (!(budget > 0)) return "";
  const pct = spent / budget * 100;
  const cls = pct > 100 ? "over" : pct > 90 ? "warn" : "";
  return `<div class="bar" title="${Math.round(pct)} %"><i class="${cls}" style="width:${Math.min(100, pct)}%"></i></div>`;
}

function budgetSums(filterFn) {
  let ist = 0, gep = 0;
  for (const e of entries) {
    if (!filterFn(e)) continue;
    if (e.status === "GEPLANT") gep += e.betrag; else ist += e.betrag;
  }
  return { ist, gep };
}

function updateProjektliste() {
  const names = new Set(Object.keys(settings.projektBudgets));
  entries.forEach(e => { if (e.projekt) names.add(e.projekt); });
  const dl = $("projektListe");
  dl.innerHTML = "";
  [...names].sort().forEach(n => {
    const o = document.createElement("option");
    o.value = n;
    dl.appendChild(o);
  });
  return [...names].sort();
}

function renderBudget() {
  const jahr = $("budgetJahr").value;
  $("budgetTitel").textContent = "Budget & Ausgabenplanung " + jahr;
  const bud = settings.budgets[jahr] = settings.budgets[jahr] || {};

  // Kategorien: Standardliste + alles, was in Einträgen/Budget des Jahres vorkommt
  const names = KATEGORIEN.map(k => k.name);
  for (const e of entries) if (String(e.jahr) === jahr && !names.includes(e.kategorie)) names.push(e.kategorie);
  for (const n of Object.keys(bud)) if (!names.includes(n)) names.push(n);

  const body = $("budgetKatBody");
  body.innerHTML = "";
  let tB = 0, tI = 0, tG = 0;
  for (const name of names) {
    const { ist, gep } = budgetSums(e => String(e.jahr) === jahr && e.kategorie === name);
    const b = parseFloat(bud[name]) || 0;
    tB += b; tI += ist; tG += gep;
    const prognose = ist + gep;
    const rest = b - prognose;
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${escapeHtml(name)}</td>` +
      `<td class="num"><input class="mini" type="number" step="50" min="0" data-bcat="${escapeHtml(name).replace(/"/g, "&quot;")}" value="${bud[name] ?? ""}" placeholder="–"></td>` +
      `<td class="num">${ist ? chf(ist) : '<span class="muted">–</span>'}</td>` +
      `<td class="num">${gep ? chf(gep) : '<span class="muted">–</span>'}</td>` +
      `<td class="num">${prognose ? chf(prognose) : '<span class="muted">–</span>'}</td>` +
      `<td class="num${b > 0 && rest < 0 ? " negativ" : ""}">${b > 0 ? chf(rest) : '<span class="muted">–</span>'}</td>` +
      `<td>${barHtml(prognose, b)}</td>`;
    body.appendChild(tr);
  }
  const tRest = tB - tI - tG;
  $("budgetKatFoot").innerHTML =
    `<th>Total</th><th class="num">${chf(tB)}</th><th class="num">${chf(tI)}</th>` +
    `<th class="num">${chf(tG)}</th><th class="num">${chf(tI + tG)}</th>` +
    `<th class="num"${tRest < 0 ? ' style="color:var(--red)"' : ""}>${chf(tRest)}</th><th>${barHtml(tI + tG, tB)}</th>`;

  $("kBudget").textContent = chf(tB);
  $("kBudgetIst").textContent = chf(tI);
  $("kBudgetGeplant").textContent = chf(tG);
  $("kBudgetPrognose").textContent = chf(tI + tG);
  $("kBudgetRest").textContent = chf(tRest);
  $("kBudgetRest").style.color = tRest < 0 ? "var(--red)" : "";

  // Projekte (über alle Jahre)
  const projNames = updateProjektliste();
  const pbody = $("projektBody");
  pbody.innerHTML = "";
  for (const name of projNames) {
    const { ist, gep } = budgetSums(e => e.projekt === name);
    const b = parseFloat(settings.projektBudgets[name]) || 0;
    const rest = b - ist - gep;
    const unbenutzt = !ist && !gep; // Projekt ohne Buchungen darf entfernt werden
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>📁 ${escapeHtml(name)}</td>` +
      `<td class="num"><input class="mini" type="number" step="500" min="0" data-bproj="${escapeHtml(name).replace(/"/g, "&quot;")}" value="${settings.projektBudgets[name] ?? ""}" placeholder="–"></td>` +
      `<td class="num">${ist ? chf(ist) : '<span class="muted">–</span>'}</td>` +
      `<td class="num">${gep ? chf(gep) : '<span class="muted">–</span>'}</td>` +
      `<td class="num${b > 0 && rest < 0 ? " negativ" : ""}">${b > 0 ? chf(rest) : '<span class="muted">–</span>'}</td>` +
      `<td>${barHtml(ist + gep, b)}</td>` +
      `<td class="no-print">${unbenutzt ? `<button class="small danger" data-pdel="${escapeHtml(name).replace(/"/g, "&quot;")}">🗑</button>` : ""}</td>`;
    pbody.appendChild(tr);
  }
  if (!projNames.length) pbody.innerHTML = '<tr><td colspan="7" class="muted">Noch keine Projekte – unten anlegen oder beim Erfassen ein Projekt eintragen.</td></tr>';
}

function renderAll() {
  fillYearSelects();
  fillFilterSelects();
  renderVorlagen();
  renderList();
  renderJahr();
  renderVerkauf();
  renderBudget();
}

/* ================= Tabs & Events ================= */
function showTab(name) {
  for (const t of ["Erfassen", "Jahr", "Budget", "Verkauf"]) {
    $("view" + t).classList.toggle("hidden", t !== name);
    $("tab" + t).classList.toggle("active", t === name);
  }
}

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-beleg],[data-edit],[data-del],[data-ok],[data-vedit],[data-vdel],[data-pdel]");
  if (!el) return;
  if (el.dataset.beleg) openReceipt(el.dataset.beleg);
  else if (el.dataset.edit) startEdit(el.dataset.edit);
  else if (el.dataset.del) deleteEntry(el.dataset.del);
  else if (el.dataset.ok) confirmEntry(el.dataset.ok);
  else if (el.dataset.vedit) startEditVorlage(el.dataset.vedit);
  else if (el.dataset.vdel) deleteVorlage(el.dataset.vdel);
  else if (el.dataset.pdel) {
    delete settings.projektBudgets[el.dataset.pdel];
    saveSettings().then(renderBudget);
  }
});

document.addEventListener("change", ev => {
  const d = ev.target.dataset || {};
  if (d.vaktiv) toggleVorlage(d.vaktiv, ev.target.checked);
  else if (d.bcat !== undefined) {
    const bud = settings.budgets[$("budgetJahr").value] = settings.budgets[$("budgetJahr").value] || {};
    if (ev.target.value === "") delete bud[d.bcat]; else bud[d.bcat] = ev.target.value;
    saveSettings().then(renderBudget);
  } else if (d.bproj !== undefined) {
    if (ev.target.value === "") delete settings.projektBudgets[d.bproj];
    else settings.projektBudgets[d.bproj] = ev.target.value;
    saveSettings().then(renderBudget);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  if (!window.showDirectoryPicker) {
    $("startHint").innerHTML = "<b>⚠ Browser nicht unterstützt.</b> Bitte diese Datei mit <b>Microsoft Edge</b> oder <b>Google Chrome</b> öffnen (Firefox unterstützt den lokalen Dateizugriff nicht).";
    $("btnFolder").disabled = true;
    return;
  }
  initForm();
  $("btnFolder").onclick = chooseFolder;
  $("btnSpeichern").onclick = saveEntry;
  $("btnAbbrechen").onclick = () => { resetForm(); };
  $("btnBeleg").onclick = pickReceipts;
  $("filterJahr").onchange = renderList;
  $("filterStatus").onchange = renderList;
  $("filterSteuer").onchange = renderList;
  $("filterKategorie").onchange = renderList;
  $("filterProjekt").onchange = renderList;
  $("filterText").oninput = renderList;
  $("tabErfassen").onclick = () => showTab("Erfassen");
  $("tabJahr").onclick = () => { showTab("Jahr"); renderJahr(); };
  $("tabBudget").onclick = () => { showTab("Budget"); renderBudget(); };
  $("tabVerkauf").onclick = () => { showTab("Verkauf"); renderVerkauf(); };
  $("jahrSelect").onchange = renderJahr;
  $("budgetJahr").onchange = renderBudget;
  $("btnPrintBudget").onclick = () => window.print();
  $("btnNeuProjekt").onclick = async () => {
    const name = $("neuProjekt").value.trim();
    if (!name) return;
    if (!(name in settings.projektBudgets)) settings.projektBudgets[name] = "";
    $("neuProjekt").value = "";
    await saveSettings();
    renderBudget();
  };
  $("emw").onchange = async () => {
    settings.eigenmietwert[$("jahrSelect").value] = parseFloat($("emw").value) || 0;
    await saveSettings(); renderJahr();
  };
  $("pauschalSatz").onchange = async () => {
    settings.pauschalSatz[$("jahrSelect").value] = $("pauschalSatz").value;
    await saveSettings(); renderJahr();
  };
  $("btnPrintJahr").onclick = () => window.print();
  $("btnPrintVerkauf").onclick = () => window.print();
  $("btnExcel").onclick = () => alert(
    "Die Daten liegen als «" + CSV_NAME + "» im Datenordner.\n\n" +
    "• Trennzeichen: Semikolon (Schweizer Excel öffnet sie per Doppelklick korrekt)\n" +
    "• Belege liegen unter Belege\\<Jahr>\\ und sind in der Spalte «Belege» verlinkt\n\n" +
    "Tipp: Excel-Änderungen nur bei geschlossenem heimERP machen und danach hier neu verbinden."
  );
  tryReconnect();
});
