# Sustainment Dashboard

One self-contained HTML page (`sustainment-dashboard.html`) that links every sustainment tool Brad builds: ORBIT and
APEX (both in `bradludington-ui/orbit-board`), and the tools to come (the contract tracker, the spend plan to budget
dashboard, and more). See README.md for what it is and how it is updated.

## Rules

- **Built, never hand-edited.** `src/` is the source; `npm run build` writes the page. Commit both.
- **Before every commit: `npm run check`.** It fails when the page is not what `src/` builds, when the tool list has an
  unknown area, status or icon, a repeated id, or a link that is not https, and when the page references anything
  outside itself.
- **One file, nothing from the network.** It is opened from Teams (SharePoint), which hands people the file on its own,
  so a stylesheet or script beside it would not come along. The CSP in `src/shell.html` refuses every outside load;
  links still navigate. Do not add a CDN, a web font or a fetch.
- **Two copies, and GitHub stays out of the team's.** `build.mjs` writes `sustainment-dashboard.html` (the team copy,
  for Teams) and `maintainer/sustainment-dashboard-maintainer.html` (Brad's, with the Settings panel of download links).
  Only the maintainer copy carries `src/sources.js` and `src/maint.js`. Brad, 22 Nov 2026: he does not want others to
  readily be able to download the latest versions. So the links are LEFT OUT of the team copy, never hidden in it
  (View Source would show them). `npm run check` fails on any mention of GitHub in the team copy, comments included:
  never write a GitHub address, or the panel's code, into tools.js, app.js, style.css or shell.html.
- **Two lists, one home each.** `src/tools.js` describes the tools built here; the catalog holds links to everything
  else (trackers, briefings, forms, job websites, Air Force and Navy employee links, other dashboards). Nothing is
  listed in both.
- **The catalog lives in the saved file, ORBIT's way** (Brad, 22 Nov 2026: "I need to be able to add, modify and
  delete"). It is a JSON block, `<script id="catData">`, read by `readCatalog()` → `normCatalog()` (the one reading of a
  catalog, also used by Import). Brad edits it in the maintainer copy (Edit catalog, `src/maint.js`); Save writes the
  maintainer file, Save team copy writes the team file. `src/catalog.js` is only the STARTING catalog of a fresh build:
  never assume it matches what Brad's files hold. A new build carries his links across with Import links from a copy.
- **The team copy is the maintainer copy with the fences cut out.** `sources.js` and `maint.js` are built inside
  `/*@MAINT>*/ … /*<MAINT@*/`; `teamOf()` in build.mjs and `htmlWith(…, true)` in maint.js cut them the same way, so the
  page's own Save team copy and the build cannot drift apart. A fence marker never appears literally in a source file
  (build it from pieces): a cut that met its own marker would eat the code doing the cutting. Every `<` in the catalog
  block is written `\u003c`, so a link or note holding `</script>` cannot end the block.
- **The editor plugs in through `HOOK()`** in app.js (`MAINT_HOOKS` in maint.js). The team copy has no `MAINT_HOOKS`,
  so every hook draws nothing there. Put maintainer-only behaviour behind a hook, never in app.js.
- **Office links open in the desktop app** through Office's own form (`ms-excel:ofe|u|<https address>`, and
  `ms-powerpoint`, `ms-word`), with a Browser button beside it. Brad asked for Office files never to open in preview.
- **No data, ever.** The hub links to tools; it never holds budget or contract figures. Tools that hold data live in
  their own files and follow ORBIT's rule: the repo holds the program, never a populated copy. A tool built in this repo
  goes in a folder of its own (`contract-tracker/`, ...) with its own build and checks, and gets a card in `tools.js`.
- **The look is Harbor, shared with ORBIT and APEX.** Token names in `src/style.css` are APEX's (`--sbg`, `--acc`,
  `--steal`, ...). A status is always its colour AND its word. Marks are ORBIT's family: a ring, a satellite at two
  o'clock, and something inside.
- **Escape everything drawn** (`esc()` in `src/app.js`), even from the tool list: a quote in a tagline must not break a card.
- Check appearance with `npm run shoot` at 1440, 1366 and a phone width (420) before calling a change done.
