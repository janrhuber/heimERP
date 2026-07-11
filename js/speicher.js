"use strict";
/* ================= Dateizugriff ================= */
const idb = {
  open: () => new Promise((res, rej) => {
    const rq = indexedDB.open("heimERP", 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  }),
  async set(k, v) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(v, k);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  },
  async get(k) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const rq = db.transaction("kv").objectStore("kv").get(k);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  },
};

async function chooseFolder() {
  try {
    dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    await idb.set("dir", dirHandle);
    await loadAll();
  } catch (e) {
    if (e.name !== "AbortError") setStatus("Fehler: " + e.message, "err");
  }
}

async function tryReconnect() {
  const h = await idb.get("dir").catch(() => null);
  if (!h) return;
  const perm = await h.queryPermission({ mode: "readwrite" });
  if (perm === "granted") { dirHandle = h; await loadAll(); return; }
  // Berechtigung braucht eine Nutzergeste → Button anbieten
  $("btnFolder").textContent = "🔄 Erneut verbinden: " + h.name;
  $("btnFolder").onclick = async () => {
    if (await h.requestPermission({ mode: "readwrite" }) === "granted") {
      dirHandle = h; await loadAll();
      $("btnFolder").textContent = "📁 Datenordner wählen";
      $("btnFolder").onclick = chooseFolder;
    }
  };
}

async function readFileText(name) {
  try {
    const fh = await dirHandle.getFileHandle(name);
    return await (await fh.getFile()).text();
  } catch { return null; }
}

async function writeFileText(name, text) {
  const fh = await dirHandle.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}

async function loadAll() {
  const csv = await readFileText(CSV_NAME);
  entries = csv ? parseCSV(csv) : [];
  const st = await readFileText(SETTINGS_NAME);
  if (st) { try { settings = Object.assign(settings, JSON.parse(st)); } catch {} }
  if (!Array.isArray(settings.vorlagen)) settings.vorlagen = [];
  if (!settings.budgets || typeof settings.budgets !== "object") settings.budgets = {};
  if (!settings.projektBudgets || typeof settings.projektBudgets !== "object") settings.projektBudgets = {};
  const created = await generateRecurring();
  setStatus("✔ Verbunden: " + dirHandle.name + " (" + entries.length + " Einträge" +
            (created ? ", " + created + " neu geplant" : "") + ")", "ok");
  $("startHint").classList.add("hidden");
  renderAll();
}
