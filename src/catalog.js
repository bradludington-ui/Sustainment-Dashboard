// THE CATALOG: links to the things used around the office (trackers, briefings, references, sites). This is the file
// you edit to add, change or remove a link; tools.js is only for the tools themselves.
//
// To add a link, copy one entry in `items`, change it, and run `npm run build`.
//
//   name      what the row says
//   note      one short line: what it is, who owns it, how often it changes (optional)
//   category  one of the `categories` ids below: the group the row sits in
//   type      'excel', 'powerpoint', 'word', 'pdf', 'sharepoint', 'teams', 'folder' or 'web'
//             An Excel, PowerPoint or Word link gets "Open in Excel" (or PowerPoint, Word), which opens the file straight
//             in the desktop app, and "Browser" for the web version. Every other type opens in a new tab.
//   url       the link. In Teams or SharePoint: the file's ⋯ menu › Copy link, and paste it here.
//             Leave it '' until there is one: the row says "Link not set". Only https:// links are accepted.
//   id        optional: a short name in lower case. Pins and "recently opened" follow it; without one they follow the
//             name, so renaming a link without an id unpins it.
//
// `npm run check` refuses an unknown category or type, a repeated name, and a link that is not https.

const CATALOG = {
  categories: [
    { id: 'trackers',  name: 'Trackers',             blurb: 'Working spreadsheets the office keeps current.' },
    { id: 'briefings', name: 'Briefings & slides',   blurb: 'Recurring reviews and the decks behind them.' },
    { id: 'reference', name: 'Reference',            blurb: 'Guidance, templates and policy.' },
    { id: 'sites',     name: 'Sites & dashboards',   blurb: 'Team sites, channels and other dashboards in Teams.' },
  ],

  items: [
    { name: 'ATR/BTR Tracker',          note: 'Above- and below-threshold reprogramming actions.', category: 'trackers',  type: 'excel',      url: '' },
    { name: 'Funds Control Tracker',    note: '',                                                    category: 'trackers',  type: 'excel',      url: '' },
    { name: 'Execution Review Slides',  note: '',                                                    category: 'briefings', type: 'powerpoint', url: '' },
  ],
};
