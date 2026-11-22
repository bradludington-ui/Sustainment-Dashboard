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
const sigOf = cat => { const j = JSON.stringify({ categories: cat.categories, items: cat.items }); let h = 5381; for (let i = 0; i < j.length; i++) h = ((h * 33) ^ j.charCodeAt(i)) >>> 0; return j.length + '.' + h.toString(36); };
const plainCat = () => ({ categories: CATALOG.categories.map(k => ({ ...k })), items: CATALOG.items.map(c => ({ ...c })) });

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
  const json = JSON.stringify({ categories: cat.categories, items: cat.items }).replace(/</g, '\\u003c');
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
  let html;
  try { html = htmlWith(CATALOG, team); } catch (e) { alert('Not saved: ' + e.message); return false; }
  try {
    let h = await IDB.get(key), fresh = false;
    if (h && h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') h = null;
    }
    if (!h) { h = await pickFile(name, key); fresh = true; }
    if (!h) { download(name, html); toast(name + ' downloaded: put it where the old one was'); return 'downloaded'; }
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
    toast('Saved to ' + h.name);
    return 'written';
  } catch (e) {
    if (e && e.name === 'AbortError') return false;   // the person closed the Save window
    download(name, html);
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
    + '<p class="eerr" id="eErr" role="alert"></p></div>'
    + '<footer>' + (c ? '<button type="button" class="btn danger" data-e="delLink" data-k="' + esc(key) + '">Delete</button>' : '')
    + '<span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button>'
    + '<button type="button" class="btn pri" data-e="saveLink" data-k="' + esc(key || '') + '">' + (c ? 'Save changes' : 'Add link') + '</button></footer>', '#eName');
  // the type follows the link while the person has not chosen one: a pasted Excel link reads as Excel
  const url = document.getElementById('eUrl'), type = document.getElementById('eType');
  let typed = !!c;
  type.addEventListener('change', () => { typed = true; });
  url.addEventListener('input', () => { if (!typed) { const g = guessType(url.value); if (g) type.value = g; } });
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
async function importFile(f) {
  if (!f) return;
  if (f.size > 20e6) { alert('Not imported: “' + f.name + '” is too large to be a dashboard.'); return; }
  const t = await f.text();
  const m = /<script id="catData" type="application\/json">([\s\S]*?)<\/script>/.exec(t);
  if (!m) { alert('Not imported: “' + f.name + '” is not a Sustainment Dashboard file with a catalog in it.'); return; }
  let cat;
  try { cat = normCatalog(JSON.parse(m[1])); } catch (e) { alert('Not imported: the catalog in “' + f.name + '” could not be read (' + e.message + ').'); return; }
  const sum = cat.items.length + ' links in ' + cat.categories.length + ' sections';
  if (!confirm('Replace the links on this page (' + CATALOG.items.length + ' links in ' + CATALOG.categories.length + ' sections) with the ' + sum + ' in “' + f.name + '”?'
    + (cat.fixed.length ? '\n\nRead with these changes:\n• ' + cat.fixed.slice(0, 12).join('\n• ') : '') + '\n\nNothing is written to a file until you Save.')) return;
  CATALOG = cat; ED.undo = null; edKeep();
  toast('Imported ' + sum + ' (not saved yet)');
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
      }
    });
    // Enter in a box saves it
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.closest('#sdlg .eform') || e.target.tagName === 'SELECT') return;
      e.preventDefault(); document.querySelector('#sdlg footer .btn.pri')?.click();
    });
    if (CATALOG.fixed && CATALOG.fixed.length) setTimeout(() => toast('The catalog was read with ' + CATALOG.fixed.length + ' change(s); see the console'), 300), console.warn('catalog:', CATALOG.fixed);
  },
  drawBar() {
    const bar = document.getElementById('maintBar'); if (!bar) return;
    const teamOld = ED.teamSig !== sigOf(CATALOG);
    bar.innerHTML = '<span class="mt">Maintainer copy: keep this file to yourself.</span>'
      + '<button type="button" class="mb" data-e="toggle" aria-pressed="' + ED.on + '">' + (ED.on ? 'Done editing' : 'Edit catalog') + '</button>'
      + (ED.dirty ? '<span class="pill warn" role="status">Unsaved changes</span>' : '<span class="pill" role="status">Saved</span>')
      + (ED.undo ? '<button type="button" class="mb" data-e="undo">Undo delete</button>' : '')
      + '<span class="sp"></span>'
      + (ED.on ? '<button type="button" class="mb" data-e="import">Import links from a copy…</button>' + (ED.dirty ? '<button type="button" class="mb" data-e="discard">Discard changes</button>' : '') : '')
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
  // a new section joins the Everything tab; take the person there so they see it arrive
  footNote: () => ' Tools are listed in src/tools.js; links are edited here, with Edit catalog.',
};
