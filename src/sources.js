// WHERE EACH TOOL'S LATEST VERSION LIVES ON GITHUB. Maintainer copy only.
//
// This file is built into maintainer/sustainment-dashboard-maintainer.html and NEVER into sustainment-dashboard.html,
// the copy the team opens from Teams. `npm run check` fails if a GitHub address reaches the team copy.
//
// Keyed by the tool's id in tools.js; 'hub' is this dashboard itself.
//   repo      owner/name on GitHub
//   path      the file to download, from the repository's root
//   branch    the branch whose copy is the latest (normally 'main')
//   version   what you last uploaded to Teams, as you want to read it (optional; the page cannot ask GitHub for it)
//   notes     a file in the same repository that says what changed (optional; without one, the file's history is linked)

const SOURCES = {
  hub:   { repo: 'bradludington-ui/sustainment-dashboard', path: 'sustainment-dashboard.html',     branch: 'main', version: 'v1',    notes: '' },
  orbit: { repo: 'bradludington-ui/orbit-board',           path: 'prioritization-board-grid.html', branch: 'main', version: 'v2.17', notes: 'NEXT-VERSION.md' },
  apex:  { repo: 'bradludington-ui/orbit-board',           path: 'apex/apex.html',                 branch: 'main', version: '',      notes: '' },
};
