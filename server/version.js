"use strict";
/* ================= Versionsanzeige =================
   Version aus dem Git-Tag, Hash aus dem Commit. Auf dem Tag: "v1.1.0".
   Danach: "v1.1.1-alpha.<Commits seit dem Tag>" – die Alpha zählt auf die
   nächste Version hin, weil 1.1.0-alpha.N nach SemVer VOR 1.1.0 läge. */
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");

function git(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 5000,
  }).trim();
}

/* "v1.1.0-3-g9f8e7d6" → { version, hash, release, anzeige } oder null */
function ausDescribe(text) {
  const m = /^v(\d+)\.(\d+)\.(\d+)-(\d+)-g([0-9a-f]+)$/.exec(String(text || "").trim());
  if (!m) return null;
  const [, major, minor, patch, abstand, hash] = m;
  const release = abstand === "0";
  const version = release
    ? `${major}.${minor}.${patch}`
    : `${major}.${minor}.${Number(patch) + 1}-alpha.${abstand}`;
  return { version, hash, release, anzeige: `v${version} (${hash})` };
}

function ermittleVersion() {
  try {
    const v = ausDescribe(git(["describe", "--tags", "--long", "--match", "v[0-9]*"]));
    if (v) return v;
  } catch { /* kein Tag erreichbar – unten weiter */ }
  try {
    const hash = git(["rev-parse", "--short", "HEAD"]);
    const anzahl = git(["rev-list", "--count", "HEAD"]);
    const version = `0.0.0-alpha.${anzahl}`;
    return { version, hash, release: false, anzeige: `v${version} (${hash})` };
  } catch { /* kein Git oder kein Repo */ }
  return { version: null, hash: null, release: false, anzeige: "unbekannt" };
}

/* Einmal beim Start – ein Deployment startet den Prozess ohnehin neu */
let gemerkt = null;
function version() {
  if (!gemerkt) gemerkt = ermittleVersion();
  return gemerkt;
}

module.exports = { ausDescribe, version };
