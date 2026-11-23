'use strict';
// ===================================================================================================================
// THE EDITOR, IN EVERY COPY (Brad, 23 Nov 2026: "I want the ability for anyone using to be able to update the links")
//
// The record is the file. CATALOG (app.js) is read from the file's data block; an edit changes CATALOG and is kept in
// this browser at once as a draft (sdash.draft), so a closed tab loses nothing. Save writes the file.
//
// Many people edit, and they open the file from Teams and save it back, so the last one to save must never wipe out
// the others. Save therefore MERGES: it reads the newest copy (the file itself where the browser can reopen it, or a
// copy the person downloads from Teams and chooses), and lays this person's changes over it (merge3): what only they
// changed is theirs, what only others changed is kept, and where both changed one thing differently this person's
// version is kept and the change log says so. ED.base is the catalog this page started from; the merge needs it.
//
// The maintainer copy adds the Settings panel (maint.js) and three things only Brad does: Office settings, Import from
// last version, and Save team copy (which merges into the team's file the same way).

const SRC0 = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;   // this page as it opened, before it drew
const FA = '/*@MAI' + 'NT>*/', FB = '/*<MAI' + 'NT@*/';               // built from pieces: a cut must never meet its own marker, and
                                                                       // this file is in every copy, so no piece may look like a fence
const ED = { on: false, fileSig: '', teamSig: '', dirty: false, undo: null, base: null, theirs: null };
const IS_MAINT = () => typeof openSettings === 'function';
// every part of a catalog that is written to a file. sigOf leaves out the stamp and version Save writes, so saving one
// copy never makes another read as changed.
const catOut = cat => ({ meta: cat.meta || {}, categories: cat.categories, items: cat.items, notices: cat.notices || [], glossary: cat.glossary || [], tools: cat.tools || [], trash: cat.trash || [], log: cat.log || [] });
const sigOf = cat => { const o = catOut(cat), m = { ...o.meta }; delete m.updated; delete m.version; const j = JSON.stringify({ ...o, meta: m }); let h = 5381; for (let i = 0; i < j.length; i++) h = ((h * 33) ^ j.charCodeAt(i)) >>> 0; return j.length + '.' + h.toString(36); };
const plainOf = cat => JSON.parse(JSON.stringify(catOut(cat)));
const plainCat = () => plainOf(CATALOG);
const who = () => String(store.get('who', '') || '').slice(0, 60);

function edKeep() {   // after every edit: keep the draft (with the catalog it started from), mark unsaved, redraw
  ED.dirty = sigOf(CATALOG) !== ED.fileSig;
  if (ED.dirty) store.set('draft', { base: ED.fileSig, baseCat: ED.base, cat: plainCat(), t: Date.now() });
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
    if (html.includes(FA) || html.includes('function ' + 'openSettings')) throw new Error('the team copy would still carry maintainer material');   // the words in pieces: written whole, this check would be what it finds
  }
  return html;
}

// ---- THE MERGE. Each part of a catalog is a list of things with a key; for every key, the base (where this page
// started), mine (this page now) and theirs (the newest file) decide: unchanged by me -> theirs; unchanged by them ->
// mine (a deletion included); both the same -> that; both changed differently -> mine, and named as a conflict.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function merge3list(B, M, T, key, what, conflicts) {
  const map = L => new Map((L || []).map(x => [key(x), x]));
  const b = map(B), m = map(M), t = map(T);
  const pick = k => {
    const vb = b.get(k), vm = m.get(k), vt = t.get(k);
    if (same(vm, vb)) return vt;
    if (same(vt, vb)) return vm;
    if (same(vm, vt)) return vm;
    conflicts.push(what(vm || vt || vb));
    return vm !== undefined ? vm : vt;   // mine wins; if I deleted it and they changed it, their change is kept
  };
  // their order, then what only I have, in my order; but if only I reordered (sections), my order
  const ko = L => (L || []).map(key);
  let order = ko(T).concat(ko(M).filter(k => !t.has(k)));
  if (!same(ko(M), ko(B)) && same(ko(T), ko(B))) order = ko(M).concat(ko(T).filter(k => !m.has(k)));
  return order.map(pick).filter(x => x !== undefined);
}
function merge3(B, M, T) {
  const conflicts = [], out = { meta: {} };
  out.categories = merge3list(B.categories, M.categories, T.categories, k => k.id, k => 'section “' + k.name + '”', conflicts);
  out.items = merge3list(B.items, M.items, T.items, c => ckey(c), c => 'link “' + c.name + '”', conflicts);
  out.glossary = merge3list(B.glossary, M.glossary, T.glossary, g => g.term.toLowerCase(), g => 'term “' + g.term + '”', conflicts);
  out.notices = merge3list(B.notices, M.notices, T.notices, n => n.id, n => 'announcement “' + n.text.slice(0, 40) + '”', conflicts);
  out.tools = merge3list(B.tools, M.tools, T.tools, x => x.id, x => 'the link to ' + toolName(x.id), conflicts);
  out.trash = merge3list(B.trash, M.trash, T.trash, x => x.id, () => 'a deleted item', []);
  for (const f of new Set(Object.keys(M.meta || {}).concat(Object.keys(T.meta || {})))) {
    const vb = (B.meta || {})[f], vm = (M.meta || {})[f], vt = (T.meta || {})[f];
    const v = same(vm, vb) ? vt : vm; if (v !== undefined) out.meta[f] = v;
  }
  // the log is everyone's: every entry from both, oldest first
  const seen = new Set(), log = [];
  for (const e of (T.log || []).concat(M.log || [])) { const k = e.t + '|' + e.who + '|' + e.what; if (!seen.has(k)) { seen.add(k); log.push(e); } }
  out.log = log.sort((a, x) => a.t.localeCompare(x.t)).slice(-LOG_MAX);
  return { cat: out, conflicts };
}
// what this person changed, in words, for the change log
const LOG_MAX = 500;
function describe(B, M) {
  const out = [], idx = (L, key) => new Map((L || []).map(x => [key(x), x]));
  const run = (L0, L1, key, noun, name) => {
    const a = idx(L0, key), b = idx(L1, key);
    for (const [k, v] of b) if (!a.has(k)) out.push('added ' + noun + ' “' + name(v) + '”'); else if (!same(a.get(k), v)) out.push('changed ' + noun + ' “' + name(v) + '”');
    for (const [k, v] of a) if (!b.has(k)) out.push('deleted ' + noun + ' “' + name(v) + '”');
  };
  run(B.categories, M.categories, k => k.id, 'section', k => k.name);
  run(B.items, M.items, c => ckey(c), 'link', c => c.name);
  run(B.glossary, M.glossary, g => g.term.toLowerCase(), 'term', g => g.term);
  run(B.notices, M.notices, n => n.id, 'announcement', n => n.text.slice(0, 50));
  run(B.tools, M.tools, x => x.id, 'the link to', x => toolName(x.id));
  const mb = { ...B.meta }, mm = { ...M.meta }; for (const o of [mb, mm]) { delete o.updated; delete o.version; }
  if (!same(mb, mm)) out.push('changed the office settings');
  if (!same((B.categories || []).map(k => k.id), (M.categories || []).map(k => k.id)) && !out.some(x => / section /.test(x))) out.push('reordered the sections');
  return out;
}

