"use strict";
/* ================= Konstanten ================= */
const CSV_NAME = "ausgaben.csv";
const SETTINGS_NAME = "einstellungen.json";
const BELEG_DIR = "Belege";
const CSV_HEADER = ["ID","Datum","Jahr","Kategorie","Beschreibung","Lieferant","Betrag_CHF",
                    "Anteil_Unterhalt_Prozent","Anteil_Wertvermehrend_Prozent","Belege","Notizen","Status","VorlageID","Projekt"];

const INTERVALLE = { M: ["monatlich", 1], Q: ["vierteljährlich", 3], H: ["halbjährlich", 6], J: ["jährlich", 12] };

const KATEGORIEN = [
  { name: "Unterhalt / Reparatur",        u: 100, w: 0   },
  { name: "Ersatz gleichwertig (z. B. Heizung, Küche)", u: 100, w: 0 },
  { name: "Energiesparmassnahme",         u: 100, w: 0   },
  { name: "Renovation gemischt",          u: 50,  w: 50  },
  { name: "Neubau / Ausbau / Komfort (wertvermehrend)", u: 0, w: 100 },
  { name: "Garten / Umgebung",            u: 100, w: 0   },
  { name: "Versicherungen / Gebühren Liegenschaft", u: 100, w: 0 },
  { name: "Verwaltungskosten",            u: 100, w: 0   },
  { name: "Kauf-/Verkaufsnebenkosten",    u: 0,   w: 100 },
  { name: "Hypothekarzinsen",             u: 0,   w: 0   }, // separat als Schuldzinsen abziehbar
  { name: "Amortisation",                 u: 0,   w: 0   },
  { name: "Nebenkosten (Strom, Wasser, Heizung, Kehricht)", u: 0, w: 0 },
  { name: "Abos & Kommunikation (Internet, TV, Alarm …)",   u: 0, w: 0 },
  { name: "Sonstiges / privat",           u: 0,   w: 0   },
];

/* ================= Zustand ================= */
let dirHandle = null;
let entries = [];            // Array von Objekten
let settings = { eigenmietwert: {}, pauschalSatz: {}, vorlagen: [], budgets: {}, projektBudgets: {} };
let editId = null;           // gerade bearbeiteter Eintrag
let editVorlageId = null;    // gerade bearbeitete Vorlage
let pendingFiles = [];       // neu angehängte File-Objekte (noch nicht kopiert)
let pendingExisting = [];    // bereits gespeicherte Belegpfade beim Bearbeiten

/* ================= Hilfsfunktionen ================= */
const $ = id => document.getElementById(id);
const chf = n => (isFinite(n) ? n : 0).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function setStatus(msg, cls) {
  const s = $("status");
  s.textContent = msg;
  s.className = cls || "";
}

function sanitizeFilename(s) {
  return s.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").slice(0, 60) || "Beleg";
}

/* ================= CSV ================= */
function csvEscape(v) {
  v = String(v ?? "");
  if (/[;"\r\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function toCSV() {
  const lines = [CSV_HEADER.join(";")];
  for (const e of entries) {
    lines.push([
      e.id, e.datum, e.jahr, e.kategorie, e.beschreibung, e.lieferant,
      e.betrag.toFixed(2), e.pUnterhalt, e.pWert, e.belege.join("|"), e.notizen,
      e.status, e.vorlage || "", e.projekt || ""
    ].map(csvEscape).join(";"));
  }
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM → Excel liest Umlaute korrekt
}

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ";") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i+1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  const out = [];
  for (let r = 1; r < rows.length; r++) { // Zeile 0 = Header
    const c = rows[r];
    if (c.length < 9) continue;
    out.push({
      id: c[0] || uid(),
      datum: c[1],
      jahr: parseInt(c[2]) || parseInt((c[1] || "").slice(0, 4)) || 0,
      kategorie: c[3] || "",
      beschreibung: c[4] || "",
      lieferant: c[5] || "",
      betrag: parseFloat(c[6]) || 0,
      pUnterhalt: Math.min(100, Math.max(0, parseFloat(c[7]) || 0)),
      pWert: Math.min(100, Math.max(0, parseFloat(c[8]) || 0)),
      belege: (c[9] || "").split("|").filter(Boolean),
      notizen: c[10] || "",
      status: c[11] === "GEPLANT" ? "GEPLANT" : "OK",
      vorlage: c[12] || "",
      projekt: c[13] || "",
    });
  }
  return out;
}
