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
  Only the maintainer copy carries `src/sources.js` and `src/maint.js`; `edit.js` is in both, so it may never name
  GitHub or the Settings panel's function, and its fence markers are built from pieces that do not look like a fence
  (`npm run check` refuses `MAINT>` / `MAINT@` in the team copy). Brad, 22 Nov 2026: he does not want others to
  readily be able to download the latest versions. So the links are LEFT OUT of the team copy, never hidden in it
  (View Source would show them). `npm run check` fails on any mention of GitHub in the team copy, comments included:
  never write a GitHub address, or the panel's code, into tools.js, app.js, style.css or shell.html.
- **Two lists, one home each.** `src/tools.js` describes the tools built here; the catalog holds links to everything
  else (trackers, briefings, forms, job websites, Air Force and Navy employee links, other dashboards). Nothing is
  listed in both.
- **The catalog lives in the saved file, ORBIT's way** (Brad, 22 Nov 2026: "I need to be able to add, modify and
  delete"). It is a JSON block, `<script id="catData">`, read by `readCatalog()` → `normCatalog()` (the one reading of a
  catalog, also used by Import and the merge).
- **Anyone edits (Brad, 23 Nov 2026: "I want the ability for anyone using to be able to update the links").** The
  editor is `src/edit.js`, in EVERY copy; only the Settings panel (`maint.js`, `sources.js`) is fenced. Office settings,
  Import from last version and Save team copy are the maintainer's (`IS_MAINT()`). The team opens the file from Teams
  and saves it back (Brad: "It does not synch"), so the last save must never wipe out the others: **Save merges**
  (`merge3`: base = the catalog this page started from, `ED.base`; mine; theirs = the file reread, or the newest copy
  the person chooses). Only-mine changes are mine, only-theirs are kept, both-different keeps mine and says so. Every
  link and announcement has an id (`normCatalog` makes one) because the merge keys by it. Each save writes the change
  `log` (who, from `sdash.who`) and deletes go to `trash` (90 days, anyone restores). A draft carries its `baseCat`, so
  unsaved edits from an older copy are merged over a newer file on opening. `npm test` drives two people saving at
  once and checks nothing of either is lost. `src/catalog.js` is only the STARTING catalog of a fresh build:
  never assume it matches what Brad's files hold. A new build carries his links across with Import from last version (`importFile` → Replace or `importMerge`). `VERSION` in app.js is written into every saved file as `meta.version`: raise it on every functional change.
- **The team copy is the maintainer copy with the fences cut out.** `sources.js` and `maint.js` are built inside
  `/*@MAINT>*/ … /*<MAINT@*/`; `teamOf()` in build.mjs and `htmlWith(…, true)` in edit.js cut them the same way, so the
  page's own Save team copy and the build cannot drift apart. A fence marker never appears literally in a source file
  (build it from pieces): a cut that met its own marker would eat the code doing the cutting. Every `<` in the catalog
  block is written `\u003c`, so a link or note holding `</script>` cannot end the block.
- **The editor plugs in through `HOOK()`** in app.js (`MAINT_HOOKS`, defined in edit.js). Maintainer-only behaviour
  checks `IS_MAINT()` inside edit.js; app.js stays free of editing code.
- **Office links open in the desktop app** through Office's own form (`ms-excel:ofe|u|<https address>`, and
  `ms-powerpoint`, `ms-word`), with a Browser button beside it. Brad asked for Office files never to open in preview.
- **No data, ever.** The hub links to tools; it never holds budget or contract figures. Tools that hold data live in
  their own files and follow ORBIT's rule: the repo holds the program, never a populated copy. A tool built in this repo
  goes in a folder of its own (`contract-tracker/`, ...) with its own build and checks, and gets a card in `tools.js`.
- **The look is Harbor, shared with ORBIT and APEX.** Token names in `src/style.css` are APEX's (`--sbg`, `--acc`,
  `--steal`, ...). A status is always its colour AND its word. Marks are ORBIT's family: a ring, a satellite at two
  o'clock, and something inside.
- **Escape everything drawn** (`esc()` in `src/app.js`), even from the tool list: a quote in a tagline must not break a card.
- **The layout is D** (Brad, 22 Nov 2026, from four mock-ups): a welcome band with the search and the tabs at its foot,
  pinned tiles, a slim tools row, then the catalog as section cards in columns. Tabs are buttons with `aria-pressed`,
  never ARIA tabs. `KIND` in app.js maps Files, Websites and Forms to link types; a section with `tab: true` is a tab.
- **A link may carry a date** (`YYYY-MM-DD`, read by `dateOk()`; one that is not a real day is set aside, said, and
  refused in the editor). Dated links sort newest first after the undated ones (`linkOrder`), and a section's own tab
  splits into Schedule & resources, Upcoming and Past sessions once any of its links is dated (`sectionTab`). "Upcoming"
  includes today, in the reader's own time zone (`today()`), never UTC's.
- **The office hub (Brad, 23 Nov 2026: "the end all, be all")** adds to the catalog `meta` (`contact`, `office`,
  `updated`), `notices` and `glossary`, and to a link `keywords` and `checked`. All of it goes through `normCatalog()`.
  `catOut()` in maint.js is every part written to a file; a new part goes in both, or a save silently drops it.
  `sigOf()` leaves out `meta.updated` so saving one copy never makes the other read as changed. The stamp is applied
  only once the write has landed.
- **Report and Suggest are `mailto:` links to `meta.contact`**, which Brad types in Office settings. Never write an
  address into the source. Without a contact they do not show.
- **A spreadsheet cell starting `= + - @`, a tab or a CR is written with a leading apostrophe** (`csvCell`), so Excel
  never runs a link name as a formula.
- **A row's extra controls (`.lmore`) sit over the row and move nothing.** A version that widened the row on hover
  rewrapped the name and made the cards jump under the pointer; `npm test` holds the row, the name's width and every
  card still while hovering, and was shown failing on that version.
- **`npm run a11y`** (axe-core, dev only) must report no findings. A link not set is told apart by a dashed edge, never
  by fading: fading took the Live badge under 4.5:1.
- **A browser test never touches storage from an init script**: in Chromium a `file://` page that touches storage while
  it is being created can get a storage area of its own, and a reload lands in another (drafts "vanished" until the
  tests seeded the name from the loaded page, `seedWho`). ORBIT's pmo-save check met the same thing.
- **`npm test`** drives the page in Chromium end to end (`tools/editor-test.mjs`); run it with `npm run check` before a
  commit that touches app.js, edit.js or maint.js.
- Check appearance with `npm run shoot` at 1440, 1366 and a phone width (420) before calling a change done
  (`--catalog --links` fills it with stand-in links and pins).