// ---- reading and writing files. Where the browser can write files (Edge, Chrome) the file is written in place and
// its handle remembered, so the next Save can reopen it, merge and write; elsewhere the file is downloaded.
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
// a dashboard file's kind and its catalog: 'empty' (new), 'other' (not a dashboard), 'maint', 'team', 'unreadable'
function catOfText(t) {
  if (!t.trim()) return { kind: 'empty' };
  const m = /<script id="catData" type="application\/json">([\s\S]*?)<\/script>/.exec(t);
  if (!m) return { kind: 'other' };
  let cat = null; try { cat = normCatalog(JSON.parse(m[1])); } catch {}
  return { kind: t.includes(FA) ? 'maint' : 'team', cat };
}
async function readHandle(h) { try { return catOfText(await (await h.getFile()).text()); } catch { return { kind: 'unreadable' }; } }
async function writeTo(handle, html) { const w = await handle.createWritable(); await w.write(html); await w.close(); }
async function pickFile(name, key) {
  if (typeof window.showSaveFilePicker !== 'function') return null;
  return window.showSaveFilePicker({ suggestedName: name, id: key, types: [{ description: 'Web page', accept: { 'text/html': ['.html'] } }] });
}
const thisFileName = () => { try { return decodeURIComponent(location.pathname.split(/[\\/]/).pop()) || 'sustainment-dashboard.html'; } catch { return 'sustainment-dashboard.html'; } };
// opened from Downloads (or a "(1)" copy): it came from Teams by hand and has to go back by hand
const handCopy = () => { const p = (() => { try { return decodeURIComponent(location.pathname); } catch { return location.pathname; } })(); return location.protocol === 'file:' && (/[\\/]downloads[\\/]/i.test(p) || /\(\d+\)\.html?$/i.test(p)); };

