# Sustainment Dashboard

The entry point for every sustainment tool: one page with a card per tool, grouped by area, searchable, that opens
each tool from its link in Teams. It wears the same Harbor colours, navy menu and ring-and-satellite marks as ORBIT and APEX.

**It holds no data.** It is a list of links. It remembers, in your browser only, which links you pinned and opened lately.

## Using it

1. Put `sustainment-dashboard.html` in the Teams channel's Files (or any SharePoint library).
2. Open it. Like ORBIT and APEX it is a single HTML file with no install, no add-ins and nothing loaded from the network.
3. Click **Open** on a tool. It opens in a new tab from its Teams link. **Copy link** copies that link to send to someone.
   Press **/** to search; **Esc** clears it.

## Adding or changing a tool

Everything the page shows comes from one file, **`src/tools.js`**. Its header explains every field.

1. To add a tool, copy an entry in `tools` and change it. To link a tool, paste its Teams link into `url`
   (in Teams: the file's **⋯ › Copy link**). Until a tool has a link, its card says *Link not set*.
2. `npm run build` writes `sustainment-dashboard.html`.
3. `npm run check` makes sure the list is well formed and the page loads nothing from outside itself.
4. Commit both files and upload the new `sustainment-dashboard.html` to Teams over the old one.

## The catalog: links to everything else

Trackers, briefings, references, team sites and other dashboards live in **`src/catalog.js`**, under **Catalog** in
the menu. Each link is one line with a name, a short note, a category and a type (`excel`, `powerpoint`, `word`, `pdf`,
`sharepoint`, `teams`, `folder`, `web`). Paste its address from Teams or SharePoint (**⋯ › Copy link**) into `url`.

- **Excel, PowerPoint and Word links open in the desktop app** (**Open in Excel**), not the browser preview; **Browser**
  opens the web version. Other links open in a new tab.
- **Pins:** anyone can pin the links they use most. Pins sit at the top of the catalog and the home page, and are kept
  in that person's browser only.
- **Search** (the box at the top) looks through the tools and the catalog together.

Categories are at the top of the file; add one there to get a new section and menu entry.

## Your maintainer copy: the latest versions

`maintainer/sustainment-dashboard-maintainer.html` is the same page with a **Settings** gear at the top right. Settings
lists every tool with **Download latest** (the file as it stands on its GitHub branch), **View on GitHub** and **What
changed** / **History**, and the version you last put on Teams.

**Keep it to yourself; never upload it to Teams.** The team copy has no gear, and no GitHub address anywhere in the file
(not hidden: left out, so View Source shows nothing either). `npm run check` fails if one ever gets in.

Where each tool comes from is in `src/sources.js`. When you upload a new version to Teams, update its `version` there
so the panel says what is on Teams.

## The files

| File | What it is |
|---|---|
| `sustainment-dashboard.html` | The page people open (the team copy). Built; never edit it by hand. |
| `maintainer/sustainment-dashboard-maintainer.html` | Your copy, with Settings. Built. |
| `src/tools.js` | The tool list. The file you edit. |
| `src/catalog.js` | The catalog of links. The other file you edit. |
| `src/app.js` | Draws the page from the two lists. |
| `src/sources.js` | Where each tool's latest version is on GitHub. Maintainer copy only. |
| `src/maint.js` | The Settings panel. Maintainer copy only. |
| `src/style.css` | The look (Harbor, as ORBIT and APEX). |
| `src/shell.html` | The page around them, with its Content-Security-Policy. |
| `build.mjs` | Puts the four together into one file. |
| `tools/check.mjs` | `npm run check`. |
| `tools/shoot.mjs` | `npm run shoot -- out.png [--links] [--catalog] [--maint [--settings]] [--full] [--width N]`: a screenshot in Chromium. |
