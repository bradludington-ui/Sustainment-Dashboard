'use strict';
// THE MAINTAINER'S TOOLS: the Settings panel (each tool's latest version on GitHub) and the catalog editor (add, change
// and delete links and sections, Save, Save team copy, Import links). Built into the maintainer copy only, inside a
// fence; the team copy is the maintainer copy with the fences cut out (build.mjs teamOf, and saveTeam below, the same
// way), so the team copy has no gear, no editor and no GitHub address.
//
// Everything here runs after app.js has loaded (from MAINT_HOOKS.init, or a click), so it may use app.js's helpers;
// at the top level it may only declare.
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
  return '<div class="sdlg-in"><header><h2 id="sdlgT">Settings: latest versions</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header>'
    + '<p class="snote">This panel is in your maintainer copy only. The copy on Teams has no gear and no GitHub address in it. '
    + 'Download latest takes the file as it stands on its branch; a private repository asks you to sign in to GitHub first.</p>'
    + '<ul class="slist">' + body + '</ul></div>';
}
function openSettings() {
  const d = document.getElementById('sdlg');
  d.innerHTML = settingsHtml();
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  d.querySelector('a,button')?.focus();
}


// ===================================================================================================================
// THE CATALOG EDITOR
//
// The record is the file. CATALOG (app.js) is read from the file's data block; an edit changes CATALOG and is kept in
// this browser at once as a draft (sdash.draft), so a closed tab loses nothing. Save writes the maintainer file with the
// catalog in its data block; Save team copy writes the team's file from the same page with the fences cut out.
// A draft remembers which saved catalog it started from (base): a draft made against another copy is never laid over
// this one without asking.

const SRC0 = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;   // this page as it opened, before it drew
const FA = '/*@' + 'MAINT>*/', FB = '/*<' + 'MAINT@*/';                // built from pieces: this file sits inside a fence
const ED = { on: false, fileSig: '', teamSig: '', dirty: false, undo: null };
// every part of a catalog that is written to a file. sigOf leaves out meta.updated, the stamp Save writes: saving the
// team copy must not make the maintainer copy read as changed, nor the other way round.
const catOut = cat => ({ meta: cat.meta || {}, categories: cat.categories, items: cat.items, notices: cat.notices || [], glossary: cat.glossary || [] });
const sigOf = cat => { const o = catOut(cat), m = { ...o.meta }; delete m.updated; delete m.version; const j = JSON.stringify({ ...o, meta: m }); let h = 5381; for (let i = 0; i < j.length; i++) h = ((h * 33) ^ j.charCodeAt(i)) >>> 0; return j.length + '.' + h.toString(36); };
const plainCat = () => JSON.parse(JSON.stringify(catOut(CATALOG)));

function edKeep() {   // after every edit: keep the draft, mark unsaved, redraw
  ED.dirty = sigOf(CATALOG) !== ED.fileSig;
  if (ED.dirty) store.set('draft', { base: ED.fileSig, cat: plainCat(), t: Date.now() });
  else try { localStorage.removeItem('sdash.draft'); } catch {}
  draw();
}
function slugId(name, taken) {
  let id = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item', n = 2;
  const base = id; while (taken.has(id)) id = base + '-' + n++;
  return id;
}

// ---- the page's own file, rewritten: the catalog goes into the data block, nothing else changes
function htmlWith(cat, team) {
  const json = JSON.stringify(catOut(cat)).replace(/</g, '\\u003c');
  const re = /(<script id="catData" type="application\/json">)[\s\S]*?(<\/script>)/;
  if (!re.test(SRC0)) throw new Error('this page has lost its catalog block');
  let html = SRC0.replace(re, (m, a, b) => a + json + b);
  if (team) {
    let out = '', i = 0, j;
    while ((j = html.indexOf(FA, i)) >= 0) { const k = html.indexOf(FB, j); if (k < 0) throw new Error('a maintainer fence is not closed'); out += html.slice(i, j); i = k + FB.length; }
    html = (out + html.slice(i)).replace('<title>Sustainment Dashboard (maintainer)</title>', '<title>Sustainment Dashboard</title>');
    if (html.includes(FA) || /github/i.test(html)) throw new Error('the team copy would still carry maintainer material');
  }
  return html;
}

