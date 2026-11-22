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
- **The tool list is the one place a tool is described.** `src/tools.js`. The page draws everything from it; a new
  field goes there and in `tools/check.mjs` together.
- **No data, ever.** The hub links to tools; it never holds budget or contract figures. Tools that hold data live in
  their own files and follow ORBIT's rule: the repo holds the program, never a populated copy. A tool built in this repo
  goes in a folder of its own (`contract-tracker/`, ...) with its own build and checks, and gets a card in `tools.js`.
- **The look is Harbor, shared with ORBIT and APEX.** Token names in `src/style.css` are APEX's (`--sbg`, `--acc`,
  `--steal`, ...). A status is always its colour AND its word. Marks are ORBIT's family: a ring, a satellite at two
  o'clock, and something inside.
- **Escape everything drawn** (`esc()` in `src/app.js`), even from the tool list: a quote in a tagline must not break a card.
- Check appearance with `npm run shoot` at 1440, 1366 and a phone width (420) before calling a change done.
