// THE STARTING CATALOG. Since the editor (Edit catalog, in the maintainer copy), the catalog people see lives INSIDE the
// saved dashboard file, and Brad adds, changes and deletes links there. This file is only what a freshly built copy
// starts with; a newer build takes Brad's links across with "Import links from a copy…". Editing it changes nothing in
// a dashboard already saved.
//
//   name      what the row says
//   note      one short line: what it is, who owns it, how often it changes (optional)
//   category  one of the `categories` ids below: the group the row sits in
//   type      'excel', 'powerpoint', 'word', 'pdf', 'form', 'video' (a recording), 'sharepoint', 'teams', 'folder' or 'web'
//             An Excel, PowerPoint or Word link gets "Open in Excel" (or PowerPoint, Word), which opens the file straight
//             in the desktop app, and "Browser" for the web version. Every other type opens in a new tab.
//   url       the link. In Teams or SharePoint: the file's ⋯ menu › Copy link, and paste it here.
//             Leave it '' until there is one: the row says "Link not set". Only https:// links are accepted.
//   date      optional: 'YYYY-MM-DD', for a training session, a board or a deadline. Dated links sort newest first, and a
//             section holding dates splits its tab into Schedule & resources, Upcoming and Past sessions.
//   id        optional: a short name in lower case. Pins and "recently opened" follow it; without one they follow the
//             name, so renaming a link without an id unpins it.
//
// `npm run check` refuses an unknown category or type, a repeated name, and a link that is not https.

// A section with tab: true is also a tab at the top of the page (tabName is the tab's label; without one, the name).
//
const CATALOG = {
  categories: [
    { id: 'trackers',  name: 'Trackers',             blurb: 'Working spreadsheets the office keeps current.' },
    { id: 'briefings', name: 'Briefings & slides',   blurb: 'Recurring reviews and the decks behind them.' },
    { id: 'forms',     name: 'Forms',                blurb: 'Forms to fill in, and where to send them.' },
    { id: 'websites',  name: 'Job websites',         blurb: 'Websites used for the work itself.' },
    { id: 'af',        name: 'Air Force employees',  blurb: 'Pay, personnel, training and support for Air Force employees.', tab: true, tabName: 'Air Force' },
    { id: 'navy',      name: 'Navy employees',       blurb: 'Pay, personnel, training and support for Navy employees.',      tab: true, tabName: 'Navy' },
    { id: 'training',  name: 'Training',             blurb: 'The training schedule, and past sessions with their topics and recordings.', tab: true },
    { id: 'reference', name: 'Reference',            blurb: 'Guidance, templates and policy.' },
    { id: 'sites',     name: 'Sites & dashboards',   blurb: 'Team sites, channels and other dashboards in Teams.' },
  ],

  items: [
    { name: 'ATR/BTR Tracker',          note: 'Above- and below-threshold reprogramming actions.', category: 'trackers',  type: 'excel',      url: '' },
    { name: 'Funds Control Tracker',    note: '',                                                    category: 'trackers',  type: 'excel',      url: '' },
    { name: 'Training schedule',        note: 'Upcoming sessions and how to sign up.',              category: 'training',  type: 'sharepoint', url: '' },
    { name: 'Execution Review Slides',  note: '',                                                    category: 'briefings', type: 'powerpoint', url: '' },
  ],
};
