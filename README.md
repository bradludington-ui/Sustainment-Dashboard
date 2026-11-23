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

### Adding, changing and deleting links

In your **maintainer copy** (below), press **Edit catalog**:

- **+ Add link** on a section, or the pencil on a link to change it. Paste the address from Teams or SharePoint
  (**⋯ › Copy link**); the type is guessed from it. The bin deletes a link; **Undo delete** puts it back.
- **+ Add a section**; on a section's header, **+ Link**, the pencil (rename, describe, show as a tab, or delete it with
  its links) and ◀ ▶ to reorder.
- Every edit is kept in your browser at once, so a closed tab loses nothing; the bar says **Unsaved changes**.
- **Save** writes your maintainer file. **Save team copy…** writes `sustainment-dashboard.html` with the same links and
  no editor: upload that one to Teams. A ● on the button means the team copy is out of date.
- **Paste from Excel…**: copy rows from a spreadsheet (headings Name, Link, and any of Section, Type, Note, Date,
  Keywords) and paste. It is checked first and says what it will add, update and leave out; a new section is made; a
  name already in the catalog updates that link. **Export to Excel** writes every link as a spreadsheet (a backup, a
  review list, a hand-over).
- **Needs checking** lists links nobody has checked in 180 days, oldest first: open each, press **It works**. A link's
  box has **I checked this link works today**.
- **Office settings…**: the contact email reports and suggestions go to (a shared office mailbox outlasts any one person).
- **+ Announcement** on What's new (with a "show until" date), and **+ Add a term** on the Glossary tab.
- **Import links from a copy…** takes the links from another saved copy. Use it when you download a newer version
  of the dashboard, so your links come with you.

The links live inside the saved files, not in this repository: `src/catalog.js` is only what a fresh build starts with.

**Keep your maintainer file in OneDrive** (it keeps every version), **export to Excel now and then**, and give a second
person a copy of the maintainer file: it is the only full record of the catalog.

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
| `src/maint.js` | The Settings panel and the catalog editor. Maintainer copy only. |
| `src/style.css` | The look (Harbor, as ORBIT and APEX). |
| `src/shell.html` | The page around them, with its Content-Security-Policy. |
| `build.mjs` | Puts the four together into one file. |
| `tools/check.mjs` | `npm run check`. |
| `tools/editor-test.mjs` | `npm test`: the page driven in Chromium, end to end (editor, saving, tabs, search, pins). |
| `tools/a11y.mjs` | `npm run a11y`: Section 508 / WCAG 2.2 AA with axe-core, in every tab, both copies, while editing. |
| `tools/shoot.mjs` | `npm run shoot -- out.png [--links] [--catalog] [--maint [--settings]] [--full] [--width N]`: a screenshot in Chromium. |