// the merge before a write: base -> mine over theirs. Returns what to write and what to say; CATALOG becomes the result.
function mergeInto(theirs, base) {
  const mine = plainCat(), b = base || { categories: [], items: [], glossary: [], notices: [], trash: [], log: [], meta: {} };
  const mineChanges = describe(b, mine);
  if (!theirs || sigOf(theirs) === sigOf(b)) return { changes: mineChanges, kept: 0, conflicts: [] };
  const kept = describe(b, plainOf(theirs)).length;
  const r = merge3(b, mine, plainOf(theirs));
  CATALOG = { ...r.cat, fixed: [] };
  return { changes: mineChanges, kept, conflicts: r.conflicts };
}
// one Save: merge, stamp, log, write. `team` writes the team copy (from the maintainer copy: Save team copy).
async function saveFile({ team, theirs = null, base = undefined, handle = null }) {
  const name = team ? 'sustainment-dashboard.html' : (IS_MAINT() ? 'sustainment-dashboard-maintainer.html' : thisFileName());
  const want = team || !IS_MAINT() ? 'team' : 'maint', key = team || !IS_MAINT() ? 'teamFile' : 'maintFile';
  let h = handle, fresh = false;
  try {
    if (!h) {
      h = await IDB.get(key);
      if (h && h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') h = null;
      }
    }
    // a file the browser can reopen is read first: it is the newest copy, whoever saved it
    if (h && !theirs) {
      const r = await readHandle(h);
      if (r.kind === 'other') { alert('Not saved: “' + h.name + '” is not a Sustainment Dashboard file, and is left as it was.'); return false; }
      if (r.kind !== 'empty' && r.kind !== 'unreadable' && r.kind !== want) { alert('Not saved: “' + h.name + '” is the ' + (r.kind === 'maint' ? 'maintainer copy' : 'team copy') + '.'); await IDB.set(key, null); return false; }
      if (r.cat) theirs = r.cat;
    }
  } catch { h = null; }
  const prev = plainCat();
  const m = mergeInto(theirs, base === undefined ? ED.base : base);
  // the log: what this person changed, with their name
  const stamp = new Date().toISOString(), by = who() || 'someone';
  if (m.changes.length) {
    CATALOG.log = (CATALOG.log || []).concat(m.changes.slice(0, 40).map(what => ({ t: stamp, who: by, what })).concat(m.changes.length > 40 ? [{ t: stamp, who: by, what: 'and ' + (m.changes.length - 40) + ' more changes' }] : [])).slice(-LOG_MAX);
  }
  // deleted things are kept 90 days, then go for good
  const cut = new Date(Date.now() - 90 * 864e5).toISOString();
  CATALOG.trash = (CATALOG.trash || []).filter(x => x.t >= cut).slice(-200);
  let html;
  try { html = htmlWith({ ...CATALOG, meta: { ...CATALOG.meta, updated: stamp, version: VERSION } }, team); }
  catch (e) { CATALOG = { ...prev, fixed: [] }; alert('Not saved: ' + e.message); return false; }
  const done = how => {
    CATALOG.meta.updated = stamp; CATALOG.meta.version = VERSION;
    let msg = (how === 'written' ? 'Saved to ' + h.name : name + ' downloaded') + (m.kept ? '. Kept ' + m.kept + ' change(s) others had saved' : '');
    if (m.conflicts.length) msg += '. Both you and someone else changed ' + m.conflicts.join(', ') + ': yours was kept';
    toast(msg);
    return { how, merged: m };
  };
  try {
    if (!h) { h = await pickFile(name, key); fresh = true; }
    if (!h) { download(name, html); return done('downloaded'); }
    if (fresh && !/\.html?$/i.test(h.name || '')) { alert('Not saved: “' + h.name + '” is not an .html file.'); CATALOG = { ...prev, fixed: [] }; return false; }
    if (fresh && want === 'team' && /maintainer/i.test(h.name || '')) { alert('Not saved: “' + h.name + '” looks like the maintainer copy. Save the team copy under its own name.'); CATALOG = { ...prev, fixed: [] }; return false; }
    await writeTo(h, html);
    await IDB.set(key, h);
    return done('written');
  } catch (e) {
    if (e && e.name === 'AbortError') { CATALOG = { ...prev, fixed: [] }; return false; }   // the Save window was closed
    download(name, html);
    toast('Could not write the file (' + (e && e.message || e) + '); downloaded instead');
    return done('downloaded');
  }
}
// after a save: this page now IS the saved catalog
function savedAs() {
  ED.base = plainCat(); ED.fileSig = sigOf(CATALOG); ED.theirs = null;
  try { localStorage.removeItem('sdash.draft'); } catch {}
  edKeep();
}

// ---- Save. A name first (the log says who). With a file the browser can reopen: merge and write, no questions.
// Otherwise the Save box: optionally choose the newest copy from Teams, save, and put it back on Teams.
async function edSave() {
  if (!(await askWho())) return;
  if (IS_MAINT()) { const r = await saveFile({ team: false }); if (r) savedAs(); return; }
  const h = await IDB.get('teamFile');
  if (h) { const r = await saveFile({ team: false, handle: null }); if (r) { savedAs(); afterSave(r); } return; }
  saveBox(false);
}
async function edSaveTeam() {
  if (!(await askWho())) return;
  saveBox(true);
}
function saveBox(team) {
  ED.theirs = null;
  const n = describe(ED.base || {}, plainCat()).length;
  dlg('<header><h2 id="sdlgT">' + (team ? 'Save the team copy' : 'Save your changes') + '</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + (team ? '' : '<p>' + (n ? 'You made <b>' + n + '</b> change' + (n === 1 ? '' : 's') + '.' : 'Saving.') + ' Saving writes them into the dashboard file.</p>')
    + '<ol class="steps"><li><b>Get the newest copy</b> ' + (team ? 'of the team’s file' : '') + 'so nobody’s changes are lost: download the dashboard from Teams again, then <button type="button" class="btn sm" data-e="pickTheirs">Choose the newest copy…</button>'
    + '<div id="theirsSay" class="eh">Skip this only if you are sure nobody else has saved since you opened it.</div></li>'
    + '<li><b>Save</b>: choose the file to write (the one you will put back on Teams).</li>'
    + '<li><b>Put it back on Teams</b>: in the channel’s Files, Upload › choose the file › Replace.</li></ol>'
    + '<p class="eh">Opening the dashboard from a synced Teams folder skips all of this: Save then merges and writes straight to Teams. Help explains how to set it up.</p></div>'
    + '<footer><span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button><button type="button" class="btn pri" data-e="saveGo" data-team="' + (team ? 1 : 0) + '">Save</button></footer>', '[data-e="pickTheirs"]');
}
async function saveGo(team) {
  const theirs = ED.theirs, base = team ? store.get('teamBase', null) : ED.base;
  dlgClose();
  const r = await saveFile({ team, theirs, base });
  if (!r) return;
  if (team) { store.set('teamBase', plainCat()); ED.teamSig = sigOf(CATALOG); store.set('teamSig', ED.teamSig); edKeep(); toast('Team copy saved' + (r.merged.kept ? ', with ' + r.merged.kept + ' change(s) the team had made' : '') + '. Upload it to Teams (Replace).'); }
  else { savedAs(); afterSave(r); }
}
function afterSave(r) {
  if (IS_MAINT() || !(r.how === 'downloaded' || handCopy())) return;
  dlg('<header><h2 id="sdlgT">Saved: now put it back on Teams</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + '<p>Your changes are in the file' + (r.how === 'written' ? '' : ' your browser just downloaded') + '. Nobody else sees them until it is back on Teams:</p>'
    + '<ol class="steps"><li>Open the channel in Teams › <b>Files</b>.</li><li><b>Upload</b> › choose the dashboard file you just saved.</li><li>When Teams asks, choose <b>Replace</b>.</li></ol>'
    + (r.merged.kept ? '<p class="eh">Your save kept ' + r.merged.kept + ' change(s) others had made, so replacing loses nobody’s work.</p>' : '<p class="eh">If someone else saved while you were working, choose their copy next time in Save (step 1) and nothing of theirs is lost.</p>')
    + '</div><footer><span class="sp"></span><button type="button" class="btn pri" data-e="close">Done</button></footer>', 'footer .btn');
}
async function pickTheirs(f) {
  const say = document.getElementById('theirsSay');
  if (!f) return;
  const r = catOfText(await f.text());
  if (!r.cat) { ED.theirs = null; say.innerHTML = '<span class="eerr">“' + esc(f.name) + '” is not a Sustainment Dashboard file. Choose the one from Teams.</span>'; return; }
  ED.theirs = r.cat;
  const others = describe(ED.base || {}, plainOf(r.cat));
  say.innerHTML = '✓ “' + esc(f.name) + '”' + (r.cat.meta.updated ? ', saved ' + esc(new Date(r.cat.meta.updated).toLocaleString()) : '') + ': '
    + (others.length ? '<b>' + others.length + '</b> change(s) by others since you opened yours; they will be kept.' : 'nobody else has changed it since you opened yours.');
}

