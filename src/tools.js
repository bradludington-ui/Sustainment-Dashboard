// THE TOOL LIST. This is the only file you edit to add, change or retire a tool.
//
// To add a tool, copy one entry in `tools` below, change its fields, and run `npm run build`.
//
//   id        a short name in lower case, unique (used for "recently opened")
//   name      what the card's heading says
//   full      the full name, under the heading (optional)
//   tagline   one sentence: what the tool is for
//   features  up to four short lines: what is inside (optional)
//   area      one of the `areas` ids below: the section the card sits in
//   status    'live'     -- people use it; the card opens it
//             'dev'      -- being built; the card says so
//             'planned'  -- an idea on the list
//   url       the tool's link in Teams. In Teams: the file's ⋯ menu › Copy link, and paste it here.
//             Leave it '' until there is one: the card says "Link not set" rather than pointing nowhere.
//             Only https:// links are accepted.
//   icon      'orbit', 'apex', 'contract', 'budget', 'chart', 'doc' or 'grid'
//
// Links to other things (trackers, briefings, references, other dashboards) go in catalog.js, not here.
//
// `npm run check` refuses an entry with an unknown area, status or icon, a repeated id, or a link that is not https.

const DASH = {
  title: 'Sustainment Dashboard',
  subtitle: 'Every sustainment tool, one place to start',

  areas: [
    { id: 'plan',      name: 'Out-year planning',      blurb: 'The FYDP: requirements, priorities and the five-year spend plan.' },
    { id: 'exec',      name: 'Active-year execution',  blurb: 'This year’s money: the spend plan, obligations and the budget behind them.' },
    { id: 'contracts', name: 'Contracts',              blurb: 'Contract actions, awards and what each one carries.' },
  ],

  tools: [
    {
      id: 'orbit',
      name: 'ORBIT',
      full: 'Out-year Requirements & Budget Integration Tool',
      tagline: 'The five-year spend plan across every appropriation: requirements ranked, funded and locked by PPBE cycle.',
      features: ['Prioritization board and RECORD panel', 'FYDP spend plan and disconnects', 'PPBE cycles, positions and locks', 'PMO copies and submittals'],
      area: 'plan',
      status: 'live',
      url: '',
      icon: 'orbit',
    },
    {
      id: 'apex',
      name: 'APEX',
      full: 'Appropriation Planning & Execution',
      tagline: 'The active-year spend plan, drawn from the CCaR pull: every product the SFCB workbook made.',
      features: ['Summary and slide blocks', 'Appropriation and PMO tabs', 'Unobligated requirements', 'Export to Excel'],
      area: 'exec',
      status: 'live',
      url: '',
      icon: 'apex',
    },
    {
      id: 'spend-budget',
      name: 'Spend Plan to Budget',
      full: 'Spend plan against budget authority',
      tagline: 'Where the spend plan stands against the budget: what is planned, what is authorized, and the gap.',
      features: [],
      area: 'exec',
      status: 'dev',
      url: '',
      icon: 'budget',
    },
    {
      id: 'contracts',
      name: 'Contract Tracker',
      full: '',
      tagline: 'Every contract action in one list: what it is, where it stands, and when it lands.',
      features: [],
      area: 'contracts',
      status: 'dev',
      url: '',
      icon: 'contract',
    },
  ],

};
