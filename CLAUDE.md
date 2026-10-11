# CLAUDE.md — heimERP

Operating manual for this repo — invariants and pointers only; details live
in `docs/` and the workflow commands.

## Commands

Workflows (`.claude/commands/`): `/feature` (spec-first change), `/bugfix`
(regression test first), `/debug` (diagnose, don't fix), `/deps` (npm audit),
`/release <X.Y.Z>` (merge to main, tag, deploy, verify).

## What this is

Tracks the costs of a house and what they mean for taxes (canton Aargau):
deductible maintenance vs. value-adding investments, budget, dossier for the
property gains tax. Plain HTML/CSS/JS without a build step, optional
Node/Express backend in `server/`. Two modes with identical data format
(local folder / server). In server mode the public address serves only the
page "Beleg hochladen"; everything else is reachable from the home network
only. Start with `docs/specs/README.md`.

## Hard constraints

- **This repo is public and about a private home.** Never commit names,
  addresses, host names, IP addresses, domains, real amounts, receipts or
  anything else that identifies the owner or the house — not in code, tests,
  docs, examples or commit messages. Installation details live in the private
  infrastructure repo `server-setup` (`ansible/inventory.yml`, host `heimerp`).
  Examples use made-up values ("Sanitär Muster").
- **Access model is security-critical.** External requests (header
  `X-Zugang: extern`, set by the reverse proxy) may only reach the upload
  page, login/logout/status and `POST /api/eingang`. Every endpoint that
  shows or changes data starts with `nurIntern`. Any new file for the public
  page must be whitelisted in **both** `server/app.js` (`EXTERN_DATEIEN`) and
  the proxy config. See `docs/specs/001-zugangsmodell.md`. When in doubt:
  internal only.
- **Logic that exists twice stays identical**: receipt naming and
  `sanitizeFilename` live in `js/basis.js` / `js/wiederkehrend.js` **and**
  `server/hilfen.js`. Change both or neither.
- **Data format is a contract.** CSV header order, BOM, `|` as receipt
  separator. The server treats the CSV as raw bytes.
- **Never touch real data.** Tests use a temp dir. The local folder `Daten/`
  is git-ignored real data — never read it into tests, examples or docs, and
  never start a test server against it. Back up production data before any
  deployment.
- **No new npm dependencies** without explicit approval. Frontend stays
  dependency-free and build-free; the upload page loads nothing from third
  parties.
- **Tests required** for every server change: `cd server && npm test`
  (`node:test`). Frontend has no automated tests — verify in the browser and
  say so.
- **Cache busting**: after changing CSS or JS, bump `?v=YYYYMMDD` on **all**
  references in `heimERP.html` / `hochladen.html` together.
- **`server/index.js` stays a plain start script** — no
  `require.main === module` (false under PM2 fork mode, server would never listen).
- **Spec-first**: specs in `docs/specs/` (index: `README.md`; changes:
  `changelog.md`).

## Git & commits

- Work on `develop`; branch off it, merge back with `--no-ff`. `main` is what
  runs in production and only changes through `/release`.
- Branch names: `feature/|fix/|refactor/|chore/|docs/|test/` + kebab-case.
- Conventional Commits, **English**, imperative: `feat(eingang): add …`, `fix: …`.
- Add user-visible changes to `docs/specs/changelog.md` under **Unreleased**.
- No "Co-Authored-By" / AI-generation notes in commit messages.
- Language: code identifiers and UI German (as existing), commits English,
  docs German.

## Key paths

| Purpose | Path |
|---|---|
| Specs, changelog | `docs/specs/` |
| Operations | `docs/betrieb.md` |
| Frontend app / public page | `heimERP.html`, `js/` · `hochladen.html`, `js/hochladen.js` |
| Backend | `server/` (`app.js` = app, `index.js` = start) |
| Tests | `server/test/` |
| Infrastructure (nginx, Ansible, deploy) | separate private repo `server-setup` |
