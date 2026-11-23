// THE STARTING CATALOG. Since the editor (Edit catalog, in the maintainer copy), the catalog people see lives INSIDE the
// saved dashboard file, and Brad adds, changes and deletes links there. This file is only what a freshly built copy
// starts with; a newer build takes Brad's links across with "Import from last version…" (the maintainer bar offers it on a fresh copy). Editing it changes nothing in
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
// glossary: { term, meaning, url? } -- notices: { text, date (posted), until?, url? }
// `npm run check` refuses an unknown category or type, a repeated name, and a link that is not https.

// A section with tab: true is also a tab at the top of the page (tabName is the tab's label; without one, the name).
//
const CATALOG = {
  // the office's settings (the contact email is set in the page: Edit catalog › Office settings)
  meta: {},

  categories: [
    { id: 'start',     name: 'Start here',           blurb: 'New to the office? Begin with these: who we are, what we do, and where things live.' },
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
    { name: 'Office overview',          note: 'Who we are, what we do, who to ask.',                category: 'start',     type: 'powerpoint', url: '' },
    { name: 'Training schedule',        note: 'Upcoming sessions and how to sign up.',              category: 'training',  type: 'sharepoint', url: '' },
    { name: 'Execution Review Slides',  note: '',                                                    category: 'briefings', type: 'powerpoint', url: '' },
  ],

  // announcements for What's new (added in the page: Edit catalog › + Announcement)
  notices: [],

  // the office glossary: a starting set, worded plainly. Check them against how the office uses each term; change,
  // add and delete them in the page (Edit catalog, on the Glossary tab).
  glossary: [
    { term: 'ATR', meaning: 'Above Threshold Reprogramming: moving funds above the amount a component may move on its own, so it needs approval (and congressional notification) before it happens.' },
    { term: 'BTR', meaning: 'Below Threshold Reprogramming: moving funds within the limits a component may move on its own authority.' },
    { term: 'BA', meaning: 'Budget Authority: the authority, given in law, to commit the government to spend money.' },
    { term: 'BES', meaning: 'Budget Estimate Submission: a component’s budget for the coming year, built from its POM and sent up for review.' },
    { term: 'CLIN', meaning: 'Contract Line Item Number: one priced item or service on a contract.' },
    { term: 'CR', meaning: 'Continuing Resolution: a law that funds the government at roughly the prior year’s rate when the year’s appropriation has not been passed. New starts are not allowed under a CR.' },
    { term: 'FYDP', meaning: 'Future Years Defense Program: the department’s plan of forces and money for the budget year and the four years after it.' },
    { term: 'MIPR', meaning: 'Military Interdepartmental Purchase Request (DD Form 448): how one DoD activity orders goods or services from, and sends funds to, another.' },
    { term: 'O&M', meaning: 'Operation and Maintenance: the appropriation that pays for day-to-day operations, sustainment and civilian pay. Generally available to obligate for one year.' },
    { term: 'PB', meaning: 'President’s Budget: the budget the President sends to Congress each year.' },
    { term: 'PMO', meaning: 'Program Management Office: the office that manages a program’s cost, schedule and performance.' },
    { term: 'POM', meaning: 'Program Objective Memorandum: a component’s proposed program for the FYDP years, the starting point of each PPBE cycle.' },
    { term: 'PPBE', meaning: 'Planning, Programming, Budgeting and Execution: the department’s yearly process for deciding what to fund and then spending it.' },
    { term: 'UFR', meaning: 'Unfunded Requirement: a need the current budget does not pay for.' },
    { term: 'WBS', meaning: 'Work Breakdown Structure: a program’s work divided into parts, each of which can be costed and tracked.' },
  ],
};
