# Sustainment Dashboard

The entry point for every sustainment tool and the office's most-used files, websites and forms: a welcome band with one
search box and tabs (Everything, Tools, Files, Websites, Forms, Air Force, Navy), your pinned links as tiles, the tools,
and the catalog as colour-headed section cards. It wears the same Harbor colours, navy menu and ring-and-satellite marks as ORBIT and APEX.

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

## The catalog: files, websites and forms

On the page under **Catalog**: Start here (for new people), trackers, briefings, forms, job websites, Air Force and Navy
employee links, training, references and team sites, each a section card. The **Files**, **Websites** and **Forms** tabs
gather links by what they are, whatever section they sit in; a section marked **Show as a tab** (Air Force, Navy and
Training to start) gets a tab of its own. Excel, PowerPoint and Word links open in the desktop app (**Open in Excel**),
not the browser preview; hover a link for **Browser**, **Copy link** and **⚑ report**.

**Training** holds the schedule and every session. Give a session's link a **date** (and its topic as the note): the
Training tab then splits into **Schedule & resources** (links with no date), **Upcoming** (soonest first, today included)
and **Past sessions** (newest first). Any section works the same way once its links carry dates, and a recording can use
the **Recording** type.

### What the team sees

- **What's new** (your announcements) and **Coming up** (every dated link in the next 30 days) at the top of Everything.
- **Links updated 22 Nov 2026** in the welcome band, so anyone can tell how current their copy is. A copy opened from a
  **Downloads** folder says it is a downloaded copy that will not change, and to open the dashboard from Teams.
- **⚑ Report a broken link** on every link and **Suggest a link** at the top: each opens an email to the office
  contact with the details filled in (set the address in Office settings; until then they do not show).
- **Search** reads names, notes, hidden **keywords** (MIPR finds DD 448) and the **Glossary**.
- **Glossary**: the office's terms, A to Z, starting with fifteen (ATR, BTR, CR, FYDP, PPBE, UFR…). Check the wording.
- **Help**: how the page works, in six questions (up to date? why Excel? pins? search? broken link? phone?).

### Anyone can add, change and delete links

Everyone's copy has **✎ Edit links** at the top. The first time, it asks the person's name (kept in their browser) for
the change log. Then **+ Link** on a section, the pencil and bin on a link, **+ Add a section**, **+ Announcement**,
**+ Add a term**, **Paste from Excel…**, **Export to Excel** and **Needs checking**.

- **Nothing is lost by two people working at once.** **Save** merges: it lays this person's changes over the newest
  copy, so changes others saved meanwhile are kept. Where two people changed the same link differently, the one saving
  keeps theirs and is told.
  - **Opened from Teams (download, edit, put back):** Save asks to choose the newest copy from Teams first (download it
    again), writes the merged file, then says how to put it back: Files › Upload › Replace.
  - **Opened from a synced Teams folder** (Teams › Files › Sync, then open it from File Explorer): Save rereads the file
    itself, merges and writes straight back to Teams. No download, no upload. Help explains how to set it up.
- **Change log**: who changed what, and when, carried in the file.
- **Recently deleted**: anything deleted in the last 90 days, with who deleted it; anyone can restore it.
- **Unsaved edits are never lost**: they are kept in the browser, and if the file has moved on since (someone else
  saved), opening it lays them over the newer copy.

Only **your maintainer copy** has the Settings panel (GitHub downloads), **Office settings** (the contact email),
**Import from last version** and **Save team copy…** (which merges into the team's file the same way).

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
| `src/catalog.js` | The starting catalog for a fresh build. Links are edited in the page (Edit catalog). |
| `src/app.js` | Draws the page from the two lists. |
| `src/sources.js` | Where each tool's latest version is on GitHub. Maintainer copy only. |
| `src/maint.js` | The Settings panel. Maintainer copy only. |
| `src/edit.js` | The editor, the merge, the change log and Recently deleted. In every copy. |
| `src/style.css` | The look (Harbor, as ORBIT and APEX). |
| `src/shell.html` | The page around them, with its Content-Security-Policy. |
| `build.mjs` | Puts the four together into one file. |
| `tools/check.mjs` | `npm run check`. |
| `tools/editor-test.mjs` | `npm test`: the page driven in Chromium, end to end (editor, saving, tabs, search, pins). |
| `tools/a11y.mjs` | `npm run a11y`: Section 508 / WCAG 2.2 AA with axe-core, in every tab, both copies, while editing. |
| `tools/shoot.mjs` | `npm run shoot -- out.png [--links] [--catalog] [--maint [--settings]] [--full] [--width N]`: a screenshot in Chromium. |