// ---- saving. Where the browser can write files (Edge, Chrome), the maintainer file is written in place and its handle
// remembered; elsewhere, and if anything fails, the file is downloaded instead and the page says so.
const IDB = {
  db() { return new Promise((ok, no) => { const r = indexedDB.open('sdash', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); },
  async get(k) { try { const d = await IDB.db(); return await new Promise(ok => { const r = d.transaction('h').objectStore('h').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }); } catch { return null; } },
  async set(k, v) { try { const d = await IDB.db(); await new Promise(ok => { const t = d.transaction('h', 'readwrite'); t.objectStore('h').put(v, k); t.oncomplete = ok; t.onerror = ok; }); } catch {} },
};
function download(name, html) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// what is already in a file decides whether it may be written over: a new or empty file, or one of the right kind
async function fileKind(handle) {
  try { const t = await (await handle.getFile()).text(); if (!t.trim()) return 'empty'; if (!t.includes('id="catData"')) return 'other'; return t.includes(FA) ? 'maint' : 'team'; }
  catch { return 'unreadable'; }
}
async function writeTo(handle, html) {
  const w = await handle.createWritable(); await w.write(html); await w.close();
}
async function pickFile(name, key) {
  if (typeof window.showSaveFilePicker !== 'function') return null;
  const h = await window.showSaveFilePicker({ suggestedName: name, id: key, types: [{ description: 'Web page', accept: { 'text/html': ['.html'] } }] });
  return h;
}
async function saveFile({ team }) {
  const name = team ? 'sustainment-dashboard.html' : 'sustainment-dashboard-maintainer.html';
  const want = team ? 'team' : 'maint', key = team ? 'teamFile' : 'maintFile';
  // the file says when its links were saved ("Links updated 22 Nov 2026" on the page); the stamp lands only if the write does
  const stamp = new Date().toISOString();
  let html;
  try { html = htmlWith({ ...CATALOG, meta: { ...CATALOG.meta, updated: stamp, version: VERSION } }, team); } catch (e) { alert('Not saved: ' + e.message); return false; }
  try {
    let h = await IDB.get(key), fresh = false;
    if (h && h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') h = null;
    }
    if (!h) { h = await pickFile(name, key); fresh = true; }
    if (!h) { download(name, html); CATALOG.meta.updated = stamp; CATALOG.meta.version = VERSION; toast(name + ' downloaded: put it where the old one was'); return 'downloaded'; }
    const kind = await fileKind(h);
    // the Save window empties a file the moment it is chosen, so a fresh pick reads as empty: the name is the guard there
    if (fresh && !/\.html?$/i.test(h.name || '')) { alert('Not saved: “' + h.name + '” is not an .html file.'); return false; }
    if (fresh && team && /maintainer/i.test(h.name || '')) { alert('Not saved: “' + h.name + '” looks like your maintainer copy. Save the team copy under its own name, sustainment-dashboard.html.'); return false; }
    if (kind === 'other') { alert('Not saved: “' + h.name + '” is not a Sustainment Dashboard file, and is left as it was.'); return false; }
    if (kind !== 'empty' && kind !== 'unreadable' && kind !== want) {
      alert('Not saved: “' + h.name + '” is the ' + (kind === 'maint' ? 'maintainer copy' : 'team copy') + '. Choose the ' + (team ? 'team copy' : 'maintainer copy') + ' instead.');
      await IDB.set(key, null); return false;
    }
    await writeTo(h, html);
    await IDB.set(key, h);
    CATALOG.meta.updated = stamp; CATALOG.meta.version = VERSION;
    toast('Saved to ' + h.name);
    return 'written';
  } catch (e) {
    if (e && e.name === 'AbortError') return false;   // the person closed the Save window
    download(name, html); CATALOG.meta.updated = stamp; CATALOG.meta.version = VERSION;
    toast('Could not write the file (' + (e && e.message || e) + '); downloaded instead');
    return 'downloaded';
  }
}
async function edSave() {
  const r = await saveFile({ team: false });
  if (!r) return;
  ED.fileSig = sigOf(CATALOG);
  try { localStorage.removeItem('sdash.draft'); } catch {}
  edKeep();
}
async function edSaveTeam() {
  const r = await saveFile({ team: true });
  if (!r) return;
  ED.teamSig = sigOf(CATALOG); store.set('teamSig', ED.teamSig);
  draw();
}

// ---- the editing box (one <dialog>, used for a link and for a section)
function dlg(html, focusSel) {
  const d = document.getElementById('sdlg');
  d.innerHTML = '<div class="sdlg-in">' + html + '</div>';
  if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
  (d.querySelector(focusSel || 'input,select,textarea,button') || d).focus();
  return d;
}
function dlgClose() { const d = document.getElementById('sdlg'); if (d.open) d.close(); }
const field = (id, label, control, hint) => '<div class="ef"><label for="' + id + '">' + label + '</label>' + control + (hint ? '<div class="eh" id="' + id + '-h">' + hint + '</div>' : '') + '</div>';

function linkForm(key, presetCat) {
  const c = key ? citems().find(x => ckey(x) === key) : null;
  const v = c || { name: '', note: '', category: presetCat || (cats()[0] || {}).id || '', type: 'web', url: '' };
  const catOpts = cats().map(k => '<option value="' + esc(k.id) + '"' + (k.id === v.category ? ' selected' : '') + '>' + esc(k.name) + '</option>').join('')
    + (v.category && !catOf(v) ? '<option value="' + esc(v.category) + '" selected>Other</option>' : '');
  const typeOpts = Object.keys(TYPES).map(t => '<option value="' + t + '"' + (t === v.type ? ' selected' : '') + '>' + esc(TYPES[t].label) + '</option>').join('');
  dlg('<header><h2 id="sdlgT">' + (c ? 'Change a link' : 'Add a link') + '</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header>'
    + '<div class="eform">'
    + field('eName', 'Name', '<input id="eName" maxlength="120" value="' + esc(v.name) + '" autocomplete="off">')
    + field('eUrl', 'Link', '<input id="eUrl" type="url" maxlength="2000" placeholder="https://…" value="' + esc(v.url) + '" autocomplete="off">',
      'In Teams or SharePoint: the file’s ⋯ menu › Copy link. Leave it empty if you do not have it yet.')
    + '<div class="erow">' + field('eCat', 'Section', '<select id="eCat">' + catOpts + '</select>')
    + field('eType', 'Type', '<select id="eType">' + typeOpts + '</select>', 'Excel, PowerPoint and Word open in the desktop app.') + '</div>'
    + '<div class="erow">' + field('eNote', 'Note', '<input id="eNote" maxlength="200" value="' + esc(v.note) + '" placeholder="What it is, who owns it; for a session, its topic (optional)" autocomplete="off">')
    + '<div class="ef dt">' + '<label for="eDate">Date</label><input id="eDate" type="date" value="' + esc(v.date || '') + '"><div class="eh">Optional: a session or deadline.</div></div></div>'
    + field('eKw', 'Keywords', '<input id="eKw" maxlength="300" value="' + esc(v.keywords || '') + '" placeholder="Other words people search for: MIPR, DD 448, LES… (not shown)" autocomplete="off">')
    + '<label class="echk"><input type="checkbox" id="eChk"' + (!c || !v.checked ? ' checked' : '') + '> I checked this link works today'
    + (v.checked ? ' <span class="eh">(last checked ' + esc(dateTxt(v.checked)) + ')</span>' : '') + '</label>'
    + '<p class="eerr" id="eErr" role="alert"></p></div>'
    + '<footer>' + (c ? '<button type="button" class="btn danger" data-e="delLink" data-k="' + esc(key) + '">Delete</button>' : '')
    + '<span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button>'
    + '<button type="button" class="btn pri" data-e="saveLink" data-k="' + esc(key || '') + '">' + (c ? 'Save changes' : 'Add link') + '</button></footer>', '#eName');
  // the type follows the link while the person has not chosen one: a pasted Excel link reads as Excel
  const url = document.getElementById('eUrl'), type = document.getElementById('eType');
  let typed = !!c;
  type.addEventListener('change', () => { typed = true; });
  const share = () => {   // a sharing link (…/:x:/…) may open the browser even from "Open in Excel"; say so where it matters
    const h = document.getElementById('eUrl-h'), office = ['excel', 'powerpoint', 'word'].includes(type.value);
    h.textContent = office && /\/:[xpw]:\//i.test(url.value) ? 'This is a sharing link. If “Open in ' + TYPES[type.value].appName + '” opens the browser instead, use the file’s own address (in SharePoint: the file’s details › Path, or Open in app and copy it from the app).'
      : 'In Teams or SharePoint: the file’s ⋯ menu › Copy link. Leave it empty if you do not have it yet.';
  };
  url.addEventListener('input', () => { if (!typed) { const g = guessType(url.value); if (g) type.value = g; } share(); });
  type.addEventListener('change', share); share();
}
function guessType(u) {
  u = String(u).toLowerCase();
  if (/\.xls[xmb]?(\?|$)|\/:x:\//.test(u)) return 'excel';
  if (/\.ppt[xm]?(\?|$)|\/:p:\//.test(u)) return 'powerpoint';
  if (/\.doc[xm]?(\?|$)|\/:w:\//.test(u)) return 'word';
  if (/\.pdf(\?|$)|\/:b:\//.test(u)) return 'pdf';
  if (/\.(mp4|mov|wmv|m4v)(\?|$)|\/stream\.aspx|\/:v:\//.test(u)) return 'video';
  if (/teams\.microsoft\.(com|us)/.test(u)) return 'teams';
  if (/\.sharepoint\.(com|us)|\.sharepoint-mil\.us/.test(u)) return 'sharepoint';
  return '';
}
function saveLink(key) {
  const g = id => document.getElementById(id).value.trim(), err = document.getElementById('eErr');
  const name = g('eName'), url = g('eUrl');
  if (!name) { err.textContent = 'Give the link a name.'; document.getElementById('eName').focus(); return; }
  if (url && !linkOk(url)) { err.textContent = 'The link must start with https:// (copy it from the file’s ⋯ menu › Copy link).'; document.getElementById('eUrl').focus(); return; }
  const others = citems().filter(x => ckey(x) !== key);
  if (others.some(x => x.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'Another link already has that name. Give this one a name of its own.'; document.getElementById('eName').focus(); return; }
  const rec = { name, note: g('eNote'), category: g('eCat'), type: g('eType'), url };
  const date = g('eDate');
  if (date && !dateOk(date)) { err.textContent = 'That is not a date. Pick one from the calendar, or leave it empty.'; document.getElementById('eDate').focus(); return; }
  if (date) rec.date = date;
  if (g('eKw')) rec.keywords = g('eKw');
  const prev = key ? CATALOG.items.find(x => ckey(x) === key) : null;
  if (document.getElementById('eChk').checked && url) rec.checked = today(); else if (prev && prev.checked && prev.url === url) rec.checked = prev.checked;
  if (key) {
    const i = CATALOG.items.findIndex(x => ckey(x) === key);
    // a link keeps its key (pins and recently opened follow it) however it is renamed
    rec.id = CATALOG.items[i].id || key.slice(2);
    CATALOG.items[i] = rec;
  } else {
    rec.id = slugId(name, new Set(CATALOG.items.map(x => ckey(x).slice(2))));
    CATALOG.items.push(rec);
  }
  dlgClose(); edKeep();
  toast(key ? 'Link changed (not saved yet)' : 'Link added (not saved yet)');
}
function delLink(key) {
  const i = CATALOG.items.findIndex(x => ckey(x) === key);
  if (i < 0) return;
  const [gone] = CATALOG.items.splice(i, 1);
  ED.undo = { kind: 'link', rec: gone, at: i };
  dlgClose(); edKeep();
  toast('Deleted “' + gone.name + '”');
}

function sectionForm(id) {
  const k = id ? cats().find(x => x.id === id) : null;
  const n = k ? citems().filter(c => c.category === k.id).length : 0;
  dlg('<header><h2 id="sdlgT">' + (k ? 'Change a section' : 'Add a section') + '</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header>'
    + '<div class="eform">' + field('sName', 'Name', '<input id="sName" maxlength="60" value="' + esc(k ? k.name : '') + '" autocomplete="off">')
    + field('sBlurb', 'Description', '<input id="sBlurb" maxlength="160" value="' + esc(k ? k.blurb : '') + '" placeholder="Shown while editing, and when the section is empty (optional)" autocomplete="off">')
    + '<label class="echk"><input type="checkbox" id="sTab"' + (k && k.tab ? ' checked' : '') + '> Show as a tab at the top (like Air Force and Navy), so its links are one click away</label>'
    + '<p class="eerr" id="eErr" role="alert"></p></div>'
    + '<footer>' + (k ? '<button type="button" class="btn danger" data-e="delSection" data-s="' + esc(k.id) + '">Delete section' + (n ? ' and its ' + n + ' link' + (n > 1 ? 's' : '') : '') + '</button>' : '')
    + '<span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button>'
    + '<button type="button" class="btn pri" data-e="saveSection" data-s="' + esc(id || '') + '">' + (k ? 'Save changes' : 'Add section') + '</button></footer>', '#sName');
}
function saveSection(id) {
  const name = document.getElementById('sName').value.trim(), blurb = document.getElementById('sBlurb').value.trim(), err = document.getElementById('eErr');
  if (!name) { err.textContent = 'Give the section a name.'; return; }
  if (cats().some(k => k.id !== id && k.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'There is already a section with that name.'; return; }
  const tab = document.getElementById('sTab').checked;
  let k;
  if (id) { k = CATALOG.categories.find(x => x.id === id); k.name = name; k.blurb = blurb; }
  else { k = { id: slugId(name, new Set(cats().map(x => x.id))), name, blurb }; CATALOG.categories.push(k); }
  if (tab) k.tab = true; else { delete k.tab; delete k.tabName; }
  dlgClose(); edKeep();
  toast(id ? 'Section changed (not saved yet)' : 'Section added (not saved yet)');
}
function delSection(id) {
  const k = cats().find(x => x.id === id); if (!k) return;
  const links = citems().filter(c => c.category === id);
  if (links.length && !confirm('Delete the section “' + k.name + '” and its ' + links.length + ' link' + (links.length > 1 ? 's' : '') + '?\n\n' + links.map(c => '• ' + c.name).join('\n') + '\n\nUndo will put them back until you delete something else.')) return;
  const at = CATALOG.categories.indexOf(k);
  CATALOG.categories.splice(at, 1);
  CATALOG.items = CATALOG.items.filter(c => c.category !== id);
  ED.undo = { kind: 'section', rec: k, at, links };
  dlgClose(); edKeep();
  toast('Deleted the section “' + k.name + '”');
}
function moveSection(id, d) {
  const a = CATALOG.categories, i = a.findIndex(x => x.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]];
  edKeep();
  (document.querySelector('[data-e="mv"][data-s="' + CSS.escape(id) + '"][data-d="' + d + '"]:not([disabled])') || document.querySelector('[data-e="mv"][data-s="' + CSS.escape(id) + '"]:not([disabled])'))?.focus();
}
function edUndo() {
  const u = ED.undo; if (!u) return;
  if (u.kind === 'link') CATALOG.items.splice(Math.min(u.at, CATALOG.items.length), 0, u.rec);
  else { CATALOG.categories.splice(Math.min(u.at, CATALOG.categories.length), 0, u.rec); CATALOG.items.push(...u.links); }
  ED.undo = null; edKeep(); toast('Put back');
}
function edDiscard() {
  if (!confirm('Throw away every change since the last Save, and go back to the links saved in this file?')) return;
  CATALOG = readCatalog(); ED.undo = null; edKeep(); toast('Back to the saved links');
}

// ---- links from another copy: a newer build starts with the starting catalog, and this carries Brad's across
function importPick() { document.getElementById('impFile').click(); }
let IMP = null;   // the catalog read from the file chosen, held while the import box is open
async function importFile(f) {
  if (!f) return;
  if (f.size > 20e6) { alert('Not imported: “' + f.name + '” is too large to be a dashboard.'); return; }
  const t = await f.text();
  const m = /<script id="catData" type="application\/json">([\s\S]*?)<\/script>/.exec(t);
  if (!m) { alert('Not imported: “' + f.name + '” is not a Sustainment Dashboard file with links in it.'); return; }
  let cat;
  try { cat = normCatalog(JSON.parse(m[1])); } catch (e) { alert('Not imported: the links in “' + f.name + '” could not be read (' + e.message + ').'); return; }
  IMP = { cat, name: f.name, team: !t.includes(FA) };
  const M = cat.meta, saved = M.updated ? new Date(M.updated) : null;
  const n = (x, w) => x + ' ' + w + (x === 1 ? '' : 's');
  const sum = c => n(c.items.length, 'link') + ', ' + n(c.categories.length, 'section') + ', ' + n(c.glossary.length, 'glossary term') + ', ' + n(c.notices.length, 'announcement');
  const merge = importMerge(cat, true);
  dlg('<header><h2 id="sdlgT">Import from your last version</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + '<table class="imptab"><tr><th>File</th><td>' + esc(f.name) + (IMP.team ? ' <span class="eh">(a team copy)</span>' : '') + '</td></tr>'
    + '<tr><th>Written by</th><td>' + (M.version ? 'Sustainment Dashboard ' + esc(M.version) : 'a version before v1.7') + '</td></tr>'
    + '<tr><th>Saved</th><td>' + (saved ? esc(saved.toLocaleString()) : 'never saved') + '</td></tr>'
    + '<tr><th>Holds</th><td>' + esc(sum(cat)) + (M.contact ? ', contact ' + esc(M.contact) : '') + '</td></tr>'
    + '<tr><th>This page holds</th><td>' + esc(sum(CATALOG)) + '</td></tr></table>'
    + (cat.fixed.length ? '<p class="eh">Read with ' + cat.fixed.length + ' change(s): ' + cat.fixed.slice(0, 6).map(esc).join('; ') + '</p>' : '')
    + '<p class="eh"><b>Replace with these</b> makes this page exactly what that file held (use it when this is a fresh download). '
    + '<b>Add the ones I don’t have</b> keeps everything on this page and adds ' + esc(merge) + '. Nothing is written to a file until you Save.</p></div>'
    + '<footer><span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button>'
    + '<button type="button" class="btn" data-e="impMerge">Add the ones I don’t have</button>'
    + '<button type="button" class="btn pri" data-e="impReplace">Replace with these</button></footer>', '[data-e="impReplace"]');
}
// adds what this page lacks (matched by name, ignoring case); with dry, only says what it would add
function importMerge(cat, dry) {
  const has = (list, k, v) => list.some(x => String(x[k]).toLowerCase() === String(v).toLowerCase());
  const secs = cat.categories.filter(k => !has(CATALOG.categories, 'name', k.name));
  const links = cat.items.filter(c => !has(CATALOG.items, 'name', c.name));
  const terms = cat.glossary.filter(g => !has(CATALOG.glossary || [], 'term', g.term));
  const news = cat.notices.filter(x => !has(CATALOG.notices || [], 'text', x.text));
  const n = (x, w) => x + ' ' + w + (x === 1 ? '' : 's');
  if (dry) return [n(links.length, 'link'), n(secs.length, 'section'), n(terms.length, 'term'), n(news.length, 'announcement')].join(', ');
  const ids = new Set(cats().map(k => k.id));
  for (const k of secs) { const nk = { ...k }; if (ids.has(nk.id)) nk.id = slugId(nk.name, ids); ids.add(nk.id); CATALOG.categories.push(nk); }
  // a link keeps its section by the section's NAME, which is what both copies agree on
  const secName = id => (cat.categories.find(k => k.id === id) || {}).name;
  const taken = new Set(CATALOG.items.map(x => ckey(x).slice(2)));
  for (const c of links) {
    const it = { ...c }, sn = secName(c.category), here = sn && CATALOG.categories.find(k => k.name.toLowerCase() === sn.toLowerCase());
    it.category = here ? here.id : c.category;
    if (taken.has(ckey(it).slice(2))) it.id = slugId(it.name, taken);
    taken.add(ckey(it).slice(2)); CATALOG.items.push(it);
  }
  CATALOG.glossary = (CATALOG.glossary || []).concat(terms);
  CATALOG.notices = (CATALOG.notices || []).concat(news);
  if (!CATALOG.meta.contact && cat.meta.contact) CATALOG.meta.contact = cat.meta.contact;
  if (!CATALOG.meta.office && cat.meta.office) CATALOG.meta.office = cat.meta.office;
  return links.length + secs.length + terms.length + news.length;
}
function importReplace() {
  const c = IMP.cat, keepVer = CATALOG.meta.version;
  CATALOG = { meta: { ...c.meta }, categories: c.categories, items: c.items, notices: c.notices, glossary: c.glossary, fixed: c.fixed };
  // what this page's file says it is stays as it is until it is saved: the version and stamp belong to the file written
  delete CATALOG.meta.updated; delete CATALOG.meta.version; if (keepVer) CATALOG.meta.version = keepVer;
  dlgClose(); ED.undo = null; edKeep();
  toast('Imported ' + c.items.length + ' links from ' + IMP.name + ' (not saved yet: press Save)');
}

// ---- the hooks app.js calls
const MAINT_HOOKS = {
  editing: () => ED.on,
  init() {
    ED.fileSig = sigOf(CATALOG);
    ED.teamSig = store.get('teamSig', '');
    ED.on = !!store.get('editing', false);
    const d = store.get('draft', null);
    if (d && d.cat && d.base === ED.fileSig) { CATALOG = normCatalog(d.cat); ED.dirty = sigOf(CATALOG) !== ED.fileSig; }
    else if (d && d.cat && sigOf(normCatalog(d.cat)) !== ED.fileSig) {
      // a draft made against a different saved catalog (another copy, or this one before a Save elsewhere)
      if (confirm('This browser holds unsaved catalog edits made to a different copy of the dashboard (' + new Date(d.t || 0).toLocaleString() + ').\n\nOK: show those edits here (Save to keep them).\nCancel: throw them away and show this file’s links.')) {
        CATALOG = normCatalog(d.cat); ED.dirty = true; store.set('draft', { base: ED.fileSig, cat: plainCat(), t: Date.now() });
      } else try { localStorage.removeItem('sdash.draft'); } catch {}
    } else if (d) try { localStorage.removeItem('sdash.draft'); } catch {}
    document.body.insertAdjacentHTML('beforeend', '<input type="file" id="impFile" accept=".html,.htm" hidden>');
    document.getElementById('impFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; importFile(f); });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      const k = b.dataset.k, sId = b.dataset.s;
      switch (b.dataset.e) {
        case 'toggle': ED.on = !ED.on; store.set('editing', ED.on); if (ED.on && S.tab === 'tools') { S.tab = 'all'; store.set('tab', 'all'); } draw(); document.querySelector('[data-e="toggle"]')?.focus(); break;
        case 'save': edSave(); break;
        case 'saveTeam': edSaveTeam(); break;
        case 'import': importPick(); break;
        case 'impReplace': importReplace(); break;
        case 'impMerge': { const k = importMerge(IMP.cat, false); dlgClose(); ED.undo = null; edKeep(); toast('Added ' + k + ' from ' + IMP.name + ' (not saved yet: press Save)'); break; }
        case 'discard': edDiscard(); break;
        case 'undo': edUndo(); break;
        case 'addLink': linkForm('', sId); break;
        case 'editLink': linkForm(k); break;
        case 'delLink': if (confirm('Delete “' + (citems().find(x => ckey(x) === k) || {}).name + '”?')) delLink(k); break;
        case 'saveLink': saveLink(k); break;
        case 'addSection': sectionForm(''); break;
        case 'editSection': sectionForm(sId); break;
        case 'delSection': delSection(sId); break;
        case 'saveSection': saveSection(sId); break;
        case 'mv': moveSection(sId, +b.dataset.d); break;
        case 'close': dlgClose(); break;
        case 'paste': pasteForm(); break;
        case 'pasteCheck': pasteCheck(false); break;
        case 'pasteAdd': pasteCheck(true); break;
        case 'export': exportCsv(); break;
        case 'checkList': checkList(); break;
        case 'markChecked': markChecked(k); break;
        case 'office': officeForm(); break;
        case 'saveOffice': saveOffice(); break;
        case 'news': newsList(); break;
        case 'addNews': newsForm(-1); break;
        case 'editNews': newsForm(+b.dataset.i); break;
        case 'saveNews': saveNews(+b.dataset.i); break;
        case 'delNews': delNews(+b.dataset.i); break;
        case 'addTerm': termForm(''); break;
        case 'editTerm': termForm(b.dataset.t); break;
        case 'saveTerm': saveTerm(b.dataset.t); break;
        case 'delTerm': delTerm(b.dataset.t); break;
      }
    });
    // Enter in a box saves it
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.closest('#sdlg .eform') || /^(SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      e.preventDefault(); document.querySelector('#sdlg footer .btn.pri')?.click();
    });
    if (CATALOG.fixed && CATALOG.fixed.length) setTimeout(() => toast('The catalog was read with ' + CATALOG.fixed.length + ' change(s); see the console'), 300), console.warn('catalog:', CATALOG.fixed);
  },
  drawBar() {
    const bar = document.getElementById('maintBar'); if (!bar) return;
    const teamOld = ED.teamSig !== sigOf(CATALOG);
    const fresh = !CATALOG.meta.updated && !ED.dirty;   // a copy nobody has saved yet: a new version, straight from GitHub
    bar.innerHTML = (fresh ? '<span class="newver"><b>New copy (' + esc(VERSION) + ').</b> Bring your links across from your last version first: '
        + '<button type="button" class="mb pri" data-e="import">Import from last version…</button></span><span class="brk"></span>' : '')
      + '<span class="mt">Maintainer copy: keep this file to yourself.' + (CATALOG.meta.contact || fresh ? '' : ' <button type="button" class="lnk" data-e="office">Add your contact email</button> so people can report broken links.') + '</span>'
      + '<button type="button" class="mb" data-e="toggle" aria-pressed="' + ED.on + '">' + (ED.on ? 'Done editing' : 'Edit catalog') + '</button>'
      + (ED.dirty ? '<span class="pill warn" role="status">Unsaved changes</span>' : fresh ? '' : '<span class="pill" role="status">Saved</span>')
      + (ED.undo ? '<button type="button" class="mb" data-e="undo">Undo delete</button>' : '')
      + '<span class="sp"></span>'
      + (ED.on ? '<button type="button" class="mb" data-e="paste">Paste from Excel…</button><button type="button" class="mb" data-e="export">Export to Excel</button>'
        + '<button type="button" class="mb" data-e="checkList">Needs checking' + (needsCheck().length ? ' <b class="cnt">' + needsCheck().length + '</b>' : '') + '</button>'
        + '<button type="button" class="mb" data-e="office">Office settings…</button>'
        + (ED.dirty ? '<button type="button" class="mb" data-e="discard">Discard changes</button>' : '') : '')
      + (fresh ? '' : '<button type="button" class="mb" data-e="import">Import from last version…</button>')
      + '<button type="button" class="mb pri" data-e="save"' + (ED.dirty ? '' : ' aria-disabled="true"') + '>Save</button>'
      + '<button type="button" class="mb" data-e="saveTeam" title="Write sustainment-dashboard.html, the copy for Teams">Save team copy…' + (teamOld ? ' <span class="dot-warn" aria-label="(out of date)">●</span>' : '') + '</button>';
  },
  rowActs(c, k) {
    if (!ED.on) return '';
    return '<button type="button" class="lic ed" data-e="editLink" data-k="' + esc(k) + '" title="Change" aria-label="Change ' + esc(c.name) + '">' + UI.edit + '</button>'
      + '<button type="button" class="lic ed danger" data-e="delLink" data-k="' + esc(k) + '" title="Delete" aria-label="Delete ' + esc(c.name) + '">' + UI.trash + '</button>';
  },
  sectionActs(g) {
    if (!ED.on) return '';
    const i = cats().findIndex(k => k.id === g.id);
    return '<span class="shacts"><button type="button" class="shb wide" data-e="addLink" data-s="' + esc(g.id) + '">+ Link</button>'
      + '<button type="button" class="shb" data-e="editSection" data-s="' + esc(g.id) + '" title="Change section" aria-label="Change the section ' + esc(g.name) + '">' + UI.edit + '</button>'
      + '<button type="button" class="shb" data-e="mv" data-s="' + esc(g.id) + '" data-d="-1" title="Move earlier" aria-label="Move ' + esc(g.name) + ' earlier"' + (i > 0 ? '' : ' disabled') + '>◀</button>'
      + '<button type="button" class="shb" data-e="mv" data-s="' + esc(g.id) + '" data-d="1" title="Move later" aria-label="Move ' + esc(g.name) + ' later"' + (i < cats().length - 1 ? '' : ' disabled') + '>▶</button></span>';
  },
  catalogFoot: () => '<div class="addsec"><button type="button" class="btn" data-e="addSection">+ Add a section</button></div>',
  newsActs: () => ED.on ? ' <span class="nacts"><button type="button" class="btn sm" data-e="addNews">+ Announcement</button>' + ((CATALOG.notices || []).length ? '<button type="button" class="btn sm" data-e="news">All announcements</button>' : '') + '</span>' : '',
  glossFoot: () => ED.on ? '<div class="addsec top"><button type="button" class="btn" data-e="addTerm">+ Add a term</button></div>' : '',
  termActs: g => ED.on ? ' <button type="button" class="lic ed" data-e="editTerm" data-t="' + esc(g.term) + '" aria-label="Change ' + esc(g.term) + '">' + UI.edit + '</button><button type="button" class="lic ed danger" data-e="delTerm" data-t="' + esc(g.term) + '" aria-label="Delete ' + esc(g.term) + '">' + UI.trash + '</button>' : '',
  // a new section joins the Everything tab; take the person there so they see it arrive
  footNote: () => ' Tools are listed in src/tools.js; links are edited here, with Edit catalog.',
};


// ===================================================================================================================
// THE OFFICE TOOLS: settings, links that need checking, Excel in and out, announcements, the glossary

// ---- office settings: who broken-link reports and suggestions go to
function officeForm() {
  dlg('<header><h2 id="sdlgT">Office settings</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + field('oMail', 'Contact email', '<input id="oMail" type="email" maxlength="120" value="' + esc(CATALOG.meta.contact || '') + '" placeholder="the address reports and suggestions go to" autocomplete="off">',
      'Shown to the team: the ⚑ on every link and Suggest a link open an email to this address. A shared office mailbox outlasts any one person.')
    + field('oName', 'Office name', '<input id="oName" maxlength="80" value="' + esc(CATALOG.meta.office || '') + '" placeholder="optional" autocomplete="off">')
    + '<p class="eerr" id="eErr" role="alert"></p></div><footer><span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button><button type="button" class="btn pri" data-e="saveOffice">Save settings</button></footer>', '#oMail');
}
function saveOffice() {
  const m = document.getElementById('oMail').value.trim(), o = document.getElementById('oName').value.trim();
  if (m && !emailOk(m)) { document.getElementById('eErr').textContent = 'That is not an email address.'; return; }
  if (m) CATALOG.meta.contact = m; else delete CATALOG.meta.contact;
  if (o) CATALOG.meta.office = o; else delete CATALOG.meta.office;
  dlgClose(); edKeep(); toast('Settings changed (not saved yet)');
}

// ---- links nobody has checked lately (half a year), and links still waiting for an address
const CHECK_DAYS = 180;
function needsCheck() {
  const cut = (() => { const d = new Date(); d.setDate(d.getDate() - CHECK_DAYS); return d.toISOString().slice(0, 10); })();
  return citems().filter(c => linkOk(c.url) && (!c.checked || c.checked < cut)).sort((a, b) => String(a.checked || '').localeCompare(String(b.checked || '')));
}
function checkList() {
  const due = needsCheck(), none = citems().filter(c => !linkOk(c.url));
  const row = c => '<li class="lrow">' + typeTile(c) + '<span class="lmain">' + (hrefOf(c) ? aOpen(c, ckey(c), 'cname', esc(c.name)) : '<span class="cname">' + esc(c.name) + '</span>')
    + '<small>' + esc((catOf(c) || {}).name || 'Other') + ' · ' + (c.checked ? 'last checked ' + esc(dateTxt(c.checked)) : 'never checked') + '</small></span>'
    + (linkOk(c.url) ? '<button type="button" class="btn sm" data-e="markChecked" data-k="' + esc(ckey(c)) + '">It works</button>' : '<button type="button" class="btn sm" data-e="editLink" data-k="' + esc(ckey(c)) + '">Add its link</button>') + '</li>';
  dlg('<header><h2 id="sdlgT">Links that need checking</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + '<p class="eh">Open each one; if it still goes to the right place, press It works. Links not checked in ' + CHECK_DAYS + ' days are listed, oldest first.</p>'
    + (due.length ? '<ul class="llist boxed">' + due.map(row).join('') + '</ul>' : '<p class="sempty">Every link has been checked in the last ' + CHECK_DAYS + ' days.</p>')
    + (none.length ? '<h3 class="eh3">No link yet (' + none.length + ')</h3><ul class="llist boxed">' + none.map(row).join('') + '</ul>' : '')
    + '</div><footer><span class="sp"></span><button type="button" class="btn pri" data-e="close">Done</button></footer>', 'button');
}
function markChecked(k) {
  const c = CATALOG.items.find(x => ckey(x) === k); if (!c) return;
  c.checked = today(); edKeep(); checkList(); toast('“' + c.name + '” checked');
}

// ---- Excel out: every link as a spreadsheet (CSV, which Excel opens), for a review, a backup or a hand-over
const csvCell = v => {
  let t = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;   // a cell Excel would run as a formula is written as text
  return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
const CSV_COLS = ['Name', 'Link', 'Section', 'Type', 'Note', 'Date', 'Keywords', 'Last checked'];
function exportCsv() {
  const rows = [CSV_COLS].concat(citems().sort((a, b) => cats().findIndex(k => k.id === a.category) - cats().findIndex(k => k.id === b.category) || linkOrder(a, b))
    .map(c => [c.name, c.url, (catOf(c) || {}).name || 'Other', (TYPES[c.type] || TYPES.web).label, c.note, c.date || '', c.keywords || '', c.checked || '']));
  const csv = '\ufeff' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'sustainment-dashboard-links-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Exported ' + (rows.length - 1) + ' links');
}

// ---- Excel in: rows pasted from a spreadsheet. Checked first, then added in one go; a name already in the catalog is
// that link, changed; a section that does not exist yet is made.
function pasteForm() {
  dlg('<header><h2 id="sdlgT">Paste links from Excel</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + '<p class="eh">In Excel, select the rows (with their heading row) and copy; paste them below. Columns, by heading: <b>Name</b> and <b>Link</b>, and any of Section, Type, Note, Date, Keywords. '
    + 'Without headings the columns are read in that order. A name already in the catalog updates that link; a new section is made for you. Type left empty is worked out from the link.</p>'
    + '<textarea id="pIn" rows="9" spellcheck="false" placeholder="Name&#9;Link&#9;Section&#9;Type&#9;Note"></textarea>'
    + '<div id="pOut" role="status"></div></div>'
    + '<footer><span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button><button type="button" class="btn" data-e="pasteCheck">Check</button>'
    + '<button type="button" class="btn pri" data-e="pasteAdd" disabled>Add them</button></footer>', '#pIn');
  document.getElementById('pIn').addEventListener('input', () => { document.querySelector('[data-e="pasteAdd"]').disabled = true; document.getElementById('pOut').innerHTML = ''; });
}
function splitRows(t) {   // tab-separated (what Excel copies) or comma-separated, with quoted cells
  const sep = t.includes('\t') ? '\t' : ',', rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
    if (ch === '"' && cell === '') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(Boolean));
}
function pasteDate(v) {
  if (!v) return '';
  if (dateOk(v)) return v;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(v);   // 11/22/2026, as Excel shows a date in the US
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3], d = y + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0'); if (dateOk(d)) return d; }
  return null;
}
function pasteCheck(apply) {
  const out = document.getElementById('pOut'), rows = splitRows(document.getElementById('pIn').value);
  if (!rows.length) { out.innerHTML = '<p class="eerr">Nothing to read: paste the rows first.</p>'; return; }
  const H = { name: /^(name|title)$/, url: /^(link|url|address|web address)$/, section: /^(section|category|group)$/, type: /^(type|kind)$/, note: /^(note|notes|description|topic)$/, date: /^(date|when)$/, keywords: /^(keywords?|tags?)$/ };
  const first = rows[0].map(c => c.toLowerCase()), col = {};
  const hasHead = first.some(c => H.name.test(c)) && first.some(c => H.url.test(c));
  if (hasHead) first.forEach((c, i) => { for (const k in H) if (H[k].test(c) && !(k in col)) col[k] = i; });
  else ['name', 'url', 'section', 'type', 'note', 'date', 'keywords'].forEach((k, i) => { col[k] = i; });
  const body = hasHead ? rows.slice(1) : rows, errs = [], adds = [], upd = [], newSecs = new Map();
  const typeOf = v => { const l = v.toLowerCase(); return Object.keys(TYPES).find(k => k === l || TYPES[k].label.toLowerCase() === l) || (l === 'website' || l === 'site' ? 'web' : l === 'video' ? 'video' : ''); };
  body.forEach((r, i) => {
    const n = (hasHead ? i + 2 : i + 1), get = k => (col[k] === undefined ? '' : (r[col[k]] || ''));
    const name = get('name'), url = get('url'), secName = get('section'), tv = get('type'), date = pasteDate(get('date'));
    if (!name) { errs.push('row ' + n + ': no name'); return; }
    if (url && !linkOk(url)) { errs.push('row ' + n + ' (' + name + '): the link must start with https://'); return; }
    if (date === null) { errs.push('row ' + n + ' (' + name + '): “' + get('date') + '” is not a date'); return; }
    let type = tv ? typeOf(tv) : (guessType(url) || 'web');
    if (!type) { errs.push('row ' + n + ' (' + name + '): type “' + tv + '” is not one of ' + Object.values(TYPES).map(t => t.label).join(', ')); return; }
    let sec = secName ? cats().find(k => k.name.toLowerCase() === secName.toLowerCase() || k.id === secName.toLowerCase()) : null;
    if (secName && !sec) { const key = secName.toLowerCase(); if (!newSecs.has(key)) newSecs.set(key, secName); }
    const rec = { name, url, note: get('note'), type, secName, date: date || '', keywords: get('keywords') };
    (citems().some(c => c.name.toLowerCase() === name.toLowerCase()) ? upd : adds).push(rec);
  });
  const sum = '<p><b>' + adds.length + '</b> new link' + (adds.length === 1 ? '' : 's') + ', <b>' + upd.length + '</b> to update'
    + (newSecs.size ? ', new section' + (newSecs.size > 1 ? 's' : '') + ': ' + [...newSecs.values()].map(esc).join(', ') : '') + '.</p>'
    + (errs.length ? '<p class="eerr">' + errs.length + ' row' + (errs.length > 1 ? 's' : '') + ' left out:</p><ul class="perr">' + errs.slice(0, 12).map(e => '<li>' + esc(e) + '</li>').join('') + (errs.length > 12 ? '<li>…and ' + (errs.length - 12) + ' more</li>' : '') + '</ul>' : '');
  if (!apply) { out.innerHTML = sum; document.querySelector('[data-e="pasteAdd"]').disabled = !(adds.length + upd.length); return; }
  for (const [key, nm] of newSecs) CATALOG.categories.push({ id: slugId(nm, new Set(cats().map(k => k.id))), name: nm, blurb: '' });
  const secId = nm => nm ? (cats().find(k => k.name.toLowerCase() === nm.toLowerCase() || k.id === nm.toLowerCase()) || {}).id : ((cats()[0] || {}).id || '');
  const taken = new Set(CATALOG.items.map(x => ckey(x).slice(2)));
  for (const r of adds.concat(upd)) {
    const ex = CATALOG.items.find(c => c.name.toLowerCase() === r.name.toLowerCase());
    const it = ex || { name: r.name, id: slugId(r.name, taken), note: '', url: '', type: r.type, category: secId(r.secName) };
    if (!ex) { taken.add(it.id); CATALOG.items.push(it); }
    if (r.url) { if (r.url !== it.url) delete it.checked; it.url = r.url; }
    if (r.note) it.note = r.note;
    if (r.secName || !ex) it.category = secId(r.secName);
    if (r.type) it.type = r.type;
    if (r.date) it.date = r.date;
    if (r.keywords) it.keywords = r.keywords;
  }
  dlgClose(); edKeep();
  toast('Added ' + adds.length + ', updated ' + upd.length + ' (not saved yet)');
}

// ---- announcements ("What's new")
function newsList() {
  const N = CATALOG.notices || [];
  dlg('<header><h2 id="sdlgT">Announcements</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + (N.length ? '<ul class="llist boxed">' + N.map((n, i) => '<li class="lrow"><span class="lmain"><span class="cname nolink">' + esc(n.text) + '</span><small>posted ' + esc(dateTxt(n.date))
      + (n.until ? ' · shows until ' + esc(dateTxt(n.until)) + (n.until < today() ? ' (ended)' : '') : '') + '</small></span>'
      + '<button type="button" class="lic ed" data-e="editNews" data-i="' + i + '" aria-label="Change">' + UI.edit + '</button><button type="button" class="lic ed danger" data-e="delNews" data-i="' + i + '" aria-label="Delete">' + UI.trash + '</button></li>').join('') + '</ul>'
      : '<p class="sempty">No announcements.</p>')
    + '</div><footer><span class="sp"></span><button type="button" class="btn" data-e="close">Done</button><button type="button" class="btn pri" data-e="addNews">+ Announcement</button></footer>', 'button');
}
function newsForm(i) {
  const n = i >= 0 ? CATALOG.notices[i] : { text: '', date: today(), until: '', url: '' };
  dlg('<header><h2 id="sdlgT">' + (i >= 0 ? 'Change an announcement' : 'Add an announcement') + '</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + field('nText', 'Announcement', '<textarea id="nText" rows="3" maxlength="300">' + esc(n.text) + '</textarea>')
    + field('nUrl', 'Link', '<input id="nUrl" type="url" maxlength="2000" placeholder="https://… (optional)" value="' + esc(n.url || '') + '" autocomplete="off">')
    + '<div class="erow">' + field('nDate', 'Posted', '<input id="nDate" type="date" value="' + esc(n.date) + '">') + field('nUntil', 'Show until', '<input id="nUntil" type="date" value="' + esc(n.until || '') + '">', 'Empty: until you delete it.') + '</div>'
    + '<p class="eerr" id="eErr" role="alert"></p></div><footer>' + '<span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button>'
    + '<button type="button" class="btn pri" data-e="saveNews" data-i="' + i + '">' + (i >= 0 ? 'Save changes' : 'Add announcement') + '</button></footer>', '#nText');
}
function saveNews(i) {
  const v = id => document.getElementById(id).value.trim(), err = document.getElementById('eErr');
  const n = { text: v('nText'), date: v('nDate') || today() };
  if (!n.text) { err.textContent = 'Write the announcement.'; return; }
  if (!dateOk(n.date) || (v('nUntil') && !dateOk(v('nUntil')))) { err.textContent = 'Pick the dates from the calendar.'; return; }
  if (v('nUntil')) { if (v('nUntil') < n.date) { err.textContent = '“Show until” is before the day it is posted.'; return; } n.until = v('nUntil'); }
  if (v('nUrl')) { if (!linkOk(v('nUrl'))) { err.textContent = 'The link must start with https://.'; return; } n.url = v('nUrl'); }
  CATALOG.notices = CATALOG.notices || [];
  if (i >= 0) CATALOG.notices[i] = n; else CATALOG.notices.push(n);
  dlgClose(); edKeep(); toast('Announcement ' + (i >= 0 ? 'changed' : 'added') + ' (not saved yet)');
}
function delNews(i) {
  const n = CATALOG.notices[i]; if (!n || !confirm('Delete the announcement “' + n.text.slice(0, 80) + '”?')) return;
  CATALOG.notices.splice(i, 1); edKeep(); newsList();
}

// ---- the glossary
function termForm(term) {
  const g = term ? glossary().find(x => x.term === term) : { term: '', meaning: '', url: '' };
  dlg('<header><h2 id="sdlgT">' + (term ? 'Change a term' : 'Add a term') + '</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + field('gTerm', 'Term', '<input id="gTerm" maxlength="60" value="' + esc(g.term) + '" placeholder="UFR" autocomplete="off">')
    + field('gMean', 'What it means', '<textarea id="gMean" rows="4" maxlength="600" placeholder="Unfunded Requirement: …">' + esc(g.meaning) + '</textarea>')
    + field('gUrl', 'Read more', '<input id="gUrl" type="url" maxlength="2000" placeholder="https://… (optional)" value="' + esc(g.url || '') + '" autocomplete="off">')
    + '<p class="eerr" id="eErr" role="alert"></p></div><footer><span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button>'
    + '<button type="button" class="btn pri" data-e="saveTerm" data-t="' + esc(term) + '">' + (term ? 'Save changes' : 'Add term') + '</button></footer>', '#gTerm');
}
function saveTerm(old) {
  const v = id => document.getElementById(id).value.trim(), err = document.getElementById('eErr');
  const e = { term: v('gTerm'), meaning: v('gMean') };
  if (!e.term || !e.meaning) { err.textContent = 'Give the term and what it means.'; return; }
  if (glossary().some(x => x.term !== old && x.term.toLowerCase() === e.term.toLowerCase())) { err.textContent = 'That term is already in the glossary.'; return; }
  if (v('gUrl')) { if (!linkOk(v('gUrl'))) { err.textContent = 'The link must start with https://.'; return; } e.url = v('gUrl'); }
  CATALOG.glossary = CATALOG.glossary || [];
  const i = CATALOG.glossary.findIndex(x => x.term === old);
  if (old && i >= 0) CATALOG.glossary[i] = e; else CATALOG.glossary.push(e);
  dlgClose(); edKeep(); toast('Term ' + (old ? 'changed' : 'added') + ' (not saved yet)');
}
function delTerm(term) {
  const i = CATALOG.glossary.findIndex(x => x.term === term);
  if (i < 0 || !confirm('Delete “' + term + '” from the glossary?')) return;
  CATALOG.glossary.splice(i, 1); edKeep(); toast('Deleted “' + term + '”');
}