// ---- who is editing: asked once, remembered in this browser, written into the change log
function askWho() {
  if (who()) return Promise.resolve(true);
  return new Promise(res => {
    dlg('<header><h2 id="sdlgT">Who is editing?</h2><button type="button" class="x" data-e="whoCancel" aria-label="Close">×</button></header><div class="eform">'
      + field('wName', 'Your name', '<input id="wName" maxlength="60" autocomplete="name" placeholder="First and last name">', 'Shown in the change log beside what you change. Asked once on this computer.')
      + '<p class="eerr" id="eErr" role="alert"></p></div><footer><span class="sp"></span><button type="button" class="btn" data-e="whoCancel">Cancel</button><button type="button" class="btn pri" data-e="whoOk">Continue</button></footer>', '#wName');
    ED.whoRes = res;
  });
}
function whoOk() {
  const v = document.getElementById('wName').value.trim();
  if (!v) { document.getElementById('eErr').textContent = 'Type your name.'; return; }
  store.set('who', v.slice(0, 60)); dlgClose(); const r = ED.whoRes; ED.whoRes = null; r && r(true); draw();
}
function whoCancel() { dlgClose(); const r = ED.whoRes; ED.whoRes = null; r && r(false); }

// ---- Recently deleted: anything deleted is kept in the file 90 days, and anyone can put it back
function trashPut(kind, rec, extra) {
  const e = { id: kind + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: new Date().toISOString(), who: who() || 'someone', kind, rec, ...(extra || {}) };
  CATALOG.trash = (CATALOG.trash || []).concat([e]);
  return e.id;
}
function trashList() {
  const T = (CATALOG.trash || []).slice().reverse();
  const nm = x => x.kind === 'link' ? x.rec.name : x.kind === 'section' ? x.rec.name + (x.links && x.links.length ? ' (and its ' + x.links.length + ' links)' : '') : x.kind === 'term' ? x.rec.term : x.rec.text;
  const noun = { link: 'Link', section: 'Section', term: 'Term', notice: 'Announcement' };
  dlg('<header><h2 id="sdlgT">Recently deleted</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + '<p class="eh">Everything deleted in the last 90 days. Restore puts it back (save afterwards).</p>'
    + (T.length ? '<ul class="llist boxed">' + T.map(x => '<li class="lrow"><span class="lmain"><span class="cname nolink">' + esc(nm(x)) + '</span><small>' + esc(noun[x.kind] || x.kind) + ' · deleted by ' + esc(x.who) + ', ' + esc(new Date(x.t).toLocaleString()) + '</small></span>'
      + '<button type="button" class="btn sm" data-e="restore" data-k="' + esc(x.id) + '">Restore</button></li>').join('') + '</ul>' : '<p class="sempty">Nothing has been deleted.</p>')
    + '</div><footer><span class="sp"></span><button type="button" class="btn pri" data-e="close">Done</button></footer>', 'button');
}
function restoreTrash(id) {
  const i = (CATALOG.trash || []).findIndex(x => x.id === id); if (i < 0) return;
  const x = CATALOG.trash[i], keys = new Set(CATALOG.items.map(ckey));
  const putLink = c => { const it = { ...c }; if (keys.has(ckey(it))) it.id = slugId(it.name, new Set([...keys].map(k => k.slice(2)))); keys.add(ckey(it)); if (!cats().some(k => k.id === it.category)) it.category = ''; CATALOG.items.push(it); };
  if (x.kind === 'link') putLink(x.rec);
  if (x.kind === 'section') { if (!cats().some(k => k.id === x.rec.id)) CATALOG.categories.push(x.rec); (x.links || []).forEach(putLink); }
  if (x.kind === 'term' && !glossary().some(g => g.term.toLowerCase() === x.rec.term.toLowerCase())) CATALOG.glossary.push(x.rec);
  if (x.kind === 'notice') CATALOG.notices.push(x.rec);
  CATALOG.trash.splice(i, 1);
  edKeep(); trashList(); toast('Restored (not saved yet)');
}
// ---- the change log: who changed what, newest first
function logList() {
  const L = (CATALOG.log || []).slice().reverse();
  dlg('<header><h2 id="sdlgT">Change log</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + (L.length ? '<ul class="llist boxed">' + L.map(e => '<li class="lrow"><span class="lmain"><span class="cname nolink">' + esc(e.what) + '</span><small>' + esc(e.who) + ' · ' + esc(new Date(e.t).toLocaleString()) + '</small></span></li>').join('') + '</ul>'
      : '<p class="sempty">No changes saved yet.</p>')
    + '</div><footer><span class="sp"></span><button type="button" class="btn pri" data-e="close">Done</button></footer>', 'button');
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
    + field('eUrl', 'Link', '<input id="eUrl" type="text" inputmode="url" spellcheck="false" maxlength="2000" placeholder="https://… or \\\\server\\share\\…" value="' + esc(v.url) + '" autocomplete="off">',
      'In Teams or SharePoint: the file’s ⋯ menu › Copy link. A network path (\\\\server\\share\\…, S:\\…) works too. Leave it empty if you do not have it yet.')
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
      : 'In Teams or SharePoint: the file’s ⋯ menu › Copy link. A network path (\\\\server\\share\\…, S:\\…) works too. Leave it empty if you do not have it yet.';
  };
  url.addEventListener('input', () => { if (!typed) { const g = guessType(url.value); if (g) type.value = g; } share(); });
  type.addEventListener('change', share); share();
}
// ---- a tool's link (ORBIT, APEX and the rest): typed here, kept in the file, winning over the tool list's own
const toolName = id => ((DASH.tools || []).find(t => t.id === id) || { name: id }).name;
function toolForm(id) {
  const t = (DASH.tools || []).find(x => x.id === id); if (!t) return;
  const o = (CATALOG.tools || []).find(x => x.id === id), cur = o ? o.url : t.url;
  dlg('<header><h2 id="sdlgT">Link to ' + esc(t.name) + '</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header>'
    + '<div class="eform">'
    + field('tUrl', 'Address', '<input id="tUrl" type="text" inputmode="url" spellcheck="false" maxlength="2000" placeholder="https://… or \\\\server\\share\\' + esc(t.name) + '.html" value="' + esc(cur) + '" autocomplete="off">',
      'Where ' + esc(t.name) + ' is kept: ' + esc(LINK_HELP) + '. Leave it empty if it has no home yet.')
    + '<p class="eh" id="tTry"></p><p class="eerr" id="tErr" role="alert"></p></div>'
    + '<footer>' + (o && t.url ? '<button type="button" class="btn" data-e="toolDefault" data-k="' + esc(id) + '">Use the built-in link</button>' : '')
    + '<span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button>'
    + '<button type="button" class="btn pri" data-e="saveTool" data-k="' + esc(id) + '">Save link</button></footer>', '#tUrl');
  const u = document.getElementById('tUrl'), tr = document.getElementById('tTry');
  const show = () => { const h = linkHref(u.value); tr.innerHTML = h ? '<a href="' + esc(h) + '" target="_blank" rel="noopener noreferrer">Try it</a> (opens in a new tab)' + (isWeb(u.value) ? '' : ' · a network path opens when the dashboard itself is opened from the network or this computer; a browser may refuse it from a Teams or SharePoint page') : ''; };
  u.addEventListener('input', show); show();
}
function saveTool(id, useDefault) {
  const t = (DASH.tools || []).find(x => x.id === id); if (!t) return;
  const L = (CATALOG.tools || []).filter(x => x.id !== id);
  if (!useDefault) {
    const url = document.getElementById('tUrl').value.trim(), err = document.getElementById('tErr');
    if (url && !linkOk(url)) { err.textContent = 'That address cannot be opened. Use ' + LINK_HELP + '.'; document.getElementById('tUrl').focus(); return; }
    if (url !== t.url) L.push({ id, url });   // the same as the tool list's own: nothing to keep
  }
  CATALOG.tools = L.sort((a, b) => (DASH.tools || []).findIndex(x => x.id === a.id) - (DASH.tools || []).findIndex(x => x.id === b.id));
  dlgClose(); edKeep();
  toast('Link to ' + t.name + ' changed (not saved yet)');
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
  if (url && !linkOk(url)) { err.textContent = 'That link cannot be opened. Use ' + LINK_HELP + ' (in Teams: the file’s ⋯ menu › Copy link).'; document.getElementById('eUrl').focus(); return; }
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
  ED.undo = { kind: 'link', rec: gone, at: i, trash: trashPut('link', gone) };
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
  ED.undo = { kind: 'section', rec: k, at, links, trash: trashPut('section', k, { links }) };
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
  CATALOG.trash = (CATALOG.trash || []).filter(x => x.id !== u.trash);
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
  dlg('<header><h2 id="sdlgT">' + (IS_MAINT() ? 'Import from your last version' : 'Import from another copy') + '</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + '<table class="imptab"><tr><th>File</th><td>' + esc(f.name) + (IMP.team ? ' <span class="eh">(a team copy)</span>' : '') + '</td></tr>'
    + '<tr><th>Written by</th><td>' + (M.version ? 'Sustainment Dashboard ' + esc(M.version) : 'a version before v1.7') + '</td></tr>'
    + '<tr><th>Saved</th><td>' + (saved ? esc(saved.toLocaleString()) : 'never saved') + '</td></tr>'
    + '<tr><th>Holds</th><td>' + esc(sum(cat)) + (M.contact ? ', contact ' + esc(M.contact) : '') + '</td></tr>'
    + '<tr><th>This page holds</th><td>' + esc(sum(CATALOG)) + '</td></tr></table>'
    + (cat.fixed.length ? '<p class="eh">Read with ' + cat.fixed.length + ' change(s): ' + cat.fixed.slice(0, 6).map(esc).join('; ') + '</p>' : '')
    + '<p class="eh"><b>Replace with these</b> makes this page exactly what that file held (use it when this is a fresh download); links it does not have go to Recently deleted. '
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
  const tset0 = new Set((CATALOG.tools || []).map(x => x.id)), tn = (cat.tools || []).filter(x => !tset0.has(x.id)).length;
  if (dry) return [n(links.length, 'link'), n(secs.length, 'section'), n(terms.length, 'term'), n(news.length, 'announcement'), n(tn, 'tool link')].join(', ');
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
  // a tool link this copy has not set comes across from the other
  const tset = new Set((CATALOG.tools || []).map(x => x.id)), tnew = (cat.tools || []).filter(x => !tset.has(x.id));
  CATALOG.tools = (CATALOG.tools || []).concat(tnew);
  return links.length + secs.length + terms.length + news.length + tnew.length;
}
function importReplace() {
  const c = IMP.cat, keepVer = CATALOG.meta.version;
  // anything this page has that the imported file does not goes to Recently deleted, so a Replace from the wrong (or an
  // old) file is never a loss; both files' change logs and deleted lists are kept, and the replace itself is logged
  const by = who() || 'someone', t = new Date().toISOString(), names = new Set(c.items.map(x => x.name.toLowerCase()));
  const gone = CATALOG.items.filter(x => !names.has(x.name.toLowerCase()))
    .map(rec => ({ id: 'link:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t, who: by, kind: 'link', rec }));
  const seen = new Set(), log = [];
  for (const e of (CATALOG.log || []).concat(c.log || [])) { const k = e.t + '|' + e.who + '|' + e.what; if (!seen.has(k)) { seen.add(k); log.push(e); } }
  const ids = new Set(), trash = (CATALOG.trash || []).concat(c.trash || [], gone).filter(x => !ids.has(x.id) && ids.add(x.id));
  CATALOG = { meta: { ...c.meta }, categories: c.categories, items: c.items, notices: c.notices, glossary: c.glossary, tools: c.tools, fixed: c.fixed,
    trash, log: log.sort((a, x) => a.t.localeCompare(x.t)).slice(-LOG_MAX) };
  if (gone.length) setTimeout(() => toast(gone.length + ' link(s) the imported file did not have are in Recently deleted'), 2300);
  // what this page's file says it is stays as it is until it is saved: the version and stamp belong to the file written
  delete CATALOG.meta.updated; delete CATALOG.meta.version; if (keepVer) CATALOG.meta.version = keepVer;
  dlgClose(); ED.undo = null; edKeep();
  toast('Imported ' + c.items.length + ' links from ' + IMP.name + ' (not saved yet: press Save)');
}

// ---- the hooks app.js calls
const MAINT_HOOKS = {
  editing: () => ED.on,
  init() {
    ED.fileSig = sigOf(CATALOG); ED.base = plainCat();
    ED.teamSig = store.get('teamSig', '');
    ED.on = !!store.get('editing', false);
    const d = store.get('draft', null);
    if (d && d.cat && d.base === ED.fileSig) { CATALOG = normCatalog(d.cat); ED.dirty = sigOf(CATALOG) !== ED.fileSig; }
    else if (d && d.cat && d.baseCat && sigOf(normCatalog(d.cat)) !== ED.fileSig) {
      // edits made in this browser to an older copy, and the file has moved on since (someone else saved): the same
      // merge Save does lays them over this file, so neither theirs nor these are lost
      const r = merge3(plainOf(normCatalog(d.baseCat)), plainOf(normCatalog(d.cat)), plainCat());
      CATALOG = { ...r.cat, fixed: [] }; ED.dirty = sigOf(CATALOG) !== ED.fileSig;
      ED.base = plainOf(normCatalog(d.baseCat)); store.set('draft', { base: ED.fileSig, baseCat: ED.base, cat: plainCat(), t: Date.now() });
      setTimeout(() => toast('Your unsaved edits from ' + new Date(d.t || 0).toLocaleString() + ' were laid over this newer copy. Save to keep them.'), 400);
    }
    else if (d && d.cat && sigOf(normCatalog(d.cat)) !== ED.fileSig) {
      // a draft made against a different saved catalog (another copy, or this one before a Save elsewhere)
      if (confirm('This browser holds unsaved catalog edits made to a different copy of the dashboard (' + new Date(d.t || 0).toLocaleString() + ').\n\nOK: show those edits here (Save to keep them).\nCancel: throw them away and show this file’s links.')) {
        CATALOG = normCatalog(d.cat); ED.dirty = true; store.set('draft', { base: ED.fileSig, baseCat: ED.base, cat: plainCat(), t: Date.now() });
      } else try { localStorage.removeItem('sdash.draft'); } catch {}
    } else if (d) try { localStorage.removeItem('sdash.draft'); } catch {}
    document.body.insertAdjacentHTML('beforeend', '<input type="file" id="impFile" accept=".html,.htm" hidden><input type="file" id="theirsFile" accept=".html,.htm" hidden>');
    document.getElementById('theirsFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; pickTheirs(f); });
    document.getElementById('impFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; importFile(f); });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      const k = b.dataset.k, sId = b.dataset.s;
      switch (b.dataset.e) {
        case 'toggle': if (!ED.on && !IS_MAINT()) { askWho().then(ok => { if (ok) { ED.on = true; store.set('editing', true); draw(); document.querySelector('[data-e="toggle"]')?.focus(); } }); break; }
          ED.on = !ED.on; store.set('editing', ED.on); if (ED.on && S.tab === 'tools') { S.tab = 'all'; store.set('tab', 'all'); } draw(); document.querySelector('[data-e="toggle"]')?.focus(); break;
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
        case 'editTool': toolForm(k); break;
        case 'saveTool': saveTool(k, false); break;
        case 'toolDefault': saveTool(k, true); break;
        case 'addSection': sectionForm(''); break;
        case 'editSection': sectionForm(sId); break;
        case 'delSection': delSection(sId); break;
        case 'saveSection': saveSection(sId); break;
        case 'mv': moveSection(sId, +b.dataset.d); break;
        case 'close': dlgClose(); break;
        case 'saveGo': saveGo(b.dataset.team === '1'); break;
        case 'pickTheirs': document.getElementById('theirsFile').click(); break;
        case 'whoOk': whoOk(); break;
        case 'whoCancel': whoCancel(); break;
        case 'whoChange': store.set('who', ''); askWho(); break;
        case 'trash': trashList(); break;
        case 'restore': restoreTrash(k); break;
        case 'log': logList(); break;
        case 'paste': pasteForm(); break;
        case 'pasteCheck': pasteCheck(false); break;
        case 'pasteAdd': pasteCheck(true); break;
        case 'export': exportCsv(); break;
        case 'checkList': checkList(); break;
        case 'markChecked': markChecked(k); break;
        case 'office': if (IS_MAINT()) officeForm(); break;
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
    const M = IS_MAINT();
    const save = '<button type="button" class="mb pri" data-e="save"' + (ED.dirty ? '' : ' aria-disabled="true"') + '>Save</button>';
    const tools = '<button type="button" class="mb" data-e="paste">Paste from Excel…</button><button type="button" class="mb" data-e="export">Export to Excel</button>'
      + '<button type="button" class="mb" data-e="checkList">Needs checking' + (needsCheck().length ? ' <b class="cnt">' + needsCheck().length + '</b>' : '') + '</button>'
      + '<button type="button" class="mb" data-e="trash">Recently deleted' + ((CATALOG.trash || []).length ? ' <b class="cnt">' + CATALOG.trash.length + '</b>' : '') + '</button>'
      + '<button type="button" class="mb" data-e="log">Change log</button>'
      + (M ? '' : '<button type="button" class="mb" data-e="import">Import from another copy…</button>');   // the maintainer's is in its own bar
    const status = (ED.dirty ? '<span class="pill warn" role="status">Unsaved changes</span>' : '') + (ED.undo ? '<button type="button" class="mb" data-e="undo">Undo delete</button>' : '');
    if (!M) {
      // everyone's copy: a slim bar that opens editing; while editing (or with unsaved changes), the tools and Save
      bar.hidden = false;
      bar.className = 'maint team' + (ED.on || ED.dirty ? ' on' : '');
      bar.innerHTML = '<button type="button" class="mb" data-e="toggle" aria-pressed="' + ED.on + '">' + (ED.on ? 'Done editing' : '✎ Edit links') + '</button>'
        + (ED.on && who() ? '<span class="mt">Editing as ' + esc(who()) + ' <button type="button" class="lnk" data-e="whoChange">not you?</button></span>' : !ED.on ? '<span class="mt">Anyone can add, change or delete links. Changes are logged and can be undone.</span>' : '')
        + status + '<span class="sp"></span>' + (ED.on ? tools + (ED.dirty ? '<button type="button" class="mb" data-e="discard">Discard changes</button>' : '') : '') + (ED.on || ED.dirty ? save : '');
      return;
    }
    const teamOld = ED.teamSig !== sigOf(CATALOG);
    const fresh = !CATALOG.meta.updated && !ED.dirty;   // a copy nobody has saved yet: a new version, just downloaded
    bar.innerHTML = (fresh ? '<span class="newver"><b>New copy (' + esc(VERSION) + ').</b> Bring your links across from your last version first: '
        + '<button type="button" class="mb pri" data-e="import">Import from last version…</button></span><span class="brk"></span>' : '')
      + '<span class="mt">Maintainer copy: keep this file to yourself.' + (CATALOG.meta.contact || fresh ? '' : ' <button type="button" class="lnk" data-e="office">Add your contact email</button> so people can report broken links.') + '</span>'
      + '<button type="button" class="mb" data-e="toggle" aria-pressed="' + ED.on + '">' + (ED.on ? 'Done editing' : 'Edit catalog') + '</button>'
      + (ED.dirty ? '' : fresh ? '' : '<span class="pill" role="status">Saved</span>') + status
      + '<span class="sp"></span>'
      + (ED.on ? tools + '<button type="button" class="mb" data-e="office">Office settings…</button>' + (ED.dirty ? '<button type="button" class="mb" data-e="discard">Discard changes</button>' : '') : '')
      + (fresh ? '' : '<button type="button" class="mb" data-e="import">Import from last version…</button>')
      + save
      + '<button type="button" class="mb" data-e="saveTeam" title="Write sustainment-dashboard.html, the copy for Teams, with the team’s own changes kept">Save team copy…' + (teamOld ? ' <span class="dot-warn" aria-label="(out of date)">●</span>' : '') + '</button>';
  },
  rowActs(c, k) {
    if (!ED.on) return '';
    return '<button type="button" class="lic ed" data-e="editLink" data-k="' + esc(k) + '" title="Change" aria-label="Change ' + esc(c.name) + '">' + UI.edit + '</button>'
      + '<button type="button" class="lic ed danger" data-e="delLink" data-k="' + esc(k) + '" title="Delete" aria-label="Delete ' + esc(c.name) + '">' + UI.trash + '</button>';
  },
  toolActs(t) {
    if (!ED.on) return '';
    return '<button type="button" class="lic ed ttedit" data-e="editTool" data-k="' + esc(t.id) + '" title="Change the link" aria-label="Change the link to ' + esc(t.name) + '">' + UI.edit + '</button>';
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
  footNote: () => IS_MAINT() ? ' Tools are listed in src/tools.js; their links and the catalog are edited here, with Edit catalog.' : '',
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
    if (url && !linkOk(url)) { errs.push('row ' + n + ' (' + name + '): the link cannot be opened (use ' + LINK_HELP + ')'); return; }
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
    + field('nUrl', 'Link', '<input id="nUrl" type="text" inputmode="url" spellcheck="false" maxlength="2000" placeholder="https://… (optional)" value="' + esc(n.url || '') + '" autocomplete="off">')
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
  if (v('nUrl')) { if (!linkOk(v('nUrl'))) { err.textContent = 'That link cannot be opened. Use ' + LINK_HELP + '.'; return; } n.url = v('nUrl'); }
  CATALOG.notices = CATALOG.notices || [];
  n.id = i >= 0 ? CATALOG.notices[i].id : 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  if (i >= 0) CATALOG.notices[i] = n; else CATALOG.notices.push(n);
  dlgClose(); edKeep(); toast('Announcement ' + (i >= 0 ? 'changed' : 'added') + ' (not saved yet)');
}
function delNews(i) {
  const n = CATALOG.notices[i]; if (!n || !confirm('Delete the announcement “' + n.text.slice(0, 80) + '”?')) return;
  trashPut('notice', n); CATALOG.notices.splice(i, 1); edKeep(); newsList();
}

// ---- the glossary
function termForm(term) {
  const g = term ? glossary().find(x => x.term === term) : { term: '', meaning: '', url: '' };
  dlg('<header><h2 id="sdlgT">' + (term ? 'Change a term' : 'Add a term') + '</h2><button type="button" class="x" data-e="close" aria-label="Close">×</button></header><div class="eform">'
    + field('gTerm', 'Term', '<input id="gTerm" maxlength="60" value="' + esc(g.term) + '" placeholder="UFR" autocomplete="off">')
    + field('gMean', 'What it means', '<textarea id="gMean" rows="4" maxlength="600" placeholder="Unfunded Requirement: …">' + esc(g.meaning) + '</textarea>')
    + field('gUrl', 'Read more', '<input id="gUrl" type="text" inputmode="url" spellcheck="false" maxlength="2000" placeholder="https://… (optional)" value="' + esc(g.url || '') + '" autocomplete="off">')
    + '<p class="eerr" id="eErr" role="alert"></p></div><footer><span class="sp"></span><button type="button" class="btn" data-e="close">Cancel</button>'
    + '<button type="button" class="btn pri" data-e="saveTerm" data-t="' + esc(term) + '">' + (term ? 'Save changes' : 'Add term') + '</button></footer>', '#gTerm');
}
function saveTerm(old) {
  const v = id => document.getElementById(id).value.trim(), err = document.getElementById('eErr');
  const e = { term: v('gTerm'), meaning: v('gMean') };
  if (!e.term || !e.meaning) { err.textContent = 'Give the term and what it means.'; return; }
  if (glossary().some(x => x.term !== old && x.term.toLowerCase() === e.term.toLowerCase())) { err.textContent = 'That term is already in the glossary.'; return; }
  if (v('gUrl')) { if (!linkOk(v('gUrl'))) { err.textContent = 'That link cannot be opened. Use ' + LINK_HELP + '.'; return; } e.url = v('gUrl'); }
  CATALOG.glossary = CATALOG.glossary || [];
  const i = CATALOG.glossary.findIndex(x => x.term === old);
  if (old && i >= 0) CATALOG.glossary[i] = e; else CATALOG.glossary.push(e);
  dlgClose(); edKeep(); toast('Term ' + (old ? 'changed' : 'added') + ' (not saved yet)');
}
function delTerm(term) {
  const i = CATALOG.glossary.findIndex(x => x.term === term);
  if (i < 0 || !confirm('Delete “' + term + '” from the glossary?')) return;
  trashPut('term', CATALOG.glossary[i]); CATALOG.glossary.splice(i, 1); edKeep(); toast('Deleted “' + term + '”');
}
