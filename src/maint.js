'use strict';
// THE SETTINGS PANEL: each tool's latest version on GitHub. Built into the maintainer copy only
// (maintainer/sustainment-dashboard-maintainer.html), after sources.js and before app.js; the team copy carries
// neither this file nor sources.js, so it has no gear, no panel and no GitHub address. app.js draws the gear only when
// openSettings exists. Everything here runs after app.js has loaded (from a click), so it may use app.js's helpers.
const GH = 'https://github.com/';
const ghPart = s => String(s || '').split('/').map(encodeURIComponent).join('/');
const ghOk = src => src && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(src.repo || '') && src.path && !/\.\./.test(src.path) && /^[A-Za-z0-9_./-]+$/.test(src.branch || 'main');
const ghLinks = src => {
  const br = ghPart(src.branch || 'main'), repo = src.repo, path = ghPart(src.path);
  return {
    download: GH + repo + '/raw/' + br + '/' + path,
    view: GH + repo + '/blob/' + br + '/' + path,
    changes: src.notes ? GH + repo + '/blob/' + br + '/' + ghPart(src.notes) : GH + repo + '/commits/' + br + '/' + path,
    repo: GH + repo,
  };
};
function settingsHtml() {
  const rows = [{ id: 'hub', name: DASH.title, icon: 'hub' }].concat(tools())
    .map(t => ({ t, src: SOURCES[t.id] }));
  const ext = '<span class="vh"> (opens GitHub in a new tab)</span>';
  const a = (href, label, cls) => '<a class="btn' + (cls ? ' ' + cls : '') + '" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + label + ext + '</a>';
  const body = rows.map(({ t, src }) => {
    const ic = t.id === 'hub' ? ICONS.hub() : iconOf(t);
    let right;
    if (!src) right = '<span class="hint">No source recorded. Add one to <code>src/sources.js</code> once it is on GitHub.</span>';
    else if (!ghOk(src)) right = '<span class="hint err">Its entry in <code>src/sources.js</code> is not a GitHub repository and file.</span>';
    else {
      const L = ghLinks(src);
      right = '<div class="sacts">' + a(L.download, UI.download + 'Download latest', 'pri') + a(L.view, 'View on GitHub') + a(L.changes, src.notes ? 'What changed' : 'History') + '</div>'
        + '<div class="spath"><code>' + esc(src.repo) + '</code> › <code>' + esc(src.path) + '</code> on <code>' + esc(src.branch || 'main') + '</code></div>';
    }
    return '<li class="srow"><span class="ico">' + ic + '</span><div class="sname"><b>' + esc(t.name) + '</b>'
      + (src && src.version ? '<span class="sver">On Teams: ' + esc(src.version) + '</span>' : '') + '</div>' + right + '</li>';
  }).join('');
  return '<form method="dialog" class="sdlg-in"><header><h2 id="sdlgT">Settings: latest versions</h2><button class="x" value="close" aria-label="Close">×</button></header>'
    + '<p class="snote">This panel is in your maintainer copy only. The copy on Teams has no gear and no GitHub address in it. '
    + 'Download latest takes the file as it stands on its branch; a private repository asks you to sign in to GitHub first.</p>'
    + '<ul class="slist">' + body + '</ul></form>';
}
function openSettings() {
  const d = document.getElementById('sdlg');
  d.innerHTML = settingsHtml();
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  d.querySelector('a,button')?.focus();
}
